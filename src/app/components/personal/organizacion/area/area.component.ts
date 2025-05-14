import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PersonService } from 'src/app/core/services/person.service';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-area',
  templateUrl: './area.component.html',
  styleUrls: ['./area.component.css']
})
export class AreaComponent implements OnInit {

  
  dataAreas:any[]=[]

  datosFiltrados: any[] = [];
  elementosSeleccionados: string[] = [];


  constructor(private personalService: PersonService, private dialog:MatDialog) { }

  ngOnInit() {
    this.datosFiltrados = [...this.dataAreas]; 
  }

  loadPositions(){
       const dialgoRef=this.dialog.open(ModalLoadingComponent);
              
                  this.personalService.getPositions().subscribe(
                    (data)=>{
                      console.log(data);
                      this.dataAreas=data;
                      dialgoRef.close();
                    },
                    (error)=>{
                      this.dialog.open(ModalConfirmComponent,{
                        data:{mensaje:error,tipo:'error'}
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
