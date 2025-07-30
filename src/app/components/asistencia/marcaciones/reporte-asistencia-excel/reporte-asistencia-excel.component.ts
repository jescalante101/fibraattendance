import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AttendanceAnalysisService } from 'src/app/core/services/attendance-analysis.service';
import { 
  EmpleadoAsistencia, 
  DiaSemana, 
  ParametrosConsulta,
  AsistenciaResponse,
  SemanaInfo,
  ColumnaAsistencia
} from 'src/app/core/models/attendance-resport.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';

@Component({
  selector: 'app-reporte-asistencia-excel',
  templateUrl: './reporte-asistencia-excel.component.html',
  styleUrls: ['./reporte-asistencia-excel.component.css']
})
export class ReporteAsistenciaExcelComponent implements OnInit, OnDestroy, AfterViewInit {
  // ===== VIEW MODE TOGGLE =====
  viewMode: 'list' | 'excel' = 'excel';

  // ===== REACTIVE FORMS =====
  filterForm!: FormGroup;
  
  // ===== DATA SOURCES =====
  empleados: EmpleadoAsistencia[] = [];
  filteredEmpleados: EmpleadoAsistencia[] = [];
  loading = false;
  totalCount = 0;
  page = 1;
  pageSize = 50; // Más grande para vista Excel
  
  // ===== MASTER DATA =====
  sedes: CategoriaAuxiliar[] = [];
  areas: RhArea[] = [];
  
  // ===== UI STATE =====
  showFilters = false;
  showColumnsConfig = false;
  currentQuickFilter: string | null = null;
  
  // ===== DYNAMIC COLUMNS FOR EXCEL VIEW =====
  columnasEstaticas: ColumnaAsistencia[] = [
    { key: 'nroDoc', label: 'N° DOC', type: 'info', width: 100, align: 'left' },
    { key: 'fullNameEmployee', label: 'COLABORADOR', type: 'info', width: 200, align: 'left' },
    { key: 'areaDescription', label: 'ÁREA', type: 'info', width: 120, align: 'left' },
    { key: 'locationName', label: 'SEDE', type: 'info', width: 140, align: 'left' }
  ];
  
  columnasDinamicas: ColumnaAsistencia[] = [];
  todasLasColumnas: ColumnaAsistencia[] = [];
  
  // ===== FLATTENED DATA FOR LIST VIEW =====
  datosDetallados: any[] = [];
  
  // ===== SELECTION =====
  selectedRows: Set<EmpleadoAsistencia> = new Set();
  selectAllChecked = false;

  // ===== SORTING =====
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  // ===== STATISTICS =====
  quickStats = {
    total: 0,
    puntuales: 0,
    tardanzas: 0,
    faltas: 0,
    manuales: 0,
    noLaborable: 0
  };

  // ===== WEEK INFORMATION =====
  semanasInfo: SemanaInfo[] = [];

  // ===== QUICK FILTER =====
  quickFilter: string | null = null;

  // ===== LIFECYCLE =====
  private destroy$ = new Subject<void>();

  constructor(
    private attendanceAnalysisService: AttendanceAnalysisService,
    private fb: FormBuilder,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.loadInitialData();
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit() {
    this.setupStickyScrollHandlers();
  }

  // ===== INITIALIZATION =====
  private initializeForm() {
    this.filterForm = this.fb.group({
      fechaInicio: [''],
      fechaFin: [''],
      filter: [''],
      areaId: [''],
      locationId: ['']
    });
  }

  private loadInitialData() {
    this.getData();
    this.loadMasterData();
  }

  private loadMasterData() {
    // Load sedes
    this.categoriaAuxiliarService.getCategoriasAuxiliar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedes) => this.sedes = sedes,
        error: (error) => console.error('Error loading sedes:', error)
      });

    // Load areas
    this.rhAreaService.getAreas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => this.areas = areas,
        error: (error) => console.error('Error loading areas:', error)
      });
  }

  private setupFormSubscriptions() {
    // Debounce search input
    this.filterForm.get('filter')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.page = 1;
        this.getData();
      });

    // Auto-filter on area/location change
    ['areaId', 'locationId'].forEach(controlName => {
      this.filterForm.get(controlName)?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.page = 1;
          this.getData();
        });
    });
  }

  // ===== DATA MANAGEMENT =====
  getData() {
    this.loading = true;
    const filters: ParametrosConsulta = {
      fechaInicio: this.filterForm.value.fechaInicio,
      fechaFin: this.filterForm.value.fechaFin,
      empleado: this.filterForm.value.filter,
      area: this.filterForm.value.areaId,
      sede: this.filterForm.value.locationId,
      pageNumber: this.page,
      pageSize: this.pageSize
    };

    this.attendanceAnalysisService.getAttendanceReport(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AsistenciaResponse) => {
          this.empleados = response.data?.items || [];
          this.totalCount = response.data?.totalCount || 0;
          this.processData();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.handleDataError();
        }
      });
  }

  private handleDataError() {
    this.empleados = [];
    this.filteredEmpleados = [];
    this.datosDetallados = [];
    this.totalCount = 0;
    this.loading = false;
    this.updateQuickStats();
  }

  private processData() {
    // Generate dynamic columns from dias data
    this.generateDynamicColumns();
    
    // Generate flattened data for list view
    this.generateFlattenedData();
    
    // Apply current filters
    this.applyCurrentFilters();
    
    // Update statistics
    this.updateQuickStats();
    
    // Generate weeks info for headers
    this.generateSemanasInfo();
  }

  private generateDynamicColumns() {
    const diasUnicos = new Set<string>();
    
    // Recopilar todos los días únicos
    this.empleados.forEach(emp => {
      emp.diasSemana.forEach(dia => {
        diasUnicos.add(dia.fecha.split('T')[0]); // Solo la fecha sin hora
      });
    });

    // Convertir a array y ordenar
    const fechasOrdenadas = Array.from(diasUnicos).sort();
    
    // Generar columnas dinámicas
    this.columnasDinamicas = [];
    
    fechasOrdenadas.forEach(fecha => {
      const fechaObj = new Date(fecha);
      const nombreDia = this.getNombreDia(fechaObj.getDay()).toUpperCase();
      const fechaFormateada = this.formatearFecha(fechaObj);
      
      // Grupo de columnas por día
      const baseKey = fecha.replace(/-/g, '');
      
      this.columnasDinamicas.push(
        { 
          key: `${baseKey}_entrada`, 
          label: `${nombreDia}\n${fechaFormateada}\nENTRADA`, 
          type: 'hora',
          width: 80,
          align: 'center'
        },
        { 
          key: `${baseKey}_salida`, 
          label: `SALIDA`, 
          type: 'hora',
          width: 80,
          align: 'center'
        },
        { 
          key: `${baseKey}_break_entrada`, 
          label: `ENT BREAK`, 
          type: 'hora',
          width: 80,
          align: 'center'
        },
        { 
          key: `${baseKey}_break_salida`, 
          label: `SAL BREAK`, 
          type: 'hora',
          width: 80,
          align: 'center'
        },
        { 
          key: `${baseKey}_turno`, 
          label: `TURNO`, 
          type: 'estado',
          width: 100,
          align: 'center'
        },
        { 
          key: `${baseKey}_estado`, 
          label: `ESTADO`, 
          type: 'estado',
          width: 80,
          align: 'center'
        },
        { 
          key: `${baseKey}_observaciones`, 
          label: `OBS`, 
          type: 'observacion',
          width: 100,
          align: 'center'
        }
      );
    });

    // Combinar columnas estáticas y dinámicas
    this.todasLasColumnas = [...this.columnasEstaticas, ...this.columnasDinamicas];
  }

  private generateFlattenedData() {
    this.datosDetallados = [];
    
    this.empleados.forEach(empleado => {
      empleado.diasSemana.forEach(dia => {
        this.datosDetallados.push({
          // Datos del empleado
          nroDoc: empleado.nroDoc,
          employeeId: empleado.employeeId,
          fullNameEmployee: empleado.fullNameEmployee,
          areaDescription: empleado.areaDescription,
          locationName: empleado.locationName,
          
          // Datos del día
          fecha: dia.fecha,
          fechaFormateada: this.formatearFecha(new Date(dia.fecha)),
          diaSemana: dia.diaSemana,
          shiftName: dia.shiftName,
          horaEntrada: dia.horaEntrada,
          horaSalida: dia.horaSalida,
          horaEntradaBreak: dia.horaEntradaBreak,
          horaSalidaBreak: dia.horaSalidaBreak,
          estadoDia: dia.estadoDia,
          totalMinutosTardanza: dia.totalMinutosTardanza,
          tieneMarcacionManual: dia.tieneMarcacionManual,
          observaciones: dia.observaciones,
          
          // Para estadísticas
          esFalta: dia.estadoDia === 'FALTA',
          esTardanza: dia.totalMinutosTardanza > 0,
          esPuntual: dia.estadoDia === 'PRESENTE' && dia.totalMinutosTardanza === 0,
          esMarcacionManual: dia.tieneMarcacionManual
        });
      });
    });
  }

  private generateSemanasInfo() {
    const fechasUnicas = new Set<string>();
    
    this.empleados.forEach(emp => {
      emp.diasSemana.forEach(dia => {
        fechasUnicas.add(dia.fecha.split('T')[0]);
      });
    });

    const fechasOrdenadas = Array.from(fechasUnicas).sort();
    
    if (fechasOrdenadas.length === 0) {
      this.semanasInfo = [];
      return;
    }

    // Agrupar por semanas (simplificado - asume fechas consecutivas)
    const primeraFecha = fechasOrdenadas[0];
    const ultimaFecha = fechasOrdenadas[fechasOrdenadas.length - 1];
    
    this.semanasInfo = [{
      fechaInicio: primeraFecha,
      fechaFin: ultimaFecha,
      dias: fechasOrdenadas.map(fecha => ({
        fecha,
        diaSemana: this.getNombreDia(new Date(fecha).getDay()).toLowerCase(),
        nombreDia: this.getNombreDia(new Date(fecha).getDay()).toUpperCase()
      }))
    }];
  }

  // ===== VIEW MODE TOGGLE =====
  toggleViewMode() {
    this.viewMode = this.viewMode === 'list' ? 'excel' : 'list';
    
    // Adjust page size based on view mode
    if (this.viewMode === 'excel') {
      this.pageSize = 50; // Más filas para vista Excel
    } else {
      this.pageSize = 20; // Vista detallada normal
    }
    
    this.page = 1;
    this.getData();
  }

  // ===== EXCEL VIEW DATA ACCESS =====
  getExcelCellValue(empleado: EmpleadoAsistencia, columna: ColumnaAsistencia): any {
    // Para columnas estáticas
    if (columna.type === 'info') {
      return (empleado as any)[columna.key] || '-';
    }
    
    // Para columnas dinámicas de días
    const fechaKey = this.extractFechaFromKey(columna.key);
    const campoKey = this.extractCampoFromKey(columna.key);
    
    const diaData = empleado.diasSemana.find(dia => 
      dia.fecha.split('T')[0].replace(/-/g, '') === fechaKey
    );
    
    if (!diaData) return '-';
    
    switch (campoKey) {
      case 'entrada': return this.formatHora(diaData.horaEntrada);
      case 'salida': return this.formatHora(diaData.horaSalida);
      case 'break_entrada': return this.formatHora(diaData.horaEntradaBreak);
      case 'break_salida': return this.formatHora(diaData.horaSalidaBreak);
      case 'turno': return diaData.shiftName || '-';
      case 'estado': return diaData.estadoDia || '-';
      case 'observaciones': return diaData.observaciones || '-';
      default: return '-';
    }
  }

  getExcelCellClass(empleado: EmpleadoAsistencia, columna: ColumnaAsistencia): string {
    if (columna.type === 'info') return '';
    
    const fechaKey = this.extractFechaFromKey(columna.key);
    const diaData = empleado.diasSemana.find(dia => 
      dia.fecha.split('T')[0].replace(/-/g, '') === fechaKey
    );
    
    if (!diaData) return '';
    
    if (diaData.estadoDia === 'FALTA') return 'bg-red-50';
    if (diaData.tieneMarcacionManual) return 'bg-yellow-50';
    if (diaData.totalMinutosTardanza > 0) return 'bg-orange-50';
    return 'bg-green-50';
  }

  // ===== UTILITY METHODS =====
  private extractFechaFromKey(key: string): string {
    // Extraer fecha del key, ej: "20250721_entrada" -> "20250721"
    return key.split('_')[0];
  }

  private extractCampoFromKey(key: string): string {
    // Extraer campo del key, ej: "20250721_entrada" -> "entrada"
    const parts = key.split('_');
    return parts.slice(1).join('_');
  }

  public formatHora(hora: string | null): string {
    if (!hora || hora === 'FALTA') return '-';
    return hora.length > 5 ? hora.substring(0, 5) : hora;
  }

  private getNombreDia(dayIndex: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dayIndex];
  }

  // Cambiar a público
  public formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  }

  // Nuevo método auxiliar para el template
  public formatearFechaTemplate(fecha: string | Date): string {
    return this.formatearFecha(new Date(fecha));
  }

  // ===== FILTERS AND STATISTICS =====
  private applyCurrentFilters() {
    if (this.quickFilter) {
      this.applyQuickStatsFilter(this.quickFilter, true);
    } else {
      this.filteredEmpleados = [...this.empleados];
    }
  }

  private updateQuickStats() {
    let totalMarcaciones = 0;
    let puntuales = 0;
    let tardanzas = 0;
    let faltas = 0;
    let manuales = 0;

    this.empleados.forEach(empleado => {
      empleado.diasSemana.forEach(dia => {
        totalMarcaciones++;
        if (dia.estadoDia === 'FALTA') faltas++;
        else if (dia.tieneMarcacionManual) manuales++;
        else if (dia.totalMinutosTardanza > 0) tardanzas++;
        else puntuales++;
      });
    });

    this.quickStats = {
      total: totalMarcaciones,
      puntuales,
      tardanzas,
      faltas,
      manuales,
      noLaborable: totalMarcaciones - (puntuales + tardanzas + faltas + manuales)
    };
  }

  applyQuickStatsFilter(type: string | null, skipUpdate = false) {
    this.quickFilter = type;
    
    if (!type) {
      this.filteredEmpleados = [...this.empleados];
      return;
    }

    // Filter employees based on their dias data
    this.filteredEmpleados = this.empleados.filter(empleado => {
      return empleado.diasSemana.some(dia => {
        switch (type) {
          case 'puntuales': 
            return dia.estadoDia === 'PRESENTE' && dia.totalMinutosTardanza === 0;
          case 'tardanzas': 
            return dia.totalMinutosTardanza > 0;
          case 'faltas': 
            return dia.estadoDia === 'FALTA';
          case 'manuales': 
            return dia.tieneMarcacionManual;
          default: 
            return true;
        }
      });
    });
  }

  clearQuickStatsFilter() {
    this.quickFilter = null;
    this.filteredEmpleados = [...this.empleados];
  }

  // ===== QUICK FILTERS =====
  applyQuickFilter(type: string) {
    this.currentQuickFilter = this.currentQuickFilter === type ? null : type;
    
    const today = new Date();
    
    switch (type) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        this.filterForm.patchValue({
          fechaInicio: todayStr,
          fechaFin: todayStr
        });
        break;
      case 'week':
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        this.filterForm.patchValue({
          fechaInicio: startOfWeek.toISOString().split('T')[0],
          fechaFin: endOfWeek.toISOString().split('T')[0]
        });
        break;
      case 'month':
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        this.filterForm.patchValue({
          fechaInicio: firstDay.toISOString().split('T')[0],
          fechaFin: lastDay.toISOString().split('T')[0]
        });
        break;
    }
    this.onFilter();
  }

  onFilter() {
    this.page = 1;
    this.clearQuickStatsFilter();
    this.getData();
  }

  hasFilters(): boolean {
    const formValues = this.filterForm.value;
    return Object.values(formValues).some(value => value && value !== '');
  }

  clearAllFilters() {
    this.filterForm.reset();
    this.currentQuickFilter = null;
    this.clearQuickStatsFilter();
    this.onFilter();
  }

  // ===== UI HELPERS =====
  getQuickFilterClass(type: string): string {
    return this.currentQuickFilter === type 
      ? 'bg-blue-50 text-blue-700 border-blue-200' 
      : 'bg-gray-50 text-gray-700 border-gray-200';
  }

  getStatsCardClass(type: string | null): string {
    const isActive = this.quickFilter === type;
    const baseClasses = 'transform hover:scale-105';
    
    if (isActive) {
      if (type === 'puntuales') return baseClasses + ' ring-2 ring-green-500';
      if (type === 'tardanzas') return baseClasses + ' ring-2 ring-orange-500';
      if (type === 'faltas') return baseClasses + ' ring-2 ring-red-500';
      if (type === 'manuales') return baseClasses + ' ring-2 ring-yellow-500';
      if (type === 'noLaborable') return baseClasses + ' ring-2 ring-gray-500';
      return baseClasses + ' ring-2 ring-blue-500';
    }
    
    return baseClasses;
  }

  getQuickFilterLabel(filter: string): string {
    switch (filter) {
      case 'puntuales': return 'Puntuales';
      case 'tardanzas': return 'Tardanzas';
      case 'faltas': return 'Faltas';
      case 'manuales': return 'Manuales';
      case 'noLaborable': return 'No Laborable';
      default: return filter;
    }
  }

  // ===== PAGINATION =====
  get totalPages(): number {
    return this.totalCount > 0 ? Math.ceil(this.totalCount / this.pageSize) : 1;
  }

  getPageStart(): number {
    return (this.page - 1) * this.pageSize + 1;
  }

  getPageEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  onPageChange(newPage: number | string) {
    if (typeof newPage !== 'number') return;
    if (newPage >= 1 && newPage <= this.totalPages && newPage !== this.page) {
      this.page = newPage;
      this.getData();
    }
  }

  onPageSizeChange() {
    this.page = 1;
    this.getData();
  }

  getVisiblePages(): (number | string)[] {
    const totalPages = this.totalPages;
    const current = this.page;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (current >= totalPages - 3) {
        pages.push(1, '...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1, '...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...', totalPages);
      }
    }

    return pages;
  }

  // ===== SELECTION =====
  toggleSelectAll() {
    if (this.selectAllChecked) {
      this.selectedRows.clear();
    } else {
      this.filteredEmpleados.forEach(item => this.selectedRows.add(item));
    }
    this.selectAllChecked = !this.selectAllChecked;
  }

  toggleRowSelection(item: EmpleadoAsistencia) {
    if (this.selectedRows.has(item)) {
      this.selectedRows.delete(item);
    } else {
      this.selectedRows.add(item);
    }
    this.updateSelectAllState();
  }

  isRowSelected(item: EmpleadoAsistencia): boolean {
    return this.selectedRows.has(item);
  }

  isIndeterminate(): boolean {
    const selectedCount = this.selectedRows.size;
    const totalCount = this.filteredEmpleados.length;
    return selectedCount > 0 && selectedCount < totalCount;
  }

  private updateSelectAllState() {
    const totalCount = this.filteredEmpleados.length;
    this.selectAllChecked = totalCount > 0 && this.selectedRows.size === totalCount;
  }

  clearSelection() {
    this.selectedRows.clear();
    this.selectAllChecked = false;
  }

  // ===== ACTIONS =====
  viewDetails(item: EmpleadoAsistencia) {
    console.log('View details:', item);
    // Implement view details logic
  }

  editItem(item: EmpleadoAsistencia) {
    console.log('Edit item:', item);
    // Implement edit logic
  }

  // ===== EXPORT =====
  exportToExcel() {
    if (this.viewMode === 'excel') {
      this.exportExcelViewToExcel();
    } else {
      this.exportListViewToExcel();
    }
  }

  private exportExcelViewToExcel() {
    // Implementar exportación de vista Excel
    console.log('Export Excel view to Excel');
  }

  private exportListViewToExcel() {
    // Implementar exportación de vista lista
    console.log('Export List view to Excel');
  }

  exportToPDF() {
    console.log('Export to PDF');
  }

  exportSelectedToExcel() {
    if (this.selectedRows.size === 0) return;
    console.log('Export selected to Excel', this.selectedRows.size);
  }

  // ===== SCROLL SYNC =====
  private setupStickyScrollHandlers() {
    setTimeout(() => {
      const headerContainer = document.getElementById('tableHeaderContainer');
      const bodyContainer = document.getElementById('tableContainer');
      
      if (headerContainer && bodyContainer) {
        bodyContainer.addEventListener('scroll', () => {
          headerContainer.scrollLeft = bodyContainer.scrollLeft;
        }, { passive: true });
        
        headerContainer.addEventListener('scroll', () => {
          bodyContainer.scrollLeft = headerContainer.scrollLeft;
        }, { passive: true });
      }
    }, 100);
  }

  // ===== EXCEL VIEW HELPERS =====
  getAllDaysFromSemanas(): any[] {
    const allDays: any[] = [];
    this.semanasInfo.forEach(semana => {
      allDays.push(...semana.dias);
    });
    return allDays;
  }

  getExcelTableColspan(): number {
    return this.columnasEstaticas.length + (this.getAllDaysFromSemanas().length * 7);
  }

  getExcelDayValue(empleado: EmpleadoAsistencia, fecha: string, campo: string): string {
    const fechaFormateada = fecha.replace(/-/g, '');
    const diaData = empleado.diasSemana.find(dia => 
      dia.fecha.split('T')[0].replace(/-/g, '') === fechaFormateada
    );
    
    if (!diaData) return '-';
    
    switch (campo) {
      case 'horaEntrada':
        return this.formatHora(diaData.horaEntrada);
      case 'horaSalida':
        return this.formatHora(diaData.horaSalida);
      case 'horaEntradaBreak':
        return this.formatHora(diaData.horaEntradaBreak);
      case 'horaSalidaBreak':
        return this.formatHora(diaData.horaSalidaBreak);
      case 'shiftName':
        return diaData.shiftName || '-';
      case 'estadoDia':
        return diaData.estadoDia || '-';
      case 'observaciones':
        return diaData.observaciones || '-';
      default:
        return '-';
    }
  }

  getExcelDayCellClass(empleado: EmpleadoAsistencia, fecha: string, campo: string): string {
    const fechaFormateada = fecha.replace(/-/g, '');
    const diaData = empleado.diasSemana.find(dia => 
      dia.fecha.split('T')[0].replace(/-/g, '') === fechaFormateada
    );
    
    if (!diaData) return 'bg-gray-100';
    
    // Color base según el estado del día
    let baseClass = '';
    if (diaData.estadoDia === 'FALTA') {
      baseClass = 'bg-red-50 text-red-800';
    } else if (diaData.tieneMarcacionManual) {
      baseClass = 'bg-yellow-50 text-yellow-800';
    } else if (diaData.totalMinutosTardanza > 0) {
      baseClass = 'bg-orange-50 text-orange-800';
    } else if (diaData.estadoDia === 'PRESENTE') {
      baseClass = 'bg-green-50 text-green-800';
    } else {
      baseClass = 'bg-gray-50 text-gray-600';
    }
    
    return baseClass;
  }

  // ===== LIST VIEW HELPERS =====
  getListRowClass(detalle: any): string {
    if (detalle.esFalta) return 'bg-red-50';
    if (detalle.esMarcacionManual && !detalle.esFalta) return 'bg-yellow-50';
    if (detalle.esTardanza) return 'bg-orange-50';
    if (detalle.esPuntual) return 'bg-green-50';
    return '';
  }

  getHourClass(hora: string): string {
    if (!hora || hora === 'FALTA') return 'text-red-600 font-medium';
    return 'text-gray-900';
  }

  getEstadoBadgeClass(estado: string): string {
    switch ((estado || '').toLowerCase()) {
      case 'presente':
        return 'bg-green-100 text-green-800';
      case 'falta':
        return 'bg-red-100 text-red-800';
      case 'tardanza':
        return 'bg-orange-100 text-orange-800';
      case 'manual':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // ===== COLUMN MANAGEMENT =====
  showAllColumns() {
    // Para vista Excel, esto podría expandir todas las sub-columnas
    console.log('Show all columns - Excel view');
  }

  hideAllColumns() {
    // Para vista Excel, esto podría colapsar sub-columnas no esenciales
    console.log('Hide all columns - Excel view');
  }

  // ===== SELECTION FOR LIST VIEW =====
  isDetalleSelected(detalle: any): boolean {
    // Para vista lista, verificar si el empleado está seleccionado
    return Array.from(this.selectedRows).some(emp => emp.employeeId === detalle.employeeId);
  }

  toggleDetalleSelection(detalle: any) {
    // Buscar el empleado correspondiente y toggle su selección
    const empleado = this.filteredEmpleados.find(emp => emp.employeeId === detalle.employeeId);
    if (empleado) {
      this.toggleRowSelection(empleado);
    }
  }

  // ===== TRACK BY =====
  trackByEmpleado(index: number, item: EmpleadoAsistencia): any {
    return item.employeeId;
  }

  trackByDetalle(index: number, item: any): any {
    return `${item.employeeId}_${item.fecha}`;
  }
}