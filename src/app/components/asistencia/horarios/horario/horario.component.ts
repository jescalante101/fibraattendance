import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';
import { NuevoHorarioComponent } from './nuevo-horario/nuevo-horario.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { FixedSizeVirtualScrollStrategy } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-horario',
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit {

  dataHorarios: any[] = [];

  totalRecords: number = 0;
  pageSize: number = 15;
  pageNumber: number = 1;



  constructor(private service: AttendanceService,private dialog:MatDialog,) { }

  ngOnInit() {
    this.loadHoraiosData();
  }

  loadHoraiosData(){
    const loadinngRef=this.dialog.open(ModalLoadingComponent);
    this.service.getHorarios(this.pageNumber,this.pageSize).subscribe(
      (data)=>{
        console.log(data);
        this.dataHorarios=data.data;
        this.totalRecords=data.totalRecords;
        loadinngRef.close();
      },
      (error)=>{
        console.log(error);
        
        alert("Error al cargar los datos");
        loadinngRef.close();
      }
    )
  }
  
    


   handlePageEvent(event: PageEvent): void {
      this.pageSize = event.pageSize;
      this.pageNumber = event.pageIndex + 1; // Sumamos 1 porque pageIndex empieza desde 0
      this.loadHoraiosData();
    }
    // Método para abrir el modal de nuevo horario
    abrirModalNuevoHorario(mode:number): void {
      console.log('Abrir modal para nuevo horario');
      const dialogConfig = new MatDialogConfig();
        
        dialogConfig.hasBackdrop = true; 
        dialogConfig.data= {use_mode:mode}  // Asegura que haya un fondo oscuro
        dialogConfig.backdropClass = 'backdrop-modal'; // Clase personalizada para el fondo
        const dialogRef = this.dialog.open(NuevoHorarioComponent,dialogConfig);

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            if(result.id){
              this.loadHoraiosData();
              this.dialog.open(ModalConfirmComponent, {
                data: {
                  tipo: 'success',
                  mensaje: 'El horario se guardó correctamente.'
                }
              });
            }
            
            
            console.log('Horario Creado:', result.id);
          
          }
        });
    }
    // Método para abrir el modal de edición
    editarHorario(idHorario:number,use_mode:number){
      console.log('Abrir modal para Editar horario');
      const dialogConfig = new MatDialogConfig();
        dialogConfig.hasBackdrop = true;
        dialogConfig.backdropClass = 'backdrop-modal';
        dialogConfig.data= {idHorario:idHorario,use_mode:use_mode}// Clase personalizada para el fondo
        const dialogRef = this.dialog.open(NuevoHorarioComponent,dialogConfig);
        dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if(result.id){
              this.loadHoraiosData();
              this.dialog.open(ModalConfirmComponent, {
                width: '400px',
                height: '200px',
                hasBackdrop: true,
                backdropClass: 'backdrop-modal',
                data: {
                  tipo: 'success',
                  mensaje: 'El horario se guardó correctamente.'
                }
              });
            }
        console.log('Horario Creado:', result);
       
      }
    });
    }


    // Método para eliminar un horario
    eliminarHorario(idHorario: number) {
     this.service.deleteHorario(idHorario).subscribe({
          next: (response) => {
            console.log('Horario eliminado:', response);
            this.loadHoraiosData();
          },
          error: (error) => {
            console.error('Error al eliminar horario:', error);
          }
        });
    }
    // Método para abrir el modal de confirmación
    openConfirmationDialog(idHorario: number) {
     const dialogRef = this.dialog.open(ModalConfirmComponent, {
        width: '400px',
        height: '200px',
        hasBackdrop: true,
        backdropClass: 'backdrop-modal',
        data: {
          tipo: 'danger',
          titulo: '¿Eliminar horario?',
          mensaje: '¿Estás seguro de que deseas eliminar este horario? Esta acción no se puede deshacer.',
          confirmacion: true,
          textoConfirmar: 'Eliminar'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // El usuario confirmó
          this.eliminarHorario(idHorario);
        }
      });
    }
  
    

}
