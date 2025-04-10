import { Component } from '@angular/core';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent {
    modalVisibleventas: boolean = false;
    
  
    openModalventas() {
      this.modalVisibleventas = true;
    }
  
    closeModalventas() {
      this.modalVisibleventas = false;
    };

    modalVisibleproduccion: boolean = false;
    
    openModalproduccion() {
      this.modalVisibleproduccion = true;
    }
  
    closeModalproduccion() {
      this.modalVisibleproduccion = false;
    };

    modalVisiblecronograma: boolean = false;

    openModalcronograma() {
      this.modalVisiblecronograma = true;
    }
  
    closeModalcronograma() {
      this.modalVisiblecronograma = false;
    }
}
