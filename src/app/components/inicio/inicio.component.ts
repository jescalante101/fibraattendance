import { query } from '@angular/animations';
import { Component } from '@angular/core';
document.addEventListener('DOMContentLoaded',function(){
  resaltarEnlace();
})
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

function resaltarEnlace() {
  // const contenedor = document.querySelector('.contenido-pedido');
  // if (!contenedor) {
  //   console.error('No se encontró el contenedor .contenido-pedido');
  //   return;
  // }

  // const sections = contenedor.querySelectorAll('section');
  // const navLinks = document.querySelectorAll('.pedidocliente a');

  // contenedor.addEventListener('scroll', () => {
  //   let activo = '';
  //   let minDistancia = Infinity;

  //   sections.forEach(section => {
  //     const rect = section.getBoundingClientRect();
  //     const contRect = contenedor.getBoundingClientRect();

  //     const distancia = Math.abs(rect.top - contRect.top); // qué tan cerca está del top del contenedor

  //     if (distancia < minDistancia) {
  //       minDistancia = distancia;
  //       activo = section.id;
  //     }
  //   });

  //   navLinks.forEach(link => {
  //     link.classList.remove('active');
  //     if (link.getAttribute('href') === '#' + activo) {
  //       link.classList.add('active');
  //     }
  //   });
  // });
}

