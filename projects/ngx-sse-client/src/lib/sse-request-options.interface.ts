import { HttpHeaders, HttpParams } from '@angular/common/http';

export interface SseRequestOptions {
  body?: any;
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | string[] };
  responseType?: 'arraybuffer' | 'blob' | 'text';
  withCredentials?: boolean;
}
