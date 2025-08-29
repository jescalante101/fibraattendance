import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin, tap, switchMap, of, Observable, map, catchError } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';

// Services
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { PersonService, EmployeesWithoutShift } from 'src/app/core/services/person.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { HeaderConfigService } from 'src/app/core/services/header-config.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';

// Extender Employee para incluir campos calculados
interface EmployeeWithFormatted extends Employee {
  fullNameFormatted?: string;
  isTerminated?: boolean;
  isOnVacation?: boolean;
}

// Extender EmployeeScheduleAssignment para incluir estado del empleado
interface EmployeeScheduleAssignmentWithStatus extends EmployeeScheduleAssignment {
  isTerminated?: boolean;
  isOnVacation?: boolean;
  employeeDateCease?: string;
  employeeVacationStart?: string;
  employeeVacationEnd?: string;
}

// Shared Components
import { DateRange } from 'src/app/shared/components/date-range-picker/date-range-picker.component';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';

// Export libraries
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

// Chart.js
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Registrar componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-reporte-personal-turnos',
  templateUrl: './reporte-personal-turnos.component.html',
  styleUrls: ['./reporte-personal-turnos.component.css']
})
export class ReportePersonalTurnosComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  // ============================================================================
  // DATOS PRINCIPALES
  // ============================================================================
  
  personalConTurno: EmployeeScheduleAssignmentWithStatus[] = [];
  personalSinTurno: EmployeeWithFormatted[] = [];
  
  // ============================================================================
  // FILTROS Y CONTROLES
  // ============================================================================
  
  dateRangeControl = new FormControl<DateRange | null>(null, Validators.required);
  
  allSedes: CategoriaAuxiliar[] = [];
  filteredSedes: CategoriaAuxiliar[] = [];
  selectedSede: CategoriaAuxiliar | null = null;
  sedeFilterTerm = '';
  showSedeDropdown = false;
  
  allAreas: RhArea[] = [];
  filteredAreas: RhArea[] = [];
  selectedArea: RhArea | null = null;
  areaFilterTerm = '';
  showAreaDropdown = false;
  
  // ============================================================================
  // PAGINACIÓN Y CONTEOS
  // ============================================================================
  
  pageConTurno = 1;
  pageSizeConTurno = 500;
  totalConTurno = 0;
  
  pageSinTurno = 1;
  pageSizeSinTurno = 500;
  totalSinTurno = 0;

  // Conteos para gráficos
  totalSinTurnoActivo = 0;
  totalCesados = 0;
  totalVacaciones = 0;
  
  // ============================================================================
  // AG-GRID CONFIGURACIÓN
  // ============================================================================
  
  @ViewChild('gridConTurno', { static: false }) gridConTurno!: AgGridAngular;
  @ViewChild('gridSinTurno', { static: false }) gridSinTurno!: AgGridAngular;
  
  @ViewChild('donutChart', { static: false }) donutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart', { static: false }) barCanvas!: ElementRef<HTMLCanvasElement>;
  
  gridOptionsConTurno: GridOptions = {
    ...createFioriGridOptions(),
    getRowStyle: (params) => {
      if (params.data?.isTerminated) {
        return { backgroundColor: '#fef2f2', opacity: 0.8 }; // red-50
      }
      if (params.data?.isOnVacation) {
        return { backgroundColor: '#fffbeb', opacity: 0.8 }; // amber-50
      }
      return undefined;
    },
  };
  gridOptionsSinTurno: GridOptions = {
    ...createFioriGridOptions(),
    getRowStyle: (params) => {
      if (params.data?.isTerminated) {
        return { backgroundColor: '#fef2f2', opacity: 0.8 }; // red-50
      }
      if (params.data?.isOnVacation) {
        return { backgroundColor: '#fffbeb', opacity: 0.8 }; // amber-50
      }
      return undefined;
    },
  };
  
  columnsConTurno: ColDef[] = [];
  columnsSinTurno: ColDef[] = [];
  
  // ============================================================================
  // ESTADOS DE UI
  // ============================================================================
  
  loading = false;
  loadingConTurno = false;
  loadingSinTurno = false;
  isExporting = false;
  
  // Estado de datos para controlar botones de exportación
  get hasDataToExport(): boolean {
    return this.personalConTurno.length > 0 || this.personalSinTurno.length > 0;
  }
  
  get isDataLoading(): boolean {
    return this.loading || this.loadingConTurno || this.loadingSinTurno;
  }
  
  // ============================================================================
  // TABS Y GRÁFICOS
  // ============================================================================
  
  activeTab: 'tabular' | 'grafica' = 'tabular';
  donutChart?: Chart;
  barChart?: Chart;
  
  constructor(
    private employeeScheduleService: EmployeeScheduleAssignmentService,
    private personService: PersonService,
    private rhAreaService: RhAreaService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService
  ) {
    this.setupGridColumns();
    this.initializeDateRange();
  }
  
  ngOnInit(): void {
    this.loadAutocompleteData();
    this.loadData();
  }
  
  ngOnDestroy(): void {
    if (this.donutChart) {
      this.donutChart.destroy();
    }
    if (this.barChart) {
      this.barChart.destroy();
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  ngAfterViewInit(): void {
    // Los gráficos se crearán cuando se cambie al tab gráfico
  }
  
  // ============================================================================
  // CONFIGURACIÓN INICIAL
  // ============================================================================
  
  private initializeDateRange(): void {
    const today = new Date();
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setDate(today.getDate() - daysFromMonday);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    
    const defaultDateRange: DateRange = {
      start: currentWeekStart.toISOString().split('T')[0],
      end: currentWeekEnd.toISOString().split('T')[0]
    };
    
    this.dateRangeControl.setValue(defaultDateRange);
  }
  
  private setupGridColumns(): void {
    this.columnsConTurno = [
      {
        headerName: 'ID Personal',
        field: 'employeeId',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => `<div class="flex items-center"><div class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">#${params.value}</div></div>`
      },
      {
        headerName: 'Empleado',
        field: 'fullNameEmployee',
        minWidth: 250,
        maxWidth: 300,
        cellRenderer: (params: any) => {
          const fullName = params.value || '-';
          const isTerminated = params.data?.isTerminated;
          const isOnVacation = params.data?.isOnVacation;

          let statusBadge = '';
          if (isTerminated) {
            statusBadge = `<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Cesado</span>`;
          } else if (isOnVacation) {
            statusBadge = `<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Vacaciones</span>`;
          }

          return `<div class="font-medium text-fiori-text flex items-center">${fullName}${statusBadge}</div>`;
        }
      },
      {
        headerName: 'Turno/Horario',
        field: 'scheduleName',
        minWidth: 150,
        maxWidth: 200,
        cellRenderer: (params: any) => `<div class="flex items-center"><div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div><span class="font-medium text-blue-700">${params.value || 'Sin nombre'}</span></div>`
      },
      {
        headerName: 'Fecha Inicio',
        field: 'startDate',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          const date = new Date(params.value);
          return `<div class="text-sm text-fiori-text">${date.toLocaleDateString('es-ES')}</div>`;
        }
      },
      {
        headerName: 'Fecha Fin',
        field: 'endDate',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-info font-medium">Indefinido</span>';
          const date = new Date(params.value);
          return `<div class="text-sm text-fiori-text">${date.toLocaleDateString('es-ES')}</div>`;
        }
      },
      {
        headerName: 'Sede',
        field: 'locationName',
        minWidth: 120,
        maxWidth: 180,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Área',
        field: 'areaName',
        minWidth: 150,
        maxWidth: 200,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      }
    ];
    
    this.columnsSinTurno = [
      {
        headerName: 'ID Personal',
        field: 'personalId',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => `<div class="flex items-center"><div class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">#${params.value}</div></div>`
      },
      {
        headerName: 'Empleado',
        field: 'fullNameFormatted',
        minWidth: 350,
        maxWidth: 500,
        cellRenderer: (params: any) => {
          const fullName = params.value;
          const isTerminated = params.data?.isTerminated;
          const isOnVacation = params.data?.isOnVacation;

          let statusBadge = '';
          if (isTerminated) {
            statusBadge = `<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Cesado</span>`;
          } else if (isOnVacation) {
            statusBadge = `<span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Vacaciones</span>`;
          }

          return `<div class="font-medium text-fiori-text flex items-center">${fullName}${statusBadge}</div>`;
        }
      },
      {
        headerName: 'Sede',
        field: 'categoriaAuxiliarDescripcion',
        minWidth: 140,
        maxWidth: 180,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Área',
        field: 'areaDescripcion',
        minWidth: 300,
        maxWidth: 450,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Centro de Costo',
        field: 'ccostoDescripcion',
        minWidth: 160,
        maxWidth: 350,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      }
    ];
  }
  
  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  
  private loadAutocompleteData(): void {
    const headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    const companyId = headerConfig?.selectedEmpresa?.companiaId || '';
    
    if (!companyId) {
      this.toastService.warning('Configuración', 'No hay empresa seleccionada');
      return;
    }
    
    forkJoin({
      sedes: this.categoriaAuxiliarService.getCategoriasAuxiliar(),
      areas: this.rhAreaService.getAreas(companyId)
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ sedes, areas }) => {
        this.allSedes = sedes || [];
        this.filteredSedes = [...this.allSedes];
        
        this.allAreas = areas || [];
        this.filteredAreas = [...this.allAreas];
      },
      error: (error) => {
        console.error('Error loading autocomplete data:', error);
        this.toastService.error('Error', 'Error al cargar datos de filtros');
      }
    });
  }
  
  loadData(): void {
    this.loading = true;
    forkJoin({
      conTurno: this.loadPersonalConTurno(),
      sinTurno: this.loadPersonalSinTurno()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
        next: () => {
            this.loading = false;
            this.createCharts();
        },
        error: (err) => {
            this.loading = false;
            console.error("Error in forkJoin loading data", err);
        }
    });
  }
  
  private loadPersonalConTurno(): Observable<any> {
    this.loadingConTurno = true;
    const dateRange = this.dateRangeControl.value;
    const startDate = dateRange?.start || '';
    const endDate = dateRange?.end || '';
    const locationIds = this.selectedSede ? [this.selectedSede.categoriaAuxiliarId] : [];
    
    return this.employeeScheduleService.getEmployeeScheduleAssignments(
      this.pageConTurno,
      this.pageSizeConTurno,
      '',
      startDate,
      endDate,
      locationIds,
      this.selectedArea?.areaId || '',
    ).pipe(
        tap({
            next: (response) => {
                this.loadingConTurno = false;
                if (response.exito && response.data) {
                    // Aplicar detección de estado a empleados CON turno
                    this.personalConTurno = (response.data.items || []).map((emp: any): EmployeeScheduleAssignmentWithStatus => ({
                        ...emp,
                        isTerminated: this.isEmployeeTerminated(emp.employeeDateCease),
                        isOnVacation: this.isEmployeeOnVacation(emp.employeeVacationStart, emp.employeeVacationEnd)
                    }));
                    this.totalConTurno = response.data.totalCount || 0;
                } else {
                    this.personalConTurno = [];
                    this.totalConTurno = 0;
                }
            },
            error: (error) => {
                this.loadingConTurno = false;
                console.error('Error loading personal con turno:', error);
                this.toastService.error('Error', 'Error al cargar personal con turno');
                this.personalConTurno = [];
                this.totalConTurno = 0;
            }
        })
    );
  }
  
  private loadPersonalSinTurno(): Observable<any> {
    this.loadingSinTurno = true;
    const dateRange = this.dateRangeControl.value;
    const startDate = dateRange?.start || '';
    const endDate = dateRange?.end || '';

    return this.employeeScheduleService.getEmployeeIdsByDateRange(startDate, endDate).pipe(
        switchMap(employeeIdsWithShift => {
          const headerConfig = this.headerConfigService.getCurrentHeaderConfig();
          const companyId = headerConfig?.selectedEmpresa?.companiaId || '';
          const areaIds = this.selectedArea ? [this.selectedArea.areaId] : [];

          const params: EmployeesWithoutShift = {
            searchText: '',
            page: this.pageSinTurno,
            pagesize: this.pageSizeSinTurno,
            areaId: areaIds,
            ccostoId: null,
            sede: this.selectedSede?.categoriaAuxiliarId || null,
            periodoId: headerConfig?.selectedPeriodo?.periodoId || null,
            planillaId: headerConfig?.selectedPlanilla?.planillaId || null,
            companiaId: companyId,
            personalIds: employeeIdsWithShift || []
          };
          
          return this.personService.getPersonalWithoutShift(params);
        }),
        tap({
            next: (response) => {
                this.loadingSinTurno = false;
                if (response.exito && response.data && response.data.items) {
                    this.personalSinTurno = (response.data.items || []).map((emp: any): EmployeeWithFormatted => ({
                        ...emp,
                        fullNameFormatted: this.getEmployeeFullName(emp),
                        isTerminated: this.isEmployeeTerminated(emp.fechaCese),
                        isOnVacation: this.isEmployeeOnVacation(emp.vacacionesFechaInicio, emp.vacacionesFechaFin)
                    }));
                    
                    this.totalSinTurno = this.personalSinTurno.length;
                    
                    this.totalSinTurnoActivo = 0;
                    this.totalCesados = 0;
                    this.totalVacaciones = 0;
                    this.personalSinTurno.forEach(emp => {
                        if (emp.isTerminated) {
                            this.totalCesados++;
                        } else if (emp.isOnVacation) {
                            this.totalVacaciones++;
                        } else {
                            this.totalSinTurnoActivo++;
                        }
                    });
                } else {
                    this.personalSinTurno = [];
                    this.totalSinTurno = 0;
                    this.totalSinTurnoActivo = 0;
                    this.totalCesados = 0;
                    this.totalVacaciones = 0;
                }
            },
            error: (error) => {
                this.loadingSinTurno = false;
                console.error('Error loading personal sin turno:', error);
                this.toastService.error('Error', 'Error al cargar personal sin turno');
                this.personalSinTurno = [];
                this.totalSinTurno = 0;
            }
        })
    );
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  onDateRangeSelected(dateRange: DateRange): void {
    // El FormControl ya está actualizado automáticamente
  }
  
  onSearch(): void {
    if (!this.dateRangeControl.valid) {
      this.toastService.warning('Validación', 'Por favor selecciona un rango de fechas válido');
      return;
    }
    
    this.pageConTurno = 1;
    this.pageSinTurno = 1;
    this.loadData();
  }
  
  onClearFilters(): void {
    this.selectedArea = null;
    this.selectedSede = null;
    this.areaFilterTerm = '';
    this.sedeFilterTerm = '';
    this.filteredAreas = [...this.allAreas];
    this.filteredSedes = [...this.allSedes];
    
    this.initializeDateRange();
    
    this.pageConTurno = 1;
    this.pageSinTurno = 1;
    this.loadData();
  }
  
  // ============================================================================
  // AUTOCOMPLETE HANDLERS
  // ============================================================================
  
  getSedeFilterText(): string {
    return this.selectedSede ? this.selectedSede.descripcion : this.sedeFilterTerm;
  }
  
  onSedeFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.sedeFilterTerm = value;
    this.filteredSedes = this.allSedes.filter(sede => 
      sede.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    
    if (value !== this.selectedSede?.descripcion) {
      this.selectedSede = null;
    }
  }
  
  onSedeFocus(): void {
    if (this.filteredSedes.length === 0) {
      this.filteredSedes = [...this.allSedes];
    }
    this.showSedeDropdown = this.filteredSedes.length > 0;
  }
  
  onSedeSelected(sede: CategoriaAuxiliar | null): void {
    this.selectedSede = sede;
    this.sedeFilterTerm = sede ? sede.descripcion : '';
    this.showSedeDropdown = false;
  }
  
  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }
  
  trackBySedeId(index: number, sede: CategoriaAuxiliar): string {
    return sede.categoriaAuxiliarId;
  }
  
  getAreaFilterText(): string {
    return this.selectedArea ? this.selectedArea.descripcion : this.areaFilterTerm;
  }
  
  onAreaFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.areaFilterTerm = value;
    this.filteredAreas = this.allAreas.filter(area => 
      area.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    
    if (value !== this.selectedArea?.descripcion) {
      this.selectedArea = null;
    }
  }
  
  onAreaFocus(): void {
    if (this.filteredAreas.length === 0) {
      this.filteredAreas = [...this.allAreas];
    }
    this.showAreaDropdown = this.filteredAreas.length > 0;
  }
  
  onAreaSelected(area: RhArea | null): void {
    this.selectedArea = area;
    this.areaFilterTerm = area ? area.descripcion : '';
    this.showAreaDropdown = false;
  }
  
  onAreaBlur(): void {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }
  
  trackByAreaId(index: number, area: RhArea): string {
    return area.areaId;
  }
  
  // ============================================================================
  // PAGINACIÓN
  // ============================================================================
  
  onPageChangeConTurno(event: PaginatorEvent): void {
    this.pageConTurno = event.pageNumber;
    this.pageSizeConTurno = event.pageSize;
    this.loadPersonalConTurno();
  }
  
  onPageChangeSinTurno(event: PaginatorEvent): void {
    this.pageSinTurno = event.pageNumber;
    this.pageSizeSinTurno = event.pageSize;
    this.loadPersonalSinTurno();
  }
  
  // ============================================================================
  // EXPORTACIÓN
  // ============================================================================
  
  private getDataForExport(): { conTurno: EmployeeScheduleAssignmentWithStatus[], sinTurno: EmployeeWithFormatted[] } {
    // Usar los datos ya cargados en memoria
    console.log('🔍 EXPORTACIÓN - Usando datos cargados:', {
      personalConTurnoLength: this.personalConTurno.length,
      personalSinTurnoLength: this.personalSinTurno.length,
      totalConTurno: this.totalConTurno,
      totalSinTurno: this.totalSinTurno
    });
    
    return {
      conTurno: [...this.personalConTurno], // Copia para evitar mutaciones
      sinTurno: [...this.personalSinTurno]  // Copia para evitar mutaciones
    };
  }

  exportToExcel(): void {
    if (!this.hasDataToExport) {
      this.toastService.warning('Sin datos', 'No hay datos para exportar. Realiza primero una búsqueda.');
      return;
    }
    
    this.isExporting = true;
    const { conTurno, sinTurno } = this.getDataForExport();
      const workbook = XLSX.utils.book_new();
      
      // Hoja 1: Personal CON Turno
      const dataConTurno = conTurno.map(emp => ({
        'ID Personal': emp.employeeId,
        'Nombre Completo': emp.fullNameEmployee || '',
        'Estado': emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Activo',
        'Turno/Horario': emp.scheduleName || 'Sin nombre',
        'Fecha Inicio': emp.startDate ? new Date(emp.startDate).toLocaleDateString('es-ES') : '',
        'Fecha Fin': emp.endDate ? new Date(emp.endDate).toLocaleDateString('es-ES') : 'Indefinido',
        'Sede': emp.locationName || '',
        'Área': emp.areaName || ''
      }));
      const wsConTurno = XLSX.utils.json_to_sheet(dataConTurno);
      const headerRowConTurno = Object.keys(dataConTurno[0] || {}).length;
      
      // Estilo de encabezados
      for (let col = 0; col < headerRowConTurno; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!wsConTurno[cellAddress]) continue;
        wsConTurno[cellAddress].s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 }, fill: { patternType: "solid", fgColor: { rgb: "10B981" } } };
      }
      
      // Aplicar colores a filas según estado del empleado
      conTurno.forEach((emp, index) => {
        const row = index + 1;
        let rowColor = "FFFFFF";
        if (emp.isTerminated) rowColor = "fde2e2"; // Light Red
        else if (emp.isOnVacation) rowColor = "fef3c7"; // Light Amber

        for (let col = 0; col < headerRowConTurno; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (!wsConTurno[cellAddress]) wsConTurno[cellAddress] = {v: ''};
            wsConTurno[cellAddress].s = { fill: { patternType: "solid", fgColor: { rgb: rowColor } } };
        }
      });
      
      wsConTurno['!cols'] = [ { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 } ];
      XLSX.utils.book_append_sheet(workbook, wsConTurno, 'Personal Con Turno');
      
      // Hoja 2: Personal SIN Turno
      const dataSinTurno = sinTurno.map(emp => ({
        'ID Personal': emp.personalId,
        'Nombre Completo': emp.fullNameFormatted || '',
        'Estado': emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Activo',
        'Sede': emp.categoriaAuxiliarDescripcion || '',
        'Área': emp.areaDescripcion || '',
        'Centro de Costo': emp.ccostoDescripcion || ''
      }));
      const wsSinTurno = XLSX.utils.json_to_sheet(dataSinTurno);
      const headerRowSinTurno = Object.keys(dataSinTurno[0] || {}).length;
      for (let col = 0; col < headerRowSinTurno; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!wsSinTurno[cellAddress]) continue;
        wsSinTurno[cellAddress].s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 }, fill: { patternType: "solid", fgColor: { rgb: "EF4444" } } };
      }
      
      sinTurno.forEach((emp, index) => {
        const row = index + 1;
        let rowColor = "FFFFFF";
        if (emp.isTerminated) rowColor = "fde2e2"; // Light Red
        else if (emp.isOnVacation) rowColor = "fef3c7"; // Light Amber

        for (let col = 0; col < headerRowSinTurno; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (!wsSinTurno[cellAddress]) wsSinTurno[cellAddress] = {v: ''};
            wsSinTurno[cellAddress].s = { fill: { patternType: "solid", fgColor: { rgb: rowColor } } };
        }
      });

      wsSinTurno['!cols'] = [ { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 30 } ];
      XLSX.utils.book_append_sheet(workbook, wsSinTurno, 'Personal Sin Turno');
      
      const fileName = `Reporte_Personal_Turnos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      this.toastService.success('Éxito', `Reporte Excel exportado con ${conTurno.length + sinTurno.length} registros`);
      this.isExporting = false;
  }
  
  exportToPDF(): void {
    if (!this.hasDataToExport) {
      this.toastService.warning('Sin datos', 'No hay datos para exportar. Realiza primero una búsqueda.');
      return;
    }
    
    this.isExporting = true;
    const { conTurno, sinTurno } = this.getDataForExport();
      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.text('REPORTE: CONTROL DE ASIGNACIÓN DE TURNOS', 15, 15);
      
      // Agregar información de resumen
      const totalConTurno = conTurno.length;
      const totalSinTurno = sinTurno.length;
      const cesadosConTurno = conTurno.filter(emp => emp.isTerminated).length;
      const vacacionesConTurno = conTurno.filter(emp => emp.isOnVacation).length;
      const cesadosSinTurno = sinTurno.filter(emp => emp.isTerminated).length;
      const vacacionesSinTurno = sinTurno.filter(emp => emp.isOnVacation).length;
      
      doc.setFontSize(10);
      doc.text(`Resumen: Total Con Turno: ${totalConTurno} | Total Sin Turno: ${totalSinTurno} | Cesados: ${cesadosConTurno + cesadosSinTurno} | Vacaciones: ${vacacionesConTurno + vacacionesSinTurno}`, 15, 25);
      
      // Personal CON Turno
      doc.setFontSize(12);
      doc.text(`Personal CON Turno (${totalConTurno})`, 15, 35);
      const dataConTurno = conTurno.map(emp => [
        emp.employeeId,
        emp.fullNameEmployee || '',
        emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Activo',
        emp.scheduleName || 'Sin nombre',
        emp.startDate ? new Date(emp.startDate).toLocaleDateString('es-ES') : '',
        emp.endDate ? new Date(emp.endDate).toLocaleDateString('es-ES') : 'Indefinido',
        emp.areaName || ''
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [['ID', 'Nombre Completo', 'Estado', 'Turno/Horario', 'Fecha Inicio', 'Fecha Fin', 'Área']],
        body: dataConTurno,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [34, 197, 94] },
        didParseCell: function(data) {
          // Aplicar colores según el estado del empleado
          if (data.row.index >= 0) {
            const emp = conTurno[data.row.index];
            if (emp?.isTerminated) {
              data.cell.styles.fillColor = [254, 226, 226]; // Light red
            } else if (emp?.isOnVacation) {
              data.cell.styles.fillColor = [254, 243, 199]; // Light amber
            }
          }
        }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.text(`Personal SIN Turno (${totalSinTurno})`, 15, finalY);
      const dataSinTurno = sinTurno.map(emp => [
        emp.personalId,
        emp.fullNameFormatted || '',
        emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Activo',
        emp.categoriaAuxiliarDescripcion || '',
        emp.areaDescripcion || '',
        emp.ccostoDescripcion || ''
      ]);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['ID', 'Nombre Completo', 'Estado', 'Sede', 'Área', 'Centro de Costo']],
        body: dataSinTurno,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [239, 68, 68] },
        didParseCell: function(data) {
          // Aplicar colores según el estado del empleado
          if (data.row.index >= 0) {
            const emp = sinTurno[data.row.index];
            if (emp?.isTerminated) {
              data.cell.styles.fillColor = [254, 226, 226]; // Light red
            } else if (emp?.isOnVacation) {
              data.cell.styles.fillColor = [254, 243, 199]; // Light amber
            }
          }
        }
      });
      
      const fileName = `Reporte_Personal_Turnos_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      this.toastService.success('Éxito', `Reporte PDF generado con ${conTurno.length + sinTurno.length} registros`);
      this.isExporting = false;
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private isEmployeeTerminated(fechaCese: string | null): boolean {
    if (!fechaCese) return false;
    try {
      const ceaseDate = new Date(fechaCese);
      const currentDate = new Date();
      const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      return ceaseDate > startOfCurrentMonth;
    } catch (error) {
      console.error('Error parsing fechaCese:', error);
      return false;
    }
  }

  private isEmployeeOnVacation(vacacionesFechaInicio: string | null, vacacionesFechaFin: string | null): boolean {
    if (!vacacionesFechaInicio || !vacacionesFechaFin) return false;
    const dateRange = this.dateRangeControl.value;
    if (!dateRange || !dateRange.start || !dateRange.end) return false;
    try {
      const vacationStart = new Date(vacacionesFechaInicio);
      const vacationEnd = new Date(vacacionesFechaFin);
      const selectedStart = new Date(dateRange.start);
      const selectedEnd = new Date(dateRange.end);
      vacationStart.setHours(0, 0, 0, 0);
      vacationEnd.setHours(0, 0, 0, 0);
      selectedStart.setHours(0, 0, 0, 0);
      selectedEnd.setHours(0, 0, 0, 0);
      return vacationStart <= selectedEnd && vacationEnd >= selectedStart;
    } catch (error) {
      console.error('Error parsing vacation dates:', error);
      return false;
    }
  }
  
  getEmployeeFullName(employee: Employee): string {
    if (!employee) return '';
    const nombres = employee.nombres || '';
    const apellidoPaterno = employee.apellidoPaterno || '';
    const apellidoMaterno = employee.apellidoMaterno || '';
    return `${apellidoPaterno} ${apellidoMaterno}, ${nombres}`.trim();
  }
  
  // ============================================================================
  // AG-GRID EVENTS
  // ============================================================================
  
  onGridReadyConTurno(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }
  
  onGridReadySinTurno(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }
  
  // ============================================================================
  // TABS MANAGEMENT
  // ============================================================================
  
  setActiveTab(tab: 'tabular' | 'grafica'): void {
    this.activeTab = tab;
    if (tab === 'grafica') {
      setTimeout(() => { this.createCharts(); }, 100);
    }
  }
  
  // ============================================================================
  // CHART.JS METHODS
  // ============================================================================
  
  private createCharts(): void {
    if (this.donutCanvas && this.barCanvas) {
      this.createDonutChart();
      this.createBarChart();
    }
  }
  
  private createDonutChart(): void {
    if (this.donutChart) {
      this.donutChart.destroy();
    }
    const ctx = this.donutCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Con Turno', 'Sin Turno (Activo)', 'Cesado', 'Vacaciones'],
        datasets: [{
          data: [this.totalConTurno, this.totalSinTurnoActivo, this.totalCesados, this.totalVacaciones],
          backgroundColor: ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'],
          borderColor: ['#059669', '#2563EB', '#DC2626', '#D97706'],
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { size: 12, family: 'Inter, system-ui, sans-serif' } } },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = this.totalConTurno + this.totalSinTurnoActivo + this.totalCesados + this.totalVacaciones;
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0';
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '60%'
      }
    };
    this.donutChart = new Chart(ctx, config);
  }
  
  private createBarChart(): void {
    if (this.barChart) {
      this.barChart.destroy();
    }
    const ctx = this.barCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const areaData = this.processDataByArea();
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: areaData.labels,
        datasets: [
          { label: 'Con Turno', data: areaData.conTurno, backgroundColor: '#10B981' },
          { label: 'Sin Turno (Activo)', data: areaData.sinTurnoActivo, backgroundColor: '#3B82F6' },
          { label: 'Cesado', data: areaData.cesados, backgroundColor: '#EF4444' },
          { label: 'Vacaciones', data: areaData.vacaciones, backgroundColor: '#F59E0B' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { stacked: true, display: true, title: { display: true, text: 'Áreas de Trabajo' } },
          y: { stacked: true, display: true, title: { display: true, text: 'Cantidad de Personal' }, beginAtZero: true }
        }
      }
    };
    this.barChart = new Chart(ctx, config);
  }
  
  private processDataByArea(): { labels: string[], conTurno: number[], sinTurnoActivo: number[], cesados: number[], vacaciones: number[] } {
    const areaMap = new Map<string, { conTurno: number, sinTurnoActivo: number, cesados: number, vacaciones: number }>();

    const ensureArea = (area: string) => {
      if (!areaMap.has(area)) {
        areaMap.set(area, { conTurno: 0, sinTurnoActivo: 0, cesados: 0, vacaciones: 0 });
      }
    };

    this.personalConTurno.forEach(emp => {
      const area = emp.areaName || 'Sin Área';
      ensureArea(area);
      areaMap.get(area)!.conTurno++;
    });
    
    this.personalSinTurno.forEach(emp => {
      const area = emp.areaDescripcion || 'Sin Área';
      ensureArea(area);
      
      if (emp.isTerminated) {
        areaMap.get(area)!.cesados++;
      } else if (emp.isOnVacation) {
        areaMap.get(area)!.vacaciones++;
      } else {
        areaMap.get(area)!.sinTurnoActivo++;
      }
    });
    
    const labels: string[] = [];
    const conTurno: number[] = [];
    const sinTurnoActivo: number[] = [];
    const cesados: number[] = [];
    const vacaciones: number[] = [];
    
    Array.from(areaMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([area, data]) => {
        labels.push(area);
        conTurno.push(data.conTurno);
        sinTurnoActivo.push(data.sinTurnoActivo);
        cesados.push(data.cesados);
        vacaciones.push(data.vacaciones);
      });
    
    return { labels, conTurno, sinTurnoActivo, cesados, vacaciones };
  }
  
  // ============================================================================
  // UTILITY METHODS FOR CHARTS
  // ============================================================================
  
  getPercentage(value: number, total: number): string {
    return total > 0 ? (value / total * 100).toFixed(1) : '0';
  }
  
  getUniqueAreasCount(): number {
    const areas = new Set<string>();
    this.personalConTurno.forEach(emp => { if (emp.areaName) areas.add(emp.areaName); });
    this.personalSinTurno.forEach(emp => { if (emp.areaDescripcion) areas.add(emp.areaDescripcion); });
    return areas.size;
  }
}