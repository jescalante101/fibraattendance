

import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ModalNuevoTurnoComponent } from './modal-nuevo-turno/modal-nuevo-turno.component';

@Component({
  selector: 'app-turno',
  templateUrl: './turno.component.html',
  styleUrls: ['./turno.component.css']
})
export class TurnoComponent implements OnInit {

  dataHorarios: Shift[] = [];

  totalRecords: number = 0;
  pageSize: number = 15;
  pageNumber: number = 1;
  datosSeleccionado: any[] = [];

  constructor(private service: ShiftsService, private modalService: ModalService) { }

  ngOnInit() {
    this.loadTurnosData();
  }

  updateThorarioSelect(select: any[]) {
    console.log(select);
    this.datosSeleccionado = select;
  }

  loadTurnosData() {
    // Si quieres mostrar un loading, puedes implementar tu propio modal de loading genérico aquí
    this.service.getShifts(this.pageNumber, this.pageSize).subscribe(
      (data) => {
        console.log(data);
        this.dataHorarios = data.data;
        this.totalRecords = data.totalRecords;
      },
      (error) => {
        console.log(error);
        alert("Error al cargar los datos");
      }
    );
  }

  getAreas(horario: any[]): string {
    // Extrae los alias únicos
    const aliasUnicos = Array.from(new Set(horario.map(item => item.alias)));
    return aliasUnicos.join(', ');
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
    this.modalService.open({
      title: 'Nuevo Turno',
      componentType: ModalNuevoTurnoComponent,
      componentData: {},
      width: '900px'
    }).then(result => {
      if (result) {
        console.log('Turno creado:', result);
        this.loadTurnosData();
      }
    });
  }
}
