import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { DeviceService } from 'src/app/core/device.service';
import { ModalAlertaComponent } from 'src/app/shared/modal-alerta/modal-alerta.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';



@Component({
  selector: 'app-dispositivo',
  templateUrl: './dispositivo.component.html',
  styleUrls: ['./dispositivo.component.css']
})
export class DispositivoComponent implements OnInit {

  devices: any[] = []; // Propiedad para almacenar los datos
  errorMessage: string = '';
  currentPage=1;
  isLoading=false;

  isModalVisible: boolean = false;
  modalTitle: string = 'Información';
  modalMessage: string = '';
  dataEspecifica: string = 'Algún valor importante.';
  datosParaMostrar: any = { nombre: 'Juan', edad: 30 }; // Tus datos


  mostrarModal(): void {
    
    console.log('Se ha llamado a mostrarModal()'); // Para depuración
    this.modalTitle = 'Detalles del Usuario';
    this.modalMessage = `Nombre: ${this.datosParaMostrar.nombre}, Edad: ${this.datosParaMostrar.edad}`;
    this.isModalVisible = true; // <--- Aquí se hace visible el modal


  }

  onModalClosed(result: boolean): void {
    console.log('Modal cerrado con resultado:', result);
    this.isModalVisible = false; // <--- Aquí se oculta el modal
  }

  onModalConfirmed(): void {
    console.log('Modal confirmado');
    // Realizar acciones al confirmar
  }

  constructor(private deviceService: DeviceService,private dialog:MatDialog){
    
  }



  
  datosFiltrados: any[] = [];
  filtros: string[] = ['', '', '', '', '', '', '', '', '', '', '', '']; // Un filtro por columna
  elementosSeleccionados: string[] = [];
  filtroFechaInicio: string | null = null;
  filtroFechaFin: string | null = null;

  verifyDevice(ipAddress:string,idTerminal:number){
    const dialgoRef=this.dialog.open(ModalLoadingComponent);

    this.deviceService.verifyConnectionDevice(idTerminal,ipAddress).subscribe(
      (data)=>{
        this.dialog.open(ModalConfirmComponent,{
          data:{mensaje:data.message,tipo:'success'}
        });
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
  
  loadDataDevice(ipAddress:string){
    const dialogRef=this.dialog.open(ModalLoadingComponent)

    this.deviceService.loadTransactionDevice(ipAddress,4370).subscribe(
      (data)=>{
       console.log(data);
       this.dialog.open(ModalAlertaComponent,{
        data:{field:data}
       });
       dialogRef.close();
      },
      (error)=>{
        this.dialog.open(ModalAlertaComponent,{
          data:{mensaje:error}
        });
        dialogRef.close();
      }
    );

  }

 
  loadDevices(): void {

    const dialogRef=this.dialog.open(ModalLoadingComponent);
    this.isLoading=true;
    this.deviceService.getDevicesByPage(this.currentPage).subscribe(
      (data) => {
        this.devices = data;
        console.log(data);
        this.isLoading=false // Asigna los datos recibidos a la propiedad del componente
      },
      (error) => {
        this.errorMessage = 'Error al cargar los dispositivos.';
        console.error(error);
        // Manejar el error apropiadamente (mostrar mensaje al usuario)
      }
    );
    dialogRef.close();
}

  ngOnInit(): void {
    this.loadDevices()
    this.datosFiltrados = [...this.devices];
    console.log(this.datosFiltrados); // Inicializa con todos los datos
  }

  filtrarTabla(event: any): void {
    const filtroTexto = event.target.value.toLowerCase();
    const columnIndex = parseInt(event.target.dataset['column']);
    this.filtros[columnIndex] = filtroTexto;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.datosFiltrados = this.devices.filter(item => {
      return this.filtros.every((filtro, index) => {
        if (!filtro) {
          return true; // Si el filtro está vacío, la fila siempre pasa
        }
        const valorCelda = Object.values(item)[index]?.toString().toLowerCase() || '';
        return valorCelda.includes(filtro);
      });
    });
   // this.actualizarSeleccionadosLista(); // Mantener la lista de seleccionados al filtrar
  }
  filtrarPorFecha(): void {
    this.aplicarFiltros();
  }
filtrarPorRangoFecha(fechaUltimaActividad: string): boolean {
    if (!this.filtroFechaInicio && !this.filtroFechaFin) {
      return true; // No hay filtros de fecha, todas las fechas pasan
    }

    const fechaActividad = new Date(fechaUltimaActividad);
    const fechaInicio = this.filtroFechaInicio ? new Date(this.filtroFechaInicio) : null;
    const fechaFin = this.filtroFechaFin ? new Date(this.filtroFechaFin) : null;

    if (fechaInicio && fechaFin) {
      return fechaActividad >= fechaInicio && fechaActividad <= fechaFin;
    } else if (fechaInicio) {
      return fechaActividad >= fechaInicio;
    } else if (fechaFin) {
      return fechaActividad <= fechaFin;
    }

    return true; // Caso por defecto si algo sale mal con los filtros de fecha
  }

  // seleccionarTodos(): void {
  //   this.datosFiltrados.forEach(item => item.seleccionado = true);
  //   this.actualizarSeleccionadosLista();
  // }

  // deseleccionarTodos(): void {
  //   this.datosFiltrados.forEach(item => item.seleccionado = false);
  //   this.actualizarSeleccionadosLista();
  // }

  // actualizarSeleccionados(): void {
  //   this.actualizarSeleccionadosLista();
  // }

  // actualizarSeleccionadosLista(): void {
  //   this.elementosSeleccionados = this.datosFiltrados
  //     .filter(item => item.seleccionado)
  //     .map(item => item['Numero de Serie']);
  // }

}
