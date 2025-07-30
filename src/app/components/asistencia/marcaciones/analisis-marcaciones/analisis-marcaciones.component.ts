import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AttendanceAnalysisService } from 'src/app/core/services/attendance-analysis.service';
import { AttendanceAnalysis, ReportResponse, Datum, ParamsReport } from 'src/app/models/attendance-analysis/attendance-analysis.model';
import { ApiResponse } from 'src/app/core/models/api-response.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaz para datos agrupados por empleado y fecha
interface GroupedAttendanceRecord {
  employeeId: string;
  fullNameEmployee: string;
  nroDoc: string;
  areaDescription: string;
  locationName: string;
  areaId: string;
  locationId: string;
  fecha: Date;
  fechaFormateada: string;
  shiftName: string;
  tipoHorario: string;
  exceptionRemarks: string | null;
  tipoPermiso: string | null;
  diasInfo: string | null;
  razonManual: string | null;
  validacionRango: string;
  // Indicadores calculados
  esPuntual: boolean;
  esTardanza: boolean;
  esFalta: boolean;
  esMarcacionManual: boolean;
  marcaciones: {
    entrada?: {
      intervalAlias: string;
      horaEsperada: string;
      horaMarcacionReal: string;
      estadoMarcacion: string;
      tipoMarcacion: string;
      diferenciaMinutos: number;
      minutosTardanza: number;
      minutosAdelanto: number;
      origenMarcacion: string;
      informacionAdicional: string;
    };
    salida?: {
      intervalAlias: string;
      horaEsperada: string;
      horaMarcacionReal: string;
      estadoMarcacion: string;
      tipoMarcacion: string;
      diferenciaMinutos: number;
      minutosTardanza: number;
      minutosAdelanto: number;
      origenMarcacion: string;
      informacionAdicional: string;
    };
  };
}

@Component({
  selector: 'app-analisis-marcaciones',
  templateUrl: './analisis-marcaciones.component.html',
  styleUrls: ['./analisis-marcaciones.component.css']
})
export class AnalisisMarcacionesComponent implements OnInit, OnDestroy, AfterViewInit {
  // Reactive forms
  filterForm!: FormGroup;
  
  // Table data
  dataSource = new MatTableDataSource<AttendanceAnalysis>([]);
  // Nueva estructura para datos agrupados
  groupedDataSource = new MatTableDataSource<GroupedAttendanceRecord>([]);
  reportResponse: ReportResponse | null = null;
  loading = false;
  totalCount = 0;
  page = 1;
  pageSize = 50;
  totalPages = 0;
  
  // Master data
  sedes: CategoriaAuxiliar[] = [];
  areas: RhArea[] = [];
  
  // UI state
  showFilters = false;
  showColumnsConfig = false;
  currentQuickFilter: string | null = null;
  
  // Column configuration
  columns = [
    { id: 'fullNameEmployee', label: 'Empleado', visible: true },
    { id: 'nroDoc', label: 'Documento', visible: true },
    { id: 'areaDescription', label: 'Área', visible: true },
    { id: 'locationName', label: 'Sede', visible: true },
    { id: 'fechaFormateada', label: 'Fecha', visible: true },
    { id: 'shiftName', label: 'Turno', visible: true },
    { id: 'intervalAlias', label: 'Horario', visible: true },
    { id: 'horaEsperada', label: 'Esperado', visible: true },
    { id: 'horaMarcacionReal', label: 'Real', visible: true },
    { id: 'estadoMarcacion', label: 'Estado', visible: true },
    { id: 'minutosTardanza', label: 'Tardanza', visible: false },
    { id: 'minutosAdelanto', label: 'Adelanto', visible: false },
    { id: 'tipoMarcacion', label: 'Tipo Horario', visible: false },
    { id: 'exceptionRemarks', label: 'Observaciones', visible: true },
    { id: 'tipoPermiso', label: 'Tipo Permiso', visible: false },
    { id: 'diasInfo', label: 'Días Info', visible: false },
    { id: 'razonManual', label: 'Razón Manual', visible: false },
    { id: 'validacionRango', label: 'Validación', visible: false },
    { id: 'informacionAdicional', label: 'Info Adicional', visible: false },
    { id: 'origenMarcacion', label: 'Origen', visible: false },
    { id: 'actions', label: 'Acciones', visible: true }
  ];

  // Data management
  allData: AttendanceAnalysis[] = [];
  filteredData: AttendanceAnalysis[] = [];
  quickFilter: string | null = null;
  selectedRows: Set<AttendanceAnalysis> = new Set();
  selectAllChecked = false;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' | '' = '';

  // Statistics
  quickStats = {
    total: 0,
    puntuales: 0,
    tardanzas: 0,
    faltas: 0,
    manuales: 0,
    noLaborable: 0
  };

  // Lifecycle management
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
    
    // Clean up scroll event listeners
    const headerContainer = document.getElementById('tableHeaderContainer');
    const bodyContainer = document.getElementById('tableContainer');
    
    if (headerContainer && bodyContainer) {
      headerContainer.removeEventListener('scroll', this.syncHeaderScroll);
      bodyContainer.removeEventListener('scroll', this.syncBodyScroll);
    }
  }

  // Scroll sync methods
  private syncHeaderScroll = (event: Event) => {
    const headerContainer = event.target as HTMLElement;
    const bodyContainer = document.getElementById('tableContainer');
    if (bodyContainer) {
      bodyContainer.scrollLeft = headerContainer.scrollLeft;
    }
  };

  private syncBodyScroll = (event: Event) => {
    const bodyContainer = event.target as HTMLElement;
    const headerContainer = document.getElementById('tableHeaderContainer');
    if (headerContainer) {
      headerContainer.scrollLeft = bodyContainer.scrollLeft;
    }
  };

  ngAfterViewInit() {
    this.setupStickyScrollHandlers();
  }

  // ===== STICKY SCROLL HANDLERS =====
  private setupStickyScrollHandlers() {
    // Sincronizar scroll horizontal entre header y body de la tabla
    setTimeout(() => {
      const headerContainer = document.getElementById('tableHeaderContainer');
      const bodyContainer = document.getElementById('tableContainer');
      
      if (headerContainer && bodyContainer) {
        // Cuando el body hace scroll, mover el header
        bodyContainer.addEventListener('scroll', () => {
          headerContainer.scrollLeft = bodyContainer.scrollLeft;
        }, { passive: true });
        
        // Cuando el header hace scroll, mover el body
        headerContainer.addEventListener('scroll', () => {
          bodyContainer.scrollLeft = headerContainer.scrollLeft;
        }, { passive: true });
      }
    }, 100);
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
    this.filterForm.get('areaId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.getData();
      });

    this.filterForm.get('locationId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.getData();
      });
  }

  // ===== DATA MANAGEMENT =====
  getData() {
    this.loading = true;
    const formValues = this.filterForm.value;
    
    // Construir parámetros para la nueva API
    const params: ParamsReport = {
      fechaInicio: formValues.fechaInicio ? new Date(formValues.fechaInicio) : new Date(),
      fechaFin: formValues.fechaFin ? new Date(formValues.fechaFin) : new Date(),
      employeeId: formValues.filter || null,
      areaId: formValues.areaId || null,
      locationId: formValues.locationId || null,
      pageNumber: this.page,
      pageSize: this.pageSize
    };
    console.log("params",params);
    
    this.attendanceAnalysisService.getAttendanceAnalysisV2(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ReportResponse) => {
          console.log('Nueva API Response:', response);
          this.reportResponse = response;
          this.totalCount = response.totalRecords;
          this.totalPages = response.totalPages;
          
          // Procesar y agrupar los datos
          const groupedData = this.groupAttendanceData(response.data);
          this.groupedDataSource.data = groupedData;
          
          // Mantener compatibilidad con el código existente
          this.allData = response.data as any[];
          this.applyCurrentFilters();
          this.loading = false;
          this.updateQuickStats();
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.handleDataError();
        }
      });
  }

  private handleDataError() {
    this.allData = [];
    this.filteredData = [];
    this.dataSource.data = [];
    this.groupedDataSource.data = [];
    this.totalCount = 0;
    this.loading = false;
    this.updateQuickStats();
  }

  /**
   * Agrupa los datos de marcaciones por empleado y fecha, 
   * combinando entrada y salida en una sola fila
   */
  private groupAttendanceData(data: Datum[]): GroupedAttendanceRecord[] {
    const grouped = new Map<string, GroupedAttendanceRecord>();

    data.forEach(item => {
      // Crear clave única por empleado y fecha
      const dateKey = new Date(item.fecha).toISOString().split('T')[0];
      const key = `${item.employeeId}-${dateKey}`;

      // Si no existe el registro, crearlo
      if (!grouped.has(key)) {
        grouped.set(key, {
          employeeId: item.employeeId,
          fullNameEmployee: item.fullNameEmployee,
          nroDoc: item.nroDoc,
          areaDescription: item.areaDescription,
          locationName: item.locationName,
          areaId: item.areaId,
          locationId: item.locationId,
          fecha: new Date(item.fecha),
          fechaFormateada: this.formatDate(new Date(item.fecha)),
          shiftName: item.shiftName,
          tipoHorario: item.tipoHorario || '',
          exceptionRemarks: item.exceptionRemarks,
          tipoPermiso: item.tipoPermiso,
          diasInfo: item.diasInfo,
          razonManual: item.razonManual,
          validacionRango: item.validacionRango || '',
          // Inicializar indicadores
          esPuntual: false,
          esTardanza: false,
          esFalta: false,
          esMarcacionManual: false,
          marcaciones: {}
        });
      }

      const record = grouped.get(key)!;

      // Determinar si es entrada o salida basado en el tipo de marcación
      const isEntrada = item.tipoMarcacion?.toLowerCase().includes('entrada') || 
                       item.tipoMarcacion?.toLowerCase().includes('in') ||
                       item.intervalAlias?.toLowerCase().includes('entrada');

      if (isEntrada) {
        record.marcaciones.entrada = {
          intervalAlias: item.intervalAlias,
          horaEsperada: item.horaEsperada,
          horaMarcacionReal: item.horaMarcacionReal,
          estadoMarcacion: item.estadoMarcacion,
          tipoMarcacion: item.tipoMarcacion,
          diferenciaMinutos: item.diferenciaMinutos,
          minutosTardanza: item.minutosTardanza,
          minutosAdelanto: item.minutosAdelanto,
          origenMarcacion: item.origenMarcacion,
          informacionAdicional: item.informacionAdicional
        };
      } else {
        record.marcaciones.salida = {
          intervalAlias: item.intervalAlias,
          horaEsperada: item.horaEsperada,
          horaMarcacionReal: item.horaMarcacionReal,
          estadoMarcacion: item.estadoMarcacion,
          tipoMarcacion: item.tipoMarcacion,
          diferenciaMinutos: item.diferenciaMinutos,
          minutosTardanza: item.minutosTardanza,
          minutosAdelanto: item.minutosAdelanto,
          origenMarcacion: item.origenMarcacion,
          informacionAdicional: item.informacionAdicional
        };
      }
    });

    // Calcular indicadores para cada registro agrupado
    const groupedArray = Array.from(grouped.values());
    groupedArray.forEach(record => {
      this.calculateIndicators(record);
    });

    return groupedArray.sort((a, b) => {
      // Ordenar por fecha descendente, luego por empleado
      const dateCompare = b.fecha.getTime() - a.fecha.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.fullNameEmployee.localeCompare(b.fullNameEmployee);
    });
  }

  /**
   * Calcula los indicadores de puntualidad para un registro agrupado
   */
  private calculateIndicators(record: GroupedAttendanceRecord) {
    const entrada = record.marcaciones.entrada;
    const salida = record.marcaciones.salida;

    // Es falta si no hay entrada ni salida marcada
    record.esFalta = !entrada?.horaMarcacionReal && !salida?.horaMarcacionReal;

    // Es tardanza si hay tardanza en la entrada
    record.esTardanza = !!(entrada && entrada.minutosTardanza > 0);

    // Es puntual si tiene marcaciones y no es tardanza ni falta
    record.esPuntual = !record.esFalta && !record.esTardanza && 
                      (!!entrada?.horaMarcacionReal || !!salida?.horaMarcacionReal);

    // Es marcación manual si el origen es manual
    record.esMarcacionManual = !!(entrada?.origenMarcacion?.toLowerCase().includes('manual') ||
                                salida?.origenMarcacion?.toLowerCase().includes('manual'));
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private applyCurrentFilters() {
    if (this.quickFilter) {
      this.applyQuickStatsFilter(this.quickFilter, true);
    } else {
      this.filteredData = [...this.allData];
      this.dataSource.data = this.filteredData;
    }
    this.applySort();
  }

  // ===== STATISTICS FILTERS =====

  // ===== COMPUTED PROPERTIES =====
  get displayedColumns(): string[] {
    return this.columns.filter(c => c.visible).map(c => c.id);
  }

  get visibleColumns() {
    return this.columns.filter(c => c.visible);
  }

  visibleColumnsFiltered() {
    return this.columns.filter(c => c.visible && c.id !== 'fullNameEmployee' && c.id !== 'actions');
  }

  /* get totalPages(): number {
    return this.totalCount > 0 ? Math.ceil(this.totalCount / this.pageSize) : 1;
  } */

  // ===== UI HELPERS =====
  isColumnVisible(id: string): boolean {
    return !!this.columns.find(c => c.id === id && c.visible);
  }

  getColumnValue(item: AttendanceAnalysis, colId: string): any {
    return (item as any)[colId];
  }

  getRowClass(item: AttendanceAnalysis): string {
    if (item.esFalta) return 'bg-red-50';
    if (item.esMarcacionManual && !item.esFalta) return 'bg-yellow-50';
    if (item.esTardanza) return 'bg-orange-50';
    return '';
  }

  getGroupedRowClass(record: GroupedAttendanceRecord): string {
    if (record.esFalta) return 'bg-red-50 hover:bg-red-100';
    if (record.esMarcacionManual && !record.esFalta) return 'bg-yellow-50 hover:bg-yellow-100';
    if (record.esTardanza) return 'bg-orange-50 hover:bg-orange-100';
    if (record.esPuntual) return 'bg-green-50 hover:bg-green-100';
    return 'hover:bg-gray-50';
  }

  getBadgeClass(field: string, value: boolean): string {
    const baseClass = 'badge ';
    if (!value) return baseClass + 'bg-gray-100 text-gray-800';
    
    switch (field) {
      case 'esFalta': return baseClass + 'bg-red-100 text-red-800';
      case 'esMarcacionManual': return baseClass + 'bg-yellow-100 text-yellow-800';
      case 'esTardanza': return baseClass + 'bg-orange-100 text-orange-800';
      case 'esPuntual': return baseClass + 'bg-green-100 text-green-800';
      default: return baseClass + 'bg-gray-100 text-gray-800';
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const baseClass = 'badge ';
    switch ((estado || '').toLowerCase()) {
      case 'puntual': return baseClass + 'bg-green-100 text-green-800';
      case 'falta': return baseClass + 'bg-red-100 text-red-800';
      case 'tardanza': return baseClass + 'bg-orange-100 text-orange-800';
      case 'manual': return baseClass + 'bg-yellow-100 text-yellow-800';
      default: return baseClass + 'bg-gray-100 text-gray-800';
    }
  }

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

  // ===== FORMATTING HELPERS =====
  formatTime(time: string): string {
    return time ? time.substring(0, 5) : '-';
  }

  formatMinutes(minutes: number): string {
    return minutes ? `${minutes} min` : '-';
  }

  // ===== PAGINATION =====
  getPageStart(): number {
    return (this.page - 1) * this.pageSize + 1;
  }

  getPageEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
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

  onPageChange(newPage: number | string) {
    if (typeof newPage !== 'number') return;
    if (newPage >= 1 && newPage <= this.totalPages && newPage !== this.page) {
      this.page = newPage;
      this.getData();
    }
  }

  isNumber(val: any): val is number {
    return typeof val === 'number';
  }

  onPageSizeChange() {
    this.page = 1;
    this.getData();
  }

  // ===== FILTERS =====
  onFilter() {
    this.page = 1;
    this.clearQuickStatsFilter();
    this.getData();
  }

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

  // ===== SORTING =====
  onSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : (this.sortDirection === 'desc' ? '' : 'asc');
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    if (this.sortDirection === '') {
      this.sortColumn = '';
    }
    
    this.applySortToGroupedData();
  }

  private applySort() {
    if (!this.sortColumn || !this.sortDirection) {
      this.dataSource.data = [...this.filteredData];
      return;
    }

    const sortedData = [...this.filteredData].sort((a, b) => {
      const aValue = this.getColumnValue(a, this.sortColumn);
      const bValue = this.getColumnValue(b, this.sortColumn);
      
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const comparison = String(aValue).localeCompare(String(bValue), 'es', { numeric: true });
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    this.dataSource.data = sortedData;
  }

  private applySortToGroupedData() {
    if (!this.sortColumn || !this.sortDirection) {
      return;
    }

    const sortedData = [...this.groupedDataSource.data].sort((a, b) => {
      let aValue: any, bValue: any;
      
      // Obtener valor según la columna
      switch (this.sortColumn) {
        case 'fullNameEmployee':
          aValue = a.fullNameEmployee;
          bValue = b.fullNameEmployee;
          break;
        case 'nroDoc':
          aValue = a.nroDoc;
          bValue = b.nroDoc;
          break;
        case 'areaDescription':
          aValue = a.areaDescription;
          bValue = b.areaDescription;
          break;
        case 'locationName':
          aValue = a.locationName;
          bValue = b.locationName;
          break;
        case 'fechaFormateada':
          aValue = a.fecha.getTime();
          bValue = b.fecha.getTime();
          break;
        case 'shiftName':
          aValue = a.shiftName;
          bValue = b.shiftName;
          break;
        case 'exceptionRemarks':
          aValue = a.exceptionRemarks;
          bValue = b.exceptionRemarks;
          break;
        case 'tipoPermiso':
          aValue = a.tipoPermiso;
          bValue = b.tipoPermiso;  
          break;
        case 'diasInfo':
          aValue = a.diasInfo;
          bValue = b.diasInfo;
          break;
        case 'razonManual':
          aValue = a.razonManual;
          bValue = b.razonManual;
          break;
        case 'validacionRango':
          aValue = a.validacionRango;
          bValue = b.validacionRango;
          break;
        default:
          aValue = a[this.sortColumn as keyof GroupedAttendanceRecord];
          bValue = b[this.sortColumn as keyof GroupedAttendanceRecord];
      }
      
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const comparison = String(aValue).localeCompare(String(bValue), 'es', { numeric: true });
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    this.groupedDataSource.data = sortedData;
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'sort';
    if (this.sortDirection === 'asc') return 'expand_less';
    if (this.sortDirection === 'desc') return 'expand_more';
    return 'sort';
  }

  // ===== TRACK BY =====
  trackByFn(index: number, item: AttendanceAnalysis): any {
    return item.employeeId + '_' + item.fecha + '_' + item.tipoMarcacion;
  }

  trackByGroupedRecord(index: number, item: GroupedAttendanceRecord): any {
    return item.employeeId + '_' + item.fecha.toISOString().split('T')[0];
  }
  private updateQuickStats() {
    const data = this.allData;
    this.quickStats = {
      total: data.length,
      puntuales: data.filter(d => d.esPuntual).length,
      tardanzas: data.filter(d => d.esTardanza).length,
      faltas: data.filter(d => d.esFalta).length,
      manuales: data.filter(d => d.esMarcacionManual).length,
      noLaborable: 0
    };
    this.quickStats.noLaborable = this.quickStats.total - 
      (this.quickStats.puntuales + this.quickStats.tardanzas + this.quickStats.faltas + this.quickStats.manuales);
  }

  applyQuickStatsFilter(type: string | null, skipUpdate = false) {
    this.quickFilter = type;
    let baseData = this.allData;

    switch (type) {
      case 'puntuales':
        this.filteredData = baseData.filter(d => d.esPuntual);
        break;
      case 'tardanzas':
        this.filteredData = baseData.filter(d => d.esTardanza);
        break;
      case 'faltas':
        this.filteredData = baseData.filter(d => d.esFalta);
        break;
      case 'manuales':
        this.filteredData = baseData.filter(d => d.esMarcacionManual);
        break;
      case 'noLaborable':
        this.filteredData = baseData.filter(d => 
          !d.esPuntual && !d.esTardanza && !d.esFalta && !d.esMarcacionManual
        );
        break;
      default:
        this.filteredData = [...baseData];
    }
    
    this.dataSource.data = this.filteredData;
    this.applySort();
  }

  clearQuickStatsFilter() {
    this.quickFilter = null;
    this.filteredData = [...this.allData];
    this.dataSource.data = this.filteredData;
    this.applySort();
  }

  // ===== COLUMN MANAGEMENT =====
  showAllColumns() {
    this.columns.forEach(col => col.visible = true);
  }

  hideAllColumns() {
    // Keep essential columns visible
    this.columns.forEach(col => {
      col.visible = ['fullNameEmployee', 'actions'].includes(col.id);
    });
  }

  // ===== SELECTION =====
  toggleSelectAll() {
    if (this.selectAllChecked) {
      this.selectedRows.clear();
    } else {
      this.dataSource.data.forEach(item => this.selectedRows.add(item));
    }
    this.selectAllChecked = !this.selectAllChecked;
  }

  toggleRowSelection(item: AttendanceAnalysis) {
    if (this.selectedRows.has(item)) {
      this.selectedRows.delete(item);
    } else {
      this.selectedRows.add(item);
    }
    this.updateSelectAllState();
  }

  isRowSelected(item: AttendanceAnalysis): boolean {
    return this.selectedRows.has(item);
  }

  isIndeterminate(): boolean {
    const selectedCount = this.selectedRows.size;
    const totalCount = this.dataSource.data.length;
    return selectedCount > 0 && selectedCount < totalCount;
  }

  private updateSelectAllState() {
    const totalCount = this.dataSource.data.length;
    this.selectAllChecked = totalCount > 0 && this.selectedRows.size === totalCount;
  }

  clearSelection() {
    this.selectedRows.clear();
    this.selectAllChecked = false;
  }

  // ===== ACTIONS =====
  viewDetails(item: AttendanceAnalysis | GroupedAttendanceRecord) {
    console.log('View details:', item);
    // Implement view details logic
  }

  editItem(item: AttendanceAnalysis | GroupedAttendanceRecord) {
    console.log('Edit item:', item);
    // Implement edit logic
  }

  // ===== Download excel =====
  downloadExcel() {
    this.attendanceAnalysisService.exportAttendanceReport(this.filterForm.value).subscribe(response => {
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analisis_marcaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // ===== EXPORT =====
  exportToExcel() {
    this.performExcelExport(this.dataSource.data);
  }

  exportSelectedToExcel() {
    if (this.selectedRows.size === 0) return;
    this.performExcelExport(Array.from(this.selectedRows));
  }

  private performExcelExport(data: AttendanceAnalysis[]) {
    const visibleColumns = this.columns.filter(c => c.visible && c.id !== 'actions');
    
    // Prepare data
    const exportData = data.map(row => {
      const obj: any = {};
      visibleColumns.forEach(col => {
        let value = this.getColumnValue(row, col.id);
        
        // Format values for Excel
        if (col.id === 'fechaFormateada' && !value) {
          value = this.getColumnValue(row, 'fecha');
        }
        if (['horaEsperada', 'horaMarcacionReal'].includes(col.id)) {
          value = this.formatTime(value);
        }
        if (['diferenciaMinutos', 'minutosTardanza', 'minutosAdelanto'].includes(col.id)) {
          value = this.formatMinutes(value);
        }
        if (['esFalta', 'esMarcacionManual', 'esTardanza', 'esPuntual'].includes(col.id)) {
          value = value ? 'Sí' : 'No';
        }
        
        obj[col.label] = value || '-';
      });
      
      // Add row type for styling
      obj.__tipo = this.getRowType(row);
      return obj;
    });

    // Create workbook
    const ws = XLSX.utils.json_to_sheet([]);
    
    // Add summary
    const summary = [{
      Total: this.quickStats.total,
      Puntuales: this.quickStats.puntuales,
      Tardanzas: this.quickStats.tardanzas,
      Faltas: this.quickStats.faltas,
      Manuales: this.quickStats.manuales,
      'No Laborable': this.quickStats.noLaborable
    }];
    
    XLSX.utils.sheet_add_json(ws, summary, { origin: 'A1' });
    XLSX.utils.sheet_add_json(ws, exportData.map(({ __tipo, ...rest }) => rest), { origin: -1 });

    // Apply styling
    this.applyExcelStyling(ws, visibleColumns, exportData);

    // Create and save workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Análisis de Marcaciones');
    XLSX.writeFile(wb, `analisis_marcaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private getRowType(row: AttendanceAnalysis): string {
    if (row.esFalta) return 'falta';
    if (row.esMarcacionManual) return 'manual';
    if (row.esTardanza) return 'tardanza';
    if (row.esPuntual) return 'puntual';
    return 'noLaborable';
  }

  private applyExcelStyling(ws: any, visibleColumns: any[], exportData: any[]) {
    const colors = {
      header: { fgColor: { rgb: '2563EB' }, color: { rgb: 'FFFFFF' } },
      puntual: { fgColor: { rgb: 'D1FAE5' } },
      tardanza: { fgColor: { rgb: 'FFEDD5' } },
      falta: { fgColor: { rgb: 'FEE2E2' } },
      manual: { fgColor: { rgb: 'FEF9C3' } },
      noLaborable: { fgColor: { rgb: 'F3F4F6' } }
    };

    // Style header row
    const headerRow = 2;
    visibleColumns.forEach((col, idx) => {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow - 1, c: idx });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: colors.header,
          font: { color: { rgb: 'FFFFFF' }, bold: true },
          alignment: { horizontal: 'center' }
        };
      }
    });

    // Style data rows
    exportData.forEach((row, rowIdx) => {
      const tipo = row.__tipo as keyof typeof colors;
      visibleColumns.forEach((col, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx + headerRow, c: colIdx });
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: colors[tipo] || {},
            alignment: { horizontal: 'left' }
          };
        }
      });
    });

    // Set column widths
    ws['!cols'] = visibleColumns.map(() => ({ wch: 15 }));
  }

  exportToPDF() {
    const doc = new jsPDF('l', 'mm', 'a4');
    const visibleColumns = this.columns.filter(c => c.visible && c.id !== 'actions');
    
    // Title
    doc.setFontSize(16);
    doc.text('Análisis de Marcaciones', 20, 15);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 20, 25);

    // Summary table
    const summaryData = [
      ['Total', this.quickStats.total.toString()],
      ['Puntuales', this.quickStats.puntuales.toString()],
      ['Tardanzas', this.quickStats.tardanzas.toString()],
      ['Faltas', this.quickStats.faltas.toString()],
      ['Manuales', this.quickStats.manuales.toString()],
      ['No Laborable', this.quickStats.noLaborable.toString()]
    ];

    autoTable(doc, {
      head: [['Estadística', 'Cantidad']],
      body: summaryData,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 0: { fontStyle: 'bold' } }
    });

    // Main data table
    const headers = [visibleColumns.map(col => col.label)];
    const body = this.dataSource.data.map(row => 
      visibleColumns.map(col => {
        let value = this.getColumnValue(row, col.id);
        
        if (col.id === 'fechaFormateada' && !value) {
          value = this.getColumnValue(row, 'fecha');
        }
        if (['horaEsperada', 'horaMarcacionReal'].includes(col.id)) {
          value = this.formatTime(value);
        }
        if (['diferenciaMinutos', 'minutosTardanza', 'minutosAdelanto'].includes(col.id)) {
          value = this.formatMinutes(value);
        }
        if (['esFalta', 'esMarcacionManual', 'esTardanza', 'esPuntual'].includes(col.id)) {
          value = value ? 'Sí' : 'No';
        }
        
        return value || '-';
      })
    );

    autoTable(doc, {
      head: headers,
      body: body,
      startY: (doc as any).lastAutoTable.finalY + 10,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      theme: 'grid',
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const rowData = this.dataSource.data[data.row.index];
          const rowType = this.getRowType(rowData);
          
          switch (rowType) {
            case 'falta':
              data.cell.styles.fillColor = [254, 226, 226];
              break;
            case 'manual':
              data.cell.styles.fillColor = [254, 249, 195];
              break;
            case 'tardanza':
              data.cell.styles.fillColor = [255, 237, 213];
              break;
            case 'puntual':
              data.cell.styles.fillColor = [209, 250, 229];
              break;
            default:
              data.cell.styles.fillColor = [243, 244, 246];
          }
        }
      }
    });

    // Save PDF
    doc.save(`analisis_marcaciones_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}