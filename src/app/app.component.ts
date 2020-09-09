import { Component, ViewChild } from '@angular/core';
import { MultiWellComponent } from './components/multiwell/multiwell.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild(MultiWellComponent) welllog: MultiWellComponent;
  title = 'app';
}
