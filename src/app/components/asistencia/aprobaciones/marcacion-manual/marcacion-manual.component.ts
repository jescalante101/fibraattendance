import { Component, OnInit } from '@angular/core';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';
import { ApiResponse } from 'src/app/core/models/api-response.model';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { NuevaMarcacionManualComponent } from './nueva-marcacion-manual/nueva-marcacion-manual.component';
import { EditarMarcionManualComponent } from './editar-marcion-manual/editar-marcion-manual.component';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { MatDialog } from '@angular/material/dialog';

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
  pageSize: number = 10;
  totalRecords: number = 0;
  
  // Por defecto, mostrar todas las marcaciones (employeeId = 0 o null)
  employeeId: string = "";

  // Hacer Math disponible en el template
  Math = Math;

  filtroNroDoc: string = '';
  
  private successTimeout: any;
    private toastCounter = 0;

  constructor(
    private attManualLogService: AttManualLogService,
    private modalService: ModalService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.loadMarcacionesManuales();
  }

  loadMarcacionesManuales() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.attManualLogService.getManualLogs(this.filtroNroDoc, this.pageNumber, this.pageSize)
      .subscribe({
        next: (response: ApiResponse<AttManualLog[]>) => {
          if (response.exito) {
            const items = Array.isArray(response.data.items[0]) 
              ? (response.data.items[0] as unknown) as AttManualLog[]
              : (response.data.items as unknown) as AttManualLog[];
            this.marcacionesManuales = items;
            this.totalRecords = response.data.totalCount;
            this.successMessage = 'Datos cargados correctamente';
            this.autoHideSuccess();
          } else {
            this.errorMessage = response.mensaje || 'Error al cargar los datos';
            this.marcacionesManuales = [];
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar marcaciones manuales:', error);
          this.errorMessage = 'Error de conexión al cargar los datos';
          this.marcacionesManuales = [];
          this.isLoading = false;
        }
      });
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
    this.totalRecords=event.totalRecords
    this.loadMarcacionesManuales();
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


}

interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
