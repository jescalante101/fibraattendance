import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { DeviceService } from 'src/app/core/device.service';
import { AttendanceRecord, ModalAlertaComponent } from 'src/app/shared/modal-alerta/modal-alerta.component';
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
  


  constructor(private deviceService: DeviceService,private dialog:MatDialog){
    
  }

  currentPage:number=1;
  datosFiltrados: any[] = [];
  filtros: string[] = ['', '', '', '', '', '', '', '', '', '', '', '']; // Un filtro por columna
  elementosSeleccionados: string[] = [];
  filtroFechaInicio: string | null = null;
  filtroFechaFin: string | null = null;

  verifyDevice(ipAddress:string,idTerminal:number){
    const dialgoRef=this.dialog.open(ModalLoadingComponent);

    this.deviceService.verifyConnectionDevice(idTerminal,ipAddress).subscribe(
      (data)=>{
        console.log(data)
        // this.dialog.open(ModalConfirmComponent,{
        //   data:{mensaje:data.message,tipo:'success'}
        // });
        dialgoRef.close();
        this.loadDevices()
      },
      (error)=>{
        this.dialog.open(ModalConfirmComponent,{
          data:{mensaje:error,tipo:'error'}
        });
         dialgoRef.close();
      }
    );

  }
  
  loadDataDevice(ipAddress:string, idDevice:number){
    const dialogRef=this.dialog.open(ModalLoadingComponent,)

    this.deviceService.loadLasttransaction(ipAddress,4370,idDevice).subscribe(
      (data)=>{
       console.log(data);
       const records=data as AttendanceRecord[]
       this.dialog.open(ModalAlertaComponent,{
        width:'800px',
        height:'600px',
        data:{field:records}
       });
       dialogRef.close();
      },
      (error)=>{
        console.log("Error en : "+error.message);
        this.dialog.open(ModalConfirmComponent,{
          data:{mensaje:"Dispositivo no conectado", tipo:"error"}
        });
        dialogRef.close();
      }
    );

  }

 
  loadDevices(): void {

    const dialogRef=this.dialog.open(ModalLoadingComponent,);
    this.deviceService.getDevicesByPage(this.currentPage).subscribe(
      (data) => {
        this.devices = data;
        console.log(data); // Asigna los datos recibidos a la propiedad del componente
      },
      (error) => {
        
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
