export interface SseErrorEvent extends ErrorEvent {
  /**
   * HTTP status code from the request error.
   */
  status?: number;

  /**
   * HTTP status text from the request error.
   */
  statusText?: string;
}
