import { Component, OnInit, ViewChild } from '@angular/core';
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
import { createFioriGridOptionsWithFullDynamicResize, localeTextFiori } from '../../../shared/ag-grid-theme-fiori';
import { PaginatorEvent } from '../../../shared/fiori-paginator/fiori-paginator.component';
import { ModalService } from '../../../shared/modal/modal.service';
import { ModalCrearCompensatorioComponent } from './modal-crear-compensatorio/modal-crear-compensatorio.component';
import { CompensatoryDayFormData } from './modal-crear-compensatorio/modal-crear-compensatorio-mock';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-compensatory-day',
  templateUrl: './compensatory-day.component.html',
  styleUrls: ['./compensatory-day.component.css']
})
export class CompensatoryDayComponent implements OnInit {
  @ViewChild('agGrid') agGrid!: any;

  // Data properties
  compensatoryDays: CompensatoryDay[] = [];
  totalCount: number = 0;
  loading: boolean = false;
  
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
    private toastService: ToastService
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
    this.gridOptions = createFioriGridOptionsWithFullDynamicResize({
      localeText: localeTextFiori,
      rowSelection: 'single',
      suppressRowClickSelection: false,
      onRowDoubleClicked: (event) => this.onRowDoubleClick(event)
    });

    this.columnDefs = this.setupColumnDefinitions();
  }

  ngOnInit(): void {
    this.loadCompensatoryDays();
  }

  /**
   * Setup AG-Grid column definitions
   */
  private setupColumnDefinitions(): ColDef[] {
    return [
      {
        headerName: 'Empleado',
        field: 'employeeFullName',
        minWidth: 200,
        flex: 2,
        cellRenderer: (params: any) => {
          const employee = params.value || 'N/A';
          const area = params.data?.employeeArea || '';
          const location = params.data?.employeeLocation || '';
          
          return `
            <div class="flex flex-col py-1">
              <div class="font-medium text-fiori-text text-sm">${employee}</div>
              ${area ? `<div class="text-xs text-fiori-subtext">${area} - ${location}</div>` : ''}
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
        this.totalCount = response.totalRecords;
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
  onPageChange(event: PaginatorEvent): void {
    this.page = event.pageNumber;
    this.pageSize = event.pageSize;
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
    try {
      const result = await this.modalService.open({
        title: 'Registrar Días Compensatorios',
        componentType: ModalCrearCompensatorioComponent,
        componentData: {},
        width: '1200px',
        
      });

      if (result) {
        const formData = result as CompensatoryDayFormData;
        console.log('Datos del modal:', formData);
        
        this.toastService.success(
          'Éxito', 
          `Se registraron ${formData.selectedEmployees.length} día(s) compensatorio(s) para el área ${formData.areaName}`
        );
        
        // Recargar datos después del registro exitoso
        this.loadCompensatoryDays();
      }
    } catch (error) {
      console.error('Error al abrir modal de creación:', error);
      this.toastService.error('Error', 'No se pudo abrir el formulario de registro');
    }
  }

  /**
   * Edit compensatory day
   */
  edit(compensatoryDay: CompensatoryDay): void {
    // TODO: Open edit modal
    console.log('Edit compensatory day:', compensatoryDay);
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
  delete(compensatoryDay: CompensatoryDay): void {
    // TODO: Implement delete logic with confirmation
    console.log('Delete compensatory day:', compensatoryDay);
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
}