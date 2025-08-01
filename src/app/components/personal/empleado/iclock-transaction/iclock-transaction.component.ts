import { Component, Input, OnInit, Inject, Optional } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Employee } from '../empleado/model/employeeDto';
import { TransactionService } from 'src/app/core/services/transaction.service';
import { TransactionResponse, Datum, TransactionFilter } from 'src/app/core/models/transaction-response.model';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-iclock-transaction',
  templateUrl: './iclock-transaction.component.html',
  styleUrls: ['./iclock-transaction.component.css']
})
export class IclockTransactionComponent implements OnInit {
  @Input() componentData: any;

  empCode: string = '';
  empleado: Employee | null = null;
  
  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;
  marcaciones: Datum[] = [];
  
  // Columnas de la tabla 
  displayedColumns: string[] = [
    'nroDoc',
    'punchTime',
    'nombreCompleto',
    'areaDescripcion',
    'terminalAlias',
    'horarioAlias',
    'diaSemanaTexto'
  ];
  
  mensajeSinMarcaciones: string = '';


  
  // Nuevas propiedades para filtros
  filtroTipo: string = '';
  cargando: boolean = false;
  tieneHorarios: boolean = false;

  constructor(
    @Optional() public dialogRef: MatDialogRef<IclockTransactionComponent>,
    private transactionService: TransactionService,
   @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit(): void {
    console.log('Datos recibidos:', this.data);
    if (this.data && this.data.empleado) {
      this.empCode = this.data.empCode || this.data.empleado.nroDoc;
      this.empleado = this.data.empleado;
      // Calcular fechas: inicio de mes y fecha actual
      const hoy = new Date();
      this.fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.fechaFin = hoy;
      // Mostrar loading desde el inicio
      this.cargando = true;
      // Buscar automáticamente
      this.buscarMarcaciones();
      if (typeof window !== 'undefined') {
            setTimeout(() => {
              initFlowbite();
              //; Forzar reinicialización de popovers después de un tiempo
              setTimeout(() => {
                initFlowbite();
              }, 500)
            }, 100);
          }
      
    }
  }

  buscarMarcaciones() {
    if (!this.fechaInicio || !this.fechaFin) {
      this.marcaciones = [];
      this.mensajeSinMarcaciones = 'Seleccione un rango de fechas válido.';
      return;
    }

    this.cargando = true;
    this.mensajeSinMarcaciones = '';
    
    // Formatear fechas a yyyy-MM-dd
    const start = this.formatDate(this.fechaInicio);
    const end = this.formatDate(this.fechaFin);

    // Crear filtros de transacción - solo usar personal_id
    const filter: TransactionFilter = {
      startDate: start,
      endDate: end,
      page: 1,
      pageSize: 30,
      empCode: this.empleado?.personalId || this.empleado?.nroDoc || this.empCode
    };

    // Ejecutar búsqueda directamente
    this.ejecutarBusqueda(filter);
  }


  private ejecutarBusqueda(filter: TransactionFilter) {
    this.transactionService.getTransactions(filter).subscribe({
      next: (response) => {
        this.procesarRespuesta(response);
      },
      error: () => {
        this.marcaciones = [];
        this.cargando = false;
        this.mensajeSinMarcaciones = 'Ocurrió un error al obtener las marcaciones.';
      }
    });
  }

  private procesarRespuesta(response: TransactionResponse) {
    if (response && response.data && response.data.length > 0) {
      this.marcaciones = response.data;
      this.mensajeSinMarcaciones = '';
    } else {
      this.marcaciones = [];
      this.mensajeSinMarcaciones = 'No se encontraron marcaciones para el rango seleccionado.';
    }
    this.cargando = false;
  }


  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Métodos de formateo y utilidades
  formatearFecha(fecha: Date): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatearHora(fecha: Date): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtener días entre fechas
  getDiasRango(): number {
    if (!this.fechaInicio || !this.fechaFin) return 0;
    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    const diferencia = fin.getTime() - inicio.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24)) + 1;
  }

  // Obtener icono según tipo de verificación
  getVerifyIcon(type: string): string {
    switch(type) {
      case '1': return 'fingerprint';
      case '2': return 'face';
      case '3': return 'badge';
      case '4': return 'key';
      default: return 'verified_user';
    }
  }

  // Obtener texto según tipo de verificación
  getVerifyText(type: string): string {
    switch(type) {
      case '1': return 'Huella';
      case '2': return 'Rostro';
      case '3': return 'Tarjeta';
      case '4': return 'PIN';
      default: return 'Desconocido';
    }
  }

  // Obtener clase CSS según temperatura
  getTemperatureClass(temp: number): string {
    if (!temp) return '';
    if (temp >= 37.5) return 'text-red-600 font-medium';
    if (temp >= 37.0) return 'text-orange-600 font-medium';
    return 'text-green-600';
  }

  // Obtener mensaje de ayuda según el estado
  getMensajeAyuda(): string {
    if (!this.fechaInicio || !this.fechaFin) {
      return 'Selecciona un rango de fechas para buscar marcaciones.';
    }
    if (this.filtroTipo !== '') {
      return 'Intenta quitar el filtro de tipo de marcación o cambiar el rango de fechas.';
    }
    return 'Intenta cambiar el rango de fechas o verificar que el empleado tenga marcaciones registradas.';
  }

  // Limpiar filtros
  limpiarFiltros(): void {
    this.filtroTipo = '';
    // Establecer fechas: inicio de mes y fecha actual
    const hoy = new Date();
    this.fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaFin = hoy;
    this.buscarMarcaciones();
  }

  // Reiniciar búsqueda
  reiniciarBusqueda(): void {
    this.buscarMarcaciones();
  }

  // Exportar a Excel (opcional)
  exportarExcel(): void {
    // Implementar lógica de exportación si es necesario
    console.log('Exportando a Excel...', this.marcaciones);
  }

  // Exportar a PDF (opcional)
  exportarPDF(): void {
    // Implementar lógica de exportación si es necesario
    console.log('Exportando a PDF...', this.marcaciones);
  }

  // Ver detalles de marcación (opcional)
  verDetalles(marcacion: Datum): void {
    // Implementar modal de detalles si es necesario
    console.log('Ver detalles:', marcacion);
  }

  // Método para cerrar el diálogo
  cerrar(): void {
    this.dialogRef.close();
  }

  // TrackBy function para mejorar rendimiento de ngFor
  trackByFn(index: number, item: Datum): string {
    return `${item.nroDoc}-${item.punchTime}`;
  }

  // Obtener el horario asignado al empleado
  
}