import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { PersonService } from 'src/app/core/services/person.service';
import { Employee } from './model/employeeDto';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { ActivatedRoute } from '@angular/router';
import { AsignarTurnoMasivoComponent } from '../asignar-turno-masivo/asignar-turno-masivo.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IclockTransactionComponent } from '../iclock-transaction/iclock-transaction.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { EmployeesParameters } from '../../../../core/services/person.service';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { GenericFilterConfig, FilterState, FilterChangeEvent } from 'src/app/shared/generic-filter/filter-config.interface';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrls: ['./empleado.component.css']
})
export class EmpleadoComponent implements OnInit, OnDestroy {

  constructor(
    private personalService: PersonService,
    private dialog: MatDialog,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private modalService:ModalService,
    private headerConfigService: HeaderConfigService
  )
     { }
  mostrarBotonAsignar = false;

  employees: Employee[] = [];
  loading = true;
  skeletonArray = Array(10); // 10 filas de skeleton

  allSelected = false;
  totalCount = 0;
  page = 1;
  pageSize = 50;
  filtro = '';

  categoriaAuxiliarList: CategoriaAuxiliar[] = [];
  selectedCategoriaAuxiliar: string = '';

  rhAreaList: RhArea[] = [];
  selectedRhArea: string = '';

  // Configuración del header
  headerConfig: HeaderConfig | null = null;

  // Subject para controlar subscripciones
  private destroy$ = new Subject<void>();

  // Exponer Math para usar en el template
  Math = Math;

  displayedColumns: string[] = [];

  // Propiedades para autocomplete de Sede
  sedeSearchTerm = '';
  sedesFiltradas: CategoriaAuxiliar[] = [];
  showSedeDropdown = false;
  highlightedSedeIndex = -1;

  // Propiedades para autocomplete de Área
  areaSearchTerm = '';
  areasFiltradas: RhArea[] = [];
  showAreaDropdown = false;
  highlightedAreaIndex = -1;

  // Configuración del filtro genérico
  filterConfig: GenericFilterConfig = {
    sections: [
      {
        title: 'Búsqueda General',
        filters: [
          {
            type: 'text',
            key: 'searchText',
            label: 'Buscar Empleado',
            placeholder: 'Nombre, documento...'
          }
        ]
      },
      {
        title: 'Ubicación',
        filters: [
          {
            type: 'autocomplete',
            key: 'sede',
            label: 'Sede',
            placeholder: 'Buscar sede...',
            options: [],
            displayField: 'descripcion',
            valueField: 'categoriaAuxiliarId'
          },
          {
            type: 'autocomplete',
            key: 'area',
            label: 'Área',
            placeholder: 'Buscar área...',
            options: [],
            displayField: 'descripcion',
            valueField: 'areaId'
          }
        ]
      }
    ],
    // position: undefined, // Permitir cálculo automático de posición
    showApplyButton: true,
    showClearAll: true
  };

  currentFilters: FilterState = {};

  // Configuración del gestor de columnas
  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas',
    showSelectAll: true,
    showReset: true,
    groupByCategory: true,
    persistKey: 'empleado-columns-visibility',
    minVisibleColumns: 2,
    maxVisibleColumns: 10,
    searchable: true,
    position: 'left'
  };

  tableColumns: ColumnConfig[] = [];
  visibleColumns: string[] = [];
  
  // ag-Grid configuration
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {
    ...createFioriGridOptions(),
    // Centrar verticalmente el contenido de todas las celdas
    defaultColDef: {
      ...createFioriGridOptions().defaultColDef,
      cellClass: 'ag-cell-vertical-center'
    }
  };
  gridApi: any;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.mostrarBotonAsignar = params['modoAsignar'] === 'true' || params['modoAsignar'] === true;
    });
    
    // Suscribirse a cambios en la configuración del header
    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        console.log('Header config cambió:', config);
        this.headerConfig = config;
        // Recargar empleados cuando cambie la configuración
        this.getEmployees();
        this.getRhAreas();
      });
    
    this.setDisplayedColumns();
    this.initializeTableColumns();
    this.setupAgGrid();
    this.getCategoriasAuxiliar();
    this.setupGenericFilter();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setDisplayedColumns() {
    this.displayedColumns = this.mostrarBotonAsignar
      ? ['select', 'nroDoc', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'categoriaAuxiliarDescripcion', 'areaDescripcion', 'asignar']
      : ['personalId', 'nroDoc', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'categoriaAuxiliarDescripcion', 'areaDescripcion', 'acciones'];
  }

  getEmployees() {
    this.loading = true;
    
    // Obtener filtros del header config
    const empresaId = this.headerConfig?.selectedEmpresa?.companiaId?.toString() || '';
    const planillaId = this.headerConfig?.selectedPlanilla?.planillaId?.toString() || '';
    const periodoId = this.headerConfig?.selectedPeriodo?.periodoId?.toString() || '';
    
    // Usar los filtros del header junto con los filtros locales
    const ccosto = null; // Empresa como centro de costo
    const sede =  this.selectedCategoriaAuxiliar; // Planilla o categoria auxiliar
    const areaId = this.selectedRhArea; // Área seleccionada localmente   

    const params: EmployeesParameters = {
      searchText: this.filtro,
      page: this.page,
      pagesize: this.pageSize,
      areaId: areaId || null,
      ccostoId: ccosto || null,
      sede: sede || null,
      periodoId: periodoId || null,
      planillaId: planillaId || null,
      companiaId: empresaId || null
    };
    
    console.log('Parametros de búsqueda:', params);
    

    this.personalService.getPersonalActivo(
     params// ccosto (usando empresa)
    )
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          console.log("Respuesta del servicio:", res);
          
          
          if (res.exito && res.data) {
            this.employees = res.data.items.map(emp => ({ ...emp, selected: this.mostrarBotonAsignar ? false : undefined }));
            this.totalCount = res.data.totalCount;
            this.page = res.data.pageNumber;
            this.pageSize = res.data.pageSize;
            
            // Update ag-Grid data
            if (this.gridApi) {
              this.gridApi.setRowData(this.employees);
            }
          } else {
            this.employees = [];
            this.totalCount = 0;
            
            // Clear ag-Grid data
            if (this.gridApi) {
              this.gridApi.setRowData([]);
            }
          }
        },
        error: _ => {
          this.employees = [];
          this.totalCount = 0;
          
          // Clear ag-Grid data on error
          if (this.gridApi) {
            this.gridApi.setRowData([]);
          }
        }
      });
  }

  getCategoriasAuxiliar() {
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe({
      next: (data) => {
        this.categoriaAuxiliarList = data;
        this.sedesFiltradas = [...data]; // Inicializar autocomplete
        this.updateFilterOptions(); // Actualizar opciones del filtro genérico
      },
      error: (err) => {
        this.categoriaAuxiliarList = [];
        this.sedesFiltradas = []; // Inicializar autocomplete
      }
    });
  }

  getRhAreas() {
    const empresaId = this.headerConfig?.selectedEmpresa?.companiaId?.toString() || '';
    this.rhAreaService.getAreas(empresaId).subscribe({
      next: (data) => {
        this.rhAreaList = data;
        this.areasFiltradas = [...data]; // Inicializar autocomplete
        this.updateFilterOptions(); // Actualizar opciones del filtro genérico
      },
      error: (err) => {
        this.rhAreaList = [];
        this.areasFiltradas = []; // Inicializar autocomplete
      }
    });
  }

  buscarEmpleado() {
    this.page = 1;
    this.getEmployees();
  }

  limpiarFiltros() {
    // Limpiar filtro de búsqueda
    this.filtro = '';
    
    // Limpiar autocompletes de sede
    this.sedeSearchTerm = '';
    this.selectedCategoriaAuxiliar = '';
    this.showSedeDropdown = false;
    this.highlightedSedeIndex = -1;
    this.sedesFiltradas = [...this.categoriaAuxiliarList];
    
    // Limpiar autocompletes de área
    this.areaSearchTerm = '';
    this.selectedRhArea = '';
    this.showAreaDropdown = false;
    this.highlightedAreaIndex = -1;
    this.areasFiltradas = [...this.rhAreaList];
    
    // Resetear paginación
    this.page = 1;
    
    // Buscar empleados sin filtros
    this.getEmployees();
  }

  toggleAllEmployees() {
    this.employees.forEach(emp => emp.selected = this.allSelected);
  }

  changePage(nuevaPagina: number) {
    if (nuevaPagina > 0 && (nuevaPagina - 1) * this.pageSize < this.totalCount) {
      this.page = nuevaPagina;
      this.getEmployees();
    }
  }

  onPageChange(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getEmployees();
  }
  
  onPageChangeCustom(event: PaginatorEvent) {
    this.page = event.pageNumber;
    this.pageSize = event.pageSize;
    this.totalCount=event.totalRecords
    this.getEmployees();
  }

  onCategoriaAuxiliarChange() {
    console.log('onCategoriaAuxiliarChange - selectedCategoriaAuxiliar:', this.selectedCategoriaAuxiliar);
    this.page = 1;
    this.getEmployees();
  }

  onRhAreaChange() {
    console.log('onRhAreaChange - selectedRhArea:', this.selectedRhArea);
    this.page = 1;
    this.getEmployees();
  }

  abrirAsignarTurnoMasivo() {
    this.modalService.open({
      title: 'Asignación Masiva de Turnos',
      componentType: AsignarTurnoMasivoComponent,
      width: '80vw',
      height: 'auto'
    })
  }


  verMarcaciones(empleado: Employee) {
    const empCode = empleado.nroDoc;
    if (!empCode) {
      this.snackBar.open('No se pudo obtener el código del empleado', 'Cerrar', {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'end',
        panelClass: ['snackbar-error']
      });
      return;
    }
    this.modalService.open({
      width: '80vw',
      title: `Marcaciones de ${empleado.nombres} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno}`,
      componentType: IclockTransactionComponent,
      componentData: { empCode, empleado }
    }).then(result => {
      if (result) {
        console.log('Marcaciones abiertas:', result);
      }
    }).catch(error => {
      console.error('Error al abrir el modal de marcaciones:', error);
    })
  }

  // Métodos para autocomplete de Sede
  onSedeSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.sedeSearchTerm = target.value;
    this.filterSedes();
    this.showSedeDropdown = true;
    this.highlightedSedeIndex = -1;
  }

  filterSedes(): void {
    if (!this.sedeSearchTerm.trim()) {
      this.sedesFiltradas = [...this.categoriaAuxiliarList];
    } else {
      this.sedesFiltradas = this.categoriaAuxiliarList.filter(sede =>
        sede.descripcion.toLowerCase().includes(this.sedeSearchTerm.toLowerCase())
      );
    }
  }

  selectSede(sede: CategoriaAuxiliar): void {
    this.sedeSearchTerm = sede.descripcion;
    this.selectedCategoriaAuxiliar = sede.categoriaAuxiliarId;
    this.showSedeDropdown = false;
    this.highlightedSedeIndex = -1;
    console.log('Sede seleccionada:', sede.descripcion, 'ID:', sede.categoriaAuxiliarId);
    this.onCategoriaAuxiliarChange();
  }

  onSedeBlur(): void {
    // Usar setTimeout para permitir que el click en el dropdown se procese primero
    setTimeout(() => {
      this.showSedeDropdown = false;
      this.highlightedSedeIndex = -1;
      
      // Si no hay selección válida, limpiar
      if (this.sedeSearchTerm && !this.categoriaAuxiliarList.find(s => s.descripcion === this.sedeSearchTerm)) {
        this.sedeSearchTerm = '';
        this.selectedCategoriaAuxiliar = '';
        this.onCategoriaAuxiliarChange();
      }
    }, 150);
  }

  onSedeKeydown(event: KeyboardEvent): void {
    if (!this.showSedeDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedSedeIndex = Math.min(this.highlightedSedeIndex + 1, this.sedesFiltradas.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedSedeIndex = Math.max(this.highlightedSedeIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedSedeIndex >= 0 && this.highlightedSedeIndex < this.sedesFiltradas.length) {
          this.selectSede(this.sedesFiltradas[this.highlightedSedeIndex]);
        }
        break;
      case 'Escape':
        this.showSedeDropdown = false;
        this.highlightedSedeIndex = -1;
        break;
    }
  }

  // Métodos para autocomplete de Área
  onAreaSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.areaSearchTerm = target.value;
    this.filterAreas();
    this.showAreaDropdown = true;
    this.highlightedAreaIndex = -1;
  }

  filterAreas(): void {
    if (!this.areaSearchTerm.trim()) {
      this.areasFiltradas = [...this.rhAreaList];
    } else {
      this.areasFiltradas = this.rhAreaList.filter(area =>
        area.descripcion.toLowerCase().includes(this.areaSearchTerm.toLowerCase())
      );
    }
  }

  selectArea(area: RhArea): void {
    this.areaSearchTerm = area.descripcion;
    this.selectedRhArea = area.areaId;
    this.showAreaDropdown = false;
    this.highlightedAreaIndex = -1;
    console.log('Área seleccionada:', area.descripcion, 'ID:', area.areaId);
    this.onRhAreaChange();
  }

  onAreaBlur(): void {
    // Usar setTimeout para permitir que el click en el dropdown se procese primero
    setTimeout(() => {
      this.showAreaDropdown = false;
      this.highlightedAreaIndex = -1;
      
      // Si no hay selección válida, limpiar
      if (this.areaSearchTerm && !this.rhAreaList.find(a => a.descripcion === this.areaSearchTerm)) {
        this.areaSearchTerm = '';
        this.selectedRhArea = '';
        this.onRhAreaChange();
      }
    }, 150);
  }

  onAreaKeydown(event: KeyboardEvent): void {
    if (!this.showAreaDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedAreaIndex = Math.min(this.highlightedAreaIndex + 1, this.areasFiltradas.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedAreaIndex = Math.max(this.highlightedAreaIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedAreaIndex >= 0 && this.highlightedAreaIndex < this.areasFiltradas.length) {
          this.selectArea(this.areasFiltradas[this.highlightedAreaIndex]);
        }
        break;
      case 'Escape':
        this.showAreaDropdown = false;
        this.highlightedAreaIndex = -1;
        break;
    }
  }

  // ============ MÉTODOS PARA FILTRO GENÉRICO ============

  setupGenericFilter() {
    // Configurar valores iniciales del filtro genérico
    this.currentFilters = {
      searchText: this.filtro,
      sede: this.selectedCategoriaAuxiliar,
      area: this.selectedRhArea
    };
    
    // Actualizar opciones cuando se carguen los datos
    this.updateFilterOptions();
  }

  updateFilterOptions() {
    // Actualizar opciones de sede
    const sedeFilter = this.filterConfig.sections?.[1]?.filters.find(f => f.key === 'sede');
    if (sedeFilter) {
      sedeFilter.options = this.categoriaAuxiliarList;
    }

    // Actualizar opciones de área
    const areaFilter = this.filterConfig.sections?.[1]?.filters.find(f => f.key === 'area');
    if (areaFilter) {
      areaFilter.options = this.rhAreaList;
    }
  }

  onGenericFilterChange(event: FilterChangeEvent) {
    console.log('Filtro cambiado:', event);
    // Actualizar filtros actuales
    this.currentFilters = { ...event.allFilters };
  }

  onGenericFiltersApply(filters: FilterState) {
    console.log('Aplicando filtros:', filters);
    
    // Mapear filtros genéricos a las propiedades del componente
    this.filtro = filters['searchText'] || '';
    this.selectedCategoriaAuxiliar = filters['sede'] || '';
    this.selectedRhArea = filters['area'] || '';
    
    // Resetear página a 1 cuando se apliquen filtros
    this.page = 1;
    
    // Ejecutar búsqueda
    this.getEmployees();
  }

  onGenericFiltersClear() {
    console.log('Limpiando todos los filtros');
    
    // Limpiar todas las propiedades de filtro
    this.filtro = '';
    this.selectedCategoriaAuxiliar = '';
    this.selectedRhArea = '';
    this.sedeSearchTerm = '';
    this.areaSearchTerm = '';
    this.page = 1;
    
    // Actualizar filtros actuales
    this.currentFilters = {};
    
    // Ejecutar búsqueda
    this.getEmployees();
  }

  // ============ MÉTODOS PARA GESTOR DE COLUMNAS ============

  initializeTableColumns() {
    // Definir las columnas disponibles para la tabla
    this.tableColumns = [
      {
        key: 'personalId',
        label: 'ID',
        visible: !this.mostrarBotonAsignar,
        required: false,
        sortable: true,
        type: 'number',
        width: '80px'
      },
      {
        key: 'select',
        label: 'Seleccionar',
        visible: this.mostrarBotonAsignar,
        required: this.mostrarBotonAsignar,
        sortable: false,
        type: 'custom',
        width: '60px'
      },
      {
        key: 'nroDoc',
        label: 'Documento',
        visible: true,
        required: true,
        sortable: true,
        type: 'text',
        width: '120px'
      },
      {
        key: 'empleado',
        label: 'Empleado',
        visible: true,
        required: true,
        sortable: true,
        type: 'text'
      },
      {
        key: 'categoriaAuxiliarDescripcion',
        label: 'Sede',
        visible: true,
        required: false,
        sortable: true,
        type: 'text'
      },
      {
        key: 'areaDescripcion',
        label: 'Área',
        visible: true,
        required: false,
        sortable: true,
        type: 'text'
      },
      {
        key: 'fechaIngreso',
        label: 'Fecha Ingreso',
        visible: false,
        required: false,
        sortable: true,
        type: 'date',
        width: '120px'
      },
      {
        key: 'fechaCese',
        label: 'Fecha Cese',
        visible: false,
        required: false,
        sortable: true,
        type: 'date',
        width: '120px'
      },
      {
        key: 'cargoDescripcion',
        label: 'Cargo',
        visible: false,
        required: false,
        sortable: true,
        type: 'text'
      },
      {
        key: 'ccostoDescripcion',
        label: 'Centro de Costo',
        visible: false,
        required: false,
        sortable: true,
        type: 'text'
      },
      {
        key: 'email',
        label: 'Correo Electrónico',
        visible: false,
        required: false,
        sortable: true,
        type: 'email'
      },
      {
        key: 'telefono',
        label: 'Teléfono',
        visible: false,
        required: false,
        sortable: true,
        type: 'phone',
        width: '120px'
      },
      {
        key: 'acciones',
        label: 'Acciones',
        visible: true,
        required: true,
        sortable: false,
        type: 'actions',
        width: '120px'
      }
    ];

    // Cargar configuración guardada
    this.loadColumnVisibility();
    this.updateVisibleColumns();
  }

  private loadColumnVisibility() {
    if (this.columnManagerConfig.persistKey) {
      const savedConfig = localStorage.getItem(this.columnManagerConfig.persistKey);
      if (savedConfig) {
        try {
          const visibilityMap = JSON.parse(savedConfig);
          this.tableColumns.forEach(column => {
            if (visibilityMap.hasOwnProperty(column.key)) {
              column.visible = visibilityMap[column.key];
            }
          });
        } catch (error) {
          console.warn('Error loading column visibility:', error);
        }
      }
    }
  }

  private updateVisibleColumns() {
    this.visibleColumns = this.tableColumns
      .filter(col => col.visible)
      .map(col => col.key);
  }

  onColumnManagerChange(event: ColumnChangeEvent) {
    console.log('Columna cambiada:', event);
    
    // Obtener la clave y visibilidad de la columna
    const columnKey = event.column.key;
    const visible = event.column.visible;
    
    // Actualizar el estado local primero
    const column = this.tableColumns.find(col => col.key === columnKey);
    if (column) {
      column.visible = visible;
    }
    
    this.updateVisibleColumns();
    
    // Aplicar cambios inmediatamente a ag-Grid
    if (this.gridApi) {
      this.gridApi.setColumnsVisible([columnKey], visible);
      
      // Trigger re-render of cells to update responsive content
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
      }, 100);
    }
  }

  onColumnsApply(columns: ColumnConfig[]) {
    console.log('Aplicando configuración de columnas:', columns);
    this.tableColumns = [...columns];
    this.updateVisibleColumns();
    
    // Aplicar todas las visibilidades a ag-Grid
    if (this.gridApi) {
      columns.forEach(col => {
        this.gridApi.setColumnsVisible([col.key], col.visible);
      });
      
      // Trigger refresh and resize after column visibility changes
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
  }

  onColumnsReset() {
    console.log('Restaurando configuración de columnas');
    this.initializeTableColumns();
    
    // Aplicar reset a ag-Grid
    if (this.gridApi) {
      this.tableColumns.forEach(col => {
        this.gridApi.setColumnsVisible([col.key], col.visible);
      });
      
      // Trigger refresh and resize after reset
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
  }

  isColumnVisible(columnKey: string): boolean {
    return this.visibleColumns.includes(columnKey);
  }
  
  // === AG-GRID CONFIGURATION ===
  
  private setupAgGrid(): void {
    this.columnDefs = [
      {
        field: 'select',
        headerName: '',
        minWidth: 50,
        maxWidth: 60,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        pinned: 'left',
        lockPosition: true,
        cellClass: 'ag-cell-checkbox',
        resizable: false,
        hide: !this.mostrarBotonAsignar
      },
      {
        field: 'personalId',
        headerName: 'ID Personal',
        width: 100,
        pinned: 'left',
        hide: this.mostrarBotonAsignar,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center mr-2">
              <span class="text-xs font-medium text-fiori-primary">#${params.value}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'nroDoc',
        headerName: 'Documento',
        width: 120,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-info mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="font-mono">${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'empleado',
        headerName: 'Personal',
        width: 280,
        pinned: 'left',
       
        cellRenderer: (params: any) => {
          const emp = params.data;
          const fullName = `${emp.apellidoPaterno} ${emp.apellidoMaterno}, ${emp.nombres}`;
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-muted rounded-full flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-fiori-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-fiori-text" title="${fullName}">${fullName}</div>
            </div>
          </div>`;
        }
      },
      {
        field: 'categoriaAuxiliarDescripcion',
        headerName: 'Sede',
      
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <span>${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'areaDescripcion',
        headerName: 'Área',
        
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-accent mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <span>${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'fechaIngreso',
        headerName: 'Fecha Ingreso',
        minWidth: 120,
        maxWidth: 150,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          const date = new Date(params.value);
          const formattedDate = date.toLocaleDateString('es-ES');
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span class="font-medium">${formattedDate}</span>
          </div>`;
        }
      },
      {
        field: 'fechaCese',
        headerName: 'Fecha Cese',
        minWidth: 120,
        maxWidth: 150,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) {
            return `<span class="text-fiori-info font-medium">Activo</span>`;
          }
          const date = new Date(params.value);
          const formattedDate = date.toLocaleDateString('es-ES');
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-error mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span class="font-medium">${formattedDate}</span>
          </div>`;
        }
      },
      {
        field: 'cargoDescripcion',
        headerName: 'Cargo',
        minWidth: 150,
        maxWidth: 200,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<span class="text-sm">${params.value}</span>`;
        }
      },
      {
        field: 'ccostoDescripcion',
        headerName: 'Centro de Costo',
        minWidth: 150,
        maxWidth: 200,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<span class="text-sm">${params.value}</span>`;
        }
      },
      {
        field: 'email',
        headerName: 'Correo Electrónico',
        minWidth: 180,
        maxWidth: 250,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-info mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <a href="mailto:${params.value}" class="text-fiori-primary hover:text-fiori-secondary truncate" title="${params.value}">${params.value}</a>
          </div>`;
        }
      },
      {
        field: 'telefono',
        headerName: 'Teléfono',
        minWidth: 120,
        maxWidth: 150,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
            <span class="font-mono">${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'acciones',
        headerName: 'Acciones',
        width: 90,
        pinned: 'right',
        lockPosition: true,
        resizable: false,
        cellRenderer: (params: any) => {
          if (this.mostrarBotonAsignar) {
            return `<div class="flex items-center justify-center h-full">
              <button class="assign-btn inline-flex items-center px-3 py-1 text-xs bg-fiori-primary text-white rounded-lg hover:bg-fiori-secondary transition-colors">
                Asignar
              </button>
            </div>`;
          } else {
            return `<div class="flex items-center justify-center space-x-1 h-full">
              <button class="view-btn p-2 text-fiori-primary hover:bg-fiori-primary/10 rounded transition-colors" title="Ver marcaciones">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            </div>`;
          }
        }
      }
    ];
  }
  
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // Apply initial column visibility from tableColumns configuration
    this.tableColumns.forEach(col => {
      params.api.setColumnsVisible([col.key], col.visible);
    });
    
    params.api.sizeColumnsToFit();
    
    // Set up action button click handlers
    this.setupActionHandlers();
  }
  
  private setupActionHandlers(): void {
    // Use event delegation to handle action button clicks
    const gridElement = document.querySelector('.ag-theme-quartz');
    if (gridElement) {
      gridElement.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('button');
        
        if (button && button.classList.contains('view-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.verMarcaciones(rowData);
            }
          }
        } else if (button && button.classList.contains('assign-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              // TODO: Implementar lógica de asignación
              console.log('Asignar turno a:', rowData);
            }
          }
        }
      });
    }
  }
}