import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';

import { CompensatoryDayService } from '../../../core/services/compensatory-day.service';
import { 
  CompensatoryDay, 
  CompensatoryDayFilterParams, 
  CompensatoryDayStatus,
  PaginatedList 
} from '../../../core/models/compensatory-day.model';
import { createFioriGridOptions, createFioriGridOptionsWithFullDynamicResize, localeTextFiori } from '../../../shared/ag-grid-theme-fiori';
import { PaginatorEvent } from '../../../shared/fiori-paginator/fiori-paginator.component';
import { ModalService } from '../../../shared/modal/modal.service';
import { ModalCrearCompensatorioComponent } from './modal-crear-compensatorio/modal-crear-compensatorio.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { HolidaysService } from 'src/app/core/services/holidays.service';
import { HolidayYear } from 'src/app/core/models/holiday.model';

@Component({
  selector: 'app-compensatory-day',
  templateUrl: './compensatory-day.component.html',
  styleUrls: ['./compensatory-day.component.css']
})
export class CompensatoryDayComponent implements OnInit, OnDestroy {
  @ViewChild('agGrid') agGrid!: any;

  // Data properties
  compensatoryDays: CompensatoryDay[] = [];
  totalCount: number = 0;
  loading: boolean = false;
  holidays: HolidayYear = {} as HolidayYear;
  public flatpickrOptions: any;
  private startDateInstance: any;
  private endDateInstance: any;
  
  // Pagination
  page: number = 1;
  pageSize: number = 25;

  // Filtering
  filterForm: FormGroup;
  currentFilters: CompensatoryDayFilterParams = {};

  // AG-Grid configuration
  gridApi!: GridApi;
  gridOptions: GridOptions;
  columnDefs: ColDef[];

  // Status enum for template
  statusEnum = CompensatoryDayStatus;

  constructor(
    private compensatoryDayService: CompensatoryDayService,
    private fb: FormBuilder,
    private modalService: ModalService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private holidaysService: HolidaysService
  ) {
    // Initialize filter form
    this.filterForm = this.fb.group({
      searchTerm: [''],
      status: [''],
      startDate: [''],
      endDate: [''],
      companyId: ['']
    });

    // Configure AG-Grid
    this.gridOptions = createFioriGridOptions({
      localeText: localeTextFiori,
      rowSelection: 'single',
      suppressRowClickSelection: false,
      onRowDoubleClicked: (event) => this.onRowDoubleClick(event)
    });

    this.columnDefs = this.setupColumnDefinitions();

    // Initialize flatpickr with basic options
    this.initializeFlatpickrOptions();
  }

  ngOnInit(): void {
    this.loadCompensatoryDays();
    this.loadHolidays();
  }

  onStartDateReady(instance: any) {
    this.startDateInstance = instance;
  }

  onEndDateReady(instance: any) {
    this.endDateInstance = instance;
  }

  loadHolidays() {
    const year = new Date().getFullYear();
    this.holidaysService.getHolidaysByYear(year.toString()).subscribe({
      next: (data) => {
        console.log('🚀 Respuesta de la API:', data);
        this.holidays = data;
        this.initializeFlatpickrOptions();
        // Re-initialize Flatpickr instances with new options instead of redraw
        if (this.startDateInstance && typeof this.startDateInstance.destroy === 'function') {
          try {
            this.startDateInstance.destroy();
          } catch (error) {
            console.warn('Error destroying startDateInstance:', error);
          }
          this.startDateInstance = null;
        }
        if (this.endDateInstance && typeof this.endDateInstance.destroy === 'function') {
          try {
            this.endDateInstance.destroy();
          } catch (error) {
            console.warn('Error destroying endDateInstance:', error);
          }
          this.endDateInstance = null;
        }
      },
      error: (error) => {
        console.error('Error loading holidays, using default calendar options:', error);
        // Initialize with default options if holidays fail to load
        this.initializeFlatpickrOptions(); 
      }
    });
  }

  initializeFlatpickrOptions() {
    console.log('🗓️ Inicializando opciones de Flatpickr...');
    console.log('🏖️ Feriados disponibles:', this.holidays);
    console.log('🏖️ Número de feriados:', this.holidays?.hld1s?.length || 0);
    
    // Crear array de fechas de feriados para Flatpickr
    const holidayDates: string[] = [];
    if (this.holidays && this.holidays.hld1s) {
      this.holidays.hld1s.forEach(holiday => {
        // Convertir formato ISO a YYYY-MM-DD
        const date = new Date(holiday.strDate);
        const dateStr = date.getFullYear() + '-' + 
                       String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(date.getDate()).padStart(2, '0');
        holidayDates.push(dateStr);
        console.log('🏖️ Feriado agregado:', dateStr, holiday.rmrks);
      });
    }
    
    this.flatpickrOptions = {
      dateFormat: 'Y-m-d',
      locale: 'es',
      // Usar enable para resaltar feriados (inverso de disable)
      enable: [
        // Habilitar todas las fechas
        {
          from: "1900-01-01",
          to: "2100-12-31"
        }
      ],
      // Método alternativo: usar onReady para aplicar estilos después
      onReady: (selectedDates: Date[], dateStr: string, instance: any) => {
        console.log('📅 Flatpickr listo, aplicando estilos de feriados...');
        setTimeout(() => {
          this.applyHolidayStyles(instance);
        }, 100);
      },
      // También en onChange por si cambia el mes
      onMonthChange: (selectedDates: Date[], dateStr: string, instance: any) => {
        console.log('📅 Mes cambiado, re-aplicando estilos...');
        setTimeout(() => {
          this.applyHolidayStyles(instance);
        }, 100);
      },
      onYearChange: (selectedDates: Date[], dateStr: string, instance: any) => {
        console.log('📅 Año cambiado, re-aplicando estilos...');
        setTimeout(() => {
          this.applyHolidayStyles(instance);
        }, 100);
      }
    };
  }

  // Método separado para aplicar estilos de feriados
  private applyHolidayStyles(instance: any): void {
    if (!this.holidays || !this.holidays.hld1s) return;

    // Buscar todos los elementos de días en el calendario
    const calendarEl = instance.calendarContainer;
    if (!calendarEl) return;

    const dayElements = calendarEl.querySelectorAll('.flatpickr-day');
    console.log('🔍 Elementos de días encontrados:', dayElements.length);

    dayElements.forEach((dayEl: HTMLElement) => {
      // Intentar obtener la fecha del elemento
      let dayDate: Date;
      
      if ((dayEl as any).dateObj) {
        dayDate = new Date((dayEl as any).dateObj);
      } else if (dayEl.getAttribute('aria-label')) {
        // Backup: usar aria-label si existe
        dayDate = new Date(dayEl.getAttribute('aria-label')!);
      } else {
        // Último recurso: usar el texto del elemento
        const dayText = dayEl.textContent || dayEl.innerText;
        if (!dayText || isNaN(parseInt(dayText))) return;
        
        // Construir fecha basándose en el mes/año del calendario
        const currentDate = new Date();
        dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(dayText));
      }
      
      if (isNaN(dayDate.getTime())) return;

      // Normalizar fecha para comparación
      const normalizedDayDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

      this.holidays.hld1s.forEach(holiday => {
        const holidayDate = new Date(holiday.strDate);
        const normalizedHolidayDate = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate());

        if (normalizedDayDate.getTime() === normalizedHolidayDate.getTime()) {
          console.log('🎉 Aplicando estilos a feriado:', holiday.rmrks);
          
          // Aplicar clase y estilos
          dayEl.classList.add('holiday-date');
          dayEl.title = holiday.rmrks;
          dayEl.style.setProperty('background-color', '#fee2e2', 'important');
          dayEl.style.setProperty('color', '#dc2626', 'important');
          dayEl.style.setProperty('font-weight', 'bold', 'important');
          dayEl.style.setProperty('border', '2px solid #dc2626', 'important');
        }
      });
    });
  }

  /**
   * Setup AG-Grid column definitions
   */
  private setupColumnDefinitions(): ColDef[] {
    return [
      {
        headerName: 'Empleado',
        field: 'employeeFullName',
        minWidth: 180,
        flex: 2,
        cellRenderer: (params: any) => {
          const employee = params.value || 'N/A';
          const initials = employee.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
          
          return `
            <div class="flex items-center space-x-2 py-1">
              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-medium text-blue-600">${initials}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-fiori-text text-sm truncate">${employee}</div>
              </div>
            </div>
          `;
        }
      },
      {
        headerName: 'Área',
        field: 'employeeArea',
        minWidth: 120,
        flex: 1,
        cellRenderer: (params: any) => {
          const area = params.value || 'N/A';
          return `
            <div class="flex items-center py-1">
              <div class="w-2 h-2 bg-purple-400 rounded-full mr-2 flex-shrink-0"></div>
              <span class="text-sm text-fiori-text truncate">${area}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'Sede',
        field: 'employeeLocation',
        minWidth: 120,
        flex: 1,
        cellRenderer: (params: any) => {
          const location = params.value || 'N/A';
          return `
            <div class="flex items-center py-1">
              <div class="w-2 h-2 bg-indigo-400 rounded-full mr-2 flex-shrink-0"></div>
              <span class="text-sm text-fiori-text truncate">${location}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'Fecha Trabajada',
        field: 'holidayWorkedDate',
        minWidth: 120,
        flex: 1,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return `
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span class="text-sm">${date.toLocaleDateString('es-ES')}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'Día Compensatorio',
        field: 'compensatoryDayOffDate',
        minWidth: 120,
        flex: 1,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return `
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 bg-green-400 rounded-full"></div>
              <span class="text-sm">${date.toLocaleDateString('es-ES')}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'Estado',
        field: 'status',
        minWidth: 100,
        flex: 1,
        cellRenderer: (params: any) => {
          const status = params.value;
          let badgeClass = '';
          let statusText = '';
          let icon = '';

          switch (status) {
            case 'P':
              badgeClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
              statusText = 'Pendiente';
              icon = 'clock';
              break;
            case 'A':
              badgeClass = 'bg-green-100 text-green-800 border-green-200';
              statusText = 'Aprobado';
              icon = 'check-circle';
              break;
            case 'R':
              badgeClass = 'bg-red-100 text-red-800 border-red-200';
              statusText = 'Rechazado';
              icon = 'x-circle';
              break;
            default:
              badgeClass = 'bg-gray-100 text-gray-800 border-gray-200';
              statusText = 'Desconocido';
              icon = 'help-circle';
          }

          return `
            <div class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badgeClass}">
              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              ${statusText}
            </div>
          `;
        }
      },
      {
        headerName: 'Creado',
        field: 'createdAt',
        minWidth: 120,
        flex: 1,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return `
            <div class="text-sm text-fiori-subtext">
              ${date.toLocaleDateString('es-ES')}
            </div>
          `;
        }
      },
      {
        headerName: 'Observaciones',
        field: 'remarks',
        minWidth: 150,
        flex: 2,
        cellRenderer: (params: any) => {
          const remarks = params.value || '';
          return `
            <div class="text-sm text-fiori-text truncate" title="${remarks}">
              ${remarks || '<span class="text-fiori-subtext italic">Sin observaciones</span>'}
            </div>
          `;
        }
      },
      {
        headerName: 'Acciones',
        field: 'actions',
        minWidth: 120,
        maxWidth: 120,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const compensatoryDay = params.data as CompensatoryDay;
          const status = compensatoryDay.status;
          
          // Solo permitir editar/eliminar si está pendiente
          const canEdit = status === 'P';
          const canDelete = status === 'P';
          
          return `
            <div class="flex items-center justify-center space-x-1 h-full">
              <button 
                class="action-btn-edit inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium transition-colors ${canEdit 
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200' 
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                }"
                ${canEdit ? '' : 'disabled'}
                title="${canEdit ? 'Editar día compensatorio' : 'No se puede editar (estado: ' + this.getStatusText(status) + ')'}"
                data-id="${compensatoryDay.id}"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button 
                class="action-btn-delete inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium transition-colors ${canDelete 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                }"
                ${canDelete ? '' : 'disabled'}
                title="${canDelete ? 'Eliminar día compensatorio' : 'No se puede eliminar (estado: ' + this.getStatusText(status) + ')'}"
                data-id="${compensatoryDay.id}"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          `;
        },
        onCellClicked: (params: any) => {
          const target = params.event.target as HTMLElement;
          const compensatoryDay = params.data as CompensatoryDay;
          
          // Buscar el botón clickeado
          const editBtn = target.closest('.action-btn-edit');
          const deleteBtn = target.closest('.action-btn-delete');
          
          if (editBtn && !editBtn.hasAttribute('disabled')) {
            this.edit(compensatoryDay);
          } else if (deleteBtn && !deleteBtn.hasAttribute('disabled')) {
            this.delete(compensatoryDay);
          }
        }
      }
    ];
  }

  /**
   * Load compensatory days from API
   */
  loadCompensatoryDays(): void {
    this.loading = true;
    
    const params: CompensatoryDayFilterParams = {
      pageNumber: this.page,
      pageSize: this.pageSize,
      ...this.currentFilters
    };

    this.compensatoryDayService.getCompensatoryDays(params).subscribe({
      next: (response: PaginatedList<CompensatoryDay>) => {
      
        this.compensatoryDays = response.items;
        this.totalCount = response.totalCount;
        this.page=response.pageNumber;
        this.pageSize=response.pageSize;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading compensatory days:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Handle AG-Grid ready event
   */
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  /**
   * Handle pagination change
   */
  onPageChangeCustom(event: PaginatorEvent) {
    this.page = event.pageNumber;
    this.pageSize = event.pageSize;
    this.totalCount = event.totalRecords;
    this.loadCompensatoryDays();
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.currentFilters = { ...this.filterForm.value };
    // Remove empty values
    Object.keys(this.currentFilters).forEach(key => {
      if (!this.currentFilters[key as keyof CompensatoryDayFilterParams]) {
        delete this.currentFilters[key as keyof CompensatoryDayFilterParams];
      }
    });
    
    this.page = 1; // Reset to first page
    this.loadCompensatoryDays();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterForm.reset();
    this.currentFilters = {};
    this.page = 1;
    this.loadCompensatoryDays();
  }

  /**
   * Handle row double click
   */
  onRowDoubleClick(event: any): void {
    const compensatoryDay = event.data as CompensatoryDay;
    this.viewDetails(compensatoryDay);
  }

  /**
   * View compensatory day details
   */
  viewDetails(compensatoryDay: CompensatoryDay): void {
    // TODO: Open details modal
    console.log('View details for:', compensatoryDay);
  }

  /**
   * Create new compensatory day
   */
  async createNew(): Promise<void> {
    console.log('🚀 Abriendo modal para crear días compensatorios...');
    
    try {
      const result = await this.modalService.open({
        title: 'Registrar Días Compensatorios',
        componentType: ModalCrearCompensatorioComponent,
        componentData: {},
        width: '1200px',
      });

      console.log('📨 Resultado del modal:', result);

      if (result && result.selectedEmployees && result.selectedEmployees.length > 0) {
       
        // Recargar datos después del registro exitoso
        this.loadCompensatoryDays();
      } else if (result === null) {
        console.log('ℹ️ Modal cancelado por el usuario');
      } else {
        console.log('⚠️ Modal cerrado sin datos válidos');
      }
    } catch (error) {
      console.error('❌ Error al abrir el modal:', error);
      this.toastService.error('Error', 'No se pudo abrir el modal de registro');
    }
  }

  /**
   * Edit compensatory day
   */
  async edit(compensatoryDay: CompensatoryDay): Promise<void> {
    this.toastService.info('info', 'Aún no esta en funcionamiento esta opción');
    // console.log('✏️ Editando día compensatorio:', compensatoryDay);
    
    // if (compensatoryDay.status !== 'P') {
    //   this.toastService.warning(
    //     'Advertencia', 
    //     'Solo se pueden editar días compensatorios en estado Pendiente'
    //   );
    //   return;
    // }

    // try {
    //   const result = await this.modalService.open({
    //     title: 'Editar Día Compensatorio',
    //     componentType: ModalCrearCompensatorioComponent,
    //     componentData: {
    //       mode: 'edit',
    //       compensatoryDay: compensatoryDay
    //     },
    //     width: '1200px',
    //   });

    //   console.log('📨 Resultado de edición:', result);

    //   if (result && result.selectedEmployees && result.selectedEmployees.length > 0) {
    //     console.log('✅ Día compensatorio editado exitosamente, recargando datos...');
        
    //     this.toastService.success(
    //       'Éxito', 
    //       'Día compensatorio actualizado correctamente'
    //     );
        
    //     // Recargar datos después de la edición exitosa
    //     this.loadCompensatoryDays();
    //   }
    // } catch (error) {
    //   console.error('❌ Error al abrir el modal de edición:', error);
    //   this.toastService.error('Error', 'No se pudo abrir el modal de edición');
    // }
  }

  /**
   * Approve compensatory day
   */
  approve(compensatoryDay: CompensatoryDay): void {
    // TODO: Implement approval logic
    console.log('Approve compensatory day:', compensatoryDay);
  }

  /**
   * Reject compensatory day
   */
  reject(compensatoryDay: CompensatoryDay): void {
    // TODO: Implement rejection logic
    console.log('Reject compensatory day:', compensatoryDay);
  }

  /**
   * Delete compensatory day
   */
  async delete(compensatoryDay: CompensatoryDay): Promise<void> {
    console.log('🗑️ Eliminando día compensatorio:', compensatoryDay);
    
    if (compensatoryDay.status !== 'P') {
      this.toastService.warning(
        'Advertencia', 
        'Solo se pueden eliminar días compensatorios en estado Pendiente'
      );
      return;
    }

     const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '350px',
      data: {
        tipo: 'danger',
        titulo: 'Eliminar usuario',
        mensaje: `¿Seguro que deseas eliminar el usuario "${compensatoryDay.employeeFullName}"?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });

   dialogRef.afterClosed().subscribe(result => {
      if (result) {
         try {
      console.log('🔄 Eliminando día compensatorio con ID:', compensatoryDay.id);
      
      // Mostrar loading
      this.loading = true;
      
      // Llamar al servicio para eliminar
      this.compensatoryDayService.deleteCompensatoryDay(compensatoryDay.id).subscribe({
        next: () => {
          console.log('✅ Día compensatorio eliminado exitosamente');
          
          this.toastService.success(
            'Éxito', 
            `Día compensatorio de ${compensatoryDay.employeeFullName} eliminado correctamente`
          );
          
          // Recargar datos después de la eliminación exitosa
          this.loadCompensatoryDays();
        },
        error: (error) => {
          console.error('❌ Error al eliminar día compensatorio:', error);
          
          let errorMessage = 'No se pudo eliminar el día compensatorio';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.toastService.error('Error', errorMessage);
          this.loading = false;
        }
      });
    } catch (error) {
      console.error('❌ Error inesperado al eliminar:', error);
      this.toastService.error('Error', 'Ocurrió un error inesperado al eliminar');
      this.loading = false;
    }
  }
    });

   
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'P': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'R': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  /**
   * Get status text
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'P': return 'Pendiente';
      case 'A': return 'Aprobado';
      case 'R': return 'Rechazado';
      default: return 'Desconocido';
    }
  }

  /**
   * Clean up component resources
   */
  ngOnDestroy(): void {
    // Clean up Flatpickr instances
    if (this.startDateInstance && typeof this.startDateInstance.destroy === 'function') {
      try {
        this.startDateInstance.destroy();
      } catch (error) {
        console.warn('Error destroying startDateInstance on destroy:', error);
      }
    }
    
    if (this.endDateInstance && typeof this.endDateInstance.destroy === 'function') {
      try {
        this.endDateInstance.destroy();
      } catch (error) {
        console.warn('Error destroying endDateInstance on destroy:', error);
      }
    }
  }
}