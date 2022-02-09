import 'eventsource-polyfill';

import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { SseClient } from 'ngx-sse-client';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: ['./app.component.css'],
})
export class AppComponent {
  private apiBaseUrl = environment?.apiBaseUrl || '';

  public sseEvents: string[] = [];
  public sourceEvents: string[] = [];

  constructor(private httpClient: HttpClient, private sseClient: SseClient) {
    this.sseClient.stream(`${this.apiBaseUrl}/subscribe`).subscribe((e) => {
      if (e.type === 'error') {
        const message = (e as ErrorEvent).message;
        this.sseEvents.push(`ERROR: ${message}`);
      } else {
        const data = (e as MessageEvent).data;
        this.sseEvents.push(data);
      }
    });

    const event = new EventSource(`${this.apiBaseUrl}/subscribe`);
    event.addEventListener('error', (e: ErrorEvent) => this.sourceEvents.push(`ERROR: ${e.message}`));
    event.addEventListener('message', (event) => this.sourceEvents.push(event.data));
  }

  public close(): void {
    this.httpClient.get(`${this.apiBaseUrl}/close`).subscribe();
  }

  public emit(): void {
    this.httpClient.get(`${this.apiBaseUrl}/emit`).subscribe();
  }
}
