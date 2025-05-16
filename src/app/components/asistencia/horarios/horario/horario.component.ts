import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-horario',
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit {

  dataHorarios: any[] = [];


  constructor(private service: AttendanceService,private dialog:MatDialog,) { }

  ngOnInit() {
    this.loadHoraiosData();
  }

  loadHoraiosData(){
    const loadinngRef=this.dialog.open(ModalLoadingComponent);
    this.service.getHorarios().subscribe(
      (data)=>{
        console.log(data);
        this.dataHorarios=data;
        loadinngRef.close();
      },
      (error)=>{
        console.log(error);
        
        alert("Error al cargar los datos");
        loadinngRef.close();
      }
    )
  }

  


  timeToMinutes(time: string): number {
    //const ho=this.extraerHoraConPipe(time);
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  ExtraerHoraDeFecha(fechaHora: string ): string {
    //extrar la hora de la fecha que tiene el formato 1900-01-01T09:00:00
    const fecha = new Date(fechaHora);
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    const segundos = fecha.getSeconds();
    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  calcularHoraSalida(horaIngreso: string, tiempoTrabajoMinutos: number): string {
  const horaIngresoCorta = horaIngreso.substring(0, 5);
  const minutosIngreso = this.timeToMinutes(horaIngresoCorta);
  const minutosSalida = minutosIngreso + tiempoTrabajoMinutos;
  const horaSalida = this.minutesToTime(minutosSalida);
  
  if (horaIngreso.length > 5) {
    const segundos = horaIngreso.substring(5);
    return horaSalida + segundos;
  }
  
  return horaSalida;
}


  
    

}
