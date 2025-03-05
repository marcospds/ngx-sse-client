import { HttpClient, HttpDownloadProgressEvent, HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { delay, repeatWhen, retryWhen, takeWhile, tap } from 'rxjs/operators';

import { SseErrorEvent } from './sse-error-event.interface';
import { SseOptions } from './sse-options.interface';

export class SseClientSubscriber {
  private static readonly SEPARATOR = ':';

  private progress = 0;
  private chunk = '';

  constructor(private httpClient: HttpClient, private sseOptions: SseOptions, private httpClientOptions: any, private url: string, private method: string) { }

  public createObservable(): Observable<string | Event> {
    return new Observable<string | Event>((observer) => {
      const subscription = this.subscribeStreamRequest(this.url, this.sseOptions, this.httpClientOptions, this.method, observer);
      return () => subscription.unsubscribe();
    });
  }

  private subscribeStreamRequest(url: string, options: SseOptions, requestOptions: any, method: string, observer: Subscriber<string | Event>): Subscription {
    return this.httpClient
      .request<string>(method, url, requestOptions)
      .pipe(repeatWhen((completed) => this.repeatWhen(completed, options.keepAlive, options.reconnectionDelay)))
      .pipe(retryWhen((error) => this.retryWhen(error, options.keepAlive, options.reconnectionDelay, observer)))
      .subscribe((event) => this.parseStreamEvent(event, observer));
  }

  private repeatWhen(completed: Observable<any>, keepAlive: boolean, reconnectionDelay: number): Observable<any> {
    return completed.pipe(takeWhile(() => keepAlive)).pipe(delay(reconnectionDelay));
  }

  private retryWhen(attempts: Observable<any>, keepAlive: boolean, reconnectionDelay: number, observer: Subscriber<string | Event>): Observable<any> {
    return attempts
      .pipe(tap((error) => this.threatRequestError(error, observer)))
      .pipe(takeWhile(() => keepAlive))
      .pipe(delay(reconnectionDelay));
  }

  private threatRequestError(event: HttpErrorResponse, observer: Subscriber<string | Event>): void {
    this.dispatchStreamData(this.errorEvent(event), observer);

    if (!this.isValidStatus(event.status)) {
      observer.error(event);
    }
  }

  private isValidStatus(status: number): boolean {
    return status !== undefined && status !== null && status <= 299;
  }

  private parseStreamEvent(event: HttpEvent<string>, observer: Subscriber<string>): void {
    if (event.type === HttpEventType.Sent) {
      this.progress = 0;
      return;
    }

    if (event.type === HttpEventType.DownloadProgress) {
      this.onStreamProgress((event as HttpDownloadProgressEvent).partialText as string, observer);
      return;
    }

    if (event.type === HttpEventType.Response) {
      this.onStreamCompleted(event as HttpResponse<string>, observer);
      return;
    }
  }

  private onStreamProgress(data: string, observer: Subscriber<string>): void {
    data = data.substring(this.progress);
    this.progress += data.length;
    data.split(/(\r\n|\r|\n){2}/g).forEach((part) => this.parseEventData(part, observer));
  }

  private onStreamCompleted(response: HttpResponse<string>, observer: Subscriber<string>): void {
    this.onStreamProgress(response.body as string, observer);
    this.dispatchStreamData(this.parseEventChunk(this.chunk), observer);

    this.chunk = '';
    this.progress = 0;

    if (this.sseOptions.keepAlive) {
      const message = `Server response ended, will reconnect in ${this.sseOptions.reconnectionDelay}ms`;
      this.dispatchStreamData(this.errorEvent({ status: 1, message }), observer);
    } else {
      observer.complete();
    }
  }

  private parseEventData(part: string, observer: Subscriber<string>) {
    if (part.trim().length === 0) {
      this.dispatchStreamData(this.parseEventChunk(this.chunk), observer);
      this.chunk = '';
    } else {
      this.chunk += part;
    }
  }

  private parseEventChunk(chunk: string): MessageEvent | undefined {
    if (!chunk || chunk.length === 0) return;

    const chunkEvent: ChunkEvent = { id: undefined, data: '', event: 'message' };
    chunk.split(/\n|\r\n|\r/).forEach((line) => this.parseChunkLine(line.trim(), chunkEvent));

    return this.messageEvent(chunkEvent.event, { lastEventId: chunkEvent.id, data: chunkEvent.data });
  }

  private parseChunkLine(line: string, event: ChunkEvent) {
    const index = line.indexOf(SseClientSubscriber.SEPARATOR);
    if (index <= 0) return;

    const field = line.substring(0, index);
    if (Object.keys(event).findIndex((key: string) => key === field) === -1) return;

    let data = line.substring(index + 1).replace(/^\s/, '');
    if (field === 'data') data = event.data + data;

    event[field] = data;
  }

  private dispatchStreamData(event: Event | undefined, observer: Subscriber<unknown>): void {
    if (!this.validEvent(event)) return;

    if (this.sseOptions.responseType === 'event') {
      observer.next(event);
    } else {
      observer.next((event as MessageEvent).data);
    }
  }

  private validEvent(event: Event | undefined): boolean {
    if (!event) return false;
    if (event.type === 'error' && this.sseOptions.responseType !== 'event') return false;
    if (event.type !== 'error' && (!(event as MessageEvent).data || !(event as MessageEvent).data.length)) return false;
    return true;
  }

  private messageEvent(type: string, options: MessageEventInit): MessageEvent {
    return new MessageEvent(type, options);
  }

  private errorEvent(error?: any): Event {
    let eventData: Partial<SseErrorEvent> | undefined;

    if (error && error.status > 0) {
      eventData = { error, message: error.message };

      if (!this.isValidStatus(error.status)) {
        eventData['status'] = error.status;
        eventData['statusText'] = error.statusText;
      }
    }

    return new ErrorEvent('error', eventData);
  }
}

type ChunkEvent = { id: string | undefined; data: string; event: 'message';[key: string]: any };

