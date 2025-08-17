import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { Router } from '@angular/router';
import { AsignarTurnoMasivoComponent } from '../asignar-turno-masivo/asignar-turno-masivo.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShiftsService } from 'src/app/core/services/shifts.service';
import { ModalVerHorarioComponent } from './modal-ver-horario/modal-ver-horario.component';
import { ModalEditarAsignacionComponent } from './modal-editar-asignacion/modal-editar-asignacion.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { GenericFilterConfig, FilterState, FilterChangeEvent } from 'src/app/shared/generic-filter/filter-config.interface';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';

@Component({
  selector: 'app-asignar-horario-empleado',
  templateUrl: './asignar-horario-empleado.component.html',
  styleUrls: ['./asignar-horario-empleado.component.css']
})
export class AsignarHorarioEmpleadoComponent implements OnInit {

  constructor(
    private dialog: MatDialog,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private snackBar: MatSnackBar,
    private shiftService: ShiftsService,
    private modalService:ModalService
  ) { }

  filtro = '';
  pageNumber = 1;
  pageSize = 50;
  totalCount = 0;
  
  startDate = '';
  endDate = '';
  
  employees: (EmployeeScheduleAssignment & { selected?: boolean })[] = [];
  loading: boolean = false;

  displayedColumns: string[] = [
    'employeeId', 'nroDoc', 'fullNameEmployee', 'scheduleName', 'createdWeek',
    'locationName', 'areaName', 'startDate', 'endDate', 'remarks', 'acciones'
  ];

  // ag-Grid configuration
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {
    ...createFioriGridOptions(),
    defaultColDef: {
      ...createFioriGridOptions().defaultColDef,
      cellClass: 'ag-cell-vertical-center'
    }
  };
  gridApi: any;

  // Column Manager
  tableColumns: ColumnConfig[] = [
    { key: 'employeeId', label: 'ID Personal', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'nroDoc', label: 'Documento', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'fullNameEmployee', label: 'Personal', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'scheduleName', label: 'Turno', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'locationName', label: 'Ubicación', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'areaName', label: 'Área', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'startDate', label: 'Fecha Inicio', visible: true, required: false, sortable: true, type: 'date' },
    { key: 'endDate', label: 'Fecha Fin', visible: true, required: false, sortable: true, type: 'date' },
    { key: 'acciones', label: 'Acciones', visible: true, required: true, sortable: false, type: 'actions' }
  ];

  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas - Horarios'
  };

  // Propiedades para el modal genérico
  isModalOpen = false;
  modalTitle = 'Horario del Empleado';
  modalComponentType = ModalVerHorarioComponent;
  modalComponentData: any = {};

  // Exponer Math para usar en el template
  Math = Math;

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
            placeholder: 'Nombre, documento o ID...'
          }
        ]
      },
      {
        title: 'Rango de Fechas',
        filters: [
          {
            type: 'date',
            key: 'startDate',
            label: 'Fecha Inicio',
            placeholder: ''
          },
          {
            type: 'date',
            key: 'endDate', 
            label: 'Fecha Fin',
            placeholder: ''
          }
        ]
      }
    ],
    showApplyButton: true,
    showClearAll: true,
    position: 'left'
  };

  currentFilters: FilterState = {};

  ngOnInit(): void {
    this.setupGenericFilter();
    this.setupAgGrid();
    this.cargarAsignaciones();
  }

  cargarAsignaciones() {
    this.loading = true;
    this.employeeScheduleAssignmentService.getEmployeeScheduleAssignments(this.pageNumber, this.pageSize, this.filtro, this.startDate, this.endDate)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          console.log('Asignaciones cargadas:', res);
          if (res.exito && res.data) {
            this.employees = res.data.items.map(item => ({ ...item, selected: false }));
            this.totalCount = res.data.totalCount;
            this.pageNumber = res.data.pageNumber;
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
        error: (err) => {
          console.error('Error cargando asignaciones:', err);
          this.employees = [];
          this.totalCount = 0;
          
          // Clear ag-Grid data on error
          if (this.gridApi) {
            this.gridApi.setRowData([]);
          }
        }
      });
  }

  getHorario(empleado: EmployeeScheduleAssignment) {
    this.loading = true;
    this.shiftService.getShiftByAssignedIdAndShiftId(empleado.assignmentId,empleado.scheduleId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (res) {
            // Configurar datos para el modal genérico
            var  orderingHorarios = res.horario.reverse();
            this.modalComponentData = {
              employeeName: empleado.fullNameEmployee,
              fecha_ini: empleado.startDate,
              fecha_fin: empleado.endDate,
              employeeId: empleado.employeeId,
              assignmentId: empleado.assignmentId,
              turno: {
                id: res.id,
                shiftCycle: res.shiftCycle,
                cycleUnit: res.cycleUnit,
                autoShift: res.autoShift,
                workDayOff: res.workDayOff,
                weekendType: res.weekendType, 
                alias: res.alias,
                horario: orderingHorarios
              }
            };
            this.modalService.open({
                title:`Horario de ${empleado.fullNameEmployee}`,
                componentType:ModalVerHorarioComponent,
                componentData:this.modalComponentData,
                width: '800px',
            });

          

          } else {
            this.snackBar.open('No se pudo obtener la información del horario.', 'Cerrar', {
              duration: 4000,
              verticalPosition: 'top',
              horizontalPosition: 'end',
              panelClass: ['snackbar-error']
            });
          }
        },
        error: (err) => {
          console.error('Error obteniendo horario:', err);
          this.snackBar.open('Error al obtener el horario del empleado.', 'Cerrar', {
            duration: 4000,
            verticalPosition: 'top',
            horizontalPosition: 'end',
            panelClass: ['snackbar-error']
          });
        }
      });
  }

  // Método para cerrar el modal
  onModalClose(): void {
    this.isModalOpen = false;
    console.log('Modal de horarios cerrado');
  }

  irAEmpleados() {
    this.modalService.open({
      title: 'Asignación Masiva de Turnos',
      componentType: AsignarTurnoMasivoComponent,
      width: '80vw',
      height: 'auto'
    }).then(result => {
     //TODO: refrescar la lista
     this.cargarAsignaciones()
    });
  }

  aplicarFiltro() {
    this.pageNumber = 1;
    this.cargarAsignaciones();
  }

  aplicarFiltroFechas() {
    this.pageNumber = 1;
    this.cargarAsignaciones();
  }

  onPageChange2(event: PaginatorEvent) {
    console.log('Página actual:', event.pageNumber);
    console.log('Tamaño de página:', event.pageSize);
    console.log('Total de registros:', event.totalRecords);
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    this.cargarAsignaciones();
  }


  editar(asignacion: EmployeeScheduleAssignment) {
    console.log('Editar asignación:', asignacion);
    
    // Configurar datos para el modal de edición
    const editData = {
      assignmentIds: [asignacion.assignmentId],
      employeeName: asignacion.fullNameEmployee,
      currentScheduleId: asignacion.scheduleId,
      currentStartDate: asignacion.startDate,
      currentEndDate: asignacion.endDate,
      currentRemarks: asignacion.remarks,
      employeeId: asignacion.employeeId,
      nroDoc: asignacion.nroDoc,
      areaId: asignacion.areaId,
      areaName: asignacion.areaName,
      locationId: asignacion.locationId,
      locationName: asignacion.locationName
    };

    this.modalService.open({
      title: `Editar Asignación - ${asignacion.fullNameEmployee}`,
      componentType: ModalEditarAsignacionComponent,
      componentData: editData,
      width: '1200px',
      height: '90vh'
    }).then(result => {
      if (result && result.updated) {
        this.snackBar.open('Asignación actualizada correctamente', 'Cerrar', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-success']
        });
        // Recargar la lista
        this.cargarAsignaciones();
      }
    });
  }

  eliminar(asignacion: EmployeeScheduleAssignment) {
    console.log('Eliminar asignación:', asignacion);
  }

  // ============ MÉTODOS PARA FILTRO GENÉRICO ============

  setupGenericFilter() {
    // Configurar valores iniciales del filtro genérico
    this.currentFilters = {
      searchText: this.filtro,
      startDate: this.startDate,
      endDate: this.endDate
    };
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
    this.startDate = filters['startDate'] || '';
    this.endDate = filters['endDate'] || '';
    
    // Resetear página a 1 cuando se apliquen filtros
    this.pageNumber = 1;
    
    // Ejecutar búsqueda
    this.cargarAsignaciones();
  }

  onGenericFiltersClear() {
    console.log('Limpiando todos los filtros');
    
    // Limpiar todas las propiedades de filtro
    this.filtro = '';
    this.startDate = '';
    this.endDate = '';
    this.pageNumber = 1;
    
    // Actualizar filtros actuales
    this.currentFilters = {};
    
    // Ejecutar búsqueda
    this.cargarAsignaciones();
  }

  // === AG-GRID CONFIGURATION ===
  
  private setupAgGrid(): void {
    this.columnDefs = [
      {
        field: 'employeeId',
        headerName: 'ID Personal',
        width: 100,
        pinned: 'left',
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
        field: 'fullNameEmployee',
        headerName: 'Personal',
        width: 280,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-muted rounded-full flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-fiori-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-fiori-text" title="${params.value}">${params.value}</div>
            </div>
          </div>`;
        }
      },
      {
        field: 'scheduleName',
        headerName: 'Turno',
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center justify-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-success/10 text-fiori-success">
              ${params.value}
            </span>
          </div>`;
        }
      },
      {
        field: 'locationName',
        headerName: 'Ubicación',
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
        field: 'areaName',
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
        field: 'startDate',
        headerName: 'Fecha Inicio',
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
        field: 'acciones',
        headerName: 'Acciones',
        width: 180,
        pinned: 'right',
        lockPosition: true,
        resizable: false,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center space-x-1 h-full">
            <button class="horario-btn inline-flex items-center px-3 py-1 text-xs bg-fiori-info text-white rounded-lg hover:bg-blue-700 transition-colors" title="Ver Horario">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Horario
            </button>
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
        
        if (button && button.classList.contains('horario-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.getHorario(rowData);
            }
          }
        } else if (button && button.classList.contains('edit-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.editar(rowData);
            }
          }
        } else if (button && button.classList.contains('delete-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.eliminar(rowData);
            }
          }
        }
      });
    }
  }

  // === COLUMN MANAGER ===
  
  onColumnManagerChange(event: ColumnChangeEvent): void {
    console.log('Column visibility changed:', event);
    
    // Obtener la clave y visibilidad de la columna
    const columnKey = event.column.key;
    const visible = event.column.visible;
    
    // Actualizar el estado local primero
    const column = this.tableColumns.find(col => col.key === columnKey);
    if (column) {
      column.visible = visible;
    }
    
    // Aplicar cambios inmediatamente a ag-Grid
    if (this.gridApi) {
      this.gridApi.setColumnsVisible([columnKey], visible);
      
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
        this.gridApi.setColumnsVisible([col.key], col.visible);
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
    const defaultVisibleColumns = ['employeeId', 'nroDoc', 'fullNameEmployee', 'scheduleName', 'locationName', 'areaName', 'startDate', 'endDate', 'acciones'];
    
    this.tableColumns.forEach(col => {
      col.visible = defaultVisibleColumns.includes(col.key);
    });
    
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
    
    console.log('Columns reset to default');
  }

}
