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
import { CalendarViewHorarioComponent } from './calendar-view-horario/calendar-view-horario.component';
import { ModalEditarAsignacionComponent } from './modal-editar-asignacion/modal-editar-asignacion.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ScheduleService } from 'src/app/core/services/schedule.service';
import { ScheduleResponseDto } from 'src/app/core/models/schedule.model';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { GenericFilterConfig, FilterState, FilterChangeEvent } from 'src/app/shared/generic-filter/filter-config.interface';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';
import { ToastService } from 'src/app/shared/services/toast.service';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { AuthService, User } from 'src/app/core/services/auth.service';
import { AppUserService, SedeArea } from 'src/app/core/services/app-user.services';
import { ModalCompensatoryDayFormComponent } from 'src/app/components/asistencia/compensatory-day/modal-compensatory-day-form/modal-compensatory-day-form.component';
import { ErrorHandlerService } from 'src/app/shared/services/error-handler.service';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    private modalService:ModalService,
    private toastService:ToastService,
    private scheduleService: ScheduleService,
    private appUserService: AppUserService,
    private authService: AuthService,
    private errorHandlerService: ErrorHandlerService
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
    { key: 'companiaId', label: 'Compañía', visible: false, required: false, sortable: true, type: 'text' },
    { key: 'ccostDescription', label: 'Centro de Costo', visible: true, required: false, sortable: true, type: 'text' },
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
  
  // Control del menú flotante de acciones
  activeMenuRow: number | null = null;
  menuPosition = { x: 0, y: 0 };

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

  user:any;

  sedesAreas: SedeArea[] = [];

  ngOnInit(): void {
    this.setCurrentWeekDates();
    this.setupGenericFilter();
    this.setupAgGrid();
    this.cargarAsignaciones();   
  }

  private setCurrentWeekDates(): void {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    
    // Calcular el lunes de esta semana
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Si es domingo, retroceder 6 días
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    // Calcular el domingo de esta semana
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Formatear fechas como YYYY-MM-DD
    this.startDate = monday.toISOString().split('T')[0];
    this.endDate = sunday.toISOString().split('T')[0];
    
    console.log('Semana actual configurada:', {
      lunes: this.startDate,
      domingo: this.endDate
    });
  }

  cargarAsignaciones() {
    this.loading = true;

    //recuperamos la sede 
     const userna = this.authService.getCurrentUser();
   if(userna){
    this.appUserService.getSedesAreas(userna.id).subscribe({
      next: (sedesAreas) => {
        this.sedesAreas = sedesAreas;
        console.log('sedesAreas',sedesAreas);
        let locationId = sedesAreas.map(item => item.siteId);
        console.log('locationId',locationId);
       if(locationId.length > 0){
         this.employeeScheduleAssignmentService.getEmployeeScheduleAssignments(this.pageNumber, this.pageSize, this.filtro, this.startDate, this.endDate,locationId)
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
          this.errorHandlerService.handleLoadError(err,'asignaciones');
          this.employees = [];
          this.totalCount = 0;
          
          // Clear ag-Grid data on error
          if (this.gridApi) {
            this.gridApi.setRowData([]);
          }
        }
      });
       }
        
      },
      error: (err) => {
        this.loading = false;
        this.errorHandlerService.handleLoadError(err,'asignaciones');
        this.employees = [];
        this.totalCount = 0;
        if (this.gridApi) {
          this.gridApi.setRowData([]);
        }
        console.error('Error cargando sedes:', err);
      }
    })  
   }
    
   
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
           this.toastService.info('Horarios','No se pudo obtener la información del horario.');
          }
        },
        error: (err) => {
          this.errorHandlerService.handleLoadError(err,'horario');
        }
      });
  }

  verCalendario(empleado: EmployeeScheduleAssignment) {
    this.loading = true;
    
    // Calcular rango de fechas para el calendario (mes actual + siguiente)
    const startDate = empleado.startDate ? new Date(empleado.startDate) : new Date();
    const endDate = empleado.endDate ? new Date(empleado.endDate) : this.getDefaultEndDate();
 
    this.scheduleService.getScheduleByDateRange(empleado.employeeId, startDate, endDate)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (scheduleResponse: ScheduleResponseDto) => {
          if (scheduleResponse && scheduleResponse.schedule) {
            console.log('Schedule data received:', scheduleResponse);

            // Extender scheduleResponse con datos del empleado para día compensatorio
            const extendedScheduleData = {
              ...scheduleResponse,
              // Datos adicionales del empleado para funcionalidades como días compensatorios
              employeeData: {
                employeeId: empleado.employeeId,
                assignmentId: empleado.assignmentId,
                fullName: empleado.fullNameEmployee,
                employeeArea: empleado.areaName || 'Sin área',
                employeeLocation: empleado.locationName || 'Sin ubicación',
                nroDoc: empleado.nroDoc
              }
            };

            this.modalService.open({
              title: `Calendario de Horarios - ${empleado.fullNameEmployee}`,
              componentType: CalendarViewHorarioComponent,
              componentData: extendedScheduleData,
              width: '95vw',
              height: '95vh'
            });

          } else {
           
            this.toastService.info('Horarios','No se pudo obtener la información del horario.');
          }
        },
        error: (err) => {
          this.errorHandlerService.handleLoadError(err,'calendario');
        }
      });
  }

  private getDayName(dayIndex: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex] || `Día ${dayIndex}`;
  }

  private getDefaultEndDate(): Date {
    // Si no hay fecha fin, mostrar 3 meses desde hoy
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    return endDate;
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
      width: '70vw',
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
      locationName: asignacion.locationName,
      // Nuevos campos
      companiaId: asignacion.companiaId,
      ccostId: asignacion.ccostId,
      ccostDescription: asignacion.ccostDescription
    };

    this.modalService.open({
      title: `Editar Asignación - ${asignacion.fullNameEmployee}`,
      componentType: ModalEditarAsignacionComponent,
      componentData: editData,
      width: '1200px',
      height: '95vh'
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

    /// modal de confirmación 
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '350px',
      data: {
        tipo: 'danger',
        titulo: 'Eliminar usuario',
        mensaje: `¿Seguro que deseas eliminar el usuario "${asignacion.fullNameEmployee}"?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.employeeScheduleAssignmentService.deleteEmployeeScheduleAssignment(asignacion.assignmentId).subscribe({
          next: (res) => {
            this.toastService.success('Asignación eliminada correctamente','Asignación eliminada correctamente  '+asignacion.fullNameEmployee);
            this.cargarAsignaciones();
          },
          error: (err) => {
            this.errorHandlerService.handleLoadError(err,'eliminar');
          }
        });
      }
    });

    // console.log('Eliminar asignación:', asignacion);
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
        width: 600,
        maxWidth: 600,
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
        width: 400,
        maxWidth: 400,
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
        width: 600,
        maxWidth: 600,

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
        field: 'companiaId',
        headerName: 'Compañía',
      
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <span class="font-medium">${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'ccostDescription',
        headerName: 'Centro de Costo',
        width: 500,
        maxWidth: 500,
        
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">Sin asignar</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-warning mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="font-medium" title="${params.value}">${params.value}</span>
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
        width: 80,
        maxWidth: 80,
        pinned: 'right',
        lockPosition: true,
        resizable: false,
        cellRenderer: (params: any) => {
          const rowIndex = params.node.rowIndex;
          return `<div class="flex items-center justify-center h-full relative">
            <button 
              class="action-menu-btn inline-flex items-center px-2 py-1 text-xs bg-fiori-surface border border-fiori-border text-fiori-text rounded-md hover:bg-fiori-muted transition-colors"
              data-row-index="${rowIndex}"
              title="Acciones">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
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
    // Use event delegation to handle action menu clicks
    const gridElement = document.querySelector('.ag-theme-quartz');
    if (gridElement) {
      gridElement.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('button');
        
        if (button && button.classList.contains('action-menu-btn')) {
          event.stopPropagation();
          const rowIndex = parseInt(button.getAttribute('data-row-index') || '0');
          this.toggleActionMenu(rowIndex, event as MouseEvent);
        }
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.action-menu-btn') && !target.closest('.action-menu')) {
          this.activeMenuRow = null;
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
    const defaultVisibleColumns = ['employeeId', 'nroDoc', 'fullNameEmployee', 'scheduleName', 'locationName', 'areaName', 'ccostDescription', 'startDate', 'endDate', 'acciones'];
    
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
  
  // === MÉTODOS PARA MENÚ FLOTANTE ===
  
  toggleActionMenu(rowIndex: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.activeMenuRow === rowIndex) {
      // Si el menú ya está abierto para esta fila, cerrarlo
      this.activeMenuRow = null;
    } else {
      // Abrir menú para esta fila
      this.activeMenuRow = rowIndex;
      
      // Calcular posición del menú (desplegado hacia la izquierda)
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const menuWidth = 200; // Ancho estimado del menú
      
      this.menuPosition = {
        x: rect.right - menuWidth, // Alinear el borde derecho del menú con el borde derecho del botón
        y: rect.bottom + 5
      };
    }
  }
  
  onMenuAction(action: string, rowIndex: number): void {
    const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
    if (!rowData) return;
    
    // Cerrar el menú
    this.activeMenuRow = null;
    
    // Ejecutar acción
    switch (action) {
      case 'calendar':
        this.verCalendario(rowData);
        break;
      case 'edit':
        this.editar(rowData);
        break;
      case 'compensatory':
        this.registrarDiaCompensatorio(rowData);
        break;
      case 'delete':
        this.eliminar(rowData);
        break;
    }
  }
  
  registrarDiaCompensatorio(empleado: EmployeeScheduleAssignment): void {
    const modalData = {
      mode: 'create' as const,
      employee: {
        employeeId: empleado.employeeId,
        assignmentId: empleado.assignmentId,
        fullName: empleado.fullNameEmployee,
        employeeArea: empleado.areaName || 'Sin área',
        employeeLocation: empleado.locationName || 'Sin ubicación',
        nroDoc: empleado.nroDoc
      }
    };
    
    this.modalService.open({
      title: `Registrar Día Compensatorio - ${empleado.fullNameEmployee}`,
      componentType: ModalCompensatoryDayFormComponent,
      componentData: modalData,
      width: '600px'
    }).then(result => {
      if (result && result.success) {
        this.toastService.success(
          'Éxito', 
          `Día compensatorio ${result.mode === 'create' ? 'creado' : 'actualizado'} correctamente`
        );
        // Opcional: recargar datos si es necesario
        // this.cargarAsignaciones();
      }
    });
  }

  // ===== EXPORT METHODS =====

  private async getEmployeeAssignmentsForExport(): Promise<EmployeeScheduleAssignment[]> {
    const userna = this.authService.getCurrentUser();
    if (!userna) {
      return [];
    }

    return new Promise((resolve, reject) => {
      this.appUserService.getSedesAreas(userna.id).subscribe({
        next: (sedesAreas) => {
          const locationId = sedesAreas.map(item => item.siteId);
          
          if (locationId.length > 0) {
            // Usar pageSize 500 para exportación
            this.employeeScheduleAssignmentService.getEmployeeScheduleAssignments(
              1, // Primera página
              500, // 500 registros
              this.filtro,
              this.startDate,
              this.endDate,
              locationId
            ).subscribe({
              next: (res) => {
                if (res.exito && res.data?.items) {
                  resolve(res.data.items);
                } else {
                  resolve([]);
                }
              },
              error: (err) => {
                console.error('Error obteniendo asignaciones para exportar:', err);
                reject(err);
              }
            });
          } else {
            resolve([]);
          }
        },
        error: (err) => {
          console.error('Error obteniendo sedes:', err);
          reject(err);
        }
      });
    });
  }

  async exportToExcel(): Promise<void> {
    try {
      console.log('Iniciando exportación a Excel...');
      const assignmentsData = await this.getEmployeeAssignmentsForExport();
      
      if (!assignmentsData || assignmentsData.length === 0) {
        console.warn('No hay datos para exportar');
        return;
      }

      // Preparar datos para el Excel
      const excelData = assignmentsData.map(assignment => ({
        'ID Personal': assignment.employeeId || '',
        'Documento': assignment.nroDoc || '',
        'Empleado': assignment.fullNameEmployee || '',
        'Turno': assignment.scheduleName || '',
        'Ubicación': assignment.locationName || '',
        'Área': assignment.areaName || '',
        'Compañía': assignment.companiaId || '',
        'Centro de Costo': assignment.ccostDescription || '',
        'Fecha Inicio': assignment.startDate ? new Date(assignment.startDate).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
        'Fecha Fin': assignment.endDate ? new Date(assignment.endDate).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : 'Permanente',
        'Observaciones': assignment.remarks || ''
      }));

      // Crear workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      
      // Configurar anchos de columna
      const columnWidths = [
        { wch: 12 }, // ID Personal
        { wch: 15 }, // Documento
        { wch: 50 }, // Empleado (más ancho)
        { wch: 25 }, // Turno
        { wch: 30 }, // Ubicación
        { wch: 25 }, // Área
        { wch: 15 }, // Compañía
        { wch: 30 }, // Centro de Costo
        { wch: 15 }, // Fecha Inicio
        { wch: 15 }, // Fecha Fin
        { wch: 40 }  // Observaciones
      ];
      worksheet['!cols'] = columnWidths;

      // Estilos para encabezados
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0070F3" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };

      // Aplicar estilos a los encabezados
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = headerStyle;
      }

      // Estilos para celdas de datos
      const dataStyle = {
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        },
        alignment: { vertical: "center" }
      };

      // Aplicar estilos a las celdas de datos
      for (let row = 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!worksheet[cellAddress]) continue;
          worksheet[cellAddress].s = dataStyle;
        }
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Asignaciones Horarios');

      // Generar nombre de archivo con fecha actual
      const now = new Date();
      const fileName = `asignaciones_horarios_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      console.log('Excel exportado correctamente:', fileName);
      
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
    }
  }

  async exportToPDF(): Promise<void> {
    try {
      console.log('Iniciando exportación a PDF...');
      const assignmentsData = await this.getEmployeeAssignmentsForExport();
      
      if (!assignmentsData || assignmentsData.length === 0) {
        console.warn('No hay datos para exportar');
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // Título del documento
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte de Asignaciones de Horarios', 15, 15);

      // Información del filtro aplicado
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 25;
      
      if (this.startDate && this.endDate) {
        const startDate = new Date(this.startDate).toLocaleDateString('es-PE');
        const endDate = new Date(this.endDate).toLocaleDateString('es-PE');
        doc.text(`Período: ${startDate} - ${endDate}`, 15, yPos);
        yPos += 5;
      }
      
      if (this.filtro) {
        doc.text(`Filtro: ${this.filtro}`, 15, yPos);
        yPos += 5;
      }

      doc.text(`Total de asignaciones: ${assignmentsData.length}`, 15, yPos);
      yPos += 5;

      // Preparar datos para la tabla
      const tableData = assignmentsData.map(assignment => [
        assignment.employeeId || '',
        assignment.nroDoc || '',
        assignment.fullNameEmployee || '',
        assignment.scheduleName || '',
        assignment.locationName || '',
        assignment.areaName || '',
        assignment.startDate ? new Date(assignment.startDate).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
        assignment.endDate ? new Date(assignment.endDate).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : 'Permanente'
      ]);

      // Configurar la tabla
      autoTable(doc, {
        head: [['ID', 'Doc.', 'Empleado', 'Turno', 'Ubicación', 'Área', 'F. Inicio', 'F. Fin']],
        body: tableData,
        startY: yPos + 5,
        styles: {
          fontSize: 7,
          cellPadding: 1.5
        },
        headStyles: {
          fillColor: [0, 112, 243], // Color azul similar al de la UI
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 15 }, // ID
          1: { cellWidth: 20 }, // Documento
          2: { cellWidth: 60 }, // Empleado (más ancho)
          3: { cellWidth: 30 }, // Turno
          4: { cellWidth: 35 }, // Ubicación
          5: { cellWidth: 35 }, // Área
          6: { cellWidth: 20 }, // F. Inicio
          7: { cellWidth: 20 }  // F. Fin
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto'
      });

      // Generar nombre de archivo con fecha actual
      const now = new Date();
      const fileName = `asignaciones_horarios_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}.pdf`;
      
      doc.save(fileName);
      console.log('PDF exportado correctamente:', fileName);
      
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
    }
  }

}
