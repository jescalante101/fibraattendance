import { ChangeDetectionStrategy, ChangeDetectorRef, Component, type OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { AttendanceMatrixPivotResponse, EmployeePivotData as BackendEmployeePivotData, DailyAttendanceData as BackendDailyAttendanceData, AttendanceSummary } from 'src/app/core/models/report/report-pivot-reponse.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';

import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import { AG_GRID_LOCALE_ES } from 'src/app/ag-grid-locale.es';

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
  styleUrl: './reporte-asistencia.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteAsistenciaComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid') agGrid!: AgGridAngular;

  // Formulario de filtros
  filterForm!: FormGroup;

  // Datos del reporte
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // AG-Grid configuration
  columnDefs: (ColDef | ColGroupDef)[] = [];
  gridOptions: GridOptions = {
    theme: 'legacy' // Usar temas CSS legacy (ag-grid.css, ag-theme-alpine.css)
  };
  rowData: any[] = [];
  private gridApi!: GridApi;

  // Datos procesados (ya no necesitamos originalData)
  pivotedData: EmployeePivotData[] = [];
  dateRange: Date[] = [];
  weekStructure: { weekKey: string; weekStart: Date; weekEnd: Date; dates: Date[] }[] = [];

  // Información del reporte desde el backend
  summary: AttendanceSummary | null = null;
  generatedAt = '';
  executionTime = '';

  // Paginación (ahora manejada por el backend)
  

  // Hacer Math disponible en el template
  Math = Math;

  // Para manejar subscripciones y evitar memory leaks
  private destroy$ = new Subject<void>();

  // Configuración del header (público para el template)
  headerConfig: HeaderConfig | null = null;

  // Datos maestros para filtros
  areas: RhArea[] = [];
  sedes: CategoriaAuxiliar[] = [];
  filteredAreas: RhArea[] = [];
  filteredSedes: CategoriaAuxiliar[] = [];

  // Estados de dropdowns
  showAreaDropdown = false;
  showSedeDropdown = false;

  constructor(
    private fb: FormBuilder,
    private attendanceMatrixService: AttendanceMatrixReportService,
    private headerConfigService: HeaderConfigService,
    private cdr: ChangeDetectorRef,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService
  ) {
    this.initializeForm();
    this.setupGridOptions();
    this.setupInitialColumnDefs();
  }

  ngOnInit(): void {
    // Cargar configuración del header y suscribirse a cambios
    this.loadHeaderConfig();

    // Cargar datos maestros para filtros
    this.loadMasterData();

    // Cargar con datos por defecto del mes actual
    this.setDefaultDateRange();
    
    // Ejecutar búsqueda inicial automáticamente
    setTimeout(() => {
      if (this.filterForm.valid && this.headerConfig) {
        console.log('Ejecutando búsqueda inicial automática');
        this.loadReportData();
      }
    }, 500);
    
    // Forzar detección inicial
    this.cdr.markForCheck();
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
      employeeId: [''],
      companiaId: [''],
      planillaId: [''],
      areaId: [''],
      areaFilter: [''],
      sedeId: [''],
      sedeFilter: [''],
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
    this.headerConfigService.headerConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: HeaderConfig | null) => {
        this.headerConfig = config;
        this.applyHeaderConfigToForm();
        
        // Si tenemos datos previos y la configuración cambió, recargar
        if (this.pivotedData.length > 0 && this.filterForm.valid) {
          console.log('Header config cambió, recargando datos');
          this.loadReportData();
        }
        
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

    // Asegurarse de que los filtros del header están aplicados
    const formValues = this.filterForm.value;
    const params: ReportMatrixParams = {
      ...formValues,
      // Sobrescribir con valores del header (más importante que form)
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId || formValues.companiaId || '',
      planillaId: this.headerConfig?.selectedPlanilla?.planillaId || formValues.planillaId || ''
    };

    // // Remover campos vacíos para evitar filtros innecesarios
    // Object.keys(params).forEach(key => {
    //   if (params[key] === '' || params[key] === null || params[key] === undefined) {
    //     delete params[key];
    //   }
    // });

    console.log('Parámetros enviados al backend pivot:', params);
    console.log('Header config aplicado:', {
      empresa: this.headerConfig?.selectedEmpresa?.descripcion,
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId,
      planilla: this.headerConfig?.selectedPlanilla?.descripcion,
      planillaId: this.headerConfig?.selectedPlanilla?.planillaId
    });

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
          
          // Actualizar AG-Grid con los nuevos datos (esto incluye generar semanas y calcular totales)
          this.updateGridData();

          console.log('Datos procesados del endpoint pivot:', {
            employees: this.pivotedData.length,
            dateRange: this.dateRange.length,
            weekStructure: this.weekStructure.length,
            summary: this.summary
          });

          this.successMessage = `Reporte generado: ${this.pivotedData.length} empleados con datos desde ${this.dateRange[0]?.toLocaleDateString()} hasta ${this.dateRange[this.dateRange.length - 1]?.toLocaleDateString()}`;
          this.autoHideSuccess();
          
          // Forzar detección de cambios con OnPush
          this.cdr.markForCheck();
          
        } else {
          this.errorMessage = response.message || 'No se encontraron datos para los filtros seleccionados';
          this.pivotedData = [];
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar reporte pivot:', error);
        this.errorMessage = 'Error de conexión al cargar el reporte';
        this.pivotedData = [];
        this.isLoading = false;
        this.cdr.markForCheck();
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

  // Cache optimizado para getDayValue con límite
  private dayValueCache = new Map<string, string>();
  private readonly maxCacheSize = 10000;

  getDayValue(employee: EmployeePivotData, date: Date, type: 'entrada' | 'salida'): string {
    const cacheKey = `${employee.personalId}-${date.getTime()}-${type}`;
    
    if (this.dayValueCache.has(cacheKey)) {
      return this.dayValueCache.get(cacheKey)!;
    }

    // Backend usa formato ISO con tiempo 00:00:00
    const dateKey = date.toISOString().split('T')[0] + 'T00:00:00';
    const dayData = employee.dailyData[dateKey];

    const result = dayData ? (type === 'entrada' ? dayData.entradaReal : dayData.salidaReal) : '-';
    
    // Limitar tamaño del cache
    if (this.dayValueCache.size >= this.maxCacheSize) {
      const firstKey = this.dayValueCache.keys().next().value;
      if (firstKey) {
        this.dayValueCache.delete(firstKey);
      }
    }
    
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

  // TrackBy functions optimizadas para *ngFor
  trackByEmployeeId = (index: number, employee: EmployeePivotData): string => {
    return `${employee.personalId}-${employee.nroDoc}`;
  }

  trackByWeekKey = (index: number, week: { weekKey: string; weekStart: Date; weekEnd: Date; dates: Date[] }): string => {
    return week.weekKey;
  }

  trackByDate = (index: number, date: Date): number => {
    return date.getTime(); // Más eficiente que string
  }

  trackByDateString = (index: number, dateStr: string): string => {
    return dateStr;
  }

  trackByIndex = (index: number, item: any): number => {
    return index;
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
    
    // Usar la misma lógica de parámetros que loadReportData
    const formValues = this.filterForm.value;
    const params: ReportMatrixParams = {
      ...formValues,
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId || formValues.companiaId || '',
      planillaId: this.headerConfig?.selectedPlanilla?.planillaId || formValues.planillaId || ''
    };
    
    // Remover campos vacíos
    // Object.keys(params).forEach(key => {
    //   if (params[key] === '' || params[key] === null || params[key] === undefined) {
    //     delete params[key];
    //   }
    // });

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
    this.cdr.markForCheck();
  }

  // ===== MASTER DATA LOADING =====
  
  private loadMasterData(): void {
    // Cargar sedes
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe({
      next: (sedes) => {
        this.sedes = sedes;
        this.filteredSedes = [...sedes];
      },
      error: (error) => console.error('Error loading sedes:', error)
    });

    // Cargar áreas
    this.rhAreaService.getAreas(this.headerConfig?.selectedEmpresa?.companiaId?.toString() || '').subscribe({
      next: (areas) => {
        this.areas = areas;
        this.filteredAreas = [...areas];
      },
      error: (error) => console.error('Error loading areas:', error)
    });
  }

  // ===== AUTOCOMPLETE METHODS =====
  
  onAreaFilterChange(event: any) {
    const filterValue = event.target.value.toLowerCase();
    this.filteredAreas = this.areas.filter(area =>
      area.descripcion.toLowerCase().includes(filterValue)
    );
  }

  onAreaSelected(area: RhArea | null) {
    this.showAreaDropdown = false;
    
    if (area) {
      this.filterForm.patchValue({
        areaId: area.areaId,
        areaFilter: area.descripcion
      });
    } else {
      this.filterForm.patchValue({
        areaId: '',
        areaFilter: ''
      });
    }
  }

  onAreaBlur() {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 150);
  }

  onSedeFilterChange(event: any) {
    const filterValue = event.target.value.toLowerCase();
    this.filteredSedes = this.sedes.filter(sede =>
      sede.descripcion.toLowerCase().includes(filterValue)
    );
  }

  onSedeSelected(sede: CategoriaAuxiliar | null) {
    this.showSedeDropdown = false;
    
    if (sede) {
      this.filterForm.patchValue({
        sedeId: sede.categoriaAuxiliarId,
        sedeFilter: sede.descripcion
      });
    } else {
      this.filterForm.patchValue({
        sedeId: '',
        sedeFilter: ''
      });
    }
  }

  onSedeBlur() {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 150);
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

  // =================== AG-GRID CONFIGURATION ===================

  private setupInitialColumnDefs(): void {
    // Configuración básica inicial para mostrar algo mientras carga
    this.columnDefs = [
      { field: 'colaborador', headerName: 'Colaborador', width: 200 },
      { field: 'nroDoc', headerName: 'Documento', width: 120 },
      { field: 'area', headerName: 'Área', width: 140 },
      { field: 'cargo', headerName: 'Cargo', width: 140 },
      { field: 'sede', headerName: 'Sede', width: 120 },
      { field: 'totalHoras', headerName: 'Total Horas', width: 120 },
      { field: 'horasExtras', headerName: 'H. Extras', width: 120 }
    ] as ColDef[];
  }

  private setupGridOptions(): void {
    this.gridOptions = {
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 80,
        // Auto-size columns to content
        suppressSizeToFit: false
      },
      localeText: AG_GRID_LOCALE_ES,
      rowSelection: 'multiple',
      // enableRangeSelection: true, // Comentado: requiere AG-Grid Enterprise
      suppressMenuHide: true,
      animateRows: true,
      rowHeight: 50,
      headerHeight: 60,
      suppressHorizontalScroll: false,
      suppressColumnVirtualisation: false,
      enableCellTextSelection: true,
      // Auto-size all columns on first data render
      onFirstDataRendered: (event) => {
        this.autoSizeAllColumns();
      },
      onGridReady: (event: GridReadyEvent) => {
        this.gridApi = event.api;
      }
    };
  }

  private setupColumnDefs(): void {
    this.columnDefs = [
      // Columnas básicas fijas del empleado
      {
        field: 'colaborador',
        headerName: 'Colaborador',
        pinned: 'left',
        minWidth: 150,
        maxWidth: 250
      },
      {
        field: 'nroDoc',
        headerName: 'Documento',
        minWidth: 100,
        maxWidth: 150
      },
      {
        field: 'area',
        headerName: 'Área',
        minWidth: 120,
        maxWidth: 200
      },
      {
        field: 'cargo',
        headerName: 'Cargo',
        minWidth: 120,
        maxWidth: 200
      },
      {
        field: 'sede',
        headerName: 'Sede',
        minWidth: 100,
        maxWidth: 150
      }
    ];

    // Agregar columnas por semanas con headers agrupados
    if (this.dateRange && this.dateRange.length > 0 && this.weekStructure.length > 0) {
      this.weekStructure.forEach(week => {
        // Crear grupos de columnas para cada día
        const weekColumns: any[] = [];
        
        week.dates.forEach(date => {
          const dateStr = date.toISOString().split('T')[0];
          const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' }); // "lunes", "martes", etc.
          const dayDate = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

          // Grupo de columnas para cada día (Entrada y Salida)
          const dayGroup: ColGroupDef = {
            headerName: `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`, // "Lunes"
            headerTooltip: `${dayName} ${dayDate}`,
            children: [
              {
                field: `entrada_${dateStr}`,
                headerName: 'Entrada',
                minWidth: 90,
                maxWidth: 140,
                cellStyle: (params: any) => this.getCellStyleByDayType(params, dateStr, 'entrada'),
                cellRenderer: (params: any) => this.formatTimeCellWithDayType(params.value, dateStr, params.data, 'entrada')
              } as ColDef,
              {
                field: `salida_${dateStr}`,
                headerName: 'Salida',
                minWidth: 90,
                maxWidth: 140,
                cellStyle: (params: any) => this.getCellStyleByDayType(params, dateStr, 'salida'),
                cellRenderer: (params: any) => this.formatTimeCellWithDayType(params.value, dateStr, params.data, 'salida')
              } as ColDef
            ]
          };
          weekColumns.push(dayGroup);
        });

        // Grupo de totales semanales
        const weekTotalsGroup: ColGroupDef = {
          headerName: `Semana ${week.weekKey.split('-W')[1]}`,
          headerClass: 'week-totals-header',
          children: [
            {
              field: `week_${week.weekKey}_hours`,
              headerName: 'T. Horas',
              cellRenderer: (params: any) => `${params.value || 0}h`,
              minWidth: 80,
              maxWidth: 100,
              cellStyle: { 
                'font-weight': 'bold', 
                'background-color': '#fffbeb', 
                'text-align': 'center',
                'color': '#d97706'
              }
            } as ColDef,
            {
              field: `week_${week.weekKey}_extras`,
              headerName: 'H. Extras',
              cellRenderer: (params: any) => `${params.value || 0}h`,
              minWidth: 80,
              maxWidth: 100,
              cellStyle: { 
                'font-weight': 'bold', 
                'background-color': '#fff7ed', 
                'text-align': 'center',
                'color': '#ea580c'
              }
            } as ColDef
          ]
        };
        weekColumns.push(weekTotalsGroup);

        // Agregar todas las columnas de la semana al columnDefs
        this.columnDefs.push(...weekColumns);
      });
    }

    // Totales generales al final agrupados
    const generalTotalsGroup: ColGroupDef = {
      headerName: 'Totales Generales',
      headerClass: 'general-totals-header',
      children: [
        {
          field: 'totalHoras',
          headerName: 'Total Horas',
          cellRenderer: (params: any) => `${params.value}h`,
          cellStyle: { 
            'font-weight': 'bold', 
            'background-color': '#f0f9ff', 
            'text-align': 'center',
            'color': '#1d4ed8'
          },
          minWidth: 100,
          maxWidth: 120
        } as ColDef,
        {
          field: 'horasExtras',
          headerName: 'H. Extras',
          cellRenderer: (params: any) => `${params.value}h`,
          cellStyle: { 
            'font-weight': 'bold', 
            'background-color': '#fef3c7', 
            'text-align': 'center',
            'color': '#d97706'
          },
          minWidth: 100,
          maxWidth: 120
        } as ColDef
      ]
    };
    this.columnDefs.push(generalTotalsGroup);
  }

  private prepareGridData(): void {
    this.rowData = this.pivotedData.map((employee, index) => {
      const row: any = {
        colaborador: employee.colaborador || `Employee ${index}`,
        nroDoc: employee.nroDoc || 'N/A',
        area: employee.area || 'N/A',
        cargo: employee.cargo || 'N/A',
        sede: employee.sede || 'N/A',
        totalHoras: employee.totalHoras || 0,
        horasExtras: employee.horasExtras || 0
      };

      // Agregar datos por semanas (como en el pivot original)
      if (this.weekStructure.length > 0) {
        this.weekStructure.forEach(week => {
          // Datos de entrada y salida para cada día de la semana con lógica mejorada
          week.dates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const dateKey = dateStr + 'T00:00:00'; // Formato que usa el backend
            const dayData = employee.dailyData && employee.dailyData[dateKey];

            // Aplicar lógica de prioridad para entrada y salida
            row[`entrada_${dateStr}`] = this.getDayDisplayValue(dayData, 'entrada');
            row[`salida_${dateStr}`] = this.getDayDisplayValue(dayData, 'salida');
          });

          // Totales semanales
          const weeklyTotals = employee.weeklyTotals && employee.weeklyTotals[week.weekKey];
          row[`week_${week.weekKey}_hours`] = weeklyTotals?.totalHoras || 0;
          row[`week_${week.weekKey}_extras`] = weeklyTotals?.horasExtras || 0;
        });
      }

      return row;
    });
  }

  

  private updateGridData(): void {
    // Primero generar estructura de semanas (necesaria para las columnas)
    this.generateWeekStructure();
    
    // Calcular totales semanales
    this.calculateWeeklyTotalsForEmployees();
    
    // Configurar columnas basadas en la estructura de semanas
    this.setupColumnDefs();
    
    // Preparar datos para la grilla
    this.prepareGridData();
    
    // Forzar detección de cambios
    this.cdr.markForCheck();
  }

  private autoSizeAllColumns(): void {
    if (!this.gridApi) return;

    // Obtener todas las columnas
    const allColumnIds: string[] = [];
    this.gridApi.getColumns()?.forEach((column: any) => {
      allColumnIds.push(column.getId());
    });

    // Auto-size todas las columnas al contenido
    this.gridApi.autoSizeColumns(allColumnIds, false);

    // Para columnas muy anchas, aplicar un máximo usando setColumnWidths
    const columnsToResize: { key: string; newWidth: number }[] = [];
    this.gridApi.getColumns()?.forEach((column: any) => {
      const currentWidth = column.getActualWidth();
      if (currentWidth > 300) {
        columnsToResize.push({ key: column.getId(), newWidth: 300 });
      }
    });

    // Aplicar los nuevos anchos si hay columnas que redimensionar
    if (columnsToResize.length > 0) {
      this.gridApi.setColumnWidths(columnsToResize);
    }
  }

  // Método público para que el usuario pueda redimensionar cuando quiera
  public autoSizeColumns(): void {
    this.autoSizeAllColumns();
  }

  // =================== VALIDACIÓN COMPLETA DE TIPO DE DÍA ===================

  /**
   * Obtiene el valor que debe mostrarse en la celda según la lógica de prioridad:
   * 1. FERIADO → "Día Feriado"
   * 2. DESCANSO → "Día de Descanso" 
   * 3. tipoPermiso → "Vacaciones", "Permiso Personal", etc.
   * 4. entradaReal/salidaReal → Hora real
   * 5. Sin datos → "Falta"
   */
  private getDayDisplayValue(dayData: any, type: 'entrada' | 'salida'): string {
    if (!dayData) return 'Sin Información';

    const tipoDia = dayData.tipoDia || '';
    const tipoPermiso = dayData.tipoPermiso || '';
    const entradaReal = dayData.entradaReal || '';
    const salidaReal = dayData.salidaReal || '';

    // Prioridad 1: Días feriados
    if (tipoDia === 'FERIADO') {
      return 'Día Feriado';
    }

    // Prioridad 2: Días de descanso
    if (tipoDia === 'DESCANSO') {
      return 'Día de Descanso';
    }

    // Prioridad 3: Permisos y vacaciones
    if (tipoPermiso) {
      return this.getPermisoDisplayName(tipoPermiso);
    }

    // Prioridad 4: Marcaciones reales
    const realValue = type === 'entrada' ? entradaReal : salidaReal;
    if (realValue && realValue !== '' && realValue !== 'FALTA') {
      return realValue;
    }

    // Prioridad 5: Sin marcación = Falta
    return 'Falta';
  }

  /**
   * Convierte códigos de permisos en nombres descriptivos para el usuario
   */
  private getPermisoDisplayName(tipoPermiso: string): string {
    const permisos: { [key: string]: string } = {
      'VAC': 'Vacaciones',
      'PERM': 'Permiso Personal',
      'MED': 'Permiso Médico',
      'LIC': 'Licencia',
      'COMP': 'Compensación',
      'TRAB': 'Trabajo Remoto',
      'CAP': 'Capacitación',
      'COM': 'Comisión',
      'DUE': 'Duelo',
      'MAT': 'Maternidad',
      'PAT': 'Paternidad',
      'LAC': 'Lactancia',
      'SIND': 'Sindical',
      'JUDI': 'Judicial'
    };

    return permisos[tipoPermiso] || `Permiso (${tipoPermiso})`;
  }

  /**
   * Obtiene el tipo de día desde los datos del empleado
   */
  private getDayTypeFromData(rowData: any, dateStr: string): string {
    if (!rowData?.dailyData) return 'LABORABLE';
    
    const dateKey = dateStr + 'T00:00:00';
    const dayData = rowData.dailyData[dateKey];
    
    return dayData?.tipoDia || 'LABORABLE';
  }

  /**
   * Aplica estilos CSS según el tipo de día y el contenido
   */
  private getCellStyleByDayType(params: any, dateStr: string, fieldType: 'entrada' | 'salida'): any {
    const tipoDia = this.getDayTypeFromData(params.data, dateStr);
    const value = params.value;
    
    let baseStyle = {
      'text-align': 'center' as const,
      'font-size': '11px',
      'padding': '6px 4px',
      'border-radius': '4px',
      'font-weight': '500'
    };

    // Estilos según tipo de día
    if (tipoDia === 'FERIADO') {
      return {
        ...baseStyle,
        'background-color': '#fee2e2',
        'color': '#dc2626',
        'border': '1px solid #fca5a5',
        'font-weight': 'bold'
      };
    }

    if (tipoDia === 'DESCANSO') {
      return {
        ...baseStyle,
        'background-color': '#f3f4f6',
        'color': '#4b5563',
        'border': '1px solid #d1d5db',
        'font-style': 'italic'
      };
    }

    // LABORABLE - estilos según el contenido
    if (value === 'Vacaciones' || value?.includes('Permiso') || value?.includes('Licencia') || value?.includes('Capacitación')) {
      return {
        ...baseStyle,
        'background-color': '#fef3c7',
        'color': '#d97706',
        'border': '1px solid #fbbf24',
        'font-weight': 'bold'
      };
    }

    if (value === 'Falta' || value === 'Sin Información') {
      return {
        ...baseStyle,
        'background-color': '#fee2e2',
        'color': '#dc2626',
        'border': '1px solid #fca5a5',
        'font-weight': 'bold'
      };
    }

    if (value && value !== '-' && !value.includes('Día')) {
      // Horarios normales
      return {
        ...baseStyle,
        'background-color': '#ecfdf5',
        'color': '#16a34a',
        'border': '1px solid #86efac',
        'font-family': 'monospace',
        'font-weight': 'bold'
      };
    }

    return {
      ...baseStyle,
      'background-color': '#f9fafb',
      'color': '#6b7280',
      'border': '1px solid #e5e7eb'
    };
  }

  /**
   * Formatea la celda con iconos y colores según el tipo de día
   */
  private formatTimeCellWithDayType(value: string, dateStr: string, rowData: any, type: 'entrada' | 'salida'): string {
    const tipoDia = this.getDayTypeFromData(rowData, dateStr);
    
    // Días feriados
    if (tipoDia === 'FERIADO') {
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-red-700">
                <span>🏛️</span>
                <span>Día Feriado</span>
              </div>`;
    }
    
    // Días de descanso
    if (tipoDia === 'DESCANSO') {
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 italic">
                <span>🛏️</span>
                <span>Día de Descanso</span>
              </div>`;
    }

    // Permisos y vacaciones
    if (value?.includes('Vacaciones')) {
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-yellow-700">
                <span>🌴</span>
                <span>${value}</span>
              </div>`;
    }

    if (value?.includes('Permiso') || value?.includes('Licencia')) {
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-yellow-700">
                <span>📋</span>
                <span>${value}</span>
              </div>`;
    }

    if (value?.includes('Capacitación')) {
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-yellow-700">
                <span>📚</span>
                <span>${value}</span>
              </div>`;
    }

    // Faltas
    if (value === 'Falta') {
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-red-700">
                <span>❌</span>
                <span>Falta</span>
              </div>`;
    }

    // Sin información
    if (value === 'Sin Información') {
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-500">
                <span>❓</span>
                <span>Sin Info</span>
              </div>`;
    }

    // Horarios normales
    if (value && value !== '-' && !value.includes('Día')) {
      const icon = type === 'entrada' ? '🟢' : '🔴';
      return `<div class="flex items-center justify-center gap-1 px-2 py-1 text-xs font-bold text-green-700 font-mono">
                <span>${icon}</span>
                <span>${value}</span>
              </div>`;
    }

    return `<div class="flex items-center justify-center px-2 py-1 text-xs text-gray-500">
              <span>-</span>
            </div>`;
  }
}