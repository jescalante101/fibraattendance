import { Component,EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.component.html',
  styleUrls: ['./resumen.component.css']
})
export class ResumenComponent {
  @Output() cerrar = new EventEmitter<void>();

  closeModalResumen() {
    this.cerrar.emit(); // Esto le avisa al padre (index) que cierre el modal
  }

}

