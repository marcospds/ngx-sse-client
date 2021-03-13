import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { delay, repeatWhen, retryWhen, takeWhile, tap } from 'rxjs/operators';

import { SseOptions } from './sse-options.interface';
import { SseRequestOptions } from './sse-request-options.interface';

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
  public stream(url: string, options?: { keepAlive?: boolean; reconnectionDelay?: number; responseType?: 'event' }): Observable<Event>;

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
  public stream(url: string, options?: { keepAlive?: boolean; reconnectionDelay?: number; responseType?: 'event' }): Observable<string>;

  public stream(url: string, options?: SseOptions, requestOptions?: SseRequestOptions, method = 'GET'): Observable<string | Event> {
    this.adjustOptions(options);
    this.adjustRequestOptions(requestOptions);

    return new Observable<string | Event>((observer) => {
      const subscription = this.subscribeStreamRequest(url, this.sseOptions, this.httpClientOptions, method, observer);
      return () => subscription.unsubscribe();
    });
  }

  private adjustOptions(options: SseOptions): void {
    this.sseOptions = Object.assign({}, { keepAlive: true, reconnectionDelay: 5_000, responseType: 'event' }, options);
  }

  private adjustRequestOptions(options: SseRequestOptions): void {
    this.httpClientOptions = Object.assign({}, options as any, { reportProgress: true, observe: 'events', responseType: 'text' });
  }

  private subscribeStreamRequest(url: string, options: SseOptions, requestOptions: any, method: string, observer: Subscriber<string>): Subscription {
    return this.httpClient
      .request<string>(method, url, requestOptions)
      .pipe(repeatWhen((completed) => completed.pipe(takeWhile(() => options.keepAlive)).pipe(delay(options.reconnectionDelay))))
      .pipe(
        retryWhen((error) =>
          error
            .pipe(tap((error) => (this.sseOptions.keepAlive ? this.dispatchStreamData(this.errorEvent(), observer) : observer.error(error))))
            .pipe(takeWhile(() => options.keepAlive))
            .pipe(delay(options.reconnectionDelay))
        )
      )
      .subscribe((event) => this.parseStreamEvent(event, observer));
  }

  private parseStreamEvent(event: HttpEvent<string>, observer: Subscriber<string>): void {
    if (event.type === HttpEventType.DownloadProgress) {
      this.onStreamProgress((event as HttpDownloadProgressEvent).partialText, observer);
      return;
    }

    if (event.type === HttpEventType.Response) {
      this.onStreamCompleted((event as HttpResponse<string>).body, observer);
      return;
    }
  }

  private onStreamProgress(data: string, observer: Subscriber<string>): void {
    data = data.substring(this.progress);
    this.progress += data.length;
    data.split(/(\r\n|\r|\n){2}/g).forEach((part) => this.parseEventData(part, observer));
  }

  private onStreamCompleted(data: string, observer: Subscriber<string>): void {
    this.onStreamProgress(data, observer);
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

    return new MessageEvent(chunkEvent.event, { lastEventId: chunkEvent.id, data: chunkEvent.data });
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
    if (!event) return;
    if (event.type === 'error' && this.sseOptions.responseType !== 'event') return;

    if (this.sseOptions.responseType === 'event') {
      observer.next(event);
    } else {
      observer.next((event as MessageEvent).data);
    }
  }

  private errorEvent(): Event {
    return new Event('error');
  }
}

type ChunkEvent = { id: string; data: string; event: 'message' };
