import { Component, Input, OnInit, Inject } from '@angular/core';
import { IClockTransaction, IClockTransactionResponse2 } from 'src/app/core/models/iclock-transaction.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Employee } from '../empleado/model/employeeDto';
import { EmployeeScheduleAssignmentService, EmployeeHorario } from 'src/app/core/services/employee-schedule-assignment.service';
import { TransactionService } from 'src/app/core/services/transaction.service';

@Component({
  selector: 'app-iclock-transaction',
  templateUrl: './iclock-transaction.component.html',
  styleUrls: ['./iclock-transaction.component.css']
})
export class IclockTransactionComponent implements OnInit {
  @Input() empCode: string = '';
  @Input() empleado: Employee | null = null;
  
  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;
  marcaciones: IClockTransaction[] = [];
  
  // Columnas de la tabla (sin acciones por defecto)
  displayedColumns: string[] = [
    'id',
    'punch_time',
    'punch_state',
    'terminal_alias',
    'area_alias',
    'verify_type',
  ];
  
  mensajeSinMarcaciones: string = '';
  
  // Nuevas propiedades para filtros
  filtroTipo: string = '';
  cargando: boolean = false;
  tieneHorarios: boolean = false;
  horarios: EmployeeHorario[] = [];

  constructor(
    private transactionService: TransactionService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<IclockTransactionComponent>,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.empCode) {
      this.empCode = this.data.empCode;
      this.empleado = this.data.empleado;
      // Calcular fechas del mes actual
      const hoy = new Date();
      this.fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      // Buscar automáticamente
      this.buscarMarcaciones();
    }
  }

  buscarMarcaciones() {
    if (!this.empCode || !this.fechaInicio || !this.fechaFin) {
      this.marcaciones = [];
      this.mensajeSinMarcaciones = 'Seleccione un rango de fechas válido.';
      return;
    }

    this.cargando = true;
    this.mensajeSinMarcaciones = '';
    
    // Formatear fechas a yyyy-MM-dd
    const start = this.formatDate(this.fechaInicio);
    const end = this.formatDate(this.fechaFin);

    // Primero obtener los horarios del empleado
    const nroDoc = this.empleado?.nroDoc || this.data?.empleado?.nroDoc;
    if (!nroDoc) {
      this.tieneHorarios = false;
      this.setDisplayedColumns(false);
      this.cargarMarcacionesSinHorarios(start, end);
      return;
    }
    this.employeeScheduleAssignmentService.getHorariosByNroDocumento(nroDoc).subscribe({
      next: (horarios) => {
        this.horarios = horarios;
        this.tieneHorarios = horarios && horarios.length > 0;
        this.setDisplayedColumns(this.tieneHorarios);
        this.cargarMarcacionesConHorarios(start, end);
      },
      error: (error) => {
        this.tieneHorarios = false;
        this.setDisplayedColumns(false);
        this.cargarMarcacionesSinHorarios(start, end);
      }
    });
  }

  private mapToIClockTransaction(data: IClockTransactionResponse2): IClockTransaction {
    return {
      id: data.id,
      emp_code: data.empCode,
      punch_time: data.punchTime,
      punch_state: data.punchState,
      verify_type: data.verifyType,
      work_code: data.workCode,
      terminal_sn: data.terminalSn,
      terminal_alias: data.terminalAlias,
      area_alias: data.areaAlias,
      longitude: data.longitude,
      latitude: data.latitude,
      gps_location: data.gpsLocation,
      mobile: data.mobile,
      source: data.source,
      purpose: data.purpose,
      crc: data.crc,
      is_attendance: data.isAttendance,
      reserved: null, // O el valor que corresponda
      upload_time: data.uploadTime,
      sync_status: data.syncStatus,
      sync_time: data.syncTime,
      is_mask: data.isMask,
      temperature: data.temperature.toString(),
      emp: data.empId,
      terminal: data.terminalId,
      llegoATiempo: 'sin_horario' // Valor por defecto
    };
  }

  private aplicarLogicaHorarios() {
    if (!this.tieneHorarios || !this.horarios || this.horarios.length === 0) {
      this.marcaciones.forEach(m => m.llegoATiempo = 'sin_horario');
      return;
    }

    this.marcaciones = this.marcaciones.map(m => {
      let llegoATiempo: 'a_tiempo' | 'tarde' | 'sin_horario' = 'sin_horario';
      
      let horarioComparar = this.getHorarioAsignado();

      if (horarioComparar && m.punch_state === '0') { // Solo comparar en entradas
        const horaMarcacion = new Date(m.punch_time);
        let [h, min, s] = horarioComparar.inTime.split(':');
        if (typeof s === 'undefined') s = '00';
        
        const horaEntrada = new Date(horaMarcacion);
        horaEntrada.setHours(Number(h), Number(min), Number(s), 0);
        
        if (!isNaN(horaEntrada.getTime())) {
          if (horaMarcacion <= horaEntrada) {
            llegoATiempo = 'a_tiempo';
          } else {
            llegoATiempo = 'tarde';
          }
        }
      }
      return { ...m, llegoATiempo };
    });
  }

  setDisplayedColumns(tieneHorarios: boolean) {
    this.displayedColumns = [
      'id',
      'punch_time',
      'punch_state',
      'terminal_alias',
      'area_alias',
      'verify_type',
    ];
    if (tieneHorarios) {
      this.displayedColumns.push('llegoATiempo');
    }
    this.displayedColumns.push('horarioAsignado');
  }

  private cargarMarcacionesSinHorarios(start: string, end: string) {
    this.transactionService.getTransactions({
      empCode: this.empCode,
      personalId: this.empleado?.personalId,
      startDate: start,
      endDate: end,
      pageSize: 50,
      page: 1
    }).subscribe({
      next: (resp) => {
        if(resp.exito && resp.data && resp.data.items) {
          let marcacionesFiltradas = resp.data.items.map(this.mapToIClockTransaction);

          if (this.filtroTipo !== '') {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => 
              m.punch_state === this.filtroTipo
            );
          }
          // Todas sin horario
          this.marcaciones = marcacionesFiltradas.map(m => ({ ...m, llegoATiempo: 'sin_horario' }));
        } else {
          this.marcaciones = [];
          this.mensajeSinMarcaciones = resp.mensaje || 'No se encontraron marcaciones.';
        }
        
        this.cargando = false;
        if (this.marcaciones.length === 0 && !this.mensajeSinMarcaciones) {
          this.mensajeSinMarcaciones = 'No se encontraron marcaciones para el rango seleccionado.';
        }
      },
      error: () => {
        this.marcaciones = [];
        this.cargando = false;
        this.mensajeSinMarcaciones = 'Ocurrió un error al obtener las marcaciones.';
      }
    });
  }

  private cargarMarcacionesConHorarios(start: string, end: string) {
    this.transactionService.getTransactions({
      empCode: this.empCode,
      personalId: this.empleado?.personalId,
      startDate: start,
      endDate: end,
      pageSize: 50,
      page: 1
    }).subscribe({
      next: (resp) => {
        if (resp.exito && resp.data && resp.data.items) {
          let marcacionesFiltradas = resp.data.items.map(this.mapToIClockTransaction);

          if (this.filtroTipo !== '') {
            marcacionesFiltradas = marcacionesFiltradas.filter(m => 
              m.punch_state === this.filtroTipo
            );
          }
          this.marcaciones = marcacionesFiltradas;
          this.aplicarLogicaHorarios();
        } else {
          this.marcaciones = [];
          this.mensajeSinMarcaciones = resp.mensaje || 'No se encontraron marcaciones.';
        }
        this.cargando = false;
        if (this.marcaciones.length === 0 && !this.mensajeSinMarcaciones) {
          this.mensajeSinMarcaciones = 'No se encontraron marcaciones para el rango seleccionado.';
        }
      },
      error: () => {
        this.marcaciones = [];
        this.cargando = false;
        this.mensajeSinMarcaciones = 'Ocurrió un error al obtener las marcaciones.';
      }
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Métodos de formateo y utilidades
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearHora(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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
    // Establecer fechas del mes actual
    const hoy = new Date();
    this.fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
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
  verDetalles(marcacion: IClockTransaction): void {
    // Implementar modal de detalles si es necesario
    console.log('Ver detalles:', marcacion);
  }

  // Método para cerrar el diálogo
  cerrar(): void {
    this.dialogRef.close();
  }

  // Obtener el horario asignado al empleado
  getHorarioAsignado(): EmployeeHorario | null {
    if (!this.horarios || this.horarios.length === 0) {
      return null;
    }
    
    // Si el primer horario es 00:00 y hay más de uno, tomar el segundo
    if ((this.horarios[0].inTime === '00:00' || this.horarios[0].inTime === '00:00:00') && this.horarios.length > 1) {
      return this.horarios[1];
    }
    
    return this.horarios[0];
  }
}