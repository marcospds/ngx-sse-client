import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { tap } from 'rxjs';
import { SseService } from '../sse/sse.service';

@Component({
  selector: 'app-hello',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hello.component.html',
  styleUrl: './hello.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelloComponent {
  hello$;

  constructor(private sseService: SseService) {
    this.hello$ = this.sseService.getHello().pipe(tap((hello) => console.log('hello', hello)));
  }
}
