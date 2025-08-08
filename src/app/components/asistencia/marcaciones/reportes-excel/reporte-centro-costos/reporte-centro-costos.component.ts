import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridOptions } from 'ag-grid-community';
import { CostCenterReportData } from 'src/app/core/models/report/cost-center-report.model';


@Component({
  selector: 'app-reporte-centro-costos',
  templateUrl: './reporte-centro-costos.component.html',
  styleUrls: ['./reporte-centro-costos.component.css']
})
export class ReporteCentroCostosComponent implements OnInit, OnDestroy {
  
  // Formulario Reactivo
  filterForm!: FormGroup;
  isLoading = false;

  // AG-Grid Configuration
  @ViewChild('agGrid', { static: false }) agGrid!: AgGridAngular;
  columnDefs: (ColDef | ColGroupDef)[] = [];
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
  reportData: CostCenterReportData | null = null;
  
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();

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
    if (!fecha) return '';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toISOString().split('T')[0];
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
    
    this.attendanceMatrixService.getCostCenterReport(params).subscribe({
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

  exportToExcel(): void {
    if (this.isExporting || this.filterForm.invalid) return;

    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      pageNumber: 1,
      pageSize: 10000
    };

    this.isExporting = true;
    this.attendanceMatrixService.downloadCostCenterReport(params).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `Reporte_Centro_Costos_${params.fechaInicio}_${params.fechaFin}.xlsx`);
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

  // AG-Grid Methods
  setupAgGrid(): void {
    if (!this.reportData || !this.reportData.content) return;

    this.columnDefs = this.createColumnDefs();
    this.rowData = this.createCostCenterRowData();
  }

  createColumnDefs(): (ColDef | ColGroupDef)[] {
    if (!this.reportData || !this.reportData.content) return [];

    const fixedColumns: ColDef[] = [
      {
        headerName: 'ITEM',
        field: 'itemNumber',
        width: 70,
        pinned: 'left',
        cellStyle: { textAlign: 'center' },
        headerClass: 'fiori-header'
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
        headerName: 'NRO DOC',
        field: 'nroDoc',
        width: 120,
        pinned: 'left',
        headerClass: 'fiori-header'
      },
      {
        headerName: 'COLABORADOR',
        field: 'colaborador',
        width: 250,
        pinned: 'left',
        headerClass: 'fiori-header'
      },
      {
        headerName: 'ÁREA',
        field: 'area',
        width: 150,
        pinned: 'left',
        headerClass: 'fiori-header'
      },
      {
        headerName: 'CARGO',
        field: 'cargo',
        width: 120,
        headerClass: 'fiori-header'
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

    const dateColumns = this.createDateColumns();
    
    return [...fixedColumns, ...dateColumns];
  }

  createDateColumns(): ColGroupDef[] {
    if (!this.reportData || !this.reportData.content) return [];

    const dateColumns: ColGroupDef[] = [];
    
    this.reportData.content.weekGroups.forEach(weekGroup => {
      const weekColumnGroup: ColGroupDef = {
        headerName: `SEMANA N° ${weekGroup.weekNumber}`,
        headerClass: 'week-header',
        children: [
          {
            headerName: 'TURNO',
            field: `week_${weekGroup.weekNumber}_turno`,
            width: 90,
            headerClass: 'turno-header',
            cellStyle: { textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }
          },
          ...weekGroup.dates.map((date, index) => ({
            headerName: `${weekGroup.dayNames[index]}\n${weekGroup.dayNumbers[index]}`,
            field: `week_${weekGroup.weekNumber}_day_${index}`,
            width: 80,
            headerClass: 'day-group-header',
            cellStyle: (params: any) => {
              const type = params.data[`week_${weekGroup.weekNumber}_day_${index}_type`];
              const baseStyle = { textAlign: 'center', fontSize: '11px', fontWeight: 'bold' };
              
              switch (type) {
                case 'work':
                  return { ...baseStyle, backgroundColor: '#dbeafe', color: '#1e40af' };
                case 'permission':
                  return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' };
                case 'absence':
                  return { ...baseStyle, backgroundColor: '#fecaca', color: '#dc2626' };
                default:
                  return { ...baseStyle, backgroundColor: '#f9fafb', color: '#6b7280' };
              }
            },
            cellRenderer: (params: any) => params.value || '-' 
          }))
        ]
      };
      dateColumns.push(weekColumnGroup);
    });
    
    return dateColumns;
  }

  createCostCenterRowData(): any[] {
    if (!this.reportData || !this.reportData.content) return [];
    
    return this.reportData.content.employees.map(employee => {
      const row: any = {
        itemNumber: employee.itemNumber,
        planilla: employee.planilla,
        nroDoc: employee.nroDoc,
        colaborador: employee.colaborador,
        area: employee.area,
        cargo: employee.cargo,
        fechaIngreso: employee.fechaIngreso
      };

      employee.weekData.forEach(week => {
        row[`week_${week.weekNumber}_turno`] = week.turno || 'N/A';
        
        week.dayValues.forEach((day, dayIndex) => {
          const fieldKey = `week_${week.weekNumber}_day_${dayIndex}`;
          row[fieldKey] = day.displayValue;
          row[`${fieldKey}_type`] = day.type;
        });
      });

      return row;
    });
  }

  autoSizeColumns(): void {
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.sizeColumnsToFit();
    }
  }
}