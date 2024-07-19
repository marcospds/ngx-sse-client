import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { SseClient } from 'ngx-sse-client';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  constructor(private sseClient: SseClient) {}

  public getWorld(): Observable<string> {
    return this.sseClient
      .stream(`http://localhost:3000/api/sse_world`, {
        keepAlive: false,
        responseType: 'text',
      })
      .pipe(map((data: string) => data));
  }

  public getHello(): Observable<string> {
    return this.sseClient
      .stream(`http://localhost:3000/api/sse_hello`, {
        keepAlive: false,
        responseType: 'text',
      })
      .pipe(map((data: string) => data));
  }
}
