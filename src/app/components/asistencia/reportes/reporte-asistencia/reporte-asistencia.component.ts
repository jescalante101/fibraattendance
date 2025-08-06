import { ChangeDetectionStrategy, ChangeDetectorRef, Component, type OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { ReportMatrixResponse, ReportMatrixResponseData } from 'src/app/core/models/report/report-matrix-response.model';
import { AttendanceMatrixPivotResponse, EmployeePivotData as BackendEmployeePivotData, DailyAttendanceData as BackendDailyAttendanceData, AttendanceSummary } from 'src/app/core/models/report/report-pivot-reponse.model';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';

// Usamos las interfaces del backend con extensiones para funcionalidades adicionales
export interface EmployeePivotData extends BackendEmployeePivotData {
  weeklyTotals?: { [weekKey: string]: WeeklyTotals };
}

export interface WeeklyTotals {
  weekStart: Date;
  weekEnd: Date;
  totalHoras: number;
  horasExtras: number;
}

export interface DailyAttendanceData extends BackendDailyAttendanceData {
  // Extendemos si necesitamos propiedades adicionales
}

@Component({
  selector: 'app-reporte-asistencia',
  templateUrl: './reporte-asistencia.component.html',
  styleUrl: './reporte-asistencia.component.css'
  // changeDetection: ChangeDetectionStrategy.OnPush // Comentado temporalmente para debug
})
export class ReporteAsistenciaComponent implements OnInit, OnDestroy {

  // Formulario de filtros
  filterForm!: FormGroup;

  // Datos del reporte
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Datos procesados (ya no necesitamos originalData)
  pivotedData: EmployeePivotData[] = [];
  dateRange: Date[] = [];
  weekStructure: { weekKey: string; weekStart: Date; weekEnd: Date; dates: Date[] }[] = [];

  // Información del reporte desde el backend
  summary: AttendanceSummary | null = null;
  generatedAt = '';
  executionTime = '';

  // Paginación (ahora manejada por el backend)
  pageNumber = 1;
  pageSize = 100;

  // Hacer Math disponible en el template
  Math = Math;

  // Para manejar subscripciones y evitar memory leaks
  private destroy$ = new Subject<void>();

  // Configuración del header (público para el template)
  headerConfig: HeaderConfig | null = null;

  constructor(
    private fb: FormBuilder,
    private attendanceMatrixService: AttendanceMatrixReportService,
    private headerConfigService: HeaderConfigService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Cargar configuración del header y suscribirse a cambios
    this.loadHeaderConfig();

    // Cargar con datos por defecto del mes actual
    this.setDefaultDateRange();
    
    // Forzar detección inicial
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    this.filterForm = this.fb.group({
      fechaInicio: [this.formatDate(firstDay), Validators.required],
      fechaFin: [this.formatDate(lastDay), Validators.required],
      employeeId: [''],
      companiaId: [''],
      planillaId: [''],
      areaId: [''],
      sedeId: [''],
      cargoId: [''],
      centroCostoId: [''],
      sedeCodigo: [''],
      ccCodigo: ['']
    });
  }

  private loadHeaderConfig(): void {
    // Cargar configuración inicial
    this.headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    this.applyHeaderConfigToForm();

    // Suscribirse a cambios en la configuración del header
    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: HeaderConfig | null) => {
        this.headerConfig = config;
        this.applyHeaderConfigToForm();
        this.cdr.markForCheck();
      });
  }

  private applyHeaderConfigToForm(): void {
    if (this.headerConfig && this.filterForm) {
      // Aplicar companiaId desde la empresa seleccionada
      const companiaId = this.headerConfig.selectedEmpresa?.companiaId || '';

      // Aplicar planillaId desde la planilla seleccionada
      const planillaId = this.headerConfig.selectedPlanilla?.planillaId || '';

      // Actualizar formulario sin disparar eventos innecesarios
      this.filterForm.patchValue({
        companiaId: companiaId,
        planillaId: planillaId
      }, { emitEvent: false });

      console.log('Filtros del header aplicados:', {
        companiaId: companiaId,
        planillaId: planillaId,
        empresa: this.headerConfig.selectedEmpresa?.descripcion,
        planilla: this.headerConfig.selectedPlanilla?.descripcion
      });
    }
  }

  private setDefaultDateRange(): void {
    const fechaInicio = this.filterForm.get('fechaInicio')?.value;
    const fechaFin = this.filterForm.get('fechaFin')?.value;

    if (fechaInicio && fechaFin) {
      // generateDateRange ya no es necesario - dateRange viene del backend
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onSearch(): void {
    if (this.filterForm.valid) {
      this.loadReportData();
    } else {
      this.filterForm.markAllAsTouched();
    }
    this.cdr.markForCheck();
  }

  private loadReportData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      planillaId: this.headerConfig?.selectedPlanilla?.planillaId || '',
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId || ''
    };

    console.log('Parámetros enviados al backend pivot:', params);

    // Usar el nuevo endpoint pivot
    this.attendanceMatrixService.getAttendanceMatrixPivotReport(params).subscribe({
      next: (response: AttendanceMatrixPivotResponse) => {
        console.log('Respuesta del servicio pivot:', response);
        
        if (response.success && response.employees && response.employees.length > 0) {
          // Limpiar cache al cargar nuevos datos
          this.dayValueCache.clear();
          
          // Los datos ya vienen pivoteados del backend
          this.pivotedData = response.employees;
          this.summary = response.summary;
          this.generatedAt = response.generatedAt;
          this.executionTime = response.executionTime;
          
          // Procesar dateRange del backend (convertir strings a Date)
          this.dateRange = response.dateRange.map(dateStr => new Date(dateStr));
          
          // Generar estructura de semanas para totales semanales
          this.generateWeekStructure();
          
          // Calcular totales semanales para cada empleado
          this.calculateWeeklyTotalsForEmployees();
          
          // Pre-calcular todos los valores para evitar lazy rendering
          this.preCalculateAllValues();

          console.log('Datos procesados del endpoint pivot:', {
            employees: this.pivotedData.length,
            dateRange: this.dateRange.length,
            weekStructure: this.weekStructure.length,
            summary: this.summary
          });

          this.successMessage = `Reporte generado: ${this.pivotedData.length} empleados con datos desde ${this.dateRange[0]?.toLocaleDateString()} hasta ${this.dateRange[this.dateRange.length - 1]?.toLocaleDateString()}`;
          this.autoHideSuccess();
          
          // SOLUCIÓN PARA LAZY RENDERING: Forzar renderización completa
          setTimeout(() => {
            // Forzar que Angular detecte todos los cambios
            this.cdr.detectChanges();
            
            // Disparar eventos que fuercen re-renderizado
            window.dispatchEvent(new Event('resize'));
            
            // Forzar segundo pase
            setTimeout(() => {
              this.cdr.detectChanges();
            }, 50);
          }, 100);
          
        } else {
          this.errorMessage = response.message || 'No se encontraron datos para los filtros seleccionados';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar reporte pivot:', error);
        this.errorMessage = 'Error de conexión al cargar el reporte';
        this.isLoading = false;
      }
    });
  }


  private generateWeekStructure(): void {
    this.weekStructure = [];
    if (this.dateRange.length === 0) return;

    let currentWeekDates: Date[] = [];
    let weekStart: Date | null = null;

    this.dateRange.forEach((date, index) => {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Si es lunes o es el primer día del rango, iniciar nueva semana
      if (dayOfWeek === 1 || index === 0) {
        // Si hay una semana anterior, guardarla
        if (currentWeekDates.length > 0 && weekStart) {
          const weekEnd = new Date(currentWeekDates[currentWeekDates.length - 1]);
          const weekKey = this.getWeekKey(weekStart);
          
          this.weekStructure.push({
            weekKey,
            weekStart: new Date(weekStart),
            weekEnd,
            dates: [...currentWeekDates]
          });
        }
        
        // Iniciar nueva semana
        currentWeekDates = [new Date(date)];
        weekStart = new Date(date);
      } else {
        // Agregar día a la semana actual
        currentWeekDates.push(new Date(date));
      }
      
      // Si es el último día, cerrar la semana
      if (index === this.dateRange.length - 1 && weekStart) {
        const weekEnd = new Date(date);
        const weekKey = this.getWeekKey(weekStart);
        
        this.weekStructure.push({
          weekKey,
          weekStart: new Date(weekStart),
          weekEnd,
          dates: [...currentWeekDates]
        });
      }
    });
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  private extractFirstTime(marcaciones: string, tipoPermiso: string): string {
    if ((!marcaciones || marcaciones === 'SIN_MARCACIONES') && tipoPermiso) {
      return tipoPermiso;
    }

    if (!marcaciones || marcaciones === 'SIN_MARCACIONES') {
      return 'FALTA';
    }

    const horasUnicas = marcaciones
      .split('|')
      .filter(m => m.trim())
      .map(m => {
        const limpia = m.trim();
        const parenIndex = limpia.indexOf('(');
        return parenIndex > 0 ? limpia.substring(0, parenIndex).trim() : limpia.trim();
      })
      .filter((value, index, self) => self.indexOf(value) === index);

    return horasUnicas[0] || 'FALTA';
  }

  private extractLastTime(marcaciones: string, tipoPermiso: string): string {
    if ((!marcaciones || marcaciones === 'SIN_MARCACIONES') && tipoPermiso) {
      return '';
    }

    if (!marcaciones || marcaciones === 'SIN_MARCACIONES') {
      return 'FALTA';
    }

    const horasUnicas = marcaciones
      .split('|')
      .filter(m => m.trim())
      .map(m => {
        const limpia = m.trim();
        const parenIndex = limpia.indexOf('(');
        return parenIndex > 0 ? limpia.substring(0, parenIndex).trim() : limpia.trim();
      })
      .filter((value, index, self) => self.indexOf(value) === index);

    return horasUnicas[horasUnicas.length - 1] || 'FALTA';
  }


  // Nuevo método simplificado para calcular totales semanales con datos pivoteados
  private calculateWeeklyTotalsForEmployees(): void {
    this.pivotedData.forEach(employee => {
      const weeklyTotals: { [weekKey: string]: WeeklyTotals } = {};

      // Inicializar totales semanales
      this.weekStructure.forEach(week => {
        weeklyTotals[week.weekKey] = {
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          totalHoras: 0,
          horasExtras: 0
        };
      });

      // Calcular totales por semana
      this.weekStructure.forEach(week => {
        let weekTotalHours = 0;
        let weekOvertimeHours = 0;
        const normalWorkDay = 8.0;

        week.dates.forEach(date => {
          const dateKey = date.toISOString().split('T')[0] + 'T00:00:00'; // Backend usa formato ISO con 00:00:00
          const dayData = employee.dailyData[dateKey];

          if (!dayData) return;

          // Si hay permiso, no contar horas
          if (dayData.tipoPermiso) return;

          // Si es FALTA, continuar
          if (dayData.entradaReal === 'FALTA' || dayData.salidaReal === 'FALTA') return;

          // Solo calcular si hay entrada y salida válidas
          if (dayData.entradaReal && dayData.salidaReal) {
            const entrada = this.parseTime(dayData.entradaReal);
            const salida = this.parseTime(dayData.salidaReal);

            if (entrada && salida) {
              const workedHours = (salida.getTime() - entrada.getTime()) / (1000 * 60 * 60);
              if (workedHours > 0 && workedHours < 24) {
                weekTotalHours += workedHours;
                
                // Calcular horas extras
                if (workedHours > normalWorkDay) {
                  weekOvertimeHours += workedHours - normalWorkDay;
                }
              }
            }
          }
        });

        weeklyTotals[week.weekKey].totalHoras = Math.round(weekTotalHours * 100) / 100;
        weeklyTotals[week.weekKey].horasExtras = Math.round(weekOvertimeHours * 100) / 100;
      });

      // Asignar totales semanales al empleado
      employee.weeklyTotals = weeklyTotals;
    });
  }

  // Pre-calcular todos los valores para evitar lazy rendering
  private preCalculateAllValues(): void {
    console.log('Pre-calculando valores para evitar lazy rendering...');
    
    // Pre-calcular todos los valores getDayValue
    this.pivotedData.forEach(employee => {
      this.dateRange.forEach(date => {
        // Pre-calcular entrada y salida para cada día
        this.getDayValue(employee, date, 'entrada');
        this.getDayValue(employee, date, 'salida');
      });
      
      // Pre-calcular totales semanales
      this.weekStructure.forEach(week => {
        this.getWeeklyTotal(employee, week.weekKey, 'totalHoras');
        this.getWeeklyTotal(employee, week.weekKey, 'horasExtras');
      });
    });
    
    console.log(`Pre-cálculo completado. Cache size: ${this.dayValueCache.size}`);
  }

  private parseTime(timeStr: string): Date | null {
    if (!timeStr || timeStr === 'FALTA' || timeStr === '-') return null;

    // Las horas ya vienen formateadas del backend como "08:00", "17:30", etc.
    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!timeParts) return null;

    const date = new Date();
    date.setHours(parseInt(timeParts[1]), parseInt(timeParts[2]), 0, 0);
    return date;
  }

  // Cache para optimizar getDayValue
  private dayValueCache = new Map<string, string>();

  getDayValue(employee: EmployeePivotData, date: Date, type: 'entrada' | 'salida'): string {
    const cacheKey = `${employee.personalId}-${date.getTime()}-${type}`;
    
    if (this.dayValueCache.has(cacheKey)) {
      return this.dayValueCache.get(cacheKey)!;
    }

    // Backend usa formato ISO con tiempo 00:00:00
    const dateKey = date.toISOString().split('T')[0] + 'T00:00:00';
    const dayData = employee.dailyData[dateKey];

    const result = dayData ? (type === 'entrada' ? dayData.entradaReal : dayData.salidaReal) : '-';
    
    this.dayValueCache.set(cacheKey, result);
    return result;
  }

  getDayOfWeek(date: Date): string {
    return date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
  }

  getWeeklyTotal(employee: EmployeePivotData, weekKey: string, type: 'totalHoras' | 'horasExtras'): number {
    const weeklyTotal = employee.weeklyTotals?.[weekKey];
    return weeklyTotal ? weeklyTotal[type] : 0;
  }

  getWeekLabel(week: { weekKey: string; weekStart: Date; weekEnd: Date; dates: Date[] }): string {
    const start = week.weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    const end = week.weekEnd.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    return `${start} - ${end}`;
  }

  // TrackBy functions para optimizar *ngFor
  trackByEmployeeId(index: number, employee: EmployeePivotData): string {
    return employee.personalId;
  }

  trackByWeekKey(index: number, week: { weekKey: string; weekStart: Date; weekEnd: Date; dates: Date[] }): string {
    return week.weekKey;
  }

  trackByDate(index: number, date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Getter methods for template calculations (usamos summary del backend)
  get totalHours(): number {
    return this.summary?.totalHours || this.pivotedData.reduce((sum, emp) => sum + emp.totalHoras, 0);
  }

  get totalOvertimeHours(): number {
    return this.summary?.totalOvertimeHours || this.pivotedData.reduce((sum, emp) => sum + emp.horasExtras, 0);
  }

  get totalEmployees(): number {
    return this.summary?.totalEmployees || this.pivotedData.length;
  }

  onExportExcel(): void {
    if (!this.filterForm.valid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const params: ReportMatrixParams = this.filterForm.value;

    this.attendanceMatrixService.downloadAttendanceMatrixReport(params).subscribe({
      next: (blob: Blob) => {
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const fechaInicio = new Date(params.fechaInicio);
        const fechaFin = new Date(params.fechaFin);
        const fileName = `Matriz_Asistencia_${fechaInicio.getDate().toString().padStart(2, '0')}-${(fechaInicio.getMonth() + 1).toString().padStart(2, '0')}_al_${fechaFin.getDate().toString().padStart(2, '0')}-${(fechaFin.getMonth() + 1).toString().padStart(2, '0')}-${fechaFin.getFullYear()}.xlsx`;

        link.download = fileName;
        link.click();

        window.URL.revokeObjectURL(url);
        this.isLoading = false;

        this.successMessage = 'Archivo Excel descargado exitosamente';
        this.autoHideSuccess();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al descargar Excel:', error);
        this.errorMessage = 'Error al descargar el archivo Excel';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onClearFilters(): void {
    // Limpiar formulario pero preservar valores del header
    this.initializeForm();
    this.applyHeaderConfigToForm(); // Reaplicar filtros del header
    this.setDefaultDateRange();
    this.pivotedData = [];
    this.clearMessages();
  }

  // PENDIENTE: Implementar paginación cuando el backend la soporte
  /*onPageChangeEvent(event: PaginatorEvent): void {
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    this.loadReportData();
  }*/

  private autoHideSuccess(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.markForCheck();
    }, 5000);
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}