import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { GridOptions, ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions, createFioriGridOptionsWithDynamicResize, createFioriGridOptionsWithFullDynamicResize } from '../../../../shared/ag-grid-theme-fiori';

import { PersonnelWhitelistService } from '../../../../core/services/personnel-white-list.service';
import { ModalService } from '../../../../shared/modal/modal.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ErrorHandlerService } from '../../../../shared/services/error-handler.service';

import {
  PersonnelWhitelistDto,
  PaginationFilterPersonnelWhitelist
} from '../../../../core/models/personnel-white-list.model';
import { PaginatorEvent } from '../../../../shared/fiori-paginator/fiori-paginator.component';
import { ModalPersonnelWhitelistFormComponent } from './modal-personnel-whitelist-form/modal-personnel-whitelist-form.component';
import { ModalBulkPersonnelWhitelistComponent } from './modal-bulk-personnel-whitelist/modal-bulk-personnel-whitelist.component';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent, ModalConfirmData } from '../../../../shared/modal-confirm/modal-confirm.component';

@Component({
  selector: 'app-personnel-whitelist',
  templateUrl: './personnel-whitelist.component.html',
  styleUrls: ['./personnel-whitelist.component.css']
})
export class PersonnelWhitelistComponent implements OnInit, OnDestroy {
  
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  
  // Datos de la tabla
  whitelistData: PersonnelWhitelistDto[] = [];
  
  // AG-Grid configuration
  columnDefs: ColDef[] = [];
  rowData: PersonnelWhitelistDto[] = [];
  gridOptions: GridOptions = createFioriGridOptionsWithDynamicResize();
  private gridApi!: GridApi;
  
  
  // Paginación
  page = 1;
  pageSize = 35;
  totalCount = 0;
  
  // Filtros y estados
  filterForm!: FormGroup;
  loading = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private personnelWhitelistService: PersonnelWhitelistService,
    private modalService: ModalService,
    private toastService: ToastService,
    private errorHandler: ErrorHandlerService,
    public dialog: MatDialog
  ) {
    this.initializeForm();
    this.setupColumnDefs();
  }

  ngOnInit(): void {
    this.setupWindowMethods();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      searchTerm: [''],
      sortBy: ['employeeName'],
      isAscending: [true]
    });
  }

  private setupColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'ID Empleado',
        field: 'employeeId',
        cellClass: 'text-center font-mono',
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Nombre Empleado',
        field: 'employeeName',
        width: 450,
        maxWidth:450,
        flex: 1,
        cellClass: 'font-medium',
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Observaciones',
        field: 'remarks',
        flex: 1,
        cellRenderer: (params: any) => {
          const value = params.value;
          if (!value || value.trim() === '') {
            return '<span class="text-gray-400">Sin observaciones</span>';
          }
          return `<span class="text-sm">${value}</span>`;
        },
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Creado Por',
        field: 'createdBy',
        cellClass: 'text-sm',
        filter: 'agTextColumnFilter'
      },
      {
        headerName: 'Fecha Creación',
        field: 'createdAt',
        cellClass: 'text-sm text-center',
        cellRenderer: (params: any) => this.formatDate(params.value),
        filter: 'agDateColumnFilter'
      },
      {
        headerName: 'Acciones',
       
        cellClass: 'text-center',
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const deleteBtn = `<button class="inline-flex items-center px-2 py-1 text-xs font-medium text-fiori-error bg-white border border-fiori-error rounded hover:bg-fiori-error hover:text-white transition-colors" onclick="window.deletePersonnelWhitelist(${params.node.rowIndex})" title="Eliminar">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>`;
          
          return `<div class="flex items-center justify-center">${deleteBtn}</div>`;
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.autoSizeColumns();
  }

  private autoSizeColumns(): void {
    if (this.gridApi) {
      const allColumnIds: string[] = [];
      this.gridApi.getColumns()?.forEach((column: any) => {
        allColumnIds.push(column.getId());
      });
      this.gridApi.autoSizeColumns(allColumnIds, false);
    }
  }

  // Cargar datos
  loadData(): void {
    this.loading = true;
    
    const filters = this.prepareFilters();

    this.personnelWhitelistService.getWhitelists(filters)
      .pipe(
        finalize(() => this.loading = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          if (response && response.items) {
            this.whitelistData = response.items;
            this.rowData = response.items;
            this.totalCount = response.totalCount;
          } else {
            this.whitelistData = [];
            this.rowData = [];
            this.totalCount = 0;
          }
        },
        error: (error) => {
          this.errorHandler.handleLoadError(error, 'lista blanca de personal');
          this.whitelistData = [];
          this.rowData = [];
          this.totalCount = 0;
        }
      });
  }

  private prepareFilters(): PaginationFilterPersonnelWhitelist {
    const formValues = this.filterForm.value;
    
    return {
      pageNumber: this.page,
      pageSize: this.pageSize,
      filterText: formValues.searchTerm || null,
      sortBy: formValues.sortBy || 'employeeName',
      isAscending: formValues.isAscending !== false
    };
  }

  // Filtros
  applyFilters(): void {
    this.page = 1; // Reset to first page
    this.loadData();
  }

  clearFilters(): void {
    this.filterForm.reset({
      searchTerm: '',
      sortBy: 'employeeName',
      isAscending: true
    });
    this.page = 1;
    this.loadData();
  }

  // Paginación
  onPageChangeCustom(event: PaginatorEvent): void {
    this.page = event.pageNumber;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  // CRUD Operations
  createNew(): void {
    this.modalService.open({
      title: 'Agregar Empleado a Lista Blanca',
      componentType: ModalPersonnelWhitelistFormComponent,
      componentData: { mode: 'create' },
      width: '600px',
      height: 'auto'
    }).then(result => {
      if (result && result.success) {
        this.loadData();
        this.toastService.success('Éxito', 'Empleado agregado correctamente a la lista blanca');
      }
    }).catch(error => {
      // Modal was cancelled or error occurred
      if (error) {
        console.error('Error in create modal:', error);
      }
    });
  }

  openBulkRegistration(): void {
    this.modalService.open({
      title: 'Registro Masivo - Lista Blanca Personal',
      componentType: ModalBulkPersonnelWhitelistComponent,
      componentData: {},
      width: '90%',
      height: 'auto'
    }).then(result => {
      this.loadData();
    }).catch(error => {
      // Modal was cancelled or error occurred
      if (error) {
        console.error('Error in bulk registration modal:', error);
      }
    });
  }

  deleteItem(rowIndex: number): void {
    const selectedItem = this.whitelistData[rowIndex];
    if (!selectedItem) return;

    const dialogData: ModalConfirmData = {
      tipo: 'danger',
      titulo: 'Confirmar Eliminación',
      mensaje: `¿Está seguro de que desea eliminar a "${selectedItem.employeeName}" de la lista blanca?`,
      confirmacion: true
    };

    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loading = true;
        
        this.personnelWhitelistService.deleteWhitelist(selectedItem.id)
          .pipe(
            finalize(() => this.loading = false),
            takeUntil(this.destroy$)
          )
          .subscribe({
            next: () => {
              this.toastService.success('Éxito', 'Empleado eliminado correctamente de la lista blanca');
              this.loadData();
            },
            error: (error) => {
              this.errorHandler.handleDeleteError(error, 'empleado de la lista blanca');
            }
          });
      }
    });
  }

  // Utilidades
  private formatDate(dateString: string): string {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  // Hacer accesibles los métodos desde el cellRenderer
  private setupWindowMethods(): void {
    (window as any).deletePersonnelWhitelist = (rowIndex: number) => this.deleteItem(rowIndex);
  }
}