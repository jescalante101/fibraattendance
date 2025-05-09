import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

interface Dispositivo {
  'Numero de Serie': string;
  Nombre: string;
  Area: string;
  IP: string;
  Estado: string;
  'Ultima Actividad': string;
  Usuario: string;
  Huella: string;
  Rostro: string;
  Palma: string;
  Marcaciones: string;
  Cmd: string;
  seleccionado?: boolean;
}

@Component({
  selector: 'app-dispositivo',
  templateUrl: './dispositivo.component.html',
  styleUrls: ['./dispositivo.component.css']
})
export class DispositivoComponent implements OnInit {

 datosOriginales: Dispositivo[] = [ // Reemplaza esto con tus datos reales
     { 'Numero de Serie': 'AEH2182760005', Nombre: 'LUR-ING', Area: 'LURIN', IP: '192.168.1.205', Estado: '✅', 'Ultima Actividad': '2025-05-08 16:32:56', Usuario: '777', Huella: '1472', Rostro: '8', Palma: '0', Marcaciones: '69689', Cmd: '0' },
    { 'Numero de Serie': 'XYZ9876543210', Nombre: 'OFICINA-1', Area: 'CENTRAL', IP: '192.168.1.100', Estado: '✅', 'Ultima Actividad': '2025-05-09 08:00:00', Usuario: '123', Huella: '5678', Rostro: '2', Palma: '1', Marcaciones: '12345', Cmd: '1' },
    { 'Numero de Serie': 'ABC1234567890', Nombre: 'ALMACEN-A', Area: 'NORTE', IP: '192.168.1.150', Estado: '❌', 'Ultima Actividad': '2025-05-07 19:45:30', Usuario: '456', Huella: '9012', Rostro: '5', Palma: '0', Marcaciones: '67890', Cmd: '0' },
    // ... más datos ...
  ];
  
  datosFiltrados: Dispositivo[] = [];
  filtros: string[] = ['', '', '', '', '', '', '', '', '', '', '', '']; // Un filtro por columna
  elementosSeleccionados: string[] = [];
  filtroFechaInicio: string | null = null;
  filtroFechaFin: string | null = null;

  

  ngOnInit(): void {
    this.datosFiltrados = [...this.datosOriginales]; // Inicializa con todos los datos
  }

  filtrarTabla(event: any): void {
    const filtroTexto = event.target.value.toLowerCase();
    const columnIndex = parseInt(event.target.dataset['column']);
    this.filtros[columnIndex] = filtroTexto;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.datosFiltrados = this.datosOriginales.filter(item => {
      return this.filtros.every((filtro, index) => {
        if (!filtro) {
          return true; // Si el filtro está vacío, la fila siempre pasa
        }
        const valorCelda = Object.values(item)[index]?.toString().toLowerCase() || '';
        return valorCelda.includes(filtro);
      });
    });
    this.actualizarSeleccionadosLista(); // Mantener la lista de seleccionados al filtrar
  }
  filtrarPorFecha(): void {
    this.aplicarFiltros();
  }
filtrarPorRangoFecha(fechaUltimaActividad: string): boolean {
    if (!this.filtroFechaInicio && !this.filtroFechaFin) {
      return true; // No hay filtros de fecha, todas las fechas pasan
    }

    const fechaActividad = new Date(fechaUltimaActividad);
    const fechaInicio = this.filtroFechaInicio ? new Date(this.filtroFechaInicio) : null;
    const fechaFin = this.filtroFechaFin ? new Date(this.filtroFechaFin) : null;

    if (fechaInicio && fechaFin) {
      return fechaActividad >= fechaInicio && fechaActividad <= fechaFin;
    } else if (fechaInicio) {
      return fechaActividad >= fechaInicio;
    } else if (fechaFin) {
      return fechaActividad <= fechaFin;
    }

    return true; // Caso por defecto si algo sale mal con los filtros de fecha
  }

  seleccionarTodos(): void {
    this.datosFiltrados.forEach(item => item.seleccionado = true);
    this.actualizarSeleccionadosLista();
  }

  deseleccionarTodos(): void {
    this.datosFiltrados.forEach(item => item.seleccionado = false);
    this.actualizarSeleccionadosLista();
  }

  actualizarSeleccionados(): void {
    this.actualizarSeleccionadosLista();
  }

  actualizarSeleccionadosLista(): void {
    this.elementosSeleccionados = this.datosFiltrados
      .filter(item => item.seleccionado)
      .map(item => item['Numero de Serie']);
  }

}
