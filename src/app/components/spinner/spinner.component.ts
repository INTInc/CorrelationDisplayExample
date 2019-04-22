import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-spinner-component',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent {
  @Input() visible = true;
  constructor() {

  }
  /**
   * Show
   */
  public show() {
    this.visible = true;
  }
  /**
   * Hide
   */
  public hide() {
    this.visible = false;
  }
}
