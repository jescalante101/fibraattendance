

import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';
import { ModalNuevoTurnoComponent } from './modal-nuevo-turno/modal-nuevo-turno.component';

@Component({
  selector: 'app-turno',
  templateUrl: './turno.component.html',
  styleUrls: ['./turno.component.css']
})
export class TurnoComponent implements OnInit {

  dataHorarios: any[] = [];

  totalRecords: number = 0;
  pageSize: number = 15;
  pageNumber: number = 1;
  datosSeleccionado: any[]=[];

  constructor(private service: AttendanceService, private dialog: MatDialog) { }

  ngOnInit() {
    this.loadTurnosData();
  }

   updateThorarioSelect(select:any[]){
    console.log(select);
    this.datosSeleccionado=select;
  }

  loadTurnosData() {
    const loadingRef = this.dialog.open(ModalLoadingComponent);
    this.service.getTurnos(this.pageNumber, this.pageSize).subscribe(
      (data) => {
        console.log(data);
        this.dataHorarios = data.data;
        this.totalRecords = data.totalRecords;
        loadingRef.close();
      },
      (error) => {
        console.log(error);

        alert("Error al cargar los datos");
        loadingRef.close();
      }
    );
  }

  getAreas(slt:any[]):string{
    return slt.map(item => item.alias).join(', ');
  }

  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24; // Usamos el módulo 24 para manejar el cambio de día
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  ExtraerHoraDeFecha(fechaHora: string ): string {
    const fecha = new Date(fechaHora);
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    const segundos = fecha.getSeconds();
    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  calcularHoraSalida(horaIngreso: string, tiempoTrabajoMinutos: number): string {
    const horaIngresoCorta = horaIngreso.substring(0, 5);
    const minutosIngreso = this.timeToMinutes(horaIngresoCorta);
    const minutosSalidaTotales = minutosIngreso + tiempoTrabajoMinutos;
    const horaSalida = this.minutesToTime(minutosSalidaTotales);

    if (horaIngreso.length > 5) {
      const segundos = horaIngreso.substring(5);
      return horaSalida + segundos;
    }

    return horaSalida;
  }

  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1; // Sumamos 1 porque pageIndex empieza desde 0
    this.loadTurnosData();
  }

  openNuevoTurnoModal(): void {
    const dialogConfig = new MatDialogConfig();
  dialogConfig.width = '980px';
  dialogConfig.height = '800px';
  // dialogConfig.disableClose = true;  // Evita que se cierre al hacer clic fuera
  dialogConfig.hasBackdrop = true;   // Asegura que haya un fondo oscuro
  dialogConfig.backdropClass = 'backdrop-modal'; // Clase personalizada para el fondo
    const dialogRef = this.dialog.open(ModalNuevoTurnoComponent,dialogConfig);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Turno creado:', result);
        this.loadTurnosData();
      }
    });
  }
}
