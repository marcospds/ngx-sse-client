# NGX SSE Client

A simple **SSE** (Server Sent Events) client for `Angular` applications.

Based on the [**sse.js**](https://github.com/mpetazzoni/sse.js) project, this library uses the `HttpClient` instead of the `XMLHttpRequest` and uses `Observable` to receive data from the server, instead of Javascript events.

That way, all requests made from this library can be intercepted correctly, with `HttpInterceptor`. It is also possible to decide which request will be made, `GET` or `POST` for example, and send other options as in other `HttpClient` requests.

## Basic Usage

Inject the `SseClient` service to your component and execute the `stream` method, passing the `url` string to conect with the server stream:

```typescript
import { Component, OnInit } from '@angular/core';
import { SseClient } from 'ngx-sse-client';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private sseClient: SseClient) {
    this.sseClient.stream('/subscribe').subscribe((data) => console.log(data));
  }
}
```

It is also possible to send specific options to tell the service to automatically reconnect the stream and to set an reconnect delay:

```typescript
const options = { keepAlive: true, reconnectionDelay: 15_000 };
this.sseClient.stream('/subscribe', options).subscribe((data) => console.log(data));
```

## `stream` parameters

Here's a list of possible parameters for the `stream` method:

|   # | name             | description                  | mandatory |
| --: | ---------------- | ---------------------------- | :-------: |
|   1 | `url`            | server source `URL`          |    \*     |
|   2 | `options`        | an object of `SseOption`     |           |
|   3 | `requestOptions` | `HttpClient` request options |           |
|   4 | `method`         | the `HTTP` request method    |           |

## `SseOption` object

The `SseOption` is an object with specific options for the `SseClient` service. Bellow there's the list of possible options:

| name                | description                                        |  default   |
| ------------------- | -------------------------------------------------- | :--------: |
| `keepAlive`         | `true` to reconnect after the request is completed |  `false`   |
| `reconnectionDelay` | defines a delay before reconnecting                | 30 seconds |

---

Please, feel free to send your contributions.
