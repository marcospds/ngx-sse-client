import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subscriber, Subscription } from 'rxjs';
import { delay, repeatWhen, takeWhile } from 'rxjs/operators';

import { SseOptions } from './sse-options.interface';
import { SseRequestOptions } from './sse-request-options.interface';

@Injectable({
  providedIn: 'root',
})
export class SseClient {
  private static readonly SEPARATOR = ':';

  private progress = 0;
  private chunk = '';

  constructor(private httpClient: HttpClient) {}

  /**
   * Connects to the server's SSE stream request.
   *
   * @param url server source URL
   * @param options an object of `SseOption`
   * @param requestOptions `HttpClient` request options
   * @param method the HTTP request method
   *
   * @returns an observable with the stream request
   */
  public stream(url: string, options?: SseOptions, requestOptions?: SseRequestOptions, method = 'GET'): Observable<string> {
    options = this.adjustOptions(options);
    requestOptions = this.adjustRequestOptions(requestOptions);

    return new Observable<string>((observer) => {
      const subscription = this.subscribeStreamRequest(url, options, requestOptions, method, observer);
      return () => subscription.unsubscribe();
    });
  }

  private adjustOptions(options: SseOptions): SseOptions {
    return Object.assign({}, { keepAlive: false, reconnectionDelay: 30_000 }, options);
  }

  private adjustRequestOptions(options: SseRequestOptions): SseRequestOptions {
    return Object.assign({}, options, { reportProgress: true, observe: 'events', responseType: 'text' });
  }

  private subscribeStreamRequest(url: string, options: SseOptions, requestOptions: SseRequestOptions, method: string, observer: Subscriber<string>): Subscription {
    return this.httpClient
      .request<string>(method, url, requestOptions as any)
      .pipe(repeatWhen((completed) => completed.pipe(takeWhile(() => options.keepAlive)).pipe(delay(options.reconnectionDelay))))
      .subscribe(
        (event) => this.parseStremEvent(event, observer),
        (error) => observer.error(error)
      );
  }

  private parseStremEvent(event: HttpEvent<string>, observer: Subscriber<string>): void {
    if (event.type === HttpEventType.DownloadProgress) {
      this.onStreamProgress((event as HttpDownloadProgressEvent).partialText, observer);
      return;
    }

    if (event.type === HttpEventType.Response) {
      this.onStreamCompleted((event as HttpResponse<string>).body, observer);
      return;
    }
  }

  /**
   * Called when the stream is receiving data from the server.
   *
   * @param data
   * @param observer
   */
  private onStreamProgress(data: string, observer: Subscriber<string>): void {
    data = data.substring(this.progress);
    this.progress += data.length;
    data.split(/(\r\n|\r|\n){2}/g).forEach((part) => this.parseEventData(part, observer));
  }

  /**
   * Called when the stream is completed by the server.
   *
   * @param event
   * @param observer
   */
  private onStreamCompleted(data: string, observer: Subscriber<string>): void {
    this.onStreamProgress(data, observer);
    this.dispatchStreamData(this.parseEventChunk(this.chunk), observer);
    this.chunk = '';
    this.progress = 0;
  }

  /**
   * Parses the event data part.
   *
   * @param part
   * @param observer
   */
  private parseEventData(part: string, observer: Subscriber<string>) {
    if (part.trim().length === 0) {
      this.dispatchStreamData(this.parseEventChunk(this.chunk), observer);
      this.chunk = '';
    } else {
      this.chunk += part;
    }
  }

  /**
   * Parses the event chunk part.
   * @param chunk
   */
  private parseEventChunk(chunk: string): string {
    if (!chunk || chunk.length === 0) return '';

    let data = '';
    chunk.split(/\n|\r\n|\r/).forEach((line) => (data += this.parseChunkLine(line.trim())));

    return data;
  }

  /**
   * Parse the chunk line.
   * @param line
   */
  private parseChunkLine(line: string): string {
    const index = line.indexOf(SseClient.SEPARATOR);
    if (index <= 0) return '';

    const field = line.substring(0, index);
    if (!(field === 'data')) return '';

    return line.substring(index + 1);
  }

  /**
   * Dispatch the stream data through the observer.
   *
   * @param data
   * @param observer
   */
  private dispatchStreamData(data: string, observer: Subscriber<unknown>): void {
    if (!data || data.length === 0) return;
    observer.next(data);
  }
}
