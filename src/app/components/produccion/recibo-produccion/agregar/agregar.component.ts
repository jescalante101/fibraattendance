import { Component,EventEmitter, Output  } from '@angular/core';

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.component.html',
  styleUrls: ['./agregar.component.css']
})
export class AgregarComponent {
  isSelect1 = false;
  selectedOption: string = ''; // Opción seleccionada
  ancho: number | null = null;
  pesoTuco: number | null = null;; 
  metros: number | null = null;

  @Output() cerrar = new EventEmitter<void>();

  closeModalAgregar() {
    this.cerrar.emit(); // Esto le avisa al padre (index) que cierre el modal
  }

  ToggleSelect1() {
    this.isSelect1 = false;
  }
  
  
}
