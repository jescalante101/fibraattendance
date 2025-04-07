import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-inv-lectura',
  templateUrl: './inv-lectura.component.html',
  styleUrls: ['./inv-lectura.component.css']
})
export class InvLecturaComponent {
  @Input() isModalOpen: boolean = false;  // Controla si el modal está abierto
  @Input() selectedClient: string = '';   // El cliente seleccionado
  @Output() closeModalEvent = new EventEmitter<void>(); 
  codigo: string = '';


  scanResults: any[] = [];



  productosEstaticos:any = {
    '12345': {
      itemCode: '12345',
      description: 'Producto A',
      quantity: 10,
      grossWeight: 5,
      cantidad: 4,

      netWeight: 4,
      details: 'Detalles del Producto A'
    },
    '67890': {
      itemCode: '67890',
      description: 'Producto B',
      quantity: 20,
      grossWeight: 15,
      cantidad: 4,
      netWeight: 12,
      details: 'Detalles del Producto B'
    }
    // Agrega más productos estáticos aquí
  };
  addScan() {
    if (this.codigo.trim()) {
      // Verificar si el código está en los productos estáticos
      const producto = this.productosEstaticos[this.codigo.trim()];
  
      if (producto) {
        this.scanResults.push(producto); // Agregar el producto encontrado a la lista de resultados
        this.codigo = '';  // Limpiar el campo del código
        this.closeModal(); // Cerrar el modal después de agregar
      } else {
        console.log('Código no válido o no encontrado');
      }
    }
  }


  closeModal() {
    this.closeModalEvent.emit();  // Emite el evento de cerrar
  }
}
