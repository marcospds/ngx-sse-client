import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { SseClient, SseErrorEvent } from 'ngx-sse-client';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent {
  private apiBaseUrl = environment?.apiBaseUrl || '';

  public sseEvents: string[] = [];
  public sourceEvents: string[] = [];

  constructor(private httpClient: HttpClient, private sseClient: SseClient) {
    this.sseClient.stream(`${this.apiBaseUrl}/subscribe`).subscribe((e) => {
      if (e.type === 'error') {
        const event = e as SseErrorEvent;
        this.sseEvents.push(`ERROR: ${event.message}, STATUS: ${event.status}, STATUS TEXT: ${event.statusText}`);
      } else {
        const data = (e as MessageEvent).data;
        this.sseEvents.push(data);
      }
    });

    const event = new EventSource(`${this.apiBaseUrl}/subscribe`);
    event.addEventListener('error', (event) => {
      console.error(event);
      this.sourceEvents.push('ERROR');
    });
    event.addEventListener('message', (event) => {
      console.info(event);
      this.sourceEvents.push(event.data);
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
