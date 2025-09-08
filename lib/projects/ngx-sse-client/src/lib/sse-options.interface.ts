export interface SseOptions {
  /**
   * `true` to automatically reconnect when the request is closed by an request
   * error (including timeout errors) or completed.
   *
   * In this case, to close the connection is necessary to unsubscribe manually.
   *
   * @default `true`
   */
  keepAlive: boolean;

  /**
   * Delay before reconnecting with the server, this is only useful when
   * `keepAlive` is `true`.
   *
   * @default `3000`
   */
  reconnectionDelay: number;

  /**
   * Defines the response type.
   *
   * When set to `event` a `MessageEvent` will be returned with the data and a
   * default `Event` with type error in case of erros.
   *
   * When set to `text` only the message data will be returned. In this case no
   * errors will be returned, only the data from successful requests.
   *
   * @default `text`
   */
  responseType: 'event' | 'text';
}

export const defaultSseOptions: SseOptions = { keepAlive: true, reconnectionDelay: 3_000, responseType: 'event' };
