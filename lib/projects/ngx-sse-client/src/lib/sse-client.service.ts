import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { defaultSseOptions, SseOptions } from './sse-options.interface';
import { defaultRequestOptions, SseRequestOptions } from './sse-request-options.interface';

import { SseClientSubscriber } from './sse-client-subscriber';

@Injectable({
  providedIn: 'root',
})
export class SseClient {
  constructor(private httpClient: HttpClient) { }

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

  public stream(url: string, options?: Partial<SseOptions>, requestOptions?: Partial<SseRequestOptions>, method = 'GET'): Observable<string | Event> {
    var sseOptions: SseOptions = Object.assign({}, defaultSseOptions, options);
    var httpClientOptions: any = Object.assign({}, requestOptions as any, defaultRequestOptions);

    return new SseClientSubscriber(this.httpClient, sseOptions, httpClientOptions, url, method).createObservable();
  }
}
