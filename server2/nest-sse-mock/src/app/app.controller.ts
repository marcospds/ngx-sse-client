import { Controller, MessageEvent, Sse } from '@nestjs/common';

import { map, Observable, take, timer } from 'rxjs';

@Controller()
export class AppController {
  @Sse('sse_world')
  sse(): Observable<MessageEvent> {
    return timer(0, 100).pipe(
      //take(100),
      map(() => ({ data: 'world ' }))
    );
  }

  @Sse('sse_hello')
  sse2(): Observable<MessageEvent> {
    return timer(0, 100).pipe(
      //take(100),
      map(() => ({ data: 'hello ' }))
    );
  }
}
