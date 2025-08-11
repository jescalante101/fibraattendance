import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceMatrixReportService } from 'src/app/core/services/report/attendance-matrix-report.service';
import { ReportMatrixParams } from 'src/app/core/models/report/report-matrix-params.model';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ColGroupDef, GridOptions } from 'ag-grid-community';
import { MarkingsReportData } from 'src/app/core/models/report/markings-report.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { AG_GRID_LOCALE_ES } from 'src/app/ag-grid-locale.es';

@Component({
  selector: 'app-reporte-marcaciones-detalle',
  templateUrl: './reporte-marcaciones-detalle.component.html',
  styleUrls: ['./reporte-marcaciones-detalle.component.css']
})
export class ReporteMarcacionesDetalleComponent implements OnInit, OnDestroy {
  
  // Formulario Reactivo
  filterForm!: FormGroup;
  isLoading = false;

  // AG-Grid Configuration
  @ViewChild('agGrid', { static: false }) agGrid!: AgGridAngular;
  columnDefs: (ColDef | ColGroupDef)[] = [];
  rowData: any[] = [];
  gridOptions: GridOptions = {
    theme: 'legacy', // Usar temas CSS legacy (ag-grid.css, ag-theme-alpine.css)
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 50
    },
    localeText: AG_GRID_LOCALE_ES,
    suppressHorizontalScroll: false,
    // enableRangeSelection: true, // Comentado: requiere AG-Grid Enterprise
    rowSelection: 'multiple'
  };

  // Datos del reporte
  reportData: MarkingsReportData | null = null;
  
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
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Día 1 del mes actual
    const today = new Date(); // Fecha actual

    this.filterForm = this.fb.group({
      fechaInicio: [this.formatDate(firstDayOfMonth), Validators.required],
      fechaFin: [this.formatDate(today), Validators.required],
      employeeId: [''],
      areaId: [''],
      areaFilter: [''],
      sedeId: [''],
      sedeFilter: [''],
      // Compañía viene del header global - no se expone al usuario
      companiaId: [''],
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
    
    this.attendanceMatrixService.getMarkingsReport(params).subscribe({
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
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    this.filterForm.reset({
      fechaInicio: this.formatDate(firstDayOfMonth),
      fechaFin: this.formatDate(now),
      employeeId: '',
      areaId: '',
      areaFilter: '',
      sedeId: '',
      sedeFilter: '',
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId || '',
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
    this.attendanceMatrixService.downloadExportMarkingsReport(params).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `Reporte_Marcaciones_Detalle_${params.fechaInicio}_${params.fechaFin}.xlsx`);
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
    this.rowData = this.createMarkingsRowData();
  }

  createColumnDefs(): (ColDef | ColGroupDef)[] {
    if (!this.reportData || !this.reportData.content) return [];

    const fixedColumns: ColDef[] = [
      { headerName: 'ITEM', field: 'itemNumber', width: 70, pinned: 'left', cellStyle: { textAlign: 'center' }, headerClass: 'fiori-header' },
      { headerName: 'PLANILLA', field: 'planilla', width: 100, pinned: 'left', headerClass: 'fiori-header', cellRenderer: (params: any) => {
          const planilla = params.value;
          const className = planilla === 'EMPLEADOS' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
          return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}">${planilla}</span>`;
        }
      },
      { headerName: 'NRO DOC', field: 'nroDoc', width: 120, pinned: 'left', headerClass: 'fiori-header' },
      { headerName: 'COLABORADOR', field: 'colaborador', width: 250, pinned: 'left', headerClass: 'fiori-header' },
      { headerName: 'ÁREA', field: 'area', width: 150, pinned: 'left', headerClass: 'fiori-header' },
      { headerName: 'CARGO', field: 'cargo', width: 120, headerClass: 'fiori-header' },
      { headerName: 'F. INGRESO', field: 'fechaIngreso', width: 110, headerClass: 'fiori-header', valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      }
    ];

    const dateColumns = this.createDateColumns();
    
    return [...fixedColumns, ...dateColumns];
  }

    createDateColumns(): ColDef[] {
    if (!this.reportData || !this.reportData.content) return [];

    // Usamos flatMap para crear una lista plana de columnas, una por cada día.
    return this.reportData.content.weekGroups.flatMap(weekGroup => 
      weekGroup.dates.map((date, index): ColDef => ({
        headerName: `${weekGroup.dayNames[index]} ${weekGroup.dayNumbers[index]}`,
        field: `day_${date}_value`,
        width: 80,
        headerClass: 'day-group-header',
        cellStyle: (params: any) => {
          const type = params.data[`day_${date}_type_raw`];
          const baseStyle = { textAlign: 'center', fontSize: '11px', fontWeight: 'bold' };
          switch (type) {
            case 'markings': return { ...baseStyle, backgroundColor: '#e0f2fe', color: '#075985' }; // Azul Fiori
            case 'permission': return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' }; // Amarillo Fiori
            case 'holiday': return { ...baseStyle, backgroundColor: '#fed7aa', color: '#ea580c' }; // Naranja para feriados
            case 'absence': return { ...baseStyle, backgroundColor: '#fecaca', color: '#dc2626' }; // Rojo Fiori
            default: return { ...baseStyle, backgroundColor: '#f9fafb', color: '#6b7280' }; // Gris Fiori
          }
        },
        tooltipValueGetter: (params) => {
          // El tooltip solo muestra el detalle si hay marcaciones
          return params.data[`day_${date}_rawMarkings`];
        },
        cellRenderer: (params: any) => {
          // Muestra el valor de la celda (conteo o tipo de ausencia)
          return params.value || '-';
        }
      }))
    );
  }

  createMarkingsRowData(): any[] {
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
        week.dayValues.forEach(day => {
          const dateKey = `day_${day.date}`;
          
          // Si el tipo es 'markings', el valor a mostrar es el conteo. Si no, es el displayValue (ej. 'F', 'VA').
          if (day.type === 'markings') {
            row[`${dateKey}_value`] = (day.markingsCount != null && day.markingsCount > 0) ? day.markingsCount : '-';
          } else {
            row[`${dateKey}_value`] = day.displayValue;
          }

          // Guardamos los datos crudos para usarlos en el estilo y el tooltip
          row[`${dateKey}_type_raw`] = day.type;
          row[`${dateKey}_rawMarkings`] = day.rawMarkings;
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

}