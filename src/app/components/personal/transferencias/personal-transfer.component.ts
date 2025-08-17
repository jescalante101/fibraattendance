import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PersonalTransferService } from '../../../core/services/personal-transfer.service';
import { PersonalTransferDto, CreatePersonalTransferDto, UpdatePersonalTransferDto } from '../../../core/models/personal-transfer.model';
import { GenericFilterConfig, FilterChangeEvent, FilterState } from '../../../shared/generic-filter/filter-config.interface';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from '../../../shared/column-manager/column-config.interface';
import { TransferModalComponent } from './transfer-modal/transfer-modal.component';
import { MassiveTransferModalComponent } from './massive-transfer-modal/massive-transfer-modal.component';
import { ModalService } from '../../../shared/modal/modal.service';
import { ToastService } from '../../../shared/services/toast.service';
import { PaginatorEvent } from '../../../shared/fiori-paginator/fiori-paginator.component';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../core/services/rh-area.service';
import { CostCenterService, CostCenter } from '../../../core/services/cost-center.service';
import { HeaderConfigService, HeaderConfig } from '../../../core/services/header-config.service';
import { ColDef, GridOptions, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { createFioriGridOptionsWithFullDynamicResize, applyDynamicResizeToColumnsWithPriority } from 'src/app/shared/ag-grid-theme-fiori';

@Component({
  selector: 'app-personal-transfer',
  templateUrl: './personal-transfer.component.html',
  styleUrls: ['./personal-transfer.component.css']
})
export class PersonalTransferComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Datos principales
  transfers: (PersonalTransferDto & { selected?: boolean })[] = [];
  totalCount = 0;
  loading = false;
  
  // Paginación
  page = 1;
  pageSize = 10;
  
  // Filtros
  currentFilters: FilterState = {};
  filterConfig: GenericFilterConfig = {
    sections: [
      {
        title: 'Búsqueda General',
        filters: [
          {
            type: 'text',
            key: 'searchText', 
            label: 'Búsqueda Global',
            placeholder: 'Nombre, ID personal, sucursal, área...'
          }
        ]
      },
      {
        title: 'Filtros por Ubicación',
        filters: [
          {
            type: 'autocomplete',
            key: 'branchId',
            label: 'Sede',
            placeholder: 'Buscar sede...',
            options: [],
            displayField: 'descripcion',
            valueField: 'categoriaAuxiliarId'
          },
          {
            type: 'autocomplete',
            key: 'areaId',
            label: 'Área',
            placeholder: 'Buscar área...',
            options: [],
            displayField: 'descripcion',
            valueField: 'areaId'
          },
          {
            type: 'autocomplete',
            key: 'costCenterId',
            label: 'Centro de Costos',
            placeholder: 'Buscar centro de costos...',
            options: [],
            displayField: 'descripcion',
            valueField: 'ccostoId'
          }
        ]
      },
      {
        title: 'Filtros por Fechas',
        filters: [
          {
            type: 'daterange',
            key: 'startDate',
            label: 'Fecha Inicio Desde',
            placeholder: ''
          },
          {
            type: 'daterange',
            key: 'endDate',
            label: 'Fecha Fin Hasta',
            placeholder: ''
          }
        ]
      }
    ],
    showApplyButton: true,
    showClearAll: true
  };
  
  // Gestión de columnas
  tableColumns: ColumnConfig[] = [
    { key: 'select', label: 'Seleccionar', visible: true, required: false, sortable: false, type: 'custom' },
    { key: 'personalId', label: 'ID Personal', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'fullName', label: 'Nombre Completo', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'branchDescription', label: 'Sucursal', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'areaDescription', label: 'Área', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'costCenterDescription', label: 'Centro de Costos', visible: false, required: false, sortable: true, type: 'text' },
    { key: 'startDate', label: 'Fecha Inicio', visible: true, required: false, sortable: true, type: 'date' },
    { key: 'endDate', label: 'Fecha Fin', visible: true, required: false, sortable: true, type: 'date' },
    { key: 'observation', label: 'Observación', visible: false, required: false, sortable: false, type: 'text' },
    { key: 'createdBy', label: 'Creado Por', visible: false, required: false, sortable: true, type: 'text' },
    { key: 'createdAt', label: 'Fecha Creación', visible: false, required: false, sortable: true, type: 'datetime' },
    { key: 'acciones', label: 'Acciones', visible: true, required: true, sortable: false, type: 'actions' }
  ];
  
  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas - Transferencias'
  };
  
  // Selección
  allSelected = false;
  
  // Listas para autocompletes
  sedesList: CategoriaAuxiliar[] = [];
  areasList: RhArea[] = [];
  costCentersList: CostCenter[] = [];
  
  // Configuración del header
  headerConfig: HeaderConfig | null = null;

  // ag-Grid configuration
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = createFioriGridOptionsWithFullDynamicResize();
  gridApi: any;
  
  constructor(
    private personalTransferService: PersonalTransferService,
    private modalService: ModalService,
    private toastService: ToastService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private costCenterService: CostCenterService,
    private headerConfigService: HeaderConfigService
  ) {}
  
  ngOnInit(): void {
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
    this.setupAgGrid();
    this.loadAutocompleteData();
    this.loadTransfers();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Cargar datos para los autocompletes
   */
  private loadAutocompleteData(): void {
    if (!this.headerConfig?.selectedEmpresa) {
      console.warn('No hay empresa seleccionada');
      return;
    }

    const companiaId = this.headerConfig.selectedEmpresa.companiaId;

    // Cargar sedes
    this.categoriaAuxiliarService.getCategoriasAuxiliar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedes) => {
          this.sedesList = sedes;
          this.updateFilterOptions();
        },
        error: (error) => {
          console.error('Error cargando sedes:', error);
        }
      });

    // Cargar áreas
    this.rhAreaService.getAreas(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.areasList = areas;
          this.updateFilterOptions();
        },
        error: (error) => {
          console.error('Error cargando áreas:', error);
        }
      });

    // Cargar centros de costo
    this.costCenterService.getAll(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (costCenters) => {
          this.costCentersList = costCenters;
          this.updateFilterOptions();
        },
        error: (error) => {
          console.error('Error cargando centros de costo:', error);
        }
      });
  }
  
  /**
   * Actualizar opciones de filtros autocomplete
   */
  private updateFilterOptions(): void {
    // Actualizar opciones de sede
    const sedeFilter = this.filterConfig.sections?.[1]?.filters.find(f => f.key === 'branchId');
    if (sedeFilter) {
      sedeFilter.options = this.sedesList;
    }

    // Actualizar opciones de área
    const areaFilter = this.filterConfig.sections?.[1]?.filters.find(f => f.key === 'areaId');
    if (areaFilter) {
      areaFilter.options = this.areasList;
    }

    // Actualizar opciones de centro de costos
    const costCenterFilter = this.filterConfig.sections?.[1]?.filters.find(f => f.key === 'costCenterId');
    if (costCenterFilter) {
      costCenterFilter.options = this.costCentersList;
    }
  }
  
  /**
   * Cargar transferencias con paginación
   */
  loadTransfers(): void {
    this.loading = true;
    
    // Usar paginación avanzada con filtros
    this.personalTransferService.getPersonalTransfersPaginatedAdvanced(
      this.page,
      this.pageSize,
      this.currentFilters['searchText'],
      this.currentFilters['branchId'],
      this.currentFilters['areaId'],
      this.currentFilters['costCenterId'],
      undefined, // isActive - por ahora sin filtrar por estado
      'personalId', // sortBy
      'asc' // sortDirection
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            this.transfers = response.data.data.map(transfer => ({
              ...transfer,
              selected: false
            }));
            this.totalCount = response.data.totalCount;
            
            // Update ag-Grid data
            if (this.gridApi) {
              this.gridApi.setRowData(this.transfers);
            }
          } else {
            this.toastService.error('Error', response.message || 'Error al cargar transferencias');
            this.transfers = [];
            this.totalCount = 0;
            
            // Clear ag-Grid data
            if (this.gridApi) {
              this.gridApi.setRowData([]);
            }
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading transfers:', error);
          this.toastService.error('Error', 'Error al cargar las transferencias');
          this.transfers = [];
          this.totalCount = 0;
          
          // Clear ag-Grid data
          if (this.gridApi) {
            this.gridApi.setRowData([]);
          }
        }
      });
  }
  
  

  /**
   * Crear transferencias masivas
   */
  createMassiveTransfer(): void {
    this.modalService.open({
      title: 'Transferencias Masivas de Personal',
      componentType: MassiveTransferModalComponent,
      width: '95vw',
      height: '90vh',
      componentData: {
        mode: 'massive'
      }
    }).then(result => {
      if (result && result.action === 'save') {
        console.log('Transferencias masivas:', result.data);
        // TODO: Llamar al servicio para crear las transferencias masivas
        this.loadTransfers();
      }
    }).catch(error => {
      console.error('Error en modal de transferencias masivas:', error);
    });
  }
  
  /**
   * Editar transferencia
   */
  editTransfer(transfer: PersonalTransferDto): void {
    this.modalService.open({
      title: 'Editar Transferencia de Personal',
      componentType: TransferModalComponent,
      width: '50vw',
      height: 'auto',
      componentData: {
        mode: 'edit',
        transferId: transfer.id, // Pasamos el ID para cargar los datos frescos
        transferData: transfer  // También pasamos los datos como respaldo
      }
    }).then(result => {
      if (result && result.action === 'save' && result.success) {
        this.toastService.success('Éxito', result.message || 'Transferencia actualizada correctamente');
        this.loadTransfers(); // Recargar la lista de transferencias
      }
    }).catch(error => {
      console.error('Error en modal de edición:', error);
      //this.toastService.error('Error', 'Error al abrir el modal de edición');
    });
  }
  
  /**
   * Eliminar transferencia
   */
  deleteTransfer(transfer: PersonalTransferDto): void {
    if (confirm(`¿Estás seguro de eliminar la transferencia del personal ${transfer.personalId}?`)) {
      this.personalTransferService.deletePersonalTransfer(transfer.personalId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.toastService.success('Éxito', 'Transferencia eliminada correctamente');
              this.loadTransfers();
            } else {
              this.toastService.error('Error', response.message || 'Error al eliminar transferencia');
            }
          },
          error: (error) => {
            console.error('Error deleting transfer:', error);
            this.toastService.error('Error', 'Error al eliminar la transferencia');
          }
        });
    }
  }
  
  // === FILTROS ===
  
  onGenericFilterChange(event: FilterChangeEvent): void {
    // Actualizar filtros en tiempo real si es necesario
    console.log('Filter changed:', event);
  }
  
  onGenericFiltersApply(filters: FilterState): void {
    this.currentFilters = filters;
    this.page = 1; // Reset a primera página
    this.loadTransfers(); // Recargar con nuevos filtros
  }
  
  onGenericFiltersClear(): void {
    this.currentFilters = {};
    this.page = 1;
    this.loadTransfers(); // Recargar sin filtros
  }
  
  // === GESTIÓN DE COLUMNAS ===
  
  onColumnManagerChange(event: ColumnChangeEvent): void {
    console.log('Column visibility changed:', event);
    
    // Actualizar el estado local primero
    const column = this.tableColumns.find(col => col.key === event.column.key);
    if (column) {
      column.visible = event.column.visible;
    }
    
    // Aplicar cambios inmediatamente a ag-Grid
    if (this.gridApi) {
      this.gridApi.setColumnVisible(event.column.key, event.column.visible);
      
      // Trigger re-render of cells to update responsive content
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
      }, 100);
    }
  }
  
  onColumnsApply(columns: ColumnConfig[]): void {
    this.tableColumns = columns;
    console.log('Columns applied:', columns);
    
    // Aplicar todas las visibilidades a ag-Grid
    if (this.gridApi) {
      columns.forEach(col => {
        this.gridApi.setColumnVisible(col.key, col.visible);
      });
      
      // Trigger refresh and resize after column visibility changes
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
  }
  
  onColumnsReset(): void {
    // Restaurar configuración por defecto
    const defaultVisibleColumns = ['select', 'personalId', 'fullName', 'branchDescription', 'areaDescription', 'startDate', 'endDate', 'actions'];
    
    this.tableColumns.forEach(col => {
      col.visible = defaultVisibleColumns.includes(col.key);
    });
    
    // Aplicar reset a ag-Grid
    if (this.gridApi) {
      this.tableColumns.forEach(col => {
        this.gridApi.setColumnVisible(col.key, col.visible);
      });
      
      // Trigger refresh and resize after reset
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
    
    console.log('Columns reset to default');
  }
  
  isColumnVisible(columnKey: string): boolean {
    const column = this.tableColumns.find(col => col.key === columnKey);
    return column ? column.visible : false;
  }
  
  // === SELECCIÓN ===
  
  toggleAllTransfers(): void {
    this.transfers.forEach(transfer => {
      transfer.selected = this.allSelected;
    });
  }
  
  // === PAGINACIÓN ===
  
  onPageChangeCustom(event: PaginatorEvent): void {
    this.page = event.pageNumber;
    this.pageSize = event.pageSize;
    console.log('Page changed:', event);
    this.loadTransfers(); // Recargar con nueva paginación
  }

  // === AG-GRID CONFIGURATION ===

  private setupAgGrid(): void {
    const baseColumnDefs: ColDef[] = [
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
        resizable: false
      },
      {
        field: 'personalId',
        headerName: 'ID Personal',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center">
            <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center mr-2">
              <span class="text-xs font-medium text-fiori-primary">#${params.value}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'fullName',
        headerName: 'Empleado',
        minWidth: 200,
        maxWidth: 300,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-background rounded-full flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-fiori-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div class="text-sm font-medium text-fiori-text">${params.value || '-'}</div>
          </div>`;
        }
      },
      {
        field: 'branchDescription',
        headerName: 'Sede',
        minWidth: 120,
        maxWidth: 250,
        cellRenderer: (params: any) => {
          const branchId = params.data.branchId;
          const column = params.column;
          const actualWidth = column.getActualWidth();
          
          // Mostrar ID solo si hay suficiente espacio (más de 160px)
          const showId = actualWidth > 160;
          
          return `<div class="flex items-center py-1 w-full">
            <div class="w-5 h-5 bg-fiori-success/10 rounded flex items-center justify-center mr-2 flex-shrink-0">
              <svg class="w-3 h-3 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-fiori-text truncate" title="${params.value}">${params.value}</div>
              ${showId ? `<div class="text-xs text-fiori-subtext truncate" title="ID: ${branchId}">ID: ${branchId}</div>` : ''}
            </div>
          </div>`;
        }
      },
      {
        field: 'areaDescription',
        headerName: 'Área',
        minWidth: 110,
        maxWidth: 220,
        cellRenderer: (params: any) => {
          const areaId = params.data.areaId;
          const column = params.column;
          const actualWidth = column.getActualWidth();
          
          // Mostrar ID solo si hay suficiente espacio (más de 150px)
          const showId = actualWidth > 150;
          
          return `<div class="flex items-center py-1 w-full">
            <div class="w-5 h-5 bg-fiori-accent/10 rounded flex items-center justify-center mr-2 flex-shrink-0">
              <svg class="w-3 h-3 text-fiori-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-fiori-text truncate" title="${params.value}">${params.value}</div>
              ${showId ? `<div class="text-xs text-fiori-subtext truncate" title="ID: ${areaId}">ID: ${areaId}</div>` : ''}
            </div>
          </div>`;
        }
      },
      {
        field: 'costCenterDescription',
        headerName: 'Centro de Costo',
        minWidth: 130,
        maxWidth: 200,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          const costCenterId = params.data.costCenterId;
          const column = params.column;
          const actualWidth = column.getActualWidth();
          
          // Mostrar ID solo si hay suficiente espacio (más de 170px)
          const showId = actualWidth > 170;
          
          return `<div class="flex items-center py-1 w-full">
            <div class="w-5 h-5 bg-fiori-warning/10 rounded flex items-center justify-center mr-2 flex-shrink-0">
              <svg class="w-3 h-3 text-fiori-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-fiori-text truncate" title="${params.value}">${params.value}</div>
              ${showId ? `<div class="text-xs text-fiori-subtext truncate" title="ID: ${costCenterId}">ID: ${costCenterId}</div>` : ''}
            </div>
          </div>`;
        }
      },
      {
        field: 'startDate',
        headerName: 'Fecha Inicio',
        minWidth: 130,
        maxWidth: 160,
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
        field: 'endDate',
        headerName: 'Fecha Fin',
        minWidth: 130,
        maxWidth: 160,
        cellRenderer: (params: any) => {
          if (!params.value) {
            return `<span class="text-fiori-info font-medium">Permanente</span>`;
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
        field: 'observation',
        headerName: 'Observación',
        minWidth: 180,
        maxWidth: 250,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="text-sm text-fiori-text" title="${params.value}">${params.value}</div>`;
        }
      },
      {
        field: 'createdBy',
        headerName: 'Creado Por',
        minWidth: 120,
        maxWidth: 160,
        hide: true,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-subtext mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <span>${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'createdAt',
        headerName: 'Fecha Creación',
        minWidth: 140,
        maxWidth: 180,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          const date = new Date(params.value);
          const formattedDate = date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          return `<span class="text-sm">${formattedDate}</span>`;
        }
      },
      {
        field: 'actions',
        headerName: 'Acciones',
        minWidth: 120,
        maxWidth: 140,
        pinned: 'right',
        lockPosition: true,
        resizable: false,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center space-x-1 h-full">
            <button class="edit-btn p-2 text-fiori-primary hover:bg-fiori-primary/10 rounded transition-colors" title="Editar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-btn p-2 text-fiori-error hover:bg-fiori-error/10 rounded transition-colors" title="Eliminar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>`;
        }
      }
    ];

    // Definir prioridades de columnas (menor número = mayor prioridad)
    const columnPriorities = {
      'select': 1,           // Siempre visible (checkbox)
      'personalId': 2,       // ID Personal - muy importante
      'fullName': 3,         // Nombre - muy importante
      'branchDescription': 4, // Sede - importante
      'areaDescription': 5,   // Área - importante
      'startDate': 6,        // Fecha inicio - moderadamente importante
      'endDate': 7,          // Fecha fin - moderadamente importante
      'costCenterDescription': 8, // Centro de costo - menos importante
      'observation': 9,      // Observación - menos importante
      'createdBy': 10,       // Creado por - poco importante
      'createdAt': 11,       // Fecha creación - poco importante
      'actions': 1           // Siempre visible (acciones)
    };

    // Aplicar optimizaciones para dynamic resizing con prioridades
    this.columnDefs = applyDynamicResizeToColumnsWithPriority(baseColumnDefs, columnPriorities);
    
    // Sync column visibility between ag-Grid and column manager
    this.syncColumnVisibility();
  }
  
  private syncColumnVisibility(): void {
    // Ensure ag-Grid column visibility matches the tableColumns configuration
    this.columnDefs.forEach(colDef => {
      const columnConfig = this.tableColumns.find(col => col.key === colDef.field);
      if (columnConfig) {
        // Set the hide property based on the tableColumns visible state
        colDef.hide = !columnConfig.visible;
      }
    });
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
        
        if (button && button.classList.contains('edit-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.editTransfer(rowData);
            }
          }
        } else if (button && button.classList.contains('delete-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.deleteTransfer(rowData);
            }
          }
        }
      });
    }
  }

  onSelectionChanged(): void {
    const selectedRows = this.gridApi?.getSelectedRows() || [];
    this.allSelected = selectedRows.length === this.transfers.length && this.transfers.length > 0;
    console.log('Selection changed:', selectedRows);
  }
}