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
import { ErrorHandlerService } from 'src/app/shared/services/error-handler.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { AppUserService, SedeArea } from 'src/app/core/services/app-user.services';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ModalEmpleadoDetalleComponent } from './modal-empleado-detalle/modal-empleado-detalle.component';
import { ModalEmpleadoSinTurnoDetalleComponent } from './modal-empleado-sin-turno-detalle/modal-empleado-sin-turno-detalle.component';

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
  
  // Sedes y áreas específicas del usuario
  allSedesAreas: SedeArea[] = [];
  filteredSedes: any[] = [];
  selectedSede: any | null = null;
  sedeFilterTerm = '';
  showSedeDropdown = false;
  
  filteredAreas: any[] = [];
  selectedArea: any | null = null;
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
  
  // Conteos por área para personal con turno
  areasConTurno: Map<string, number> = new Map();
  
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
  
  // Estado para saber si se ha ejecutado al menos una búsqueda
  hasSearched = false;
  
  // ============================================================================
  // TABS Y GRÁFICOS
  // ============================================================================
  
  activeTab: 'sin-turno' | 'con-turno' | 'grafica' = 'sin-turno';
  donutChart?: Chart;
  barChart?: Chart;
  
  constructor(
    private employeeScheduleService: EmployeeScheduleAssignmentService,
    private personService: PersonService,
    private rhAreaService: RhAreaService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService,
    private authService: AuthService,
    private appUserService: AppUserService,
    private modalService: ModalService
  ) {
    this.setupGridColumns();
    this.initializeDateRange();
  }
  
  ngOnInit(): void {
    this.loadAutocompleteData();
    // No cargar datos por defecto - el usuario debe seleccionar filtros
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
    // No establecer valores por defecto - el usuario debe seleccionar las fechas
    this.dateRangeControl.setValue(null);
  }
  
  private setupGridColumns(): void {
    this.columnsConTurno = [
      {
        headerName: 'ID Personal',
        field: 'nroDoc',
        minWidth: 100,
        maxWidth: 120,
        cellRenderer: (params: any) => `<div class="flex items-center"><div class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium cursor-pointer hover:bg-green-200 transition-colors" title="Click para ver detalles">#${params.value}</div></div>`,
        onCellClicked: (params: any) => {
          this.openEmployeeDetailModal(params.data);
        }
      },
      {
        headerName: 'Empleado',
        field: 'fullNameEmployee',
        minWidth: 350,
        maxWidth: 400,
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
        minWidth: 130,
        maxWidth: 170,
        cellRenderer: (params: any) => `<div class="flex items-center"><div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div><span class="font-medium text-blue-700">${params.value || 'Sin nombre'}</span></div>`
      },
      {
        headerName: 'Fecha Inicio',
        field: 'startDate',
        minWidth: 100,
        maxWidth: 120,
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          const date = new Date(params.value);
          return `<div class="text-sm text-fiori-text">${date.toLocaleDateString('es-ES')}</div>`;
        }
      },
      {
        headerName: 'Fecha Fin',
        field: 'endDate',
        minWidth: 100,
        maxWidth: 120,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-info font-medium">Indefinido</span>';
          const date = new Date(params.value);
          return `<div class="text-sm text-fiori-text">${date.toLocaleDateString('es-ES')}</div>`;
        }
      },
      {
        headerName: 'Sede',
        field: 'locationName',
        minWidth: 100,
        maxWidth: 140,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Área',
        field: 'areaName',
        minWidth: 200,
        maxWidth: 250,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Centro de Costo',
        field: 'ccostDescription',
        minWidth: 180,
        maxWidth: 200,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Creado Por',
        field: 'createdBy',
        minWidth: 150,
        maxWidth: 180,
        cellRenderer: (params: any) => {
          const createdBy = params.value || 'Sistema';
          return `<div class="flex items-center">
            <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
              <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <span class="text-sm text-fiori-text">${createdBy}</span>
          </div>`;
        }
      }
    ];
    
    this.columnsSinTurno = [
      {
        headerName: 'ID Personal',
        field: 'personalId',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => `<div class="flex items-center"><div class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium cursor-pointer hover:bg-red-200 transition-colors" title="Click para ver detalles">#${params.value}</div></div>`,
        onCellClicked: (params: any) => {
          this.openEmployeeSinTurnoDetailModal(params.data);
        }
      },
      {
        headerName: 'Estado',
        field: 'status',
        minWidth: 100,
        maxWidth: 120,
        cellRenderer: (params: any) => {
          const isTerminated = params.data?.isTerminated;
          const isOnVacation = params.data?.isOnVacation;

          if (isTerminated) {
            return `<div class="flex items-center justify-center"><div class="w-4 h-4 bg-red-500 rounded-full" title="Cesado"></div></div>`;
          } else if (isOnVacation) {
            return `<div class="flex items-center justify-center"><div class="w-4 h-4 bg-amber-500 rounded-full" title="De Vacaciones"></div></div>`;
          } else {
            return `<div class="flex items-center justify-center"><div class="w-4 h-4 bg-blue-500 rounded-full" title="Pendiente Asignación"></div></div>`;
          }
        }
      },
      {
        headerName: 'Empleado',
        field: 'fullNameFormatted',
        minWidth: 300,
        maxWidth: 400,
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
        minWidth: 120,
        maxWidth: 160,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Área',
        field: 'areaDescripcion',
        minWidth: 250,
        maxWidth: 350,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      },
      {
        headerName: 'Centro de Costo',
        field: 'ccostoDescripcion',
        minWidth: 140,
        maxWidth: 280,
        cellRenderer: (params: any) => `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`
      }
    ];
  }
  
  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  
  private loadAutocompleteData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.toastService.warning('Configuración', 'No hay usuario autenticado');
      return;
    }

    this.appUserService.getSedesAreas(currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedesAreas) => {
          this.allSedesAreas = sedesAreas || [];
          
          // Extraer todas las sedes y deduplicar por siteId
          const allSedes = this.allSedesAreas.map(sa => ({
            siteId: sa.siteId,
            siteName: sa.siteName,
            descripcion: sa.siteName // Para compatibilidad con el template
          }));
          
          // Deduplicar sedes por siteId para evitar duplicados
          this.filteredSedes = allSedes.filter((sede, index, self) => 
            index === self.findIndex(s => s.siteId === sede.siteId)
          );
          
          // Extraer todas las áreas de todas las sedes y deduplicar por areaId
          const allAreas = this.allSedesAreas.flatMap(sa => 
            sa.areas.map(area => ({
              areaId: area.areaId,
              areaName: area.areaName,
              descripcion: area.areaName, // Para compatibilidad con el template
              siteId: sa.siteId // Agregar referencia a la sede
            }))
          );
          
          // Deduplicar áreas por areaId para evitar duplicados
          const uniqueAreas = allAreas.filter((area, index, self) => 
            index === self.findIndex(a => a.areaId === area.areaId)
          );
          
          this.filteredAreas = uniqueAreas;
          
          console.log('📊 Datos de usuario cargados:', {
            sedesAreas: this.allSedesAreas.length,
            sedes: this.filteredSedes.length,
            areas: this.filteredAreas.length,
            areasBeforeDedup: allAreas.length,
            areasAfterDedup: uniqueAreas.length
          });
          console.log('📋 Areas únicas:', uniqueAreas.map(a => `${a.areaId}: ${a.areaName}`));
        },
        error: (error) => {
          this.errorHandlerService.handleLoadError(error, 'datos de filtros del usuario');
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
    const locationIds = this.selectedSede ? [this.selectedSede.siteId] : [];
    
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
                    
                    // Calcular conteos por área para personal con turno
                    this.areasConTurno.clear();
                    this.personalConTurno.forEach(emp => {
                        const area = emp.areaName || 'Sin Área';
                        this.areasConTurno.set(area, (this.areasConTurno.get(area) || 0) + 1);
                    });
                } else {
                    this.personalConTurno = [];
                    this.totalConTurno = 0;
                    this.areasConTurno.clear();
                }
            },
            error: (error) => {
                this.loadingConTurno = false;
                this.errorHandlerService.handleLoadError(error, 'personal con turno');
                this.personalConTurno = [];
                this.totalConTurno = 0;
                this.areasConTurno.clear();
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
            sede: this.selectedSede?.siteId || null,
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
                this.errorHandlerService.handleLoadError(error, 'personal sin turno');
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
    if (!this.dateRangeControl.valid || !this.dateRangeControl.value) {
      this.toastService.warning('Filtros requeridos', 'Por favor selecciona un rango de fechas para generar el reporte');
      return;
    }
    
    this.hasSearched = true;
    this.pageConTurno = 1;
    this.pageSinTurno = 1;
    this.loadData();
  }
  
  onClearFilters(): void {
    this.selectedArea = null;
    this.selectedSede = null;
    this.areaFilterTerm = '';
    this.sedeFilterTerm = '';
    
    // Restablecer las opciones filtradas y deduplicar sedes
    const allSedes = this.allSedesAreas.map(sa => ({
      siteId: sa.siteId,
      siteName: sa.siteName,
      descripcion: sa.siteName
    }));
    this.filteredSedes = allSedes.filter((sede, index, self) => 
      index === self.findIndex(s => s.siteId === sede.siteId)
    );
    
    // Deduplicar áreas al restablecer
    const allAreas = this.allSedesAreas.flatMap(sa => 
      sa.areas.map(area => ({
        areaId: area.areaId,
        areaName: area.areaName,
        descripcion: area.areaName,
        siteId: sa.siteId
      }))
    );
    this.filteredAreas = allAreas.filter((area, index, self) => 
      index === self.findIndex(a => a.areaId === area.areaId)
    );
    
    this.initializeDateRange();
    
    // Limpiar datos cuando se limpian los filtros
    this.personalConTurno = [];
    this.personalSinTurno = [];
    this.totalConTurno = 0;
    this.totalSinTurno = 0;
    this.totalSinTurnoActivo = 0;
    this.totalCesados = 0;
    this.totalVacaciones = 0;
    this.areasConTurno.clear();
    this.hasSearched = false;
    
    this.pageConTurno = 1;
    this.pageSinTurno = 1;
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
    this.filteredSedes = this.allSedesAreas.map(sa => ({
      siteId: sa.siteId,
      siteName: sa.siteName,
      descripcion: sa.siteName
    })).filter(sede => 
      sede.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    
    if (value !== this.selectedSede?.descripcion) {
      this.selectedSede = null;
    }
  }
  
  onSedeFocus(): void {
    if (this.filteredSedes.length === 0) {
      this.filteredSedes = this.allSedesAreas.map(sa => ({
        siteId: sa.siteId,
        siteName: sa.siteName,
        descripcion: sa.siteName
      }));
    }
    this.showSedeDropdown = this.filteredSedes.length > 0;
  }
  
  onSedeSelected(sede: any | null): void {
    this.selectedSede = sede;
    this.sedeFilterTerm = sede ? sede.descripcion : '';
    this.showSedeDropdown = false;
  }
  
  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }
  
  trackBySedeId(index: number, sede: any): string {
    return sede.siteId;
  }
  
  getAreaFilterText(): string {
    return this.selectedArea ? this.selectedArea.descripcion : this.areaFilterTerm;
  }
  
  onAreaFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.areaFilterTerm = value;
    // Filtrar áreas según sede seleccionada y término de búsqueda
    let availableAreas = this.filteredAreas;
    if (this.selectedSede) {
      availableAreas = this.allSedesAreas
        .filter(sa => sa.siteId === this.selectedSede.siteId)
        .flatMap(sa => sa.areas.map(area => ({
          areaId: area.areaId,
          areaName: area.areaName,
          descripcion: area.areaName,
          siteId: sa.siteId
        })));
    } else {
      const allAreas = this.allSedesAreas.flatMap(sa => 
        sa.areas.map(area => ({
          areaId: area.areaId,
          areaName: area.areaName,
          descripcion: area.areaName,
          siteId: sa.siteId
        }))
      );
      // Deduplicar áreas por areaId
      availableAreas = allAreas.filter((area, index, self) => 
        index === self.findIndex(a => a.areaId === area.areaId)
      );
    }
    
    this.filteredAreas = availableAreas.filter(area => 
      area.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    
    if (value !== this.selectedArea?.descripcion) {
      this.selectedArea = null;
    }
  }
  
  onAreaFocus(): void {
    if (this.filteredAreas.length === 0) {
      // Mostrar áreas según sede seleccionada
      if (this.selectedSede) {
        this.filteredAreas = this.allSedesAreas
          .filter(sa => sa.siteId === this.selectedSede.siteId)
          .flatMap(sa => sa.areas.map(area => ({
            areaId: area.areaId,
            areaName: area.areaName,
            descripcion: area.areaName,
            siteId: sa.siteId
          })));
      } else {
        const allAreas = this.allSedesAreas.flatMap(sa => 
          sa.areas.map(area => ({
            areaId: area.areaId,
            areaName: area.areaName,
            descripcion: area.areaName,
            siteId: sa.siteId
          }))
        );
        // Deduplicar áreas por areaId
        this.filteredAreas = allAreas.filter((area, index, self) => 
          index === self.findIndex(a => a.areaId === area.areaId)
        );
      }
    }
    this.showAreaDropdown = this.filteredAreas.length > 0;
  }
  
  onAreaSelected(area: any | null): void {
    this.selectedArea = area;
    this.areaFilterTerm = area ? area.descripcion : '';
    this.showAreaDropdown = false;
  }
  
  onAreaBlur(): void {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }
  
  trackByAreaId(index: number, area: any): string {
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
        'ID Personal': emp.nroDoc,
        'Nombre Completo': emp.fullNameEmployee || '',
        'Estado': emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Activo',
        'Turno/Horario': emp.scheduleName || 'Sin nombre',
        'Fecha Inicio': emp.startDate ? new Date(emp.startDate).toLocaleDateString('es-ES') : '',
        'Fecha Fin': emp.endDate ? new Date(emp.endDate).toLocaleDateString('es-ES') : 'Indefinido',
        'Sede': emp.locationName || '',
        'Área': emp.areaName || '',
        'Centro de Costo': emp.ccostDescription || '',
        'Creado Por': emp.createdBy || 'Sistema'
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
      
      wsConTurno['!cols'] = [ { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 20 } ];
      XLSX.utils.book_append_sheet(workbook, wsConTurno, 'Personal Con Turno');
      
      // Hoja 2: Personal Pendiente de Asignación
      const dataSinTurno = sinTurno.map(emp => ({
        'ID Personal': emp.personalId,
        'Nombre Completo': emp.fullNameFormatted || '',
        'Estado': emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Pendiente Asignación',
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

      wsSinTurno['!cols'] = [ { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 30 } ];
      XLSX.utils.book_append_sheet(workbook, wsSinTurno, 'Personal Pendiente Asignación');
      
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
        emp.nroDoc,
        emp.fullNameEmployee || '',
        emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Activo',
        emp.scheduleName || 'Sin nombre',
        emp.startDate ? new Date(emp.startDate).toLocaleDateString('es-ES') : '',
        emp.endDate ? new Date(emp.endDate).toLocaleDateString('es-ES') : 'Indefinido',
        emp.areaName || '',
        emp.ccostDescription || '',
        emp.createdBy || 'Sistema'
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [['ID', 'Nombre Completo', 'Estado', 'Turno/Horario', 'Fecha Inicio', 'Fecha Fin', 'Área', 'Centro de Costo', 'Creado Por']],
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
      doc.text(`Personal Pendiente de Asignación (${totalSinTurno})`, 15, finalY);
      const dataSinTurno = sinTurno.map(emp => [
        emp.personalId,
        emp.fullNameFormatted || '',
        emp.isTerminated ? 'Cesado' : emp.isOnVacation ? 'Vacaciones' : 'Pendiente Asignación',
        emp.categoriaAuxiliarDescripcion || '',
        emp.areaDescripcion || '',
        emp.ccostoDescripcion || ''
      ]);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['ID', 'Nombre Completo', 'Estado', 'Sede', 'Área', 'Centro de Costo']],
        body: dataSinTurno,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [71, 85, 105] },
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
      
      // Verificar si la fecha es 1/1/1900 (fecha por defecto del sistema que indica que NO está cesado)
      if (ceaseDate.getFullYear() === 1900 && ceaseDate.getMonth() === 0 && ceaseDate.getDate() === 1) {
        return false;
      }
      
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
  
  setActiveTab(tab: 'sin-turno' | 'con-turno' | 'grafica'): void {
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

  // ============================================================================
  // MODAL EMPLOYEE DETAILS
  // ============================================================================

  openEmployeeDetailModal(employee: EmployeeScheduleAssignmentWithStatus): void {
    console.log('🔍 Abriendo modal de detalles para empleado con turno:', employee);
    
    this.modalService.open({
      title: `Detalles de ${employee.fullNameEmployee || 'Empleado'}`,
      componentType: ModalEmpleadoDetalleComponent,
      componentData: {
        employeeData: employee
      },
      width: '1000px',
      height: 'auto'
    }).then((result) => {
      console.log('Modal cerrado con resultado:', result);
    }).catch((error) => {
      console.error('Error al abrir modal:', error);
      //this.errorHandlerService.handleGenericError(error, 'Error al abrir detalles del empleado');
    });
  }

  openEmployeeSinTurnoDetailModal(employee: EmployeeWithFormatted): void {
    console.log('🔍 Abriendo modal de detalles para empleado sin turno:', employee);
    
    const fullName = employee.fullNameFormatted || 
                    `${employee.apellidoPaterno || ''} ${employee.apellidoMaterno || ''}, ${employee.nombres || ''}`.replace(/,\s*$/, '').replace(/^\s*,/, '').trim() ||
                    'Empleado';
    
    this.modalService.open({
      title: `Detalles de ${fullName}`,
      componentType: ModalEmpleadoSinTurnoDetalleComponent,
      componentData: {
        employeeData: employee
      },
      width: '1000px',
      height: 'auto'
    }).then((result) => {
      console.log('Modal sin turno cerrado con resultado:', result);
    }).catch((error) => {
      console.error('Error al abrir modal sin turno:', error);
      ///this.errorHandlerService.handleGenericError(error, 'Error al abrir detalles del empleado');
    });
  }
}