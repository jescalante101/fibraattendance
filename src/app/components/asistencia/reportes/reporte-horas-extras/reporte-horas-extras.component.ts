import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridApi } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { Subject, takeUntil, finalize } from 'rxjs';

import { ExtraHoursReportService } from 'src/app/core/services/report/extra-hours-report.service';
import { HeaderConfigService } from 'src/app/core/services/header-config.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { 
  ReportFiltersHE,
  ExtraHoursReportResult,
  ReporteAsistenciaSemanalDto,
  ProcessedEmployeeData,
  ProcessedDayData,
  AreaOption,
  SedeOption,
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

  // Filtros auxiliares
  allAreas: AreaOption[] = [];
  filteredAreas: AreaOption[] = [];
  showAreaDropdown = false;
  selectedArea: AreaOption | null = null;

  allSedes: SedeOption[] = [];
  filteredSedes: SedeOption[] = [];
  showSedeDropdown = false;
  selectedSede: SedeOption | null = null;

  // Fechas del reporte
  reportDates: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private extraHoursService: ExtraHoursReportService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService
  ) {
    this.initializeForm();
    this.setupGridOptions();
  }

  ngOnInit() {
    this.loadInitialData();
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

    this.filterForm = this.fb.group({
      fechaInicio: [lastWeek.toISOString().split('T')[0], Validators.required],
      fechaFin: [today.toISOString().split('T')[0], Validators.required],
      areaFilter: [''],
      sedeFilter: [''],
      areaId: [''],
      sedeId: ['']
    });
  }

  private loadInitialData() {
    const headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    const companyId = headerConfig?.selectedEmpresa?.companiaId;

    if (!companyId) {
      this.toastService.error('Error', 'No se pudo obtener el ID de la compañía');
      return;
    }

    // Cargar áreas y sedes
    this.loadAreas(companyId);
    this.loadSedes(companyId);
  }

  private loadAreas(companyId: string) {
    this.extraHoursService.getAreas(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.allAreas = areas || [];
          this.filteredAreas = [...this.allAreas];
        },
        error: (error) => {
          console.error('Error loading areas:', error);
          this.allAreas = [];
          this.filteredAreas = [];
        }
      });
  }

  private loadSedes(companyId: string) {
    this.extraHoursService.getSites(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedes) => {
          this.allSedes = sedes || [];
          this.filteredSedes = [...this.allSedes];
        },
        error: (error) => {
          console.error('Error loading sedes:', error);
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
      }
    };
  }

  // Generar reporte
  onSearch() {
    if (this.filterForm.invalid) {
      this.markFormGroupTouched();
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
    const formValue = this.filterForm.value;
    const headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    const companyId = headerConfig?.selectedEmpresa?.companiaId || '';

    const filters = {
      startDate: formValue.fechaInicio,
      endDate: formValue.fechaFin,
      companyId: companyId,
      areaId: this.selectedArea?.id || '',
      sedeId: this.selectedSede?.id || ''
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
        days: {},
        totales: {
          horasNormales: employee.totalHorasNormales,
          horasExtras1: employee.totalHorasExtras1,
          horasExtras2: employee.totalHorasExtras2
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
          estado: dayData.estado,
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
    const startDate = new Date(this.filterForm.value.fechaInicio);
    const endDate = new Date(this.filterForm.value.fechaFin);
    this.reportDates = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      this.reportDates.push(d.toISOString().split('T')[0]);
    }
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
        totalHorasNormales: employee.totales.horasNormales,
        totalHorasExtras1: employee.totales.horasExtras1,
        totalHorasExtras2: employee.totales.horasExtras2
      };

      // Agregar datos por fecha
      this.reportDates.forEach(fecha => {
        // Buscar la fecha en diferentes formatos
        let dayData = employee.days[fecha];
        
        console.log(`🔍 Buscando fecha ${fecha} para empleado ${employee.nombre}:`);
        
        // Si no se encuentra, buscar con formato de timestamp
        if (!dayData) {
          const fechaConTimestamp = `${fecha}T00:00:00`;
          dayData = employee.days[fechaConTimestamp];
          console.log(`  📅 Probando formato timestamp: ${fechaConTimestamp} =>`, !!dayData);
        }
        
        // Si no se encuentra, buscar cualquier variación de fecha
        if (!dayData) {
          const fechaBuscada = fecha;
          const fechaEncontrada = Object.keys(employee.days).find(key => 
            key.startsWith(fechaBuscada)
          );
          if (fechaEncontrada) {
            dayData = employee.days[fechaEncontrada];
            console.log(`  ✅ Encontrada variación: ${fechaEncontrada}`);
          }
        }
        
        if (dayData) {
          console.log(`  💾 Guardando datos para ${fecha}:`, { entrada: dayData.entrada, horasNormales: dayData.horasNormales });
          row[`entrada_${fecha}`] = dayData.entrada;
          row[`salida_${fecha}`] = dayData.salida;
          row[`horasNormales_${fecha}`] = dayData.horasNormales;
          row[`horasExtras1_${fecha}`] = dayData.horasExtras1;
          row[`horasExtras2_${fecha}`] = dayData.horasExtras2;
          row[`estado_${fecha}`] = dayData.estado;
        } else {
          row[`entrada_${fecha}`] = 'FALTA';
          row[`salida_${fecha}`] = 'FALTA';
          row[`horasNormales_${fecha}`] = 0;
          row[`horasExtras1_${fecha}`] = 0;
          row[`horasExtras2_${fecha}`] = 0;
          row[`estado_${fecha}`] = 'FALTA';
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
      // Columnas fijas de empleado
      { headerName: 'N° Doc', field: 'nroDoc', pinned: 'left', width: 100, cellClass: 'text-center' },
      { headerName: 'Colaborador', field: 'nombre', pinned: 'left', width: 200, cellClass: 'font-medium' },
      { headerName: 'Área', field: 'area', pinned: 'left', width: 120 },
      { headerName: 'Sede', field: 'sede', pinned: 'left', width: 100 },
      { headerName: 'Cargo', field: 'cargo', width: 150 },
    ];

    // Columnas dinámicas por fecha
    this.reportDates.forEach(fecha => {
      const dateObj = new Date(fecha);
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayMonth = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      
      const headerGroup = {
        headerName: `${dayName.toUpperCase()} ${dayMonth}`,
        children: [
          {
            headerName: 'Entrada',
            field: `entrada_${fecha}`,
            width: 80,
            cellClass: (params: any) => this.getCellClass(params, 'entrada'),
            cellRenderer: (params: any) => this.formatTimeCell(params.value)
          },
          {
            headerName: 'Salida', 
            field: `salida_${fecha}`,
            width: 80,
            cellClass: (params: any) => this.getCellClass(params, 'salida'),
            cellRenderer: (params: any) => this.formatTimeCell(params.value)
          },
          {
            headerName: 'H.N.',
            field: `horasNormales_${fecha}`,
            width: 70,
            cellClass: 'text-center hours-normal',
            cellRenderer: (params: any) => this.formatHoursCell(params.value)
          },
          {
            headerName: 'H.E.1',
            field: `horasExtras1_${fecha}`,
            width: 70,
            cellClass: 'text-center hours-extra1',
            cellRenderer: (params: any) => this.formatHoursCell(params.value)
          },
          {
            headerName: 'H.E.2',
            field: `horasExtras2_${fecha}`,
            width: 70,
            cellClass: 'text-center hours-extra2',
            cellRenderer: (params: any) => this.formatHoursCell(params.value)
          }
        ]
      };
      
      this.columnDefs.push(headerGroup as ColDef);
    });

    // Columnas de totales
    this.columnDefs.push(
      { headerName: 'Total H.N.', field: 'totalHorasNormales', width: 100, cellClass: 'text-center font-bold hours-normal', cellRenderer: (params: any) => this.formatHoursCell(params.value) },
      { headerName: 'Total H.E.1', field: 'totalHorasExtras1', width: 100, cellClass: 'text-center font-bold hours-extra1', cellRenderer: (params: any) => this.formatHoursCell(params.value) },
      { headerName: 'Total H.E.2', field: 'totalHorasExtras2', width: 100, cellClass: 'text-center font-bold hours-extra2', cellRenderer: (params: any) => this.formatHoursCell(params.value) }
    );

    console.log('🏗️ Column Definitions Created:', this.columnDefs.length, 'columns');
    console.log('📋 Sample Column Def:', this.columnDefs[0]);
  }

  // Funciones auxiliares
  private getStatusClass(estado: string): string {
    switch (estado) {
      case 'FALTA': return 'status-absent';
      case 'VACACIONES': return 'status-vacation';
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

  // Filtros auxiliares
  onAreaFilterChange(event: any) {
    const value = event.target.value.toLowerCase();
    this.filteredAreas = this.allAreas.filter(area => 
      area.descripcion.toLowerCase().includes(value)
    );
  }

  onAreaSelected(area: AreaOption | null) {
    this.selectedArea = area;
    this.filterForm.patchValue({ 
      areaFilter: area ? area.descripcion : '',
      areaId: area ? area.id : ''
    });
    this.showAreaDropdown = false;
  }

  onAreaBlur() {
    setTimeout(() => this.showAreaDropdown = false, 200);
  }

  onSedeFilterChange(event: any) {
    const value = event.target.value.toLowerCase();
    this.filteredSedes = this.allSedes.filter(sede => 
      sede.descripcion.toLowerCase().includes(value)
    );
  }

  onSedeSelected(sede: SedeOption | null) {
    this.selectedSede = sede;
    this.filterForm.patchValue({ 
      sedeFilter: sede ? sede.descripcion : '',
      sedeId: sede ? sede.id : ''
    });
    this.showSedeDropdown = false;
  }

  onSedeBlur() {
    setTimeout(() => this.showSedeDropdown = false, 200);
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

  onClearFilters() {
    this.selectedArea = null;
    this.selectedSede = null;
    this.filterForm.reset();
    
    // Restablecer fechas por defecto
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    this.filterForm.patchValue({
      fechaInicio: lastWeek.toISOString().split('T')[0],
      fechaFin: today.toISOString().split('T')[0]
    });

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

  private markFormGroupTouched() {
    Object.keys(this.filterForm.controls).forEach(key => {
      this.filterForm.get(key)?.markAsTouched();
    });
  }

  formatHours(hours: number): string {
    return this.extraHoursService.formatHours(hours);
  }

  formatDateForDisplay(dateString: string): string {
    return this.extraHoursService.formatDateForDisplay(dateString);
  }
}