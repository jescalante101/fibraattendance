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
          } else {
            this.toastService.error('Error', response.message || 'Error al cargar transferencias');
            this.transfers = [];
            this.totalCount = 0;
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading transfers:', error);
          this.toastService.error('Error', 'Error al cargar las transferencias');
          this.transfers = [];
          this.totalCount = 0;
        }
      });
  }
  
  /**
   * Crear nueva transferencia individual
   */
  createTransfer(): void {
    this.modalService.open({
      title: 'Nueva Transferencia de Personal',
      componentType: TransferModalComponent,
      width: '90vw',
      height: 'auto',
      componentData: {
        mode: 'create'
      }
    }).then(result => {
      if (result && result.action === 'save') {
        console.log('Nueva transferencia:', result.data);
        // TODO: Llamar al servicio para crear la transferencia
        this.loadTransfers();
      }
    }).catch(error => {
      console.error('Error en modal de transferencia:', error);
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
      width: '90vw',
      height: 'auto',
      componentData: {
        mode: 'edit',
        transferData: transfer
      }
    }).then(result => {
      if (result && result.action === 'save') {
        console.log('Transferencia editada:', result.data);
        // TODO: Llamar al servicio para actualizar la transferencia
        this.loadTransfers();
      }
    }).catch(error => {
      console.error('Error en modal de edición:', error);
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
  }
  
  onColumnsApply(columns: ColumnConfig[]): void {
    this.tableColumns = columns;
    console.log('Columns applied:', columns);
  }
  
  onColumnsReset(): void {
    // Restaurar configuración por defecto
    this.tableColumns.forEach(col => {
      if (['select', 'personalId', 'branchDescription', 'areaDescription', 'startDate', 'acciones'].includes(col.key)) {
        col.visible = true;
      } else {
        col.visible = false;
      }
    });
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
}