import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { PersonService } from 'src/app/core/services/person.service';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrls: ['./empleado.component.css']
})
export class EmpleadoComponent implements OnInit {
  dataEmployees: any[] = [];
  datosFiltrados: any[] = [];
  elementosSeleccionados: string[] = [];
  totalRecords: number = 0;
  pageSize: number = 15;
  pageNumber: number = 1;

  constructor(private personalService: PersonService, private dialog: MatDialog) { }

  ngOnInit() {
    this.loadEmpleados();
  }
  
  /**
   * Maneja los eventos de paginación
   */
  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1; // Sumamos 1 porque pageIndex empieza desde 0
    this.loadEmpleados();
  }

  loadEmpleados() {
    const dialgoRef = this.dialog.open(ModalLoadingComponent);    
    this.personalService.getEmpleados(this.pageNumber, this.pageSize).subscribe(
      (data) => {
        console.log(data.data);
        this.dataEmployees = data.data;
        this.datosFiltrados = [...this.dataEmployees];
        this.totalRecords = data.totalRecords;
        dialgoRef.close();
      },
      (error) => {
        this.dialog.open(ModalConfirmComponent, {
          data: {mensaje: error, tipo: 'error'}
        });
          dialgoRef.close();
      }
    );
  }

  actualizarSeleccionados(): void {
    this.actualizarSeleccionadosLista();
  }

  actualizarSeleccionadosLista(): void {
    this.elementosSeleccionados = this.datosFiltrados
      .filter(item => item.seleccionado)
      .map(item => item.CantidadEmp);
  }
}