import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridApi } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { Subject, takeUntil, finalize } from 'rxjs';

import { ExtraHoursReportService } from 'src/app/core/services/report/extra-hours-report.service';
import { HeaderConfigService } from 'src/app/core/services/header-config.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { DateRange } from 'src/app/shared/components/date-range-picker/date-range-picker.component';
import { 
  ReportFiltersHE,
  ExtraHoursReportResult,
  ReporteAsistenciaSemanalDto,
  ProcessedEmployeeData,
  SummaryResponse
} from 'src/app/core/models/report/extra-hours-report.model';

@Component({
  selector: 'app-reporte-horas-extras',
  templateUrl: './reporte-horas-extras.component.html',
  styleUrls: ['./reporte-horas-extras.component.css']
})
export class ReporteHorasExtrasComponent implements OnInit, OnDestroy {
  @ViewChild('agGrid') agGrid!: AgGridAngular;

  // Form y filtros
  filterForm!: FormGroup;
  dateRangeControl = new FormControl<DateRange | null>(null, Validators.required);
  isLoading = false;
  isExporting = false;

  // Datos del reporte
  reportData: ExtraHoursReportResult | null = null;
  summaryData: SummaryResponse | null = null;
  processedData: ProcessedEmployeeData[] = [];

  // AG-Grid configuration
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridOptions: GridOptions = createFioriGridOptions();
  private gridApi!: GridApi;

  // Filtros auxiliares usando servicios existentes
  allAreas: RhArea[] = [];
  filteredAreas: RhArea[] = [];
  showAreaDropdown = false;
  selectedArea: RhArea | null = null;
  areaFilterTerm = '';

  allSedes: CategoriaAuxiliar[] = [];
  filteredSedes: CategoriaAuxiliar[] = [];
  showSedeDropdown = false;
  selectedSede: CategoriaAuxiliar | null = null;
  sedeFilterTerm = '';

  // Fechas del reporte
  reportDates: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private extraHoursService: ExtraHoursReportService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService,
    private rhAreaService: RhAreaService,
    private categoriaAuxiliarService: CategoriaAuxiliarService
  ) {
    console.log('🏗️ Constructor called at:', new Date().toISOString());
    this.initializeForm();
    this.setupGridOptions();
  }

  ngOnInit() {
    console.log('🎯 ngOnInit called at:', new Date().toISOString());
    this.setupHeaderConfigSubscription();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm() {
    // Calcular fechas por defecto (última semana)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    // Configurar date range picker con fechas por defecto
    const defaultDateRange: DateRange = {
      start: lastWeek.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
    
    this.dateRangeControl.setValue(defaultDateRange);

    this.filterForm = this.fb.group({
      // Los filtros ahora son manejados por las variables individuales
    });
  }

  private setupHeaderConfigSubscription() {
    console.log('🔄 Setting up HeaderConfig subscription...');
    
    // Primero obtener la configuración inicial
    const initialConfig = this.headerConfigService.getCurrentHeaderConfig();
    if (initialConfig) {
      console.log('📋 Initial header config:', initialConfig);
      this.loadMasterDataFromConfig(initialConfig);
    }

    // Luego suscribirse a cambios
    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        console.log('🔄 Header config changed:', config);
        if (config) {
          this.loadMasterDataFromConfig(config);
        }
      });
  }

  private loadMasterDataFromConfig(config: any) {
    console.log('🚀 loadMasterDataFromConfig called at:', new Date().toISOString());
    const companyId = config?.selectedEmpresa?.companiaId;
    
    console.log('🏢 Company ID from config:', companyId);

    if (!companyId) {
      console.warn('⚠️ No company ID available in config');
      return;
    }

    // Clear existing areas when company changes
    this.allAreas = [];
    this.filteredAreas = [];
    
    // Cargar áreas y sedes
    this.loadAreas(companyId.toString());
    this.loadSedes();
  }

  private loadAreas(companyId: string) {
    console.log('🔄 loadAreas called with companyId:', companyId);
    
    // Siempre recargar areas cuando se llame (similar al patrón exitoso)
    console.log('🔄 Loading areas from API...');
    this.rhAreaService.getAreas(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          console.log('📊 Raw areas from API:', areas?.length || 0);
          
          // Deduplicar por areaId para evitar duplicados del backend
          const uniqueAreas = areas ? 
            areas.filter((area, index, self) => 
              index === self.findIndex(a => a.areaId === area.areaId)
            ) : [];
          
          console.log('🔄 After deduplication:', uniqueAreas.length);
          console.log('📋 Unique areas:', uniqueAreas.map(a => `${a.areaId}: ${a.descripcion}`));
          
          this.allAreas = uniqueAreas;
          this.filteredAreas = [...this.allAreas];
          console.log('✅ Areas set in component, total:', this.allAreas.length);
        },
        error: (error) => {
          console.error('❌ Error loading areas:', error);
          this.allAreas = [];
          this.filteredAreas = [];
        }
      });
  }

  private loadSedes() {
    console.log('🔄 loadSedes called');
    
    // Solo cargar sedes si no están ya cargadas
    if (this.allSedes.length > 0) {
      console.log('✅ Sedes already loaded, skipping...');
      return;
    }

    this.categoriaAuxiliarService.getCategoriasAuxiliar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedes) => {
          console.log('📊 Sedes loaded:', sedes?.length || 0);
          this.allSedes = sedes || [];
          this.filteredSedes = [...this.allSedes];
        },
        error: (error) => {
          console.error('❌ Error loading sedes:', error);
          this.allSedes = [];
          this.filteredSedes = [];
        }
      });
  }

  // Grid setup
  private setupGridOptions() {
    // Extender las opciones Fiori con configuraciones específicas
    this.gridOptions = {
      ...this.gridOptions,
      onGridReady: (params) => {
        this.gridApi = params.api;
        this.autoSizeColumns();
      },
      // Configuración para tabla legible sin sticky columns
      rowHeight: 38, // Filas con buen tamaño para lectura
      headerHeight: 54, // Header con espacio suficiente
      groupHeaderHeight: 48, // Headers de grupo legibles
      suppressColumnVirtualisation: false, // Mantener virtualización para performance
      suppressMenuHide: true, // Ocultar menú de columnas para más espacio
    };
  }

  // Generar reporte
  onSearch() {
    if (!this.dateRangeControl.valid) {
      this.toastService.error('Validación', 'Por favor selecciona un rango de fechas válido');
      return;
    }

    const filters = this.prepareFilters();
    const validation = this.extraHoursService.validateFilters(filters);

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        this.toastService.error('Validación', error);
      });
      return;
    }

    this.isLoading = true;
    this.reportData = null;
    this.summaryData = null;

    // Cargar datos y resumen en paralelo
    const reportData$ = this.extraHoursService.getReportData(filters);
    const summaryData$ = this.extraHoursService.getSummary(filters);

    // Ejecutar ambas peticiones
    reportData$
      .pipe(
        finalize(() => this.isLoading = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          console.log('🔍 Raw API Response:', response);
          if (response.success && response.data) {
            console.log('📊 Report Data Array:', response.data);
            console.log('📈 Data Length:', response.data.length);
            console.log('👤 First Employee Sample:', response.data[0]);
            
            this.reportData = response;
            this.processReportData(response.data);
            this.setupDynamicColumns();
            this.loadSummary(filters);
            
            // Force grid refresh after data and columns are set
            setTimeout(() => {
              console.log('🔄 Grid API available:', !!this.gridApi);
              console.log('📋 Final Column Defs:', this.columnDefs.length);
              console.log('📊 Final Row Data:', this.rowData.length);
              
              if (this.gridApi) {
                this.gridApi.setGridOption('rowData', this.rowData);
                this.gridApi.setGridOption('columnDefs', this.columnDefs);
                this.autoSizeColumns();
                console.log('✅ Grid refreshed successfully');
              }
            }, 100);
          } else {
            console.warn('⚠️ No data found:', response);
            this.toastService.warning('Sin datos', response.message || 'No se encontraron datos para el período seleccionado');
            this.resetReportData();
          }
        },
        error: (error) => {
          console.error('Error loading report:', error);
          this.toastService.error('Error', 'Error al cargar el reporte de horas extras');
          this.resetReportData();
        }
      });
  }

  private loadSummary(filters: ReportFiltersHE) {
    this.extraHoursService.getSummary(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          if (summary.success) {
            this.summaryData = summary;
          }
        },
        error: (error) => {
          console.error('Error loading summary:', error);
        }
      });
  }

  private prepareFilters(): ReportFiltersHE {
    const dateRange = this.dateRangeControl.value;
    const headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    const companyId = headerConfig?.selectedEmpresa?.companiaId || '';

    const filters = {
      startDate: dateRange?.start || '',
      endDate: dateRange?.end || '',
      companyId: companyId,
      areaId: this.selectedArea?.areaId || '',
      sedeId: this.selectedSede?.categoriaAuxiliarId || ''
    };

    console.log('🎯 Prepared Filters:', filters);
    console.log('🏢 Header Config:', headerConfig);
    console.log('📍 Selected Area:', this.selectedArea);
    console.log('🏢 Selected Sede:', this.selectedSede);
    
    return filters;
  }

  // Procesamiento de datos
  private processReportData(data: ReporteAsistenciaSemanalDto[]) {
    console.log('⚙️ Processing report data...');
    this.processedData = data.map(employee => {
      const processedEmployee: ProcessedEmployeeData = {
        nroDoc: employee.nro_Doc,
        nombre: employee.colaborador,
        area: employee.area,
        sede: employee.sede,
        cargo: employee.cargo,
        fechaIngreso: employee.fechaIngreso,
        tipoTurno: '',
        days: {},
        totales: {
          horasNormales: employee.totalHorasNormales,
          horasExtras1: employee.totalHorasExtras1,
          horasExtras2: employee.totalHorasExtras2,
          horasExtras100: employee.totalHorasExtras100,
          vacaciones: employee.totalVacaciones,
          faltas: employee.totalFaltas,
          permisos: employee.totalPermisos
        }
      };

      // Procesar días
      Object.keys(employee.asistenciaPorDia).forEach(fecha => {
        const dayData = employee.asistenciaPorDia[fecha];
        processedEmployee.days[fecha] = {
          entrada: dayData.horaEntrada,
          salida: dayData.horaSalida,
          horasNormales: dayData.horasNormales,
          horasExtras1: dayData.horasExtras1,
          horasExtras2: dayData.horasExtras2,
          horasExtras100: dayData.horasExtras100,
          estado: dayData.estado,
          tipoTurno: dayData.tipoTurno,
          cssClass: this.getStatusClass(dayData.estado)
        };
      });

      return processedEmployee;
    });

    console.log('✅ Processed Data:', this.processedData);
    console.log('👥 Total Employees Processed:', this.processedData.length);

    // Generar fechas del período
    this.generateReportDates();
    
    // Preparar datos para AG-Grid
    this.prepareRowData();
  }

  private generateReportDates() {
    const dateRange = this.dateRangeControl.value;
    if (!dateRange?.start || !dateRange?.end) {
      this.reportDates = [];
      return;
    }
    
    console.log('🎯 Input date range:', dateRange);
    
    // Crear fechas de forma explícita para evitar problemas de zona horaria
    const [startYear, startMonth, startDay] = dateRange.start.split('-').map(Number);
    const [endYear, endMonth, endDay] = dateRange.end.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay); // Mes es 0-indexed
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    console.log('📅 Parsed start date:', startDate.toISOString(), 'Local:', startDate.toLocaleDateString());
    console.log('📅 Parsed end date:', endDate.toISOString(), 'Local:', endDate.toLocaleDateString());
    
    this.reportDates = [];

    // Generar fechas en formato que coincida con la API: YYYY-MM-DDTHH:mm:ss
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Generar formato que coincida con la API: "2025-08-25T00:00:00"
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}T00:00:00`;
      this.reportDates.push(dateStr);
      
      console.log(`📆 Generated date: ${dateStr} from currentDate: ${currentDate.toLocaleDateString()}`);
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('📅 Final generated report dates (API format):', this.reportDates);
    console.log('📊 Total dates generated:', this.reportDates.length);
    
    // Test con el rango específico que mencionas
    console.log('🧪 TESTING: Expected range 2025-08-25 to 2025-08-31');
    console.log('🧪 TESTING: Generated first date:', this.reportDates[0]);
    console.log('🧪 TESTING: Generated last date:', this.reportDates[this.reportDates.length - 1]);
    console.log('🧪 TESTING: Should have 7 dates, got:', this.reportDates.length);
  }

  private prepareRowData() {
    console.log('🗂️ Preparing row data for AG-Grid...');
    console.log('📅 Report Dates:', this.reportDates);
    this.rowData = this.processedData.map(employee => {
      console.log(`👤 Processing employee: ${employee.nombre}`);
      console.log('📊 Available dates for employee:', Object.keys(employee.days));
      const row: any = {
        nroDoc: employee.nroDoc,
        nombre: employee.nombre,
        area: employee.area,
        sede: employee.sede,
        cargo: employee.cargo,
        fechaIngreso: employee.fechaIngreso,
        tipoTurno: employee.tipoTurno,
        totalHorasNormales: employee.totales.horasNormales,
        totalHorasExtras1: employee.totales.horasExtras1,
        totalHorasExtras2: employee.totales.horasExtras2,
        totalHorasExtras100: employee.totales.horasExtras100,
        totalVacaciones: employee.totales.vacaciones,
        totalFaltas: employee.totales.faltas,
        totalPermisos: employee.totales.permisos
      };

      // Agregar datos por fecha - ahora con formato correcto
      this.reportDates.forEach(fecha => {
        console.log(`🔍 Buscando fecha ${fecha} para empleado ${employee.nombre}:`);
        console.log(`  📊 Fechas disponibles en employee.days:`, Object.keys(employee.days));
        
        // Buscar la fecha exacta (formato API: "2025-08-29T00:00:00")
        const dayData = employee.days[fecha];
        
        if (dayData) {
          console.log(`  ✅ Encontrada fecha exacta: ${fecha}`);
          console.log(`  💾 Guardando datos para ${fecha}:`, { 
            entrada: dayData.entrada, 
            salida: dayData.salida,
            horasNormales: dayData.horasNormales,
            horasExtras1: dayData.horasExtras1,
            estado: dayData.estado
          });
          row[`entrada_${fecha}`] = dayData.entrada;
          row[`salida_${fecha}`] = dayData.salida;
          row[`horasNormales_${fecha}`] = dayData.horasNormales;
          row[`horasExtras1_${fecha}`] = dayData.horasExtras1;
          row[`horasExtras2_${fecha}`] = dayData.horasExtras2;
          row[`horasExtras100_${fecha}`] = dayData.horasExtras100;
          row[`estado_${fecha}`] = dayData.estado;
          row[`tipoTurno_${fecha}`] = dayData.tipoTurno;
        } else {
          console.log(`  ❌ NO se encontraron datos para ${fecha} - usando valores por defecto`);
          console.log(`  🔍 Todas las fechas disponibles:`, Object.keys(employee.days));
          row[`entrada_${fecha}`] = 'FALTA';
          row[`salida_${fecha}`] = 'FALTA';
          row[`horasNormales_${fecha}`] = 0;
          row[`horasExtras1_${fecha}`] = 0;
          row[`horasExtras2_${fecha}`] = 0;
          row[`horasExtras100_${fecha}`] = 0;
          row[`estado_${fecha}`] = 'FALTA';
          row[`tipoTurno_${fecha}`] = '';
        }
      });

      return row;
    });

    console.log('📊 Row Data prepared:', this.rowData.length, 'rows');
    console.log('👤 Sample Row Data:', this.rowData[0]);
  }

  // Configuración dinámica de columnas
  private setupDynamicColumns() {
    console.log('📊 Setting up dynamic columns...');
    console.log('📅 Report Dates:', this.reportDates);
    
    this.columnDefs = [
      // Columnas de empleado sin sticky - mejor legibilidad
      { headerName: 'N° Doc', field: 'nroDoc', width: 90, pinned:'left',  cellClass: 'text-center' },
      { headerName: 'Colaborador', field: 'nombre',  pinned:'left', width: 200, cellClass: 'font-medium' },
      { headerName: 'Área', field: 'area',  width: 120 },
      { headerName: 'Sede', field: 'sede',  width: 100 },
      { headerName: 'Cargo', field: 'cargo', width: 140 },
    ];

    // Columnas dinámicas por fecha
    this.reportDates.forEach(fecha => {
      // Extraer solo la parte de fecha para mostrar en header
      const fechaSinTimestamp = fecha.split('T')[0];
      
      // Crear fecha de forma explícita para evitar problemas de timezone
      const [year, month, day] = fechaSinTimestamp.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day); // Mes es 0-indexed
      
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayMonth = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      
      console.log(`🗓️ Processing date: ${fecha} -> Header: ${dayName.toUpperCase()} ${dayMonth}`);
      
      const headerGroup = {
        headerName: `${dayName.toUpperCase()} ${dayMonth}`,
        children: [
          {
            headerName: 'Entrada',
            field: `entrada_${fecha}`,
            width: 75,
            cellClass: (params: any) => this.getCellClass(params, 'entrada'),
            cellRenderer: (params: any) => this.formatTimeCell(params.value)
          },
          {
            headerName: 'Salida', 
            field: `salida_${fecha}`,
            width: 75,
            cellClass: (params: any) => this.getCellClass(params, 'salida'),
            cellRenderer: (params: any) => this.formatTimeCell(params.value)
          },
          {
            headerName: 'H.N.',
            field: `horasNormales_${fecha}`,
            width: 65,
            cellClass: 'text-center hours-normal',
            cellRenderer: (params: any) => this.formatHoursCell(params.value)
          },
          {
            headerName: 'H.E.25%',
            field: `horasExtras1_${fecha}`,
            width: 75,
            cellClass: 'text-center hours-extra25',
            cellRenderer: (params: any) => this.formatHoursCell(params.value)
          },
          {
            headerName: 'H.E.35%',
            field: `horasExtras2_${fecha}`,
            width: 75,
            cellClass: 'text-center hours-extra35',
            cellRenderer: (params: any) => this.formatHoursCell(params.value)
          },
          {
            headerName: 'H.E.100%',
            field: `horasExtras100_${fecha}`,
            width: 80,
            cellClass: 'text-center hours-extra100',
            cellRenderer: (params: any) => this.formatHoursCell(params.value)
          }
        ]
      };
      
      this.columnDefs.push(headerGroup as ColDef);
    });

    // Columnas de totales (sticky a la derecha)
    this.columnDefs.push(
      // Columnas de totales SIN sticky - al final de la tabla
      { 
        headerName: 'Total H.N.', 
        field: 'totalHorasNormales', 
        width: 90, 
        cellClass: 'text-center font-bold hours-normal bg-blue-50', 
        cellRenderer: (params: any) => this.formatHoursCell(params.value)
      },
      { 
        headerName: 'Total H.E.25%', 
        field: 'totalHorasExtras1', 
        width: 100, 
        cellClass: 'text-center font-bold hours-extra25 bg-orange-50', 
        cellRenderer: (params: any) => this.formatHoursCell(params.value)
      },
      { 
        headerName: 'Total H.E.35%', 
        field: 'totalHorasExtras2', 
        width: 100, 
        cellClass: 'text-center font-bold hours-extra35 bg-red-50', 
        cellRenderer: (params: any) => this.formatHoursCell(params.value)
      },
      { 
        headerName: 'Total H.E.100%', 
        field: 'totalHorasExtras100', 
        width: 110, 
        cellClass: 'text-center font-bold hours-extra100 bg-purple-50', 
        cellRenderer: (params: any) => this.formatHoursCell(params.value)
      },
      { 
        headerName: 'Vacaciones', 
        field: 'totalVacaciones', 
        width: 90, 
        cellClass: 'text-center font-bold bg-green-50', 
        cellRenderer: (params: any) => this.formatCountCell(params.value)
      },
      { 
        headerName: 'Faltas', 
        field: 'totalFaltas', 
        width: 70, 
        cellClass: 'text-center font-bold bg-red-50', 
        cellRenderer: (params: any) => this.formatCountCell(params.value)
      },
      { 
        headerName: 'Permisos', 
        field: 'totalPermisos', 
        width: 80, 
        cellClass: 'text-center font-bold bg-yellow-50', 
        cellRenderer: (params: any) => this.formatCountCell(params.value)
      }
    );

    console.log('🏗️ Column Definitions Created:', this.columnDefs.length, 'columns');
    console.log('📋 Sample Column Def:', this.columnDefs[0]);
  }

  // Funciones auxiliares
  private getStatusClass(estado: string): string {
    switch (estado) {
      case 'FALTA': return 'status-absent';
      case 'VACACIONES': return 'status-vacation';
      case 'PERMISO': return 'status-permission';
      case 'PRESENTE': return 'status-present';
      default: return '';
    }
  }

  private getCellClass(params: any, type: 'entrada' | 'salida'): string {
    const fecha = params.colDef.field?.replace(`${type}_`, '');
    if (fecha) {
      const estado = params.data[`estado_${fecha}`];
      return this.getStatusClass(estado);
    }
    return '';
  }

  private formatTimeCell(value: any): string {
    if (!value || value === 'FALTA') {
      return '<span class="text-red-600 font-medium">FALTA</span>';
    }
    return `<span class="font-mono">${value}</span>`;
  }

  private formatHoursCell(value: any): string {
    if (!value || value === 0) {
      return '<span class="text-gray-400">-</span>';
    }
    return `<span class="font-mono">${this.extraHoursService.formatHours(value)}</span>`;
  }

  private formatCountCell(value: any): string {
    if (!value || value === 0) {
      return '<span class="text-gray-400">0</span>';
    }
    return `<span class="font-mono font-bold">${value}</span>`;
  }

  // Métodos para Date Range Picker
  onDateRangeSelected(dateRange: DateRange): void {
    console.log('📅 Date range selected:', dateRange);
    // El FormControl ya está actualizado automáticamente
  }

  // Métodos para Área Autocomplete
  getAreaFilterText(): string {
    return this.selectedArea ? this.selectedArea.descripcion : this.areaFilterTerm;
  }

  onAreaFilterChange(event: any): void {
    const filterValue = (event.target.value || '').toLowerCase().trim();
    this.areaFilterTerm = event.target.value || '';
    
    console.log('🔍 onAreaFilterChange called with:', filterValue);
    console.log('📊 allAreas length:', this.allAreas.length);
    console.log('📋 allAreas data:', this.allAreas.map(a => a.descripcion));
    
    if (!filterValue) {
      this.filteredAreas = [...this.allAreas];
      console.log('🌟 Reset filter - showing all areas:', this.filteredAreas.length);
    } else {
      this.filteredAreas = this.allAreas.filter(area =>
        area.descripcion.toLowerCase().includes(filterValue)
      );
      console.log('🎯 Filtered areas:', this.filteredAreas.length, 'matches for:', filterValue);
    }
    
    // Reset selection if typing new text
    if (filterValue !== this.selectedArea?.descripcion?.toLowerCase()) {
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

  // Métodos para Sede Autocomplete
  getSedeFilterText(): string {
    return this.selectedSede ? this.selectedSede.descripcion : this.sedeFilterTerm;
  }

  onSedeFilterChange(event: any): void {
    const value = (event.target?.value || '').trim();
    this.sedeFilterTerm = value;
    
    if (!value) {
      this.filteredSedes = [...this.allSedes];
    } else {
      this.filteredSedes = this.allSedes.filter(sede => 
        sede.descripcion.toLowerCase().includes(value.toLowerCase())
      );
    }
    
    // Reset selection if typing new text
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

  // Exportar Excel
  exportToExcel() {
    if (!this.reportData) {
      this.toastService.warning('Sin datos', 'No hay datos para exportar');
      return;
    }

    const filters = this.prepareFilters();
    this.isExporting = true;

    this.extraHoursService.downloadExcel(filters)
      .pipe(
        finalize(() => this.isExporting = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.extraHoursService.generateFileName(filters);
          link.click();
          window.URL.revokeObjectURL(url);
          
          this.toastService.success('Descarga', 'Reporte descargado exitosamente');
        },
        error: (error) => {
          console.error('Error downloading Excel:', error);
          this.toastService.error('Error', 'Error al descargar el reporte');
        }
      });
  }

  // Utilidades
  autoSizeColumns() {
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
      const actualWidth = column.getActualWidth();
      if (actualWidth > 200) {
        columnsToResize.push({
          key: column.getId(),
          newWidth: 200
        });
      }
    });

    // Aplicar los anchos máximos
    if (columnsToResize.length > 0) {
      this.gridApi.setColumnWidths(columnsToResize);
    }
  }

  onClearFilters(): void {
    // Limpiar filtros
    this.selectedArea = null;
    this.selectedSede = null;
    this.areaFilterTerm = '';
    this.sedeFilterTerm = '';
    
    // Reset filtered lists to show all items
    this.filteredAreas = [...this.allAreas];
    this.filteredSedes = [...this.allSedes];
    
    // Restablecer fechas por defecto
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    const defaultDateRange: DateRange = {
      start: lastWeek.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
    
    this.dateRangeControl.setValue(defaultDateRange);
    this.resetReportData();
  }

  private resetReportData() {
    this.reportData = null;
    this.summaryData = null;
    this.processedData = [];
    this.rowData = [];
    this.columnDefs = [];
    this.reportDates = [];
  }

  private markFormGroupTouched(): void {
    this.dateRangeControl.markAsTouched();
  }

  formatHours(hours: number): string {
    return this.extraHoursService.formatHours(hours);
  }

  formatDateForDisplay(dateString: string): string {
    return this.extraHoursService.formatDateForDisplay(dateString);
  }
}