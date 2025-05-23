import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';

@Component({
  selector: 'app-modal-nuevo-turno',
  templateUrl: './modal-nuevo-turno.component.html',
  styleUrls: ['./modal-nuevo-turno.component.css'],
 
})
export class ModalNuevoTurnoComponent implements OnInit {
  // Propiedades para el turno
  nombreTurno: string = '';
  turnoAutomatico: boolean = false;
  
  // Propiedades para la tabla de horarios
  dataHorarios: any[] = [];
  horariosSeleccionados: any[] = [];
  totalRecords: number = 0;
  pageSize: number = 10;
  pageNumber: number = 1;
  
  // Días de la semana para la tabla
  diasSemana: string[] = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb'];
  horariosSemana: {[key: string]: any} = {
    'Dom': null,
    'Lun': null,
    'Mar': null,
    'Mie': null,
    'Jue': null,
    'Vie': null,
    'Sáb': null
  };

  constructor(
    private attendanceService: AttendanceService,
    public dialogRef: MatDialogRef<ModalNuevoTurnoComponent>
  ) { }

  ngOnInit() {
    this.loadHorarios();
  }

  loadHorarios() {
    this.attendanceService.getHorarios(this.pageNumber, this.pageSize).subscribe(
      (data) => {
        console.log('Datos recibidos:', data);
        this.dataHorarios = data.data;
        this.totalRecords = data.totalRecords;
      },
      (error) => {
        console.error('Error al cargar horarios:', error);
        alert('Error al cargar los horarios');
      }
    );
  }

  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1; // PageIndex empieza desde 0
    this.loadHorarios();
  }

  toggleHorarioSelection(horario: any) {
    const index = this.horariosSeleccionados.findIndex(h => h.id === horario.id);
    if (index === -1) {
      this.horariosSeleccionados.push(horario);
    } else {
      this.horariosSeleccionados.splice(index, 1);
    }
  }

  isSelected(horario: any): boolean {
    return this.horariosSeleccionados.findIndex(h => h.id === horario.id) !== -1;
  }

  guardarTurno() {
    // Aquí iría la lógica para guardar el turno
    // Por ahora solo cerramos el diálogo
    this.dialogRef.close({
      nombre: this.nombreTurno,
      automatico: this.turnoAutomatico,
      horarios: this.horariosSeleccionados,
      semana: this.horariosSemana
    });
  }

  cancelar() {
    this.dialogRef.close();
  }
}