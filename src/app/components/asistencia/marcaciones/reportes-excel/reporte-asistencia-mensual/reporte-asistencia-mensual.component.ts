import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridOptions } from 'ag-grid-community';
import { WeeklyAttendanceReportData } from 'src/app/core/models/report/weekly-attendance-report.model';


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
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 50
    },
    suppressHorizontalScroll: false,
    enableRangeSelection: true,
    rowSelection: 'multiple'
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

  constructor(
    private fb: FormBuilder,
    private attendanceMatrixService: AttendanceMatrixReportService,
    private headerConfigService: HeaderConfigService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadHeaderConfig();
    // Aquí iría la lógica para cargar datos iniciales si es necesario
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
      employeeId: [{ value: '', disabled: true }],
      areaId: [{ value: '', disabled: true }],
      companiaId: [{ value: '', disabled: true }],
      sedeId: [{ value: '', disabled: true }],
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
        headerName: `SEMANA N° ${weekGroup.weekNumber}`,
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
                    default: 
                      return { ...baseStyle, backgroundColor: '#f9fafb', color: '#6b7280' };
                  }
                },
                cellRenderer: (params: any) => {
                  const type = params.data[`week_${weekGroup.weekNumber}_day_${index}_type`];
                  const entrada = params.value || '';
                  
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
                    default: 
                      return { ...baseStyle, backgroundColor: '#f9fafb', color: '#6b7280' };
                  }
                },
                cellRenderer: (params: any) => {
                  const type = params.data[`week_${weekGroup.weekNumber}_day_${index}_type`];
                  const salida = params.value || '';
                  const hours = params.data[`week_${weekGroup.weekNumber}_day_${index}_hours`] || 0;
                  
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
    
    // Columna de totales globales
    dateColumns.push({
      headerName: 'TOTALES<br>H.TRAB | H.EXTRA',
      field: 'globalTotals',
      width: 120,
      pinned: 'right',
      headerClass: 'totals-header',
      cellStyle: { 
        textAlign: 'center', 
        fontSize: '11px', 
        fontWeight: 'bold',
        backgroundColor: '#f0fdf4',
        borderLeft: '2px solid #10b981'
      },
      cellRenderer: (params: any) => {
        const totals = params.data.globalTotals;
        if (totals) {
          const formatHours = (hours: number) => {
            if (!hours) return '0:00';
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${h}:${m.toString().padStart(2, '0')}`;
          };
          return `${formatHours(totals.totalHoras)} | ${formatHours(totals.totalExtras)}`;
        }
        return '0:00 | 0:00';
      }
    });
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


}
