import './events-polyfill';

import { HttpClient, HttpDownloadProgressEvent, HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { delay, repeatWhen, retryWhen, takeWhile, tap } from 'rxjs/operators';

import { defaultSseOptions, SseOptions } from './sse-options.interface';
import { defaultRequestOptions, SseRequestOptions } from './sse-request-options.interface';

@Injectable({
  providedIn: 'root',
})
export class SseClient {
  private static readonly SEPARATOR = ':';

  private progress = 0;
  private chunk = '';

  private sseOptions: SseOptions;
  private httpClientOptions: any;

  constructor(private httpClient: HttpClient) {}

  /**
   * Constructs a request which listen to the SSE and interprets the data as
   * events and returns the full event stream.
   *
   * @param url the endpoint URL.
   * @param options an object of `SseOption`
   * @param requestOptions the HTTP options to send with the request.
   * @param method the HTTP method
   *
   * @returns an observable of all events for the request, with the response body of type `Event`.
   */
  public stream(url: string, options?: { keepAlive?: boolean; reconnectionDelay?: number; responseType?: 'event' }, requestOptions?: SseRequestOptions, method?: string): Observable<Event>;

  /**
   * Constructs a request which listen to the SSE and interprets the data as a
   * string text and returns the full event stream.
   *
   * @param url the endpoint URL.
   * @param options an object of `SseOption`
   * @param requestOptions the HTTP options to send with the request.
   * @param method the HTTP method
   *
   * @returns an observable of all events for the request, with the response body of type string.
   */
  public stream(url: string, options?: { keepAlive?: boolean; reconnectionDelay?: number; responseType?: 'text' }, requestOptions?: SseRequestOptions, method?: string): Observable<string>;

  public stream(url: string, options?: SseOptions, requestOptions?: SseRequestOptions, method = 'GET'): Observable<string | Event> {
    this.sseOptions = Object.assign({}, defaultSseOptions, options);
    this.httpClientOptions = Object.assign({}, requestOptions as any, defaultRequestOptions);

    return new Observable<string | Event>((observer) => {
      const subscription = this.subscribeStreamRequest(url, this.sseOptions, this.httpClientOptions, method, observer);
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
      this.onStreamProgress((event as HttpDownloadProgressEvent).partialText, observer);
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
    this.onStreamProgress(response.body, observer);
    this.dispatchStreamData(this.parseEventChunk(this.chunk), observer);

    this.chunk = '';
    this.progress = 0;

    this.dispatchStreamData(this.errorEvent(), observer);
  }

  private parseEventData(part: string, observer: Subscriber<string>) {
    if (part.trim().length === 0) {
      this.dispatchStreamData(this.parseEventChunk(this.chunk), observer);
      this.chunk = '';
    } else {
      this.chunk += part;
    }
  }

  private parseEventChunk(chunk: string): MessageEvent {
    if (!chunk || chunk.length === 0) return;

    const chunkEvent: ChunkEvent = { id: null, data: '', event: 'message' };
    chunk.split(/\n|\r\n|\r/).forEach((line) => this.parseChunkLine(line.trim(), chunkEvent));

    return this.messageEvent(chunkEvent.event, { lastEventId: chunkEvent.id, data: chunkEvent.data });
  }

  private parseChunkLine(line: string, event: ChunkEvent): void {
    const index = line.indexOf(SseClient.SEPARATOR);
    if (index <= 0) return null;

    const field = line.substring(0, index);
    if (Object.keys(event).findIndex((key: string) => key === field) === -1) return;

    let data = line.substring(index + 1);
    if (field === 'data') data = event.data + data;

    event[field] = data;
  }

  private dispatchStreamData(event: Event, observer: Subscriber<unknown>): void {
    if (!this.validEvent(event)) return;

    if (this.sseOptions.responseType === 'event') {
      observer.next(event);
    } else {
      observer.next((event as MessageEvent).data);
    }
  }

  private validEvent(event: Event): boolean {
    if (!event) return false;
    if (event.type === 'error' && this.sseOptions.responseType !== 'event') return false;
    if (event.type !== 'error' && (!(event as MessageEvent).data || !(event as MessageEvent).data.length)) return false;
    return true;
  }

  private messageEvent(type: string, options: MessageEventInit): MessageEvent {
    return new MessageEvent(type, options);
  }

  private errorEvent(error?: any): Event {
    let eventInitDict: ErrorEventInit;

    if (error && error.status > 0) {
      eventInitDict = { error, message: error.message };

      if (!this.isValidStatus(error.status)) {
        eventInitDict['status'] = error.status;
        eventInitDict['statusText'] = error.statusText;
      }
    }

    return new ErrorEvent('error', eventInitDict);
  }
}

type ChunkEvent = { id: string; data: string; event: 'message' };
