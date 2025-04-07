import { Component } from '@angular/core';

@Component({
    selector: 'app-lectura-codebar',
    templateUrl: './lectura-codebar.component.html',
    styleUrls: ['./lectura-codebar.component.css'],
    standalone: false
})
export class LecturaCodebarComponent {
  public page = 1;        // Página actual
  public pageSize = 5;   // Número de elementos por página
  
  // Arreglo para almacenar los productos escaneados
  scanResults: any[] = [];
  
  // Variables para controlar el estado de los modales
  isModalOpen = false;
  isModalOpenResumen = false;
  isModalOpenAgregar = false;

  // Lista de clientes, pedidos y almacenes
  clientes = ['QUALAMEX, S.A. DE C.V.', 'CLIENTE B', 'CLIENTE C', 'CLIENTE D'];
  pedidos = ['100005653', '100005658', '100005463', '100005658'];
  almacenes = ['AMP-CH', 'PT-LOG', 'AMP-CH3', 'AMATL-CH'];

  // Variables para almacenar las opciones seleccionadas
  selectedClient: string = '';
  selectedPedido: string = '';
  selectedAlmacen: string = '';

  // Variable para almacenar el código ingresado
  codigo: string = '';
  searchClient: string = '';
  filteredClients: string[] = [];
  // Definir los productos estáticos
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

  filterClients() {
    if (this.searchClient) {
      this.filteredClients = this.clientes.filter(cliente =>
        cliente.toLowerCase().includes(this.searchClient.toLowerCase())
      );
    } else {
      this.filteredClients = [];
    }
  }

  selectClient(cliente: string) {
    this.selectedClient = cliente;
    this.filteredClients = []; // Limpiar la lista de resultados después de seleccionar
  }

  // Función para cerrar el modal de Resumen
  closeModalResumen() {
    this.isModalOpenResumen = false;
  }

  // Función para cerrar el modal de Agregar
  closeModalAgregar() {
    this.isModalOpenAgregar = false;
  }

  // Función para agregar un código escaneado
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

  // Función para abrir el modal
  pistolear() {
    if (this.selectedClient && this.selectedPedido && this.selectedAlmacen) {
      this.isModalOpen = true;  // Abre el modal si todo está correcto
    } else {
      console.log("Debe seleccionar Cliente, Pedido y Almacen");
    }
  }

  // Función para cerrar el modal
  closeModal() {
    this.isModalOpen = false;
  }

  // Función para realizar la búsqueda del código
  searchCode() {
    if (this.codigo.trim()) {
      console.log(`Buscando código: ${this.codigo}`);
      // Aquí puedes agregar la lógica para buscar el código ingresado
      this.closeModal(); // Cerrar el modal después de la búsqueda
    }
  }
  p: number = 1;

  deleteRow(element: any) {
    const index = this.scanResults.indexOf(element);
    if (index > -1) {
      this.scanResults.splice(index, 1); // Eliminar la fila
    }
  }
}

