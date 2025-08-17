import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PersonService } from 'src/app/core/services/person.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';

@Component({
  selector: 'app-personal',
  templateUrl: './personal.component.html',
  styleUrls: ['./personal.component.css']
})
export class PersonalComponent implements OnInit {

  dataCompany: any[] = [];
  loading = false;
  
  // ag-Grid configuration
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = createFioriGridOptions();
  gridApi: any;
  
  // Column Manager
  tableColumns: ColumnConfig[] = [
    { key: 'companyCode', label: 'RUC', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'companyName', label: 'Nombre', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'country', label: 'País', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'city', label: 'Ciudad', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'fax', label: 'Fax', visible: false, required: false, sortable: true, type: 'text' },
    { key: 'state', label: 'Provincia', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'email', label: 'Correo Electrónico', visible: true, required: false, sortable: true, type: 'email' },
    { key: 'phone', label: 'Teléfono', visible: true, required: false, sortable: true, type: 'phone' },
    { key: 'postalCode', label: 'Código Postal', visible: false, required: false, sortable: true, type: 'text' },
    { key: 'cantidadDepartamentos', label: '# Departamentos', visible: true, required: false, sortable: true, type: 'number' },
    { key: 'address', label: 'Dirección', visible: false, required: false, sortable: true, type: 'text' },
    { key: 'actions', label: 'Acciones', visible: true, required: true, sortable: false, type: 'actions' }
  ];
  
  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas - Empresas'
  };

  constructor(private deviceService: PersonService,private dialog:MatDialog) { }

  ngOnInit() {
    this.setupAgGrid();
    this.loadData();
  }

  loadData(){
    this.loading = true;
    const dialgoRef=this.dialog.open(ModalLoadingComponent);
    
    this.deviceService.getListCompany().subscribe(
      (data)=>{
        console.log(data);
        this.dataCompany=data;
        this.loading = false;
        
        // Update ag-Grid data
        if (this.gridApi) {
          this.gridApi.setRowData(this.dataCompany);
        }
        
        dialgoRef.close();
      },
      (error)=>{
        this.loading = false;
        this.dialog.open(ModalConfirmComponent,{
          data:{mensaje:error,tipo:'error'}
        });
        dialgoRef.close();
      }
    );
  }
  
  // === AG-GRID CONFIGURATION ===
  
  private setupAgGrid(): void {
    this.columnDefs = [
      {
        field: 'companyCode',
        headerName: 'RUC',
        minWidth: 120,
        maxWidth: 150,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center mr-2">
              <span class="text-xs font-medium text-fiori-primary">${params.value}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'companyName',
        headerName: 'Nombre',
        minWidth: 200,
        maxWidth: 300,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="text-sm font-medium text-fiori-text" title="${params.value}">${params.value}</div>
          </div>`;
        }
      },
      {
        field: 'country',
        headerName: 'País',
        minWidth: 100,
        maxWidth: 120,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-info mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'city',
        headerName: 'Ciudad',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<span class="text-sm">${params.value}</span>`;
        }
      },
      {
        field: 'fax',
        headerName: 'Fax',
        minWidth: 120,
        maxWidth: 150,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<span class="text-sm font-mono">${params.value}</span>`;
        }
      },
      {
        field: 'state',
        headerName: 'Provincia',
        minWidth: 120,
        maxWidth: 150,
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
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-info mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span class="truncate" title="${params.value}">${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'phone',
        headerName: 'Teléfono',
        minWidth: 120,
        maxWidth: 150,
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
        field: 'postalCode',
        headerName: 'Código Postal',
        minWidth: 120,
        maxWidth: 140,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<span class="text-sm font-mono">${params.value}</span>`;
        }
      },
      {
        field: 'cantidadDepartamentos',
        headerName: '# Departamentos',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          const count = params.value || 0;
          return `<div class="flex items-center justify-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-info/10 text-fiori-info">
              ${count} dept${count !== 1 ? 's' : ''}
            </span>
          </div>`;
        }
      },
      {
        field: 'address',
        headerName: 'Dirección',
        minWidth: 200,
        maxWidth: 300,
        hide: true,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-subtext">-</span>';
          return `<div class="text-sm" title="${params.value}">${params.value}</div>`;
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
            <button class="edit-btn p-2 text-fiori-primary hover:bg-fiori-primary/10 rounded transition-colors" title="Editar" >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-btn p-2 text-fiori-error hover:bg-fiori-error/10 rounded transition-colors" title="Eliminar" >
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
        
        if (button && button.classList.contains('edit-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.editCompany(rowData);
            }
          }
        } else if (button && button.classList.contains('delete-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.deleteCompany(rowData);
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
    const defaultVisibleColumns = ['companyCode', 'companyName', 'country', 'city', 'state', 'email', 'phone', 'cantidadDepartamentos', 'actions'];
    
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
  
  // === ACTIONS ===
  
  editCompany(company: any): void {
    console.log('Edit company:', company);
    // TODO: Implementar lógica de edición
  }
  
  deleteCompany(company: any): void {
    console.log('Delete company:', company);
    if (confirm(`¿Estás seguro de eliminar la empresa ${company.companyName}?`)) {
      // TODO: Implementar lógica de eliminación
    }
  }
  
  newCompany(): void {
    console.log('New company');
    // TODO: Implementar lógica para nueva empresa
  }
  
  deleteSelected(): void {
    console.log('Delete selected companies');
    // TODO: Implementar lógica para eliminar seleccionados
  }

}
