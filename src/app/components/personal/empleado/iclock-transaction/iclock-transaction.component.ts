import { Component, Input, OnInit, Inject, Optional } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Employee } from '../empleado/model/employeeDto';
import { TransactionService } from 'src/app/core/services/transaction.service';
import { TransactionResponse, TransactionComplete, TransactionFilter } from 'src/app/core/models/transaction-response.model';
import { TransactionResumenResponse } from 'src/app/core/models/transaction-resume-response.model';
import { initFlowbite } from 'flowbite';
import { HeaderConfig, HeaderConfigService } from '../../../../core/services/header-config.service';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  // Fechas para el datepicker (formato string)
  fechaInicioStr: string = '';
  fechaFinStr: string = '';
  marcaciones: TransactionComplete[] = [];
  
  // Columnas de la tabla (actualizadas para TransactionComplete)
  displayedColumns: string[] = [
    'empleado',
    'fecha',
    'horario',
    'marcaciones',
    'estado',
    'tiempo',
    'observaciones'
  ];
  
  mensajeSinMarcaciones: string = '';


  
  // Nuevas propiedades para filtros
  filtroTipo: string = '';
  cargando: boolean = false;
  tieneHorarios: boolean = false;
  // Configuración del header
  headerConfig: HeaderConfig | null = null;

  constructor(
    @Optional() public dialogRef: MatDialogRef<IclockTransactionComponent>,
    private transactionService: TransactionService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private HeaderConfigService: HeaderConfigService
  ) {}

  ngOnInit(): void {
    console.log('Datos recibidos:', this.data);
    // Cargar configuración del header
    this.HeaderConfigService.getHeaderConfig$().subscribe(config => {
      this.headerConfig = config;
      console.log('Configuración del header:', this.headerConfig);
    });


    if (this.data && this.data.empleado) {
      this.empCode = this.data.empCode || this.data.empleado.nroDoc;
      this.empleado = this.data.empleado;
      // Calcular fechas: inicio de mes y fecha actual
      //fecha de acuerdo a periodo actual
      const hoy=this.headerConfig?.selectedPeriodo?.fechaFin ? new Date(this.headerConfig.selectedPeriodo.fechaFin) : new Date();
      this.fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      this.fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      
      // Convertir a strings para el datepicker
      this.fechaInicioStr = this.formatDate(this.fechaInicio);
      this.fechaFinStr = this.formatDate(this.fechaFin);
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
    console.log('=== Iniciando búsqueda de marcaciones ===');
    console.log('fechaInicio:', this.fechaInicio);
    console.log('fechaFin:', this.fechaFin);
    console.log('fechaInicioStr:', this.fechaInicioStr);
    console.log('fechaFinStr:', this.fechaFinStr);
    
    if (!this.fechaInicio || !this.fechaFin) {
      this.marcaciones = [];
      this.mensajeSinMarcaciones = 'Seleccione un rango de fechas válido.';
      console.log('Búsqueda cancelada: fechas no válidas');
      return;
    }

    // Validar que fecha inicio no sea mayor que fecha fin
    if (this.fechaInicio > this.fechaFin) {
      this.marcaciones = [];
      this.mensajeSinMarcaciones = 'La fecha de inicio no puede ser mayor que la fecha fin.';
      console.log('Búsqueda cancelada: rango de fechas inválido');
      return;
    }

    this.cargando = true;
    this.mensajeSinMarcaciones = '';
    
    // Formatear fechas a yyyy-MM-dd
    const start = this.formatDate(this.fechaInicio);
    const end = this.formatDate(this.fechaFin);
    console.log('Fechas formateadas:', { start, end });

    // Crear filtros de transacción - solo usar personal_id
    const filter: TransactionFilter = {
      startDate: start,
      endDate: end,
      page: 1,
      pageSize: 50,
      empCode: this.empleado?.personalId || this.empleado?.nroDoc || this.empCode
    };
    console.log('Filtros de búsqueda:', filter);

    // Ejecutar búsqueda directamente
    this.ejecutarBusqueda(filter);
  }


  private ejecutarBusqueda(filter: TransactionFilter) {
    this.transactionService.getCompleteTransaction(filter).subscribe({
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

  private procesarRespuesta(response: TransactionResponse<TransactionComplete>) {
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
    
    // Actualizar strings para el datepicker
    this.fechaInicioStr = this.formatDate(this.fechaInicio);
    this.fechaFinStr = this.formatDate(this.fechaFin);
    
    this.buscarMarcaciones();
  }

  // Reiniciar búsqueda
  reiniciarBusqueda(): void {
    this.buscarMarcaciones();
  }

  // Exportar a Excel 
  exportarExcel(): void {
    if (!this.fechaInicio || !this.fechaFin || !this.empleado) {
      console.error('Datos insuficientes para exportar');
      return;
    }

    console.log('Exportando a Excel...');
    this.cargando = true;

    const filter: TransactionFilter = {
      startDate: this.formatDate(this.fechaInicio),
      endDate: this.formatDate(this.fechaFin),
      empCode: this.empleado?.personalId || this.empleado?.nroDoc || this.empCode
    };

    // Usar getCompleteTransactionNoPagination para obtener todos los datos
    this.transactionService.getCompleteTransactionNoPagination(filter).subscribe({
      next: (response) => {
        this.generarExcel(response.data);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al exportar Excel:', error);
        this.cargando = false;
      }
    });
  }

  private generarExcel(datos: TransactionComplete[]): void {
    if (!datos || datos.length === 0) {
      console.warn('No hay datos para exportar a Excel');
      return;
    }

    // Preparar datos para Excel
    const excelData = datos.map(item => ({
      'Documento': item.nro_Doc,
      'Empleado': item.nombreCompleto,
      'Área': item.areaDescripcion,
      'Fecha': this.formatearFecha(item.fechaMarcacion),
      'Día': item.diaSemanaTexto,
      'Horario': item.horarioAlias || 'Sin horario',
      'Horario Entrada': item.horarioEntrada,
      'Horario Salida': item.horarioSalida,
      'Hora Entrada': item.horaEntrada || 'No marcó',
      'Hora Salida': item.horaSalida || 'No marcó',
      'Terminal Entrada': item.terminalEntrada || '-',
      'Terminal Salida': item.terminalSalida || '-',
      'Total Marcaciones': `${item.totalMarcacionesDia}/${item.marcacionesEsperadas}`,
      'Estado Día': item.estadoDia,
      'Estado Marcaciones': item.estadoMarcaciones,
      'Horas Trabajadas': item.horasTrabajadas,
      'Minutos Tardanza': item.minutosTardanza,
      'Minutos Salida Temprana': item.minutosSalidaTemprana,
      'Es Puntual': item.esPuntual ? 'Sí' : 'No',
      'Tiene Tardanza': item.tieneTardanza ? 'Sí' : 'No',
      'Asistencia Completa': item.asistenciaCompleta ? 'Sí' : 'No',
      'Marcaciones Completas': item.marcacionesCompletas ? 'Sí' : 'No',
      'Detalle Marcaciones': item.detalleMarcaciones || ''
    }));

    // Crear workbook y worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    
    // Ajustar ancho de columnas
    const colWidths = [
      {wch: 12}, // Documento
      {wch: 25}, // Empleado
      {wch: 20}, // Área
      {wch: 12}, // Fecha
      {wch: 10}, // Día
      {wch: 15}, // Horario
      {wch: 12}, // Horario Entrada
      {wch: 12}, // Horario Salida
      {wch: 12}, // Hora Entrada
      {wch: 12}, // Hora Salida
      {wch: 15}, // Terminal Entrada
      {wch: 15}, // Terminal Salida
      {wch: 12}, // Total Marcaciones
      {wch: 15}, // Estado Día
      {wch: 20}, // Estado Marcaciones
      {wch: 12}, // Horas Trabajadas
      {wch: 12}, // Minutos Tardanza
      {wch: 15}, // Minutos Salida Temprana
      {wch: 10}, // Es Puntual
      {wch: 12}, // Tiene Tardanza
      {wch: 15}, // Asistencia Completa
      {wch: 15}, // Marcaciones Completas
      {wch: 30}  // Detalle Marcaciones
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Marcaciones');
    
    // Generar nombre del archivo
    const nombreEmpleado = this.empleado?.nombres?.replace(/\s+/g, '_') || 'empleado';
    const fechaInicioStr = this.formatDate(this.fechaInicio!).replace(/-/g, '');
    const fechaFinStr = this.formatDate(this.fechaFin!).replace(/-/g, '');
    const nombreArchivo = `Marcaciones_${nombreEmpleado}_${fechaInicioStr}_${fechaFinStr}.xlsx`;
    
    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
    console.log(`Excel generado: ${nombreArchivo}`);
  }

  // Exportar a PDF usando getTransactionResumen
  exportarPDF(): void {
    if (!this.fechaInicio || !this.fechaFin || !this.empleado) {
      console.error('Datos insuficientes para exportar PDF');
      return;
    }

    console.log('Exportando a PDF...');
    this.cargando = true;

    const empCode = this.empleado?.personalId || this.empleado?.nroDoc || this.empCode;
    const startDate = this.formatDate(this.fechaInicio);
    const endDate = this.formatDate(this.fechaFin);

    // Obtener resumen usando getTransactionResumen
    this.transactionService.getTransactionResumen(empCode, startDate, endDate).subscribe({
      next: (resumenResponse) => {
        this.generarPDF(resumenResponse);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al exportar PDF:', error);
        this.cargando = false;
      }
    });
  }

  private generarPDF(resumenData: TransactionResumenResponse): void {
    if (!resumenData || !resumenData.resumen) {
      console.warn('No hay datos de resumen para exportar a PDF');
      return;
    }

    const doc = new jsPDF();
    
    // Configuración del documento
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Título del reporte
    doc.setFontSize(18);
    doc.setFont('undefined', 'bold');
    doc.text('REPORTE DE ASISTENCIA', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Información del empleado
    doc.setFontSize(12);
    doc.setFont('undefined', 'normal');
    doc.text(`Empleado: ${resumenData.empleado}`, 20, yPosition);
    yPosition += 8;
    
    // Período
    const periodoInicio = new Date(resumenData.periodo.fechaInicio).toLocaleDateString('es-ES');
    const periodoFin = new Date(resumenData.periodo.fechaFin).toLocaleDateString('es-ES');
    doc.text(`Período: ${periodoInicio} - ${periodoFin}`, 20, yPosition);
    yPosition += 8;

    // Fecha de generación
    const fechaGeneracion = new Date(resumenData.generadoEn).toLocaleDateString('es-ES');
    doc.text(`Generado: ${fechaGeneracion}`, 20, yPosition);
    yPosition += 15;

    // Sección de resumen
    doc.setFontSize(14);
    doc.setFont('undefined', 'bold');
    doc.text('RESUMEN DE ASISTENCIA', 20, yPosition);
    yPosition += 10;

    // Tabla de resumen
    const resumenTabla = [
      ['Total de días', resumenData.resumen.totalDias.toString()],
      ['Días puntuales', resumenData.resumen.diasPuntuales.toString()],
      ['Días con tardanza', resumenData.resumen.diasConTardanza.toString()],
      ['Días sin entrada', resumenData.resumen.diasSinEntrada.toString()],
      ['Días sin salida', resumenData.resumen.diasSinSalida.toString()],
      ['Días asistencia completa', resumenData.resumen.diasAsistenciaCompleta.toString()],
      ['Promedio minutos tardanza', resumenData.resumen.promedioMinutosTardanza.toFixed(1)],
      ['Promedio horas trabajadas', resumenData.resumen.promedioHorasTrabajadas.toFixed(1)],
      ['Porcentaje puntualidad', `${resumenData.resumen.porcentajePuntualidad.toFixed(1)}%`]
    ];

    autoTable(doc, {
      head: [['Concepto', 'Valor']],
      body: resumenTabla,
      startY: yPosition,
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Si hay marcaciones disponibles, agregar tabla detallada
    if (this.marcaciones && this.marcaciones.length > 0) {
      // Solo mostrar un resumen de las primeras marcaciones para no sobrecargar el PDF
      doc.setFontSize(14);
      doc.setFont('undefined', 'bold');
      doc.text('DETALLE DE MARCACIONES (Muestra)', 20, yPosition);
      yPosition += 10;

      const marcacionesParaPDF = this.marcaciones.slice(0, 10); // Solo las primeras 10
      const marcacionesData = marcacionesParaPDF.map(item => [
        this.formatearFecha(item.fechaMarcacion),
        item.diaSemanaTexto,
        item.horaEntrada || 'No marcó',
        item.horaSalida || 'No marcó',
        item.horasTrabajadas.toString() + 'h',
        item.estadoDia
      ]);

      autoTable(doc, {
        head: [['Fecha', 'Día', 'Entrada', 'Salida', 'Horas', 'Estado']],
        body: marcacionesData,
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: {
          fontSize: 9,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [52, 152, 219],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        }
      });

      if (this.marcaciones.length > 10) {
        yPosition = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont('undefined', 'italic');
        doc.text(`Nota: Se muestran solo las primeras 10 marcaciones de un total de ${this.marcaciones.length}`, 20, yPosition);
      }
    }

    // Footer con información adicional
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont('undefined', 'normal');
    doc.text('FIBRAFIL - Sistema de Control de Asistencia', pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Generar nombre del archivo
    const nombreEmpleado = this.empleado?.nombres?.replace(/\s+/g, '_') || 'empleado';
    const fechaInicioStr = this.formatDate(this.fechaInicio!).replace(/-/g, '');
    const fechaFinStr = this.formatDate(this.fechaFin!).replace(/-/g, '');
    const nombreArchivo = `Resumen_Asistencia_${nombreEmpleado}_${fechaInicioStr}_${fechaFinStr}.pdf`;
    
    // Descargar PDF
    doc.save(nombreArchivo);
    console.log(`PDF generado: ${nombreArchivo}`);
  }

  // Ver detalles de marcación (opcional)
  verDetalles(marcacion: TransactionComplete): void {
    // Implementar modal de detalles si es necesario
    console.log('Ver detalles:', marcacion);
  }

  // Método para cerrar el diálogo
  cerrar(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // TrackBy function para mejorar rendimiento de ngFor
  trackByFn(index: number, item: TransactionComplete): string {
    return `${item.nro_Doc || 'unknown'}-${item.fechaMarcacion || index}`;
  }

  // Métodos para manejar cambios de fecha
  onFechaInicioChange(fechaStr: string): void {
    console.log('Fecha inicio cambió:', fechaStr);
    if (fechaStr && fechaStr !== this.fechaInicioStr) {
      this.fechaInicioStr = fechaStr;
      this.fechaInicio = new Date(fechaStr + 'T00:00:00'); // Asegurar zona horaria local
      console.log('Nueva fecha inicio:', this.fechaInicio);
      this.buscarMarcaciones();
    }
  }

  onFechaFinChange(fechaStr: string): void {
    console.log('Fecha fin cambió:', fechaStr);
    if (fechaStr && fechaStr !== this.fechaFinStr) {
      this.fechaFinStr = fechaStr;
      this.fechaFin = new Date(fechaStr + 'T23:59:59'); // Final del día
      console.log('Nueva fecha fin:', this.fechaFin);
      this.buscarMarcaciones();
    }
  }

  // Métodos para manejar eventos change (simplificados)
  onFechaInicioChangeEvent(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value) {
      this.onFechaInicioChange(target.value);
    }
  }

  onFechaFinChangeEvent(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value) {
      this.onFechaFinChange(target.value);
    }
  }

  // Método para validar que fecha inicio no sea mayor que fecha fin
  validarFechas(): boolean {
    if (this.fechaInicio && this.fechaFin) {
      return this.fechaInicio <= this.fechaFin;
    }
    return true;
  }

  // Obtener el horario asignado al empleado
  
}