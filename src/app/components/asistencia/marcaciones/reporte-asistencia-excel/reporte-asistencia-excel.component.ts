import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AttendanceMatrixReportService } from '../../../../core/services/report/attendance-matrix-report.service';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { ReportMatrixResponse, ReportMatrixResponseData } from '../../../../core/models/report/report-matrix-response.model';
import { ReportMatrixParams } from '../../../../core/models/report/report-matrix-params.model';
import { AgGridAngular } from 'ag-grid-angular';
import { GridOptions, ColDef } from 'ag-grid-community';

@Component({
  selector: 'app-reporte-asistencia-excel',
  templateUrl: './reporte-asistencia-excel.component.html',
})
export class ReporteAsistenciaExcelComponent implements OnInit, OnDestroy {
  
  filterForm!: FormGroup;
  loading = false;
  
  // Paginación
  totalCount = 0;
  page = 1;
  pageSize = 100; // Aumentamos el tamaño de página por defecto
  
  // AG-Grid
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridOptions: GridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
    },
    pagination: false, // La paginación la manejamos externamente
    suppressPaginationPanel: true,
    overlayNoRowsTemplate: '<span class="text-gray-500">No hay datos para mostrar. Ajuste los filtros y busque nuevamente.</span>'
  };

  private headerConfig: HeaderConfig | null = null;
  private headerSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private attendanceMatrixService: AttendanceMatrixReportService,
    private headerConfigService: HeaderConfigService
  ) {
    this.initializeForm();
    this.createColumnDefs();
  }

  ngOnInit(): void {
    this.headerSubscription = this.headerConfigService.headerConfig$.subscribe(config => {
      this.headerConfig = config;
    });
  }

  ngOnDestroy(): void {
    this.headerSubscription?.unsubscribe();
  }

  private initializeForm(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filterForm = this.fb.group({
      fechaInicio: [firstDay.toISOString().split('T')[0], Validators.required],
      fechaFin: [today.toISOString().split('T')[0], Validators.required],
      employeeId: ['']
    });
  }

  loadData(): void {
    if (!this.headerConfig || !this.filterForm.valid) {
      console.warn("Faltan datos de configuración o el formulario es inválido.");
      return;
    }

    this.loading = true;
    
    const params: ReportMatrixParams = {
      ...this.filterForm.value,
      companiaId: this.headerConfig.selectedEmpresa?.companiaId || '',
      planillaId: this.headerConfig.selectedPlanilla?.planillaId || '',
      pageNumber: this.page,
      pageSize: this.pageSize
    };

    this.attendanceMatrixService.getAttendanceMatrixReport(params).subscribe({
      next: (response: ReportMatrixResponse) => {
        if (response.success && response.data) {
          this.rowData = this.processDataForGrid(response.data);
          this.totalCount = response.totalRecords || 0;
        } else {
          this.rowData = [];
          this.totalCount = 0;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando datos:', error);
        this.rowData = [];
        this.totalCount = 0;
        this.loading = false;
      }
    });
  }

  private processDataForGrid(data: ReportMatrixResponseData[]): any[] {
    return data.map(item => {
      const { entrada, salida } = this.extractEntradaSalida(item.marcacionesDelDia);
      return {
        nroDoc: item.nroDoc,
        colaborador: item.colaborador,
        sede: item.sede,
        area: item.area,
        cargo: item.cargo,
        ccCodigo: item.ccCodigo,
        fechaIngreso: this.convertDdMmYyyyToYyyyMmDd(item.fechaIngreso),
        fecha: this.convertDdMmYyyyToYyyyMmDd(item.fecha),
        diaSemanaEs: item.diaSemanaEs,
        entrada: entrada,
        salida: salida
      };
    });
  }

  private extractEntradaSalida(marcacionesRaw: string): { entrada: string, salida: string } {
    if (!marcacionesRaw) {
      return { entrada: '-', salida: '-' };
    }
    const marcaciones = marcacionesRaw.match(/\d{2}:\d{2}/g) || [];
    if (marcaciones.length === 0) {
      return { entrada: '-', salida: '-' };
    }
    const entrada = marcaciones[0] || '-';
    const salida = marcaciones.length > 1 ? marcaciones[marcaciones.length - 1] : '-';
    return { entrada, salida };
  }

  private convertDdMmYyyyToYyyyMmDd(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateString;
  }

  createColumnDefs(): void {
    this.columnDefs = [
      { headerName: 'Nro Doc', field: 'nroDoc', width: 120, headerClass: 'fiori-header' },
      { headerName: 'Colaborador', field: 'colaborador', width: 250, headerClass: 'fiori-header' },
      { headerName: 'Sede', field: 'sede', width: 120, headerClass: 'fiori-header' },
      { headerName: 'Área', field: 'area', width: 150, headerClass: 'fiori-header' },
      { headerName: 'Cargo', field: 'cargo', width: 150, headerClass: 'fiori-header' },
      { headerName: 'C. Costo', field: 'ccCodigo', width: 120, headerClass: 'fiori-header' },
      { headerName: 'F. Ingreso', field: 'fechaIngreso', width: 120, headerClass: 'fiori-header', valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('es-PE') : '' },
      { headerName: 'Fecha', field: 'fecha', width: 120, headerClass: 'fiori-header', valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('es-PE') : '' },
      { headerName: 'Día', field: 'diaSemanaEs', width: 100, headerClass: 'fiori-header' },
      {
        headerName: 'Entrada',
        field: 'entrada',
        width: 100,
        cellClass: 'text-center bg-fiori-active text-fiori-primary font-bold',
        headerClass: 'fiori-header'
      },
      {
        headerName: 'Salida',
        field: 'salida',
        width: 100,
        cellClass: 'text-center bg-fiori-active text-fiori-primary font-bold',
        headerClass: 'fiori-header'
      },
    ];
  }

  onFilter(): void {
    this.page = 1;
    this.loadData();
  }

  onPageChange(event: any): void {
    this.page = event.pageNumber || 1;
    this.pageSize = event.pageSize || this.pageSize;
    this.loadData();
  }
}
