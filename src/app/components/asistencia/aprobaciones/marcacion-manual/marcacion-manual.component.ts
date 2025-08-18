import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';
import { ApiResponse } from 'src/app/core/models/api-response.model';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { NuevaMarcacionManualComponent } from './nueva-marcacion-manual/nueva-marcacion-manual.component';
import { EditarMarcionManualComponent } from './editar-marcion-manual/editar-marcion-manual.component';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-marcacion-manual',
  templateUrl: './marcacion-manual.component.html',
  styleUrls: ['./marcacion-manual.component.css']
})
export class MarcacionManualComponent implements OnInit {
  marcacionesManuales: AttManualLog[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Paginación
  pageNumber: number = 1;
  pageSize: number = 50;
  totalRecords: number = 0;
  
  // Por defecto, mostrar todas las marcaciones (employeeId = 0 o null)
  employeeId: string = "";

  // Hacer Math disponible en el template
  Math = Math;

  filtroNroDoc: string = '';
  
  private successTimeout: any;
  private toastCounter = 0;

  // AG-Grid Configuration
  @ViewChild('agGrid', { static: false }) agGrid!: AgGridAngular;
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridOptions: GridOptions = {
    ...createFioriGridOptions(),
    suppressHorizontalScroll: false,
    rowSelection: 'multiple',
    rowHeight: 50,
    headerHeight: 50,
    pagination: false // Usar paginación externa
  };

  constructor(
    private attManualLogService: AttManualLogService,
    private modalService: ModalService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initializeGrid();
    this.loadMarcacionesManuales();
  }

  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: 'NRO DOC',
        field: 'nroDoc',
        width: 120,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          return `<span class="text-sm font-medium text-fiori-text">${params.value}</span>`;
        }
      },
      {
        headerName: 'PERSONAL',
        field: 'fullName',
        width: 350,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          const item = params.data;
          return `
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-fiori-primary/10 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-fiori-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div>
                <div class="text-sm font-medium text-fiori-text">${item.fullName || '-'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        headerName: 'FECHA',
        field: 'punchDate',
        flex: 1,
        minWidth: 120,
        valueGetter: (params: any) => {
          const date = new Date(params.data.punchTime);
          return date.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' });
        },
        cellRenderer: (params: ICellRendererParams) => {
          return `
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-fiori-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span class="text-sm font-medium text-fiori-text">${params.value}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'HORA',
        field: 'punchHour',
        flex: 1,
        minWidth: 120,
        valueGetter: (params: any) => {
          const date = new Date(params.data.punchTime);
          return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        },
        cellRenderer: (params: ICellRendererParams) => {
          return `
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-fiori-text">${params.value}</span>
            </div>
          `;
        }
      },
      {
        headerName: 'ESTADO',
        field: 'punchState',
        flex: 1,
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const isEntry = params.value === 0;
          const bgClass = isEntry ? 'bg-fiori-success/10 text-fiori-success border-fiori-success/20' : 'bg-fiori-error/10 text-fiori-error border-fiori-error/20';
          const text = isEntry ? 'Entrada' : 'Salida';
          return `
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${bgClass}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isEntry ? 'M11 16l-4-4m0 0l4-4m-4 4h14' : 'M17 16l4-4m0 0l-4-4m4 4H7'}"></path>
              </svg>
              ${text}
            </span>
          `;
        }
      },
      {
        headerName: 'MOTIVO',
        field: 'applyReason',
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams) => {
          return `<span class="text-sm text-fiori-text">${params.value || '-'}</span>`;
        }
      },
      {
        headerName: 'APLICADO',
        field: 'applyTime',
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.value) {
            const date = new Date(params.value);
            const formatted = date.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + 
                             date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
            return `
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path>
                </svg>
                <span class="text-sm text-fiori-text">${formatted}</span>
              </div>
            `;
          }
          return '<span class="text-sm text-fiori-subtext italic">No aplicado</span>';
        }
      },
      {
        headerName: 'AUDITADO',
        field: 'auditTime',
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.value) {
            const date = new Date(params.value);
            const formatted = date.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + 
                             date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
            return `
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-fiori-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                <span class="text-sm text-fiori-text">${formatted}</span>
              </div>
            `;
          }
          return '<span class="text-sm text-fiori-subtext italic">No auditado</span>';
        }
      },
      {
        headerName: 'ACCIONES',
        field: 'actions',
        width: 120,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams) => {
          return `
            <div class="flex items-center gap-2">
              <button class="ag-btn-edit inline-flex items-center px-2 py-1 text-sm bg-fiori-surface border border-fiori-border rounded-lg hover:bg-fiori-hover hover:border-fiori-primary transition-all duration-200 group" 
                      data-id="${params.data.manualLogId}" title="Editar marcación">
                <svg class="w-4 h-4 text-fiori-primary group-hover:text-fiori-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="ag-btn-delete inline-flex items-center px-2 py-1 text-sm bg-fiori-surface border border-fiori-border rounded-lg hover:bg-fiori-error/10 hover:border-fiori-error transition-all duration-200 group" 
                      data-item='${JSON.stringify(params.data)}' title="Eliminar marcación">
                <svg class="w-4 h-4 text-fiori-error group-hover:text-fiori-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          `;
        }
      }
    ];
  }

  loadMarcacionesManuales() {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    
    this.attManualLogService.getManualLogs(this.filtroNroDoc, this.pageNumber, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: ApiResponse<AttManualLog[]>) => {
          if (response.exito) {
            const items = Array.isArray(response.data.items[0]) 
              ? (response.data.items[0] as unknown) as AttManualLog[]
              : (response.data.items as unknown) as AttManualLog[];
            this.marcacionesManuales = items;
            this.rowData = [...items];
            this.totalRecords = response.data.totalCount;
            this.successMessage = 'Datos cargados correctamente';
            this.autoHideSuccess();
            this.setupEventListeners();
          } else {
            this.errorMessage = response.mensaje || 'Error al cargar los datos';
            this.marcacionesManuales = [];
            this.rowData = [];
          }
        },
        error: (error) => {
          console.error('Error al cargar marcaciones manuales:', error);
          this.errorMessage = 'Error de conexión al cargar los datos';
          this.marcacionesManuales = [];
          this.rowData = [];
        }
      });
  }

  setupEventListeners(): void {
    setTimeout(() => {
      // Event delegation for edit buttons
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const editBtn = target.closest('.ag-btn-edit') as HTMLElement;
        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          if (id) {
            this.editarMarcacionManual(parseInt(id));
          }
        }

        // Event delegation for delete buttons
        const deleteBtn = target.closest('.ag-btn-delete') as HTMLElement;
        if (deleteBtn) {
          const itemData = deleteBtn.getAttribute('data-item');
          if (itemData) {
            const item = JSON.parse(itemData);
            this.deleteMarcacionManual(item);
          }
        }
      });
    }, 100);
  }

  registrarNuevaMarcacionManual() {
    this.modalService.open({
      title: 'Nueva Marcación Manual',
      componentType: NuevaMarcacionManualComponent,
      componentData: {},
      width: '900px',
    }).then(result => {
      if (result) {
        // Si se guardó una nueva marcación, recargar la lista
        this.loadMarcacionesManuales();
      }
    });
  }

   
  onPageChangeCustom(event: PaginatorEvent) {
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    this.totalRecords = event.totalRecords;
    
    // Si pageSize es 0 (mostrar todos), no recargar del servidor
    // Solo actualizar los datos filtrados localmente
    if (this.pageSize === 0) {
      // No hacer nada, los datos ya están filtrados
      return;
    } else {
      // Comportamiento normal: recargar datos del servidor
      this.loadMarcacionesManuales();
    }
  }

  onPageSizeChange(pageSize: number) {
    this.pageSize = pageSize;
    this.pageNumber = 1; // Reset a la primera página
    this.loadMarcacionesManuales();
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  buscarPorNroDoc() {
    this.pageNumber = 1;
    this.loadMarcacionesManuales();
  }

  limpiarFiltro() {
    this.filtroNroDoc = '';
    this.pageNumber = 1;
    this.loadMarcacionesManuales();
  }

  autoHideSuccess() {
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
    this.successTimeout = setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  editarMarcacionManual(id: number) {
    this.modalService.open({
      title: 'Editar Marcación Manual',
      componentType: EditarMarcionManualComponent,
      componentData: id ,
      width: '500px',
      height: 'auto'
    }).then(result => {
      if (result) {
        this.loadMarcacionesManuales();
      }
    });
  }
  // delete
  deleteMarcacionManual(log: AttManualLog) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '350px',
      data: {
        tipo: 'danger',
        titulo: 'Eliminar usuario',
        mensaje: `¿Seguro que deseas eliminar el usuario "${log.nroDoc}"?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.attManualLogService.deleteManualLog(log.manualLogId).subscribe({
          next: _ => {
            this.showToast('success', 'Usuario eliminado', `El usuario "${log.nroDoc}" ha sido eliminado correctamente.`);
            this.loadMarcacionesManuales();
          },
          error: (error) => {
            this.showToast('error', 'Error al eliminar', 'No se pudo eliminar el usuario. Inténtalo de nuevo.');
            console.error('Error deleting user:', error);
          }
        });
      }
    });
  }

   // Método para mostrar Toast notifications
  private showToast(type: ToastConfig['type'], title: string, message: string, duration: number = 5000) {
    const toastId = `toast-${++this.toastCounter}`;
    const toast: ToastConfig = { id: toastId, type, title, message, duration };
    
    // Crear el elemento toast
    const toastElement = this.createToastElement(toast);
    const container = document.getElementById('toast-container');
    
    if (container) {
      container.appendChild(toastElement);
      
      // Mostrar con animación
      setTimeout(() => {
        toastElement.classList.add('translate-x-0');
        toastElement.classList.remove('translate-x-full');
      }, 100);
      
      // Auto-remove después del duration
      setTimeout(() => {
        this.removeToast(toastId);
      }, duration);
    }
  }

  private createToastElement(toast: ToastConfig): HTMLElement {
    const toastDiv = document.createElement('div');
    toastDiv.id = toast.id;
    toastDiv.className = `flex items-center w-full max-w-xs p-4 mb-4 text-fiori-text bg-fiori-surface rounded-lg shadow-fioriHover transform translate-x-full transition-transform duration-300 ease-in-out border border-fiori-border`;
    
    // Configurar colores según el tipo
    const typeClasses = {
      success: 'text-fiori-success',
      error: 'text-fiori-error',
      warning: 'text-fiori-warning',
      info: 'text-fiori-info'
    };
    
    const iconNames = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info'
    };
    
    toastDiv.innerHTML = `
      <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 ${typeClasses[toast.type]} rounded-lg">
        <lucide-icon name="${iconNames[toast.type]}" class="w-5 h-5"></lucide-icon>
      </div>
      <div class="ml-3 text-sm font-normal">
        <div class="font-semibold">${toast.title}</div>
        <div class="text-fiori-subtext">${toast.message}</div>
      </div>
      <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-fiori-subtext hover:text-fiori-text rounded-lg focus:ring-2 focus:ring-fiori-primary p-1.5 hover:bg-fiori-hover inline-flex h-8 w-8" onclick="document.getElementById('${toast.id}')?.remove()">
        <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
      </button>
    `;
    
    return toastDiv;
  }

  private removeToast(toastId: string) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }

  autoSizeColumns(): void {
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.sizeColumnsToFit();
    }
  }

}

interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
