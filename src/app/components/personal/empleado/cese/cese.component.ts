import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PersonService } from 'src/app/core/services/person.service';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-cese',
  templateUrl: './cese.component.html',
  styleUrls: ['./cese.component.css']
})
export class CeseComponent implements OnInit {

  dataCeses: any[]=[];
  datosFiltrados: any[] = [];
  elementosSeleccionados: string[] = [];


  constructor(private personalService: PersonService, private dialog: MatDialog) { }

  ngOnInit() {
    this.loadCeses();
  }

  loadCeses(){
    const dialgoRef = this.dialog.open(ModalLoadingComponent);  
    this.personalService.getCeses().subscribe(
      (data) => {
        console.log(data);
        this.dataCeses = data;
        dialgoRef.close();
      },
      (error)=>{
        console.log(error);
         this.dialog.open(ModalConfirmComponent, {
                  data: {mensaje: error, tipo: 'error'}
                });
        dialgoRef.close();
      }
    );
  }

  getTipoCese(tipo: number): string{
    if(tipo == 1){
      return 'otro';
    }else if(tipo == 2){
      return 'Despido';
    }else if(tipo == 3){
      return 'Renuncia';
    }else if(tipo == 4){
      return 'Transferido';
    }else if(tipo == 5){
      return 'Trabajo sin Salario';
    }else{
      return 'Desconocido';
    }
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
