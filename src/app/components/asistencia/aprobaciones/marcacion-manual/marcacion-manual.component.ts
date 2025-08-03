import { Component, OnInit } from '@angular/core';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';
import { ApiResponse } from 'src/app/core/models/api-response.model';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { NuevaMarcacionManualComponent } from './nueva-marcacion-manual/nueva-marcacion-manual.component';
import { EditarMarcionManualComponent } from './editar-marcion-manual/editar-marcion-manual.component';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';

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

  constructor(
    private attManualLogService: AttManualLogService,
    private modalService: ModalService
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
}
