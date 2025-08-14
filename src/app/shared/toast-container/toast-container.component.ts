import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-toast-container',
  template: `<div id="toast-container" class="fixed top-5 right-5 z-50"></div>`,
  styles: [`
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    }
    
    #toast-container {
      pointer-events: auto;
    }
  `]
})
export class ToastContainerComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    // El contenedor se crea automáticamente en el template
  }

}