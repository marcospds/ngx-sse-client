import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { SseClient, SseErrorEvent } from 'ngx-sse-client';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  private readonly apiBaseUrl = environment?.apiBaseUrl || '';
  private readonly httpClient = inject(HttpClient);
  private readonly sseClient = inject(SseClient);

  protected readonly sseEvents = signal<string[]>([]);
  protected readonly sseEventsWithoutKeepalive = signal<string[]>([]);
  protected readonly sourceEvents = signal<string[]>([]);

  constructor() {
    this.sseClient.stream(`${this.apiBaseUrl}/subscribe`).subscribe({
      next: (e) => {
        if (e.type === 'error') {
          const event = e as SseErrorEvent;
          this.sseEvents.update((events) => [...events, `ERROR: ${event.message}, STATUS: ${event.status}, STATUS TEXT: ${event.statusText}`]);
        } else {
          const data = (e as MessageEvent).data;
          this.sseEvents.update((events) => [...events, data]);
        }
      },
      error: (e) => {
        console.error(e);
      },
      complete: () => {
        this.sseEvents.update((events) => [...events, 'COMPLETE - this should never happen']);
      },
    });

    this.sseClient.stream(`${this.apiBaseUrl}/subscribe`, { keepAlive: false }).subscribe({
      next: (e) => {
        if (e.type === 'error') {
          const event = e as SseErrorEvent;
          this.sseEventsWithoutKeepalive.update((events) => [...events, `ERROR: ${event.message}, STATUS: ${event.status}, STATUS TEXT: ${event.statusText}`]);
        } else {
          const data = (e as MessageEvent).data;
          this.sseEventsWithoutKeepalive.update((events) => [...events, data]);
        }
      },
      error: (e) => {
        console.error(e);
      },
      complete: () => {
        this.sseEventsWithoutKeepalive.update((events) => [...events, 'COMPLETE']);
      },
    });

    const event = new EventSource(`${this.apiBaseUrl}/subscribe`);
    event.addEventListener('error', (event) => {
      console.error(event);
      this.sourceEvents.update((events) => [...events, 'ERROR']);
    });
    event.addEventListener('message', (event) => {
      console.info(event);
      this.sourceEvents.update((events) => [...events, event.data]);
    });
  }

  public error(): void {
    this.httpClient.get(`${this.apiBaseUrl}/error`).subscribe();
  }

  public close(): void {
    this.httpClient.get(`${this.apiBaseUrl}/close`).subscribe();
  }

  public emit(): void {
    this.httpClient.get(`${this.apiBaseUrl}/emit`).subscribe();
  }
}
