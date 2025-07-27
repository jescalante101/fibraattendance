import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AttendanceAnalysisService } from 'src/app/core/services/attendance-analysis.service';
import { AttendanceAnalysis } from 'src/app/models/attendance-analysis/attendance-analysis.model';
import { ApiResponse } from 'src/app/core/models/api-response.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-analisis-marcaciones',
  templateUrl: './analisis-marcaciones.component.html',
  styleUrls: ['./analisis-marcaciones.component.css']
})
export class AnalisisMarcacionesComponent implements OnInit, OnDestroy {
  // Reactive forms
  filterForm!: FormGroup;
  
  // Table data
  dataSource = new MatTableDataSource<AttendanceAnalysis>([]);
  loading = false;
  totalCount = 0;
  page = 1;
  pageSize = 20;
  
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
    { id: 'employeeId', label: 'ID Empleado', visible: false },
    { id: 'areaDescription', label: 'Área', visible: true },
    { id: 'locationName', label: 'Sede', visible: true },
    { id: 'areaId', label: 'ID Área', visible: false },
    { id: 'locationId', label: 'ID Sede', visible: false },
    { id: 'fechaFormateada', label: 'Fecha', visible: true },
    { id: 'fecha', label: 'Fecha (ISO)', visible: false },
    { id: 'shiftName', label: 'Turno', visible: true },
    { id: 'intervalAlias', label: 'Horario', visible: true },
    { id: 'tipoMarcacion', label: 'Tipo', visible: true },
    { id: 'horaEsperada', label: 'Esperado', visible: true },
    { id: 'horaMarcacionReal', label: 'Real', visible: true },
    { id: 'diferenciaMinutos', label: 'Diferencia', visible: false },
    { id: 'minutosTardanza', label: 'Min. Tardanza', visible: false },
    { id: 'minutosAdelanto', label: 'Min. Adelanto', visible: false },
    { id: 'estadoMarcacion', label: 'Estado', visible: true },
    { id: 'origenMarcacion', label: 'Origen', visible: false },
    { id: 'informacionAdicional', label: 'Info Adicional', visible: false },
    { id: 'razonManual', label: 'Razón Manual', visible: false },
    { id: 'validacionRango', label: 'Validación', visible: false },
    { id: 'esTardanza', label: 'Tardanza', visible: false },
    { id: 'esFalta', label: 'Falta', visible: false },
    { id: 'esPuntual', label: 'Puntual', visible: false },
    { id: 'esMarcacionManual', label: 'Manual', visible: false },
    { id: 'diaSemana', label: 'Día (nro)', visible: false },
    { id: 'nombreDia', label: 'Día', visible: false },
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
    const filters = {
      ...this.filterForm.value,
      page: this.page,
      pageSize: this.pageSize
    };

    this.attendanceAnalysisService.getAttendanceAnalysis(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<AttendanceAnalysis>) => {
          const data = res.data?.items || [];
          this.allData = data;
          this.applyCurrentFilters();
          this.totalCount = res.data?.totalCount || 0;
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
    this.totalCount = 0;
    this.loading = false;
    this.updateQuickStats();
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

  get totalPages(): number {
    return this.totalCount > 0 ? Math.ceil(this.totalCount / this.pageSize) : 1;
  }

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
    
    this.applySort();
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
  viewDetails(item: AttendanceAnalysis) {
    console.log('View details:', item);
    // Implement view details logic
  }

  editItem(item: AttendanceAnalysis) {
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
      didParseCell: (data) => {
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