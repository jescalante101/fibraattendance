import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridOptions } from 'ag-grid-community';
import { WeeklyAttendanceReportData } from 'src/app/core/models/report/weekly-attendance-report.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { AG_GRID_LOCALE_ES } from 'src/app/ag-grid-locale.es';
import { createFioriGridOptions, localeTextFiori } from 'src/app/shared/ag-grid-theme-fiori';


@Component({
  selector: 'app-reporte-asistencia-mensual',
  templateUrl: './reporte-asistencia-mensual.component.html',
  styleUrls: ['./reporte-asistencia-mensual.component.css']
})
export class ReporteAsistenciaMensualComponent implements OnInit, OnDestroy {
  
  // Formulario Reactivo para los filtros
  filterForm!: FormGroup;
  isLoading = false;

  // AG-Grid Configuration
  @ViewChild('agGrid', { static: false }) agGrid!: AgGridAngular;
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridOptions: GridOptions = {
    ...createFioriGridOptions(),
    // Configuraciones específicas para el reporte mensual
    suppressHorizontalScroll: false,
    rowSelection: 'multiple',
    rowHeight: 40,
    headerHeight: 50
  };
  
  // Datos del reporte 
  reportData: WeeklyAttendanceReportData | null = null;
  
  // Configuración de vista
  showWeekends = false;
  showSummary = true;
  
  // Estadísticas generales
  totalEmpleados = 0;
  porcentajeAsistenciaGeneral = 0;
  totalDiasTrabajados = 0;
  totalFaltas = 0;

  // Estados de carga
  isExporting = false;

  // Configuración del header
  headerConfig: HeaderConfig | null = null;
  private destroy$ = new Subject<void>();

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
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadHeaderConfig();
    this.loadMasterData();
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
      areaId: [''],
      areaFilter: [''],
      companiaId: [{ value: '', disabled: true }],
      sedeId: [''],
      sedeFilter: [''],
      cargoId: [{ value: '', disabled: true }],
      centroCostoId: [{ value: '', disabled: true }]
    });
  }

  private loadHeaderConfig(): void {
    this.headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    this.applyHeaderConfigToForm();

    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: HeaderConfig | null) => {
        this.headerConfig = config;
        this.applyHeaderConfigToForm();
      });
  }

  private applyHeaderConfigToForm(): void {
    if (this.headerConfig && this.filterForm) {
      this.filterForm.patchValue({
        companiaId: this.headerConfig.selectedEmpresa?.companiaId || ''
      }, { emitEvent: false });
    }
  }

  formatDate(fecha: string | Date): string {
    return fecha instanceof Date ? fecha.toISOString().split('T')[0] : fecha;
  }

  onSearch(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    
    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      
      pageNumber: 1,
      pageSize: 10000
    };

    this.isLoading = true;
    this.reportData = null;
    
    
    // Load weekly attendance report
    this.attendanceMatrixService.getWeeklyAttendanceReport(params).subscribe({
      next: (data) => {
        this.reportData = data;
        this.setupAgGrid();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar reporte:', error);
        this.isLoading = false;
      }
    });
  }

  onClearFilters(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.filterForm.reset({
      fechaInicio: this.formatDate(firstDay),
      fechaFin: this.formatDate(now),
      employeeId: { value: '', disabled: true },
      areaId: { value: '', disabled: true },
      companiaId: { value: this.headerConfig?.selectedEmpresa?.companiaId || '', disabled: true },
      sedeId: { value: '', disabled: true },
      cargoId: { value: '', disabled: true },
      centroCostoId: { value: '', disabled: true }
    });
    this.applyHeaderConfigToForm();
  }

  // AG-Grid Methods
  setupAgGrid(): void {
    if (!this.reportData || !this.reportData.content) return;

    this.columnDefs = this.createColumnDefs();
    this.rowData = this.createRowData();
  }

  createColumnDefs(): ColDef[] {
    if (!this.reportData || !this.reportData.content) return [];
  
    const fixedColumns: ColDef[] = [
      {
        headerName: 'ITEM',
        field: 'itemNumber',
        width: 70,
        pinned: 'left',
        cellStyle: { textAlign: 'center' },
        headerClass: 'fiori-header',
      },
      {
        headerName: 'NRO DOC',
        field: 'nroDoc',
        width: 120,
        pinned: 'left',
        headerClass: 'fiori-header',
      },
      {
        headerName: 'COLABORADOR',
        field: 'colaborador',
        width: 250,
        pinned: 'left',
        headerClass: 'fiori-header',
      },
      {
        headerName: 'PLANILLA',
        field: 'planilla',
        width: 100,
        pinned: 'left',
        headerClass: 'fiori-header',
        cellRenderer: (params: any) => {
          const planilla = params.value;
          const className = planilla === 'EMPLEADOS' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
          return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}">${planilla}</span>`;
        }
      },
      {
        headerName: 'ÁREA',
        field: 'area',
        width: 150,
        pinned: 'left',
        headerClass: 'fiori-header',
      },
      {
        headerName: 'CARGO',
        field: 'cargo',
        width: 120,
        headerClass: 'fiori-header',
      },
      {
        headerName: 'F. INGRESO',
        field: 'fechaIngreso',
        width: 110,
        headerClass: 'fiori-header',
        valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      }
    ];
  
    // Add dynamic date columns based on report type
    const dateColumns = this.createDateColumns();
    
    return [...fixedColumns, ...dateColumns];
  }

  createDateColumns(): ColDef[] {
    if (!this.reportData || !this.reportData.content) return [];

    const dateColumns: ColDef[] = [];
    const weeklyData = this.reportData as WeeklyAttendanceReportData;
    
    weeklyData.content.weekGroups.forEach(weekGroup => {
      // Crear grupo de columnas para cada semana
      const weekColumnGroup: ColGroupDef = {
        headerName: `SEM ${weekGroup.weekNumber} (${this.getWeekDateRange(weekGroup)})`,
        headerClass: 'week-header',
        children: [
          // Columna TURNO para cada semana
          {
            headerName: 'TURNO',
            field: `week_${weekGroup.weekNumber}_turno`,
            width: 90,
            headerClass: 'turno-header',
            cellStyle: { textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }
          },
          // Columnas de días con entrada y salida
          ...weekGroup.dates.map((date, index) => ({
            headerName: `${weekGroup.dayNames[index]}\n${weekGroup.dayNumbers[index]}`,
            headerClass: 'day-group-header',
            children: [
              {
                headerName: 'Entrada',
                field: `week_${weekGroup.weekNumber}_day_${index}_entrada`,
                width: 70,
                headerClass: 'sub-day-header',
                cellStyle: (params: any) => {
                  const type = params.data[`week_${weekGroup.weekNumber}_day_${index}_type`];
                  const baseStyle = { textAlign: 'center', fontSize: '10px', fontWeight: 'bold' };
                  
                  switch (type) {
                    case 'work': 
                      return { ...baseStyle, backgroundColor: '#dcfce7', color: '#15803d' };
                    case 'absence': 
                      return { ...baseStyle, backgroundColor: '#fecaca', color: '#dc2626' };
                    case 'permission': 
                      return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
                    case 'holiday': 
                      return { ...baseStyle, backgroundColor: '#fed7aa', color: '#ea580c' }; // Naranja para feriados
                    default: 
                      return { ...baseStyle, backgroundColor: '#f9fafb', color: '#6b7280' };
                  }
                },
                cellRenderer: (params: any) => {
                  const type = params.data[`week_${weekGroup.weekNumber}_day_${index}_type`];
                  const entrada = params.value || '';
                  
                  if (type === 'holiday') {
                    // Para feriados: mostrar la marcación real si existe, sino mostrar "FER"
                    if (entrada) {
                      return entrada;
                    }
                    const tipoPermiso = params.data[`week_${weekGroup.weekNumber}_day_${index}_permission`];
                    return 'FER';
                  }
                  
                  if (type === 'permission') {
                    const tipoPermiso = params.data[`week_${weekGroup.weekNumber}_day_${index}_permission`];
                    return tipoPermiso ? tipoPermiso.substring(0, 3) : 'PERM';
                  }
                  
                  if (type === 'work' && entrada) {
                    return entrada;
                  }
                  
                  if (type === 'absence' || !type) {
                    return 'F';
                  }
                  
                  return '-';
                }
              },
              {
                headerName: 'Salida',
                field: `week_${weekGroup.weekNumber}_day_${index}_salida`,
                width: 70,
                headerClass: 'sub-day-header',
                cellStyle: (params: any) => {
                  const type = params.data[`week_${weekGroup.weekNumber}_day_${index}_type`];
                  const baseStyle = { textAlign: 'center', fontSize: '10px', fontWeight: 'bold' };
                  
                  switch (type) {
                    case 'work': 
                      return { ...baseStyle, backgroundColor: '#dcfce7', color: '#15803d' };
                    case 'absence': 
                      return { ...baseStyle, backgroundColor: '#fecaca', color: '#dc2626' };
                    case 'permission': 
                      return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
                    case 'holiday': 
                      return { ...baseStyle, backgroundColor: '#fed7aa', color: '#ea580c' }; // Naranja para feriados
                    default: 
                      return { ...baseStyle, backgroundColor: '#f9fafb', color: '#6b7280' };
                  }
                },
                cellRenderer: (params: any) => {
                  const type = params.data[`week_${weekGroup.weekNumber}_day_${index}_type`];
                  const salida = params.value || '';
                  const hours = params.data[`week_${weekGroup.weekNumber}_day_${index}_hours`] || 0;
                  
                  if (type === 'holiday') {
                    // Para feriados: mostrar la marcación real si existe, sino mostrar "FER"
                    if (salida) {
                      return salida;
                    }
                    if (hours > 0) {
                      const hoursInt = Math.floor(hours);
                      const minutes = Math.round((hours - hoursInt) * 60);
                      return `${hoursInt}:${minutes.toString().padStart(2, '0')}h`;
                    }
                    return 'FER';
                  }
                  
                  if (type === 'permission') {
                    return '';
                  }
                  
                  if (type === 'work' && salida) {
                    return salida;
                  }
                  
                  if (type === 'work' && hours > 0) {
                    const hoursInt = Math.floor(hours);
                    const minutes = Math.round((hours - hoursInt) * 60);
                    return `${hoursInt}:${minutes.toString().padStart(2, '0')}h`;
                  }
                  
                  if (type === 'absence' || !type) {
                    return 'F';
                  }
                  
                  return '-';
                }
              }
            ]
          }))
        ]
      };
      dateColumns.push(weekColumnGroup);
    });
    
    // Grupo de totales generales separado en dos columnas
    const totalGeneralesGroup: ColGroupDef = {
      headerName: 'TOTALES GENERALES',
      headerClass: 'general-totals-header',
      children: [
        {
          field: 'totalHoras',
          headerName: 'H. Trabajo',
          width: 100,
          pinned: 'right',
          cellStyle: { 
            textAlign: 'center', 
            fontSize: '11px', 
            fontWeight: 'bold',
            backgroundColor: '#ecfdf5',
            color: '#16a34a'
          },
          cellRenderer: (params: any) => {
            const totals = params.data.globalTotals;
            const hours = totals?.totalHoras || 0;
            const formatHours = (h: number) => {
              if (!h) return '0:00';
              const hInt = Math.floor(h);
              const m = Math.round((h - hInt) * 60);
              return `${hInt}:${m.toString().padStart(2, '0')}`;
            };
            return `<div class="flex items-center justify-center gap-1">
              <svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>${formatHours(hours)}</span>
            </div>`;
          }
        } as ColDef,
        {
          field: 'totalExtras',
          headerName: 'H. Extras',
          width: 100,
          pinned: 'right',
          cellStyle: { 
            textAlign: 'center', 
            fontSize: '11px', 
            fontWeight: 'bold',
            backgroundColor: '#fff7ed',
            color: '#ea580c'
          },
          cellRenderer: (params: any) => {
            const totals = params.data.globalTotals;
            const hours = totals?.totalExtras || 0;
            const formatHours = (h: number) => {
              if (!h) return '0:00';
              const hInt = Math.floor(h);
              const m = Math.round((h - hInt) * 60);
              return `${hInt}:${m.toString().padStart(2, '0')}`;
            };
            return `<div class="flex items-center justify-center gap-1">
              <svg class="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>${formatHours(hours)}</span>
            </div>`;
          }
        } as ColDef
      ]
    };
    dateColumns.push(totalGeneralesGroup);
    return dateColumns;
  }

  createRowData(): any[] {
    if (!this.reportData || !this.reportData.content) return [];

    const weeklyData = this.reportData as WeeklyAttendanceReportData;
    
    return weeklyData.content.employees.map(employee => {
      const row: any = {
        itemNumber: employee.itemNumber,
        nroDoc: employee.nroDoc,
        colaborador: employee.colaborador,
        planilla: employee.planilla,
        area: employee.area,
        cargo: employee.cargo,
        fechaIngreso: employee.fechaIngreso
      };

      // Agregar datos por semana
      employee.weekData.forEach(week => {
        // Usar turno del backend
        row[`week_${week.weekNumber}_turno`] = week.turno || 'N/A';
        
        // Agregar datos por día
        week.dayData.forEach((day, dayIndex) => {
          const baseFieldKey = `week_${week.weekNumber}_day_${dayIndex}`;
          row[`${baseFieldKey}_entrada`] = day.entradaReal || '';
          row[`${baseFieldKey}_salida`] = day.salidaReal || '';
          row[`${baseFieldKey}_hours`] = day.horasTrabjadas;
          row[`${baseFieldKey}_type`] = day.type;
          row[`${baseFieldKey}_permission`] = day.tipoPermiso;
        });
      });

      // Agregar totales globales
      row.globalTotals = employee.globalTotals;
      
      // Agregar campos separados para las nuevas columnas de totales
      row.totalHoras = employee.globalTotals?.totalHoras || 0;
      row.totalExtras = employee.globalTotals?.totalExtras || 0;
      
      return row;

    });

  }

  autoSizeColumns(): void {
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.sizeColumnsToFit();
    }
  }

  // Toggle Methods
  toggleWeekends(): void {
    this.showWeekends = !this.showWeekends;
    // TODO: Implement weekend column visibility toggle
  }

  toggleSummary(): void {
    this.showSummary = !this.showSummary;
    // TODO: Implement summary column visibility toggle
  }


  exportToExcel(): void {
    if (this.isExporting || this.filterForm.invalid) return;

    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      pageNumber: 1,
      pageSize: 10000 // O un número grande para exportar todo
    };

    this.isExporting = true;
    
    this.attendanceMatrixService.downloadExportWeeklyAttendanceReport(params).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `Asistencia_Semanal_${params.fechaInicio}_${params.fechaFin}.xlsx`);
        this.isExporting = false;
      },
      error: (error) => {
        console.error('Error al descargar reporte:', error);
        this.isExporting = false;
      }
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Utility Methods
  getDayName(fecha: string): string {
    const dias = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return dias[new Date(fecha).getDay()];
  }

  getWeeklySummary(): any {
    if (this.reportData) {
      return (this.reportData as WeeklyAttendanceReportData).content.summary;
    }
    return null;
  }

  formatHours(hours: number): string {
    if (!hours || hours === 0) return '0:00h';
    const hoursInt = Math.floor(hours);
    const minutes = Math.round((hours - hoursInt) * 60);
    return `${hoursInt}:${minutes.toString().padStart(2, '0')}h`;
  }
  

  formatHoursHelper(hours: number): string {
    if (!hours || hours === 0) return '0:00h';
    const hoursInt = Math.floor(hours);
    const minutes = Math.round((hours - hoursInt) * 60);
    return `${hoursInt}:${minutes.toString().padStart(2, '0')}h`;
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

  // Helper method para obtener el rango de fechas de una semana
  getWeekDateRange(weekGroup: any): string {
    if (!weekGroup.dates || weekGroup.dates.length === 0) {
      return '';
    }
    
    const firstDate = new Date(weekGroup.dates[0]);
    const lastDate = new Date(weekGroup.dates[weekGroup.dates.length - 1]);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };
    
    return `${formatDate(firstDate)} - ${formatDate(lastDate)}`;
  }

}
