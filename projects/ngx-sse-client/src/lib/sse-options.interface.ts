export interface SseOptions {
  keepAlive?: boolean;
  reconnectionDelay?: number;
  responseType?: 'text' | 'event';
}
