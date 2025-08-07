import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';

// Interfaces
interface MarcacionDetalle {
  item: number;
  planilla: string;
  nroDoc: string;
  apellidosNombres: string;
  area: string;
  cargo: string;
  sede: string;
  fechaIngreso: string;
  fechaCese?: string;
  marcacionesPorFecha: { [fecha: string]: MarcacionDia };
}

interface MarcacionDia {
  fecha: string;
  ingreso?: string;
  salida?: string;
  ingresoBreak?: string;
  salidaBreak?: string;
  horasReales?: number;
  horasEsperadas?: number;
  diferencia?: number;
  estado: 'PUNTUAL' | 'TARDANZA' | 'FALTA' | 'INCOMPLETO';
  observaciones?: string;
}

@Component({
  selector: 'app-reporte-marcaciones-detalle',
  templateUrl: './reporte-marcaciones-detalle.component.html',
  styleUrls: ['./reporte-marcaciones-detalle.component.css']
})
export class ReporteMarcacionesDetalleComponent implements OnInit, OnDestroy {
  
  // Formulario Reactivo
  filterForm!: FormGroup;
  isLoading = false;

  // Datos del reporte
  empleados: MarcacionDetalle[] = [];
  filteredEmpleados: MarcacionDetalle[] = [];
  fechasReporte: string[] = [];

  // Configuración de vista
  viewMode: 'detalle' | 'resumen' = 'detalle';
  showBreakTimes = true;
  
  // Estadísticas
  totalEmpleados = 0;
  marcacionesPuntuales = 0;
  marcacionesTardanza = 0;
  promedioHorasTrabajadas = 0;

  // Estados de carga
  isExporting = false;

  // Configuración del header
  headerConfig: HeaderConfig | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private attendanceMatrixService: AttendanceMatrixReportService,
    private headerConfigService: HeaderConfigService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadHeaderConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();

    this.filterForm = this.fb.group({
      fechaInicio: [this.formatDate(firstDay), Validators.required],
      fechaFin: [this.formatDate(today), Validators.required],
      employeeId: [{ value: '', disabled: true }],
      areaId: [{ value: '', disabled: true }],
      companiaId: [{ value: '', disabled: true }],
      sedeId: [{ value: '', disabled: true }],
      cargoId: [{ value: '', disabled: true }],
      centroCostoId: [{ value: '', disabled: true }]
    });
  }

  private loadHeaderConfig(): void {
    this.headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    this.applyHeaderConfigToForm();

    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: HeaderConfig | null) => {
        this.headerConfig = config;
        this.applyHeaderConfigToForm();
      });
  }

  private applyHeaderConfigToForm(): void {
    if (this.headerConfig && this.filterForm) {
      this.filterForm.patchValue({
        companiaId: this.headerConfig.selectedEmpresa?.companiaId || ''
      }, { emitEvent: false });
    }
  }

  formatDate(fecha: string | Date): string {
    if (!fecha) return '';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toISOString().split('T')[0];
  }

  onSearch(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    console.log('Buscando con:', this.filterForm.value);
    // Lógica para cargar datos del backend
  }

  onClearFilters(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.filterForm.reset({
      fechaInicio: this.formatDate(firstDay),
      fechaFin: this.formatDate(now),
      employeeId: { value: '', disabled: true },
      areaId: { value: '', disabled: true },
      companiaId: { value: this.headerConfig?.selectedEmpresa?.companiaId || '', disabled: true },
      sedeId: { value: '', disabled: true },
      cargoId: { value: '', disabled: true },
      centroCostoId: { value: '', disabled: true }
    });
    this.applyHeaderConfigToForm();
  }

  exportToExcel(): void {
    if (this.isExporting || this.filterForm.invalid) return;

    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      pageNumber: 1,
      pageSize: 10000
    };

    this.isExporting = true;
    this.attendanceMatrixService.downloadExportMarkingsReport(params).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `Reporte_Marcaciones_Detalle_${params.fechaInicio}_${params.fechaFin}.xlsx`);
        this.isExporting = false;
      },
      error: (error) => {
        console.error('Error al descargar reporte:', error);
        this.isExporting = false;
      }
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'detalle' ? 'resumen' : 'detalle';
  }

  toggleBreakTimes(): void {
    this.showBreakTimes = !this.showBreakTimes;
  }

  // --- Métodos de utilidad (a revisar y adaptar) ---

  getMarcacion(empleado: MarcacionDetalle, fecha: string): MarcacionDia | undefined {
    return empleado.marcacionesPorFecha[fecha];
  }

  getEstadoClass(estado: string): string {
    // Lógica de clases...
    return '';
  }

  formatTime(time?: string): string {
    if (!time) return '-';
    return time.slice(0, 5);
  }

  getDayName(fecha: string): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[new Date(fecha).getDay()];
  }

  trackByEmpleado(index: number, item: MarcacionDetalle): any {
    return item.nroDoc;
  }
}
