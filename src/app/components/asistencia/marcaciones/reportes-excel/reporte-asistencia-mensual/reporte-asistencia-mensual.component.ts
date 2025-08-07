import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';

// Interfaces (pueden moverse a sus propios archivos de modelos si se reutilizan)
interface EmpleadoAsistenciaMensual {
  item: number;
  planilla: string;
  nroDoc: string;
  apellidosNombres: string;
  area: string;
  cargo: string;
  sede: string;
  fechaIngreso: string;
  fechaCese?: string;
  asistenciaDias: { [fecha: string]: number | string };
}

@Component({
  selector: 'app-reporte-asistencia-mensual',
  templateUrl: './reporte-asistencia-mensual.component.html',
  styleUrls: ['./reporte-asistencia-mensual.component.css']
})
export class ReporteAsistenciaMensualComponent implements OnInit, OnDestroy {
  
  // Formulario Reactivo para los filtros
  filterForm!: FormGroup;
  isLoading = false;

  // Datos del reporte
  empleados: EmpleadoAsistenciaMensual[] = [];
  filteredEmpleados: EmpleadoAsistenciaMensual[] = [];
  
  // Configuración de vista
  showWeekends = false;
  showSummary = true;
  
  // Información de días del mes
  diasDelMes: string[] = [];
  
  // Estadísticas generales
  totalEmpleados = 0;
  porcentajeAsistenciaGeneral = 0;
  totalDiasTrabajados = 0;
  totalFaltas = 0;

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
    // Aquí iría la lógica para cargar datos iniciales si es necesario
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1); // Primer día del mes
    const today = new Date(); // Fecha actual (hoy)

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
    return fecha instanceof Date ? fecha.toISOString().split('T')[0] : fecha;
  }

  onSearch(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    console.log('Buscando con:', this.filterForm.value);
    // Lógica para cargar datos del backend con los filtros
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

  // --- Métodos de la tabla (simplificados o a implementar) ---

  toggleWeekends(): void {
    this.showWeekends = !this.showWeekends;
  }

  toggleSummary(): void {
    this.showSummary = !this.showSummary;
  }

  exportToExcel(): void {
    if (this.isExporting || this.filterForm.invalid) return;

    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      pageNumber: 1,
      pageSize: 10000 // O un número grande para exportar todo
    };

    this.isExporting = true;
    this.attendanceMatrixService.downloadExportWeeklyAttendanceReport(params).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `Asistencia_Mensual_${params.fechaInicio}_${params.fechaFin}.xlsx`);
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

  // --- Métodos de utilidad (a revisar y adaptar) ---

  get visibleDias(): string[] {
    // Lógica para generar días basada en fechaInicio y fechaFin del form
    return [];
  }

  getCellValue(empleado: EmpleadoAsistenciaMensual, fecha: string): string {
    return empleado.asistenciaDias[fecha]?.toString() || '-';
  }

  getCellClass(empleado: EmpleadoAsistenciaMensual, fecha: string): string {
    // Lógica de clases...
    return '';
  }

  getResumenEmpleado(empleado: EmpleadoAsistenciaMensual): any {
    // Lógica de resumen...
    return {};
  }

  getDayName(fecha: string): string {
    const dias = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return dias[new Date(fecha).getDay()];
  }

  trackByEmpleado(index: number, item: EmpleadoAsistenciaMensual): any {
    return item.nroDoc;
  }
}
