# NGX SSE Client

A simple **SSE** (Server Sent Events) client for `Angular` applications to
replace the use of `EventSource`.

This library uses the `HttpClient` to make the stream request and uses
`Observable` to receive data from server. That way, all requests can be
intercepted correctly with `HttpInterceptor`. It is also possible to decide
which request will be made, `GET` or `POST` for example, and send other options
as in other `HttpClient` requests.

## Basic Usage

Inject the `SseClient` service to your component and execute the `stream`
method, passing the `url` string to connect with. Here's a basic example:

```typescript
import { Component, OnInit } from '@angular/core';
import { SseClient } from 'ngx-sse-client';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private sseClient: SseClient) {
    const headers = new HttpHeaders().set('Authorization', `Basic YWRtaW46YWRtaW4=`);

    this.sseClient.stream('/subscribe', { keepAlive: true, reconnectionDelay: 1_000, responseType: 'event' }, { headers }, 'POST').subscribe((event) => {
      if (event.type === 'error') {
        const errorEvent = event as ErrorEvent;
        console.error(errorEvent.error, errorEvent.message);
      } else {
        const messageEvent = event as MessageEvent;
        console.info(`SSE request with type "${messageEvent.type}" and data "${messageEvent.data}"`);
      }
    });
  }
}
```

## `stream` parameters

Here's a list of possible parameters for the `stream` method:

|   # | name             | description                               | mandatory |
| --: | ---------------- | ----------------------------------------- | :-------: |
|   1 | `url`            | the endpoint URL                          |    \*     |
|   2 | `options`        | an object of `SseOption`                  |           |
|   3 | `requestOptions` | the HTTP options to send with the request |           |
|   4 | `method`         | the HTTP method, default is `GET`         |           |

## `SseOption` object

The `SseOption` is an object with specific options for the `SseClient` service.
Bellow there's the list of possible options:

| name                | description                                        |  default  |
| ------------------- | -------------------------------------------------- | :-------: |
| `keepAlive`         | `true` to reconnect after the request is completed |  `true`   |
| `reconnectionDelay` | defines a delay before reconnecting                | 3 seconds |
| `responseType`      | request response type, `event` or `text`           |  `event`  |

### `keepAlive`

When set to `true`, will automatically reconnect when the request is closed by
timeout or completed. In this case, to close the connection is necessary to
`unsubscribe` manually.

### `reconnectionDelay`

Defines a delay before reconnecting with the server. This is only useful when
`keepAlive` is `true`.

### `responseType`

Defines the response type to be cast from the server to client.

#### `event`

A **`MessageEvent`** will be returned with the message sent from the server - the
type will obey the one of the message.

Otherwise in case of errors, an **`ErrorEvent`** with type **error** will be returned

For example:

```typescript
this.sseClient.stream('/subscribe').subscribe((event) => {
  if (event.type === 'error') {
    const errorEvent = event as ErrorEvent;
    console.error(errorEvent.error, errorEvent.message);
  } else {
    const messageEvent = event as MessageEvent;
    console.info(`SSE request with type "${messageEvent.type}" and data "${messageEvent.data}"`);
  }
});
```

#### `text`

In this case, only the message data will be returned. For example:

```typescript
this.sseClient.stream('/subscribe', { responseType: 'text' }).subscribe((data) => console.log(data));
```

> :warning: It is important to know that, if the response type is set to `text`,
> no errors will be returned, only the data from successful requests.

## CHANGELOG

### 2.1.0

#### :beetle: Bug fixes

- unsubscribe the stream request if a server error occurs.

#### :star: Improvements

- added the `status` and `statusText` attributes to the `ErrorEvent`, these
  will hold details from server errors;
- changed `responseType` default to `event`;
- changed `reconnectDelay` default to `3 seconds`.

---

> Please, feel free to send your contributions. :)
