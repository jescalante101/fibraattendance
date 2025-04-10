// import { Component, Input, Output, EventEmitter } from '@angular/core';

// @Component({
//   selector: 'app-modal',
//   templateUrl: './modal.component.html',
//   styleUrls: ['./modal.component.css']
// })
// export class ModalComponent {
//   @Input() visible = false;
//   @Output() close = new EventEmitter<void>();

//   cerrar() {
//     this.close.emit();
//   }
// }

import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent {
  @Input() visible = false;
  @Input() title = ''; // título opcional
  @Input() size: 'sm' | 'md' | 'lg' = 'md'; // tamaño del modal
  @Output() close = new EventEmitter<void>();

  cerrar() {
    this.close.emit();
  }

  get sizeClass(): string {
    switch (this.size) {
      case 'sm': return 'modal-sm';
      case 'lg': return 'modal-lg';
      default: return 'modal-md';
    }
  }
}
