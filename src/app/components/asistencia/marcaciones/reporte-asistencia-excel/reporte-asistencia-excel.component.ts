import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { AgGridAngular } from 'ag-grid-angular';
import { GridOptions, ColDef } from 'ag-grid-community';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { AG_GRID_LOCALE_ES } from 'src/app/ag-grid-locale.es';
import { DateRange } from '../../../../shared/components/date-range-picker/date-range-picker.component';
import { ExtraHoursReportService } from 'src/app/core/services/report/extra-hours-report.service';
import { ExtraHoursReportResult, ReporteAsistenciaSemanalDto, ReportFiltersHE } from 'src/app/core/models/report/extra-hours-report.model';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';

@Component({
  selector: 'app-reporte-asistencia-excel',
  templateUrl: './reporte-asistencia-excel.component.html',
})
export class ReporteAsistenciaExcelComponent implements OnInit, OnDestroy {
  
  filterForm!: FormGroup;
  loading = false;
  
  // AG-Grid
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridOptions: GridOptions = {
  ...createFioriGridOptions(),
  };

  private headerConfig: HeaderConfig | null = null;
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
    private extraHoursService: ExtraHoursReportService,
    private headerConfigService: HeaderConfigService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService
  ) {
    this.initializeForm();
    this.createColumnDefs();
  }

  ngOnInit(): void {
    this.loadHeaderConfig();
    this.loadMasterData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const initialDateRange: DateRange = {
      start: firstDay.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
    
    this.filterForm = this.fb.group({
      dateRange: [initialDateRange, Validators.required],
      employeeId: [''],
      areaId: [''],
      areaFilter: [''],
      sedeId: [''],
      sedeFilter: [''],
      companiaId: [''],
      planillaId: ['']
    });
  }

  loadData(): void {
    if (!this.headerConfig || !this.filterForm.valid) {
      console.warn("Faltan datos de configuración o el formulario es inválido.");
      return;
    }

    this.loading = true;
    this.rowData = [];
    
    const formValues = this.filterForm.value;
    const dateRange = formValues.dateRange as DateRange;
    
    const params: ReportFiltersHE = {
      startDate: dateRange?.start || '',
      endDate: dateRange?.end || '',
      companyId: this.headerConfig.selectedEmpresa?.companiaId || '',
      areaId: this.filterForm.value.areaId || '',
      sedeId: this.filterForm.value.sedeId || '',
    };

    this.extraHoursService.getReportData(params).subscribe({
      next: (response: ExtraHoursReportResult) => {
        if (response.success && response.data) {
          this.rowData = this.processDataForGrid(response.data);
        } else {
          this.rowData = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando datos:', error);
        this.rowData = [];
        this.loading = false;
      }
    });
  }

  private processDataForGrid(data: ReporteAsistenciaSemanalDto[]): any[] {
    const flatData: any[] = [];
    if (!data) {
      return flatData;
    }

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    for (const employee of data) {
      for (const dateKey in employee.asistenciaPorDia) {
        if (Object.prototype.hasOwnProperty.call(employee.asistenciaPorDia, dateKey)) {
          const dayData = employee.asistenciaPorDia[dateKey];
          
          const dateObj = new Date(dateKey);

          flatData.push({
            nroDoc: employee.nro_Doc,
            colaborador: employee.colaborador,
            sede: employee.sede,
            area: employee.area,
            cargo: employee.cargo,
            fechaIngreso: employee.fechaIngreso,
            fecha: dateKey,
            diaSemanaEs: dayNames[dateObj.getUTCDay()],
            entrada: dayData.horaEntrada,
            salida: dayData.horaSalida,
          });
        }
      }
    }
    return flatData;
  }

  createColumnDefs(): void {
    this.columnDefs = [
      { headerName: 'Nro Doc', field: 'nroDoc', width: 120, headerClass: 'fiori-header' },
      { headerName: 'Colaborador', field: 'colaborador', width: 350, headerClass: 'fiori-header' },
      { headerName: 'Sede', field: 'sede', width: 120, headerClass: 'fiori-header' },
      { headerName: 'Área', field: 'area', width: 150, headerClass: 'fiori-header' },
      { headerName: 'Cargo', field: 'cargo', width: 150, headerClass: 'fiori-header' },
      { headerName: 'F. Ingreso', field: 'fechaIngreso', width: 120, headerClass: 'fiori-header', valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '' },
      { headerName: 'Fecha', field: 'fecha', width: 120, headerClass: 'fiori-header', valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '' },
      { headerName: 'Día', field: 'diaSemanaEs', width: 100, headerClass: 'fiori-header' },
      {
        headerName: 'Entrada',
        field: 'entrada',
      
        cellClass: 'text-center bg-fiori-active text-fiori-primary font-bold',
        headerClass: 'fiori-header'
      },
      {
        headerName: 'Salida',
        field: 'salida',
       
        cellClass: 'text-center bg-fiori-active text-fiori-primary font-bold',
        headerClass: 'fiori-header'
      },
    ];
  }

  onFilter(): void {
    this.loadData();
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
        companiaId: this.headerConfig.selectedEmpresa?.companiaId || '',
        planillaId: this.headerConfig.selectedPlanilla?.planillaId || ''
      }, { emitEvent: false });
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

  onClearFilters(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const initialDateRange: DateRange = {
      start: firstDay.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
    
    this.filterForm.reset({
      dateRange: initialDateRange,
      employeeId: '',
      areaId: '',
      areaFilter: '',
      sedeId: '',
      sedeFilter: '',
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId || '',
      planillaId: this.headerConfig?.selectedPlanilla?.planillaId || ''
    });
    this.applyHeaderConfigToForm();
    this.rowData = [];
  }
}
