import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { tap } from 'rxjs';
import { SseService } from '../sse/sse.service';

@Component({
  selector: 'app-world',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './world.component.html',
  styleUrl: './world.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldComponent {
  world$ = this.sseService.getWorld().pipe(tap((world) => console.log('world', world)));

  constructor(private sseService: SseService) {}
}
