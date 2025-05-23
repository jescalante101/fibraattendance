import { HttpResponse } from '@angular/common/http';
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
      {
        next:(response:HttpResponse<any>)=>{
          console.log(response.body);
        this.dataEmployees = response.body.data;
        this.datosFiltrados = [...this.dataEmployees];
        this.totalRecords = response.body.totalRecords;
        dialgoRef.close();
         
           },
        error:(error)=>{
           this.dialog.open(ModalConfirmComponent, {
          data: {mensaje: error, tipo: 'error'}
        });
          dialgoRef.close();
        }
      }
    );
  }

  actualizarSeleccionados(): void {
    this.actualizarSeleccionadosLista();
  }

  getEmplArea(lst:any[]):string{
    return lst.map(item => item.areaName).join(', ');
  }

  actualizarSeleccionadosLista(): void {
    this.elementosSeleccionados = this.datosFiltrados
      .filter(item => item.seleccionado)
      .map(item => item.CantidadEmp);
  }
}