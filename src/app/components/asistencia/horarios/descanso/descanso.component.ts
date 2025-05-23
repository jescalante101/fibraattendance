import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { NuevoDescansoComponent } from './nuevo-descanso/nuevo-descanso.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';

@Component({
  selector: 'app-descanso',
  templateUrl: './descanso.component.html',
  styleUrls: ['./descanso.component.css']
})
export class DescansoComponent implements OnInit {
  // Variables for data
  dataDescansos: any[] = [];
  
  // Variables for pagination
  totalRecords: number = 0;
  pageSize: number = 10;
  pageNumber: number = 1;

  constructor(private attendanceService: AttendanceService,private dialog:MatDialog) { }

  ngOnInit() {
    this.loadDescansos();
  }

  loadDescansos() {
    this.attendanceService.getDescansos(this.pageNumber, this.pageSize).subscribe({
      next: (response: any) => {
        console.log('Response:', response);
        if (response) {
          this.dataDescansos = response.data || [];
          this.totalRecords = response.totalRecords || 0;
        }
      },
      error: (error) => {
        console.error('Error loading descansos:', error);
      }
    });
  }

calcularHoraFin(horaInicio: string, duracionEnMinutos: number): string {
    if (!horaInicio || isNaN(duracionEnMinutos)) {
      return '';
    }

    // Convertir la hora de inicio en minutos desde medianoche
    const [horas, minutos, segundos] = horaInicio.split(':').map(Number);
    let totalMinutosInicio = horas * 60 + minutos;

    // Añadir la duración
    let totalMinutosFin = totalMinutosInicio + duracionEnMinutos;

    // Asegurar que no pase las 24 horas
    totalMinutosFin = totalMinutosFin % (24 * 60);

    // Convertir de vuelta a formato HH:mm:ss
    const horasFin = Math.floor(totalMinutosFin / 60);
    const minutosFin = totalMinutosFin % 60;

    return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  handlePageEvent(event: PageEvent) {
    this.pageNumber = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadDescansos();
  }

  /**
   * Extrae solo la parte de la hora de una fecha ISO en formato string
   * @param isoDateString Fecha en formato ISO (ej: "1900-01-01T23:30:00")
   * @returns String con formato "HH:mm:ss"
   */
  extraerHora(isoDateString: string): string {
    if (!isoDateString) {
      return '';
}

    try {
      // Crear un objeto Date a partir del string ISO
      const fecha = new Date(isoDateString);

      // Extraer las horas, minutos y segundos
      const horas = fecha.getHours().toString().padStart(2, '0');
      const minutos = fecha.getMinutes().toString().padStart(2, '0');
      const segundos = fecha.getSeconds().toString().padStart(2, '0');

      // Devolver en formato HH:mm:ss
      return `${horas}:${minutos}:${segundos}`;
    } catch (error) {
      console.error('Error al extraer hora:', error);
      return '';
    }
  }


  //Metodo para abrir un modal y registrar un nuevo descanso
  //vamos a abrir NuevoDescansoComponent
  openModalNuevoDescanso() {
    this.dialog.open(NuevoDescansoComponent, {
     
      hasBackdrop: true,
      backdropClass: 'backdrop-modal', // Clase personalizada para el fondo
      data: {
         id:0
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        // Aquí puedes manejar el resultado del modal
        console.log('Resultado del modal:', result);
        // Recargar los descansos después de cerrar el modal
        this.loadDescansos();
      }
      
    });
    console.log('Abrir modal para nuevo descanso');
  }

  //Metodo para abrir un modal y editar un descanso
  //vamos a abrir NuevoDescansoComponent
  openModalEditarDescanso(idDescanso: number) {
    this.dialog.open(NuevoDescansoComponent, {
      hasBackdrop: true,
      backdropClass: 'backdrop-modal', // Clase personalizada para el fondo
      data: {
        id: idDescanso
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        if (result.mensaje) {
          console.log('Resultado del modal:', result);
          this.loadDescansos();
           this.dialog.open(ModalConfirmComponent, {
                data: {
                  tipo: 'success',
                  mensaje: 'El Descanso se guardó correctamente.'
                }
              });
        }else{
          this.dialog.open(ModalConfirmComponent, {
            data: {
              tipo: 'error',
              mensaje: 'Error al guardar el descanso.'
            }
          });
        }
        
      }
      
    });
    console.log('Abrir modal para editar descanso');
  }

  //metedo para eliminar un descanso
  eliminarDescanso(idDescanso: number) {
    this.attendanceService.deleteDescanso(idDescanso).subscribe({
      next: (response) => {
        console.log('Descanso eliminado:', response);
        this.loadDescansos();
        this.dialog.open(ModalConfirmComponent, {
          data: {
            tipo: 'success',
            mensaje: 'El Descanso se eliminó correctamente.'
          }
        });
      },
      error: (error) => {
        console.error('Error al eliminar descanso:', error);
        this.dialog.open(ModalConfirmComponent, {
          data: {
            tipo: 'error',
            mensaje: 'Error al eliminar el descanso.'
          }
        });
      }
    });
  }

   openConfirmationDialog(idDescanso: number) {
     const dialogRef = this.dialog.open(ModalConfirmComponent, {
        width: '400px',
        height: '200px',
        hasBackdrop: true,
        backdropClass: 'backdrop-modal',
        data: {
          tipo: 'danger',
          titulo: '¿Eliminar Descanso?',
          mensaje: '¿Estás seguro de que deseas eliminar este Descanso? Esta acción no se puede deshacer.',
          confirmacion: true,
          textoConfirmar: 'Eliminar'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // El usuario confirmó
          this.eliminarDescanso(idDescanso);
        }
      });
    }


}
