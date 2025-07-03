import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { PersonService } from 'src/app/core/services/person.service';
import { AsignarNuevoHorarioComponent } from './asignar-nuevo-horario/asignar-nuevo-horario.component';

@Component({
  selector: 'app-asignar-horario-empleado',
  templateUrl: './asignar-horario-empleado.component.html',
  styleUrls: ['./asignar-horario-empleado.component.css']
})
export class AsignarHorarioEmpleadoComponent implements OnInit {

  constructor(
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

   filtro = '';
  page = 1;
  pageSize = 5;

  asignacionesMock = [
    {
      empleado: 'Juan Pérez Ramírez',
      turno: 'Mañana',
      semana: 25,
      fechaInicio: '2025-06-24',
      fechaFin: '2025-06-28',
      observacion: 'Horario regular',
    },
    {
      empleado: 'María López García',
      turno: 'Tarde',
      semana: 25,
      fechaInicio: '2025-06-24',
      fechaFin: '2025-06-28',
      observacion: 'Cambio temporal',
    },
    {
      empleado: 'Carlos Gómez Torres',
      turno: 'Noche',
      semana: 25,
      fechaInicio: '2025-06-24',
      fechaFin: '2025-06-28',
      observacion: 'Turno por rotación',
    },
    // Agrega más mock si deseas
  ];

  get asignacionesFiltradas() {
    return this.asignacionesMock
      .filter((a) =>
        a.empleado.toLowerCase().includes(this.filtro.toLowerCase())
      )
      .slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  editar(asignacion: any) {
    console.log('Editar asignación:', asignacion);
  }

  eliminar(asignacion: any) {
    console.log('Eliminar asignación:', asignacion);
  }

  abrirModalAsignarHorario(){
    const dialogRef = this.dialog.open(AsignarNuevoHorarioComponent, {
    disableClose: true,
    width: '600px',
    minHeight: '400px',
    // panelClass: 'fiori-dialog'
  });

  dialogRef.afterClosed().subscribe(result => {
    console.log('Modal cerrado', result);
    // Puedes recargar datos si es necesario
  });
  }

}
