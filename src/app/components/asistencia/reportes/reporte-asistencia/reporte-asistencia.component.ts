import { ChangeDetectionStrategy, ChangeDetectorRef, Component, type OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { ReportMatrixResponse, ReportMatrixResponseData } from 'src/app/core/models/report/report-matrix-response.model';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';

// Interfaces para el pivoteo de datos
export interface EmployeePivotData {
  personalId: string;
  nroDoc: string;
  colaborador: string;
  sede: string;
  area: string;
  cargo: string;
  centroCosto: string;
  compania: string;
  fechaIngreso: string;
  dailyData: { [date: string]: DailyAttendanceData };
  weeklyTotals: { [weekKey: string]: WeeklyTotals };
  totalHoras: number;
  horasExtras: number;
}

export interface WeeklyTotals {
  weekStart: Date;
  weekEnd: Date;
  totalHoras: number;
  horasExtras: number;
}

export interface DailyAttendanceData {
  diaSemana: string;
  tipoDia: string;
  turnoNombre: string;
  entradaProgramada: string;
  salidaProgramada: string;
  marcacionesDelDia: string;
  origenMarcaciones: string;
  tipoPermiso: string;
  entradaReal: string;
  salidaReal: string;
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

  // Datos originales y procesados
  originalData: ReportMatrixResponseData[] = [];
  pivotedData: EmployeePivotData[] = [];
  dateRange: Date[] = [];
  weekStructure: { weekKey: string; weekStart: Date; weekEnd: Date; dates: Date[] }[] = [];
  
  // Flag para renderizado progresivo
  renderComplete = false;

  // Información del reporte
  totalRecords = 0;
  generatedAt = '';
  executionTime = '';

  // Paginación
  pageNumber = 1;
  pageSize = 500; // Mostrar 50 empleados por página
  totalPages = 0;
  totalEmployees = 0;

  // Totales globales
  globalTotalHours = 0;
  globalOvertimeHours = 0;

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
      this.generateDateRange(new Date(fechaInicio), new Date(fechaFin));
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
    this.renderComplete = false; // Reset flag

    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    };

    console.log('Parámetros enviados al backend:', params);

    this.attendanceMatrixService.getAttendanceMatrixReport(params).subscribe({
      next: (response: ReportMatrixResponse) => {
        if (response.success) {
          this.originalData = response.data;
          this.totalRecords = response.totalRecords;
          this.generatedAt = response.generatedAt;
          this.executionTime = response.executionTime;

          // Información de paginación
          this.pageNumber = response.currentPage || 1;
          this.pageSize = response.pageSize || 100;
          this.totalPages = response.totalPages || 1;

          // Totales globales
          this.globalTotalHours = response.globalTotalHours || 0;
          this.globalOvertimeHours = response.globalOvertimeHours || 0;

          // Procesar datos para pivot primero
          this.processDataForPivot();

          // Calcular totalEmployees después del procesamiento
          if (response.totalEmployees) {
            this.totalEmployees = response.totalEmployees;
          } else {
            // Estimar basado en paginación y datos actuales
            if (this.pageNumber === this.totalPages) {
              // Última página: calcular exacto
              this.totalEmployees = ((this.totalPages - 1) * this.pageSize) + this.pivotedData.length;
            } else {
              // No es la última página: estimar
              this.totalEmployees = this.totalPages * this.pageSize;
            }
          }

          console.log('Información de paginación procesada:', {
            currentPage: response.currentPage,
            pageSize: response.pageSize,
            totalPages: response.totalPages,
            totalEmployees: this.totalEmployees,
            totalRecords: response.totalRecords,
            pivotedDataLength: this.pivotedData.length
          });

          console.log('Datos procesados para mostrar:', {
            pivotedData: this.pivotedData,
            weekStructure: this.weekStructure,
            dateRange: this.dateRange,
            totalEmployees: this.totalEmployees,
            totalPages: this.totalPages,
            pageNumber: this.pageNumber,
            pageSize: this.pageSize
          });

          this.successMessage = `Reporte generado - Página ${this.pageNumber} de ${this.totalPages} (${this.pivotedData.length} empleados de ${this.totalEmployees} totales)`;
          this.autoHideSuccess();
          
          // Forzar re-renderizado después de procesar datos (solución simple para lazy rendering)
          setTimeout(() => {
            this.renderComplete = true;
            // Forzar que Angular detecte cambios
            window.dispatchEvent(new Event('resize'));
          }, 50);
          
        } else {
          this.errorMessage = response.message || 'Error al cargar el reporte';
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar reporte:', error);
        this.errorMessage = 'Error de conexión al cargar el reporte';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private processDataForPivot(): void {
    if (!this.originalData.length) {
      this.pivotedData = [];
      return;
    }

    // Generar rango de fechas
    const fechaInicio = new Date(this.filterForm.get('fechaInicio')?.value);
    const fechaFin = new Date(this.filterForm.get('fechaFin')?.value);
    this.generateDateRange(fechaInicio, fechaFin);

    // Agrupar por empleado
    const employeeGroups = this.originalData.reduce((groups, record) => {
      const key = `${record.personalId}-${record.nroDoc}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
      return groups;
    }, {} as { [key: string]: ReportMatrixResponseData[] });

    // Procesar cada empleado
    this.pivotedData = Object.values(employeeGroups).map(employeeRecords => {
      const firstRecord = employeeRecords[0];
      const dailyData: { [date: string]: DailyAttendanceData } = {};

      // Procesar cada día del empleado
      employeeRecords.forEach(dayRecord => {
        const dateKey = this.formatDate(new Date(dayRecord.fecha));
        dailyData[dateKey] = {
          diaSemana: dayRecord.diaSemanaEs,
          tipoDia: dayRecord.tipoDia,
          turnoNombre: dayRecord.turnoNombre,
          entradaProgramada: dayRecord.entradaProgramada,
          salidaProgramada: dayRecord.salidaProgramada,
          marcacionesDelDia: dayRecord.marcacionesDelDia,
          origenMarcaciones: dayRecord.origenMarcaciones,
          tipoPermiso: dayRecord.tipoPermiso,
          entradaReal: this.extractFirstTime(dayRecord.marcacionesDelDia, dayRecord.tipoPermiso),
          salidaReal: this.extractLastTime(dayRecord.marcacionesDelDia, dayRecord.tipoPermiso)
        };
      });

      // Calcular totales semanales
      const weeklyTotals = this.calculateWeeklyTotals(dailyData);
      
      // Calcular totales generales
      const totalHoras = this.calculateTotalHours(dailyData);
      const horasExtras = this.calculateOvertimeHours(dailyData);

      return {
        personalId: firstRecord.personalId,
        nroDoc: firstRecord.nroDoc,
        colaborador: firstRecord.colaborador,
        sede: firstRecord.sede,
        area: firstRecord.area,
        cargo: firstRecord.cargo,
        centroCosto: firstRecord.centroCosto,
        compania: firstRecord.compania,
        fechaIngreso: firstRecord.fechaIngreso,
        dailyData,
        weeklyTotals,
        totalHoras,
        horasExtras
      };
    }).sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }

  private generateDateRange(fechaInicio: Date, fechaFin: Date): void {
    this.dateRange = [];
    const currentDate = new Date(fechaInicio);

    while (currentDate <= fechaFin) {
      this.dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generar estructura de semanas
    this.generateWeekStructure();
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

  private calculateTotalHours(dailyData: { [date: string]: DailyAttendanceData }): number {
    let totalHours = 0;

    Object.values(dailyData).forEach(dayData => {
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
            totalHours += workedHours;
          }
        }
      }
    });

    return Math.round(totalHours * 100) / 100;
  }

  private calculateOvertimeHours(dailyData: { [date: string]: DailyAttendanceData }): number {
    let overtimeHours = 0;
    const normalWorkDay = 8.0;

    Object.values(dailyData).forEach(dayData => {
      // Si hay permiso, no contar horas extras
      if (dayData.tipoPermiso) return;

      // Si es FALTA, continuar
      if (dayData.entradaReal === 'FALTA' || dayData.salidaReal === 'FALTA') return;

      // Solo calcular si hay entrada y salida válidas
      if (dayData.entradaReal && dayData.salidaReal) {
        const entrada = this.parseTime(dayData.entradaReal);
        const salida = this.parseTime(dayData.salidaReal);

        if (entrada && salida) {
          const workedHours = (salida.getTime() - entrada.getTime()) / (1000 * 60 * 60);
          if (workedHours > normalWorkDay && workedHours < 24) {
            overtimeHours += workedHours - normalWorkDay;
          }
        }
      }
    });

    return Math.round(overtimeHours * 100) / 100;
  }

  private calculateWeeklyTotals(dailyData: { [date: string]: DailyAttendanceData }): { [weekKey: string]: WeeklyTotals } {
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
        const dateKey = this.formatDate(date);
        const dayData = dailyData[dateKey];

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

    return weeklyTotals;
  }

  private parseTime(timeStr: string): Date | null {
    if (!timeStr || timeStr === 'FALTA') return null;

    const timeParts = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!timeParts) return null;

    const date = new Date();
    date.setHours(parseInt(timeParts[1]), parseInt(timeParts[2]), 0, 0);
    return date;
  }

  getDayValue(employee: EmployeePivotData, date: Date, type: 'entrada' | 'salida'): string {
    const dateKey = this.formatDate(date);
    const dayData = employee.dailyData[dateKey];

    if (!dayData) return '-';

    return type === 'entrada' ? dayData.entradaReal : dayData.salidaReal;
  }

  getDayOfWeek(date: Date): string {
    return date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
  }

  getWeeklyTotal(employee: EmployeePivotData, weekKey: string, type: 'totalHoras' | 'horasExtras'): number {
    const weeklyTotal = employee.weeklyTotals[weekKey];
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

  // Getter methods for template calculations (ahora usamos totales globales)
  get totalHours(): number {
    return this.globalTotalHours || this.pivotedData.reduce((sum, emp) => sum + emp.totalHoras, 0);
  }

  get totalOvertimeHours(): number {
    return this.globalOvertimeHours || this.pivotedData.reduce((sum, emp) => sum + emp.horasExtras, 0);
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
    this.originalData = [];
    this.pageNumber = 1; // Reset pagination
    this.clearMessages();
    this.cdr.markForCheck();
  }

  // Método para manejar eventos del FioriPaginatorComponent
  onPageChangeEvent(event: PaginatorEvent): void {
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    this.loadReportData();
    this.cdr.markForCheck();
  }

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