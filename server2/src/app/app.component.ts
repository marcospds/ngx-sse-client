import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { interval } from 'rxjs';
import { HelloComponent } from './hello/hello.component';
import { WorldComponent } from './world/world.component';

@Component({
  standalone: true,
  imports: [AsyncPipe, HelloComponent, WorldComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  timer = interval(1000);
  isready = false;

  ngOnInit() {
    setTimeout(() => {
      this.isready = true;
    }, 1000);
  }
}
