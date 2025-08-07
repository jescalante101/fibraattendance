import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';

// Interfaces (pueden moverse a sus propios archivos de modelos)
interface EmpleadoCentroCosto {
  item: number;
  planilla: string;
  nroDoc: string;
  apellidosNombres: string;
  area: string;
  cargo: string;
  sede: string;
  fechaIngreso: string;
  fechaCese?: string;
  datosSemana: { [fecha: string]: number | string };
}

interface SemanaInfo {
  fechaInicio: string;
  fechaFin: string;
  dias: string[];
}

@Component({
  selector: 'app-reporte-centro-costos',
  templateUrl: './reporte-centro-costos.component.html',
  styleUrls: ['./reporte-centro-costos.component.css']
})
export class ReporteCentroCostosComponent implements OnInit, OnDestroy {
  
  // Formulario Reactivo
  filterForm!: FormGroup;
  isLoading = false;

  // Datos del reporte
  empleados: EmpleadoCentroCosto[] = [];
  filteredEmpleados: EmpleadoCentroCosto[] = [];
  semanasInfo: SemanaInfo[] = [];

  // Configuración de vista
  viewMode: 'semanal' | 'mensual' = 'semanal';
  
  // Estadísticas
  totalEmpleados = 0;
  totalHorasTrabajadas = 0;
  promedioHorasPorEmpleado = 0;

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
    // La carga de datos se hará con onSearch()
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

  exportToExcel(): void {
    if (this.isExporting || this.filterForm.invalid) return;

    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      pageNumber: 1,
      pageSize: 10000
    };

    this.isExporting = true;
    this.attendanceMatrixService.downloadCostCenterReport(params).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `Reporte_Centro_Costos_${params.fechaInicio}_${params.fechaFin}.xlsx`);
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
    this.viewMode = this.viewMode === 'semanal' ? 'mensual' : 'semanal';
  }

  // --- Métodos de utilidad (a revisar y adaptar) ---

  getAllDates(): string[] {
    return this.semanasInfo.flatMap(semana => semana.dias);
  }

  getCellValue(empleado: EmpleadoCentroCosto, fecha: string): string {
    const valor = empleado.datosSemana[fecha];
    if (valor === undefined || valor === null) return '-';
    return valor.toString();
  }

  getCellClass(empleado: EmpleadoCentroCosto, fecha: string): string {
    // Lógica de clases...
    return '';
  }

  getDayName(fecha: string): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[new Date(fecha).getDay()];
  }

  trackByEmpleado(index: number, item: EmpleadoCentroCosto): any {
    return item.nroDoc;
  }
}
