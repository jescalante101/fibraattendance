import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-asignar-nuevo-horario',
  templateUrl: './asignar-nuevo-horario.component.html',
  styleUrls: ['./asignar-nuevo-horario.component.css']
})
export class AsignarNuevoHorarioComponent implements OnInit {
  formulario = {
    employeeId: '',
    scheduleId: null,
    startDate: null as Date | null,
    endDate: null as Date | null,
    remarks: '',
    createdAt: new Date().toISOString(),
    crearteBY: '', // puedes llenarlo con el usuario logueado
    fullName: '',
    shiftDescription: ''
  };

  turnos = [
    { id: 1, descripcion: 'Mañana' },
    { id: 2, descripcion: 'Tarde' },
    { id: 3, descripcion: 'Noche' }
  ];

  empleadoSeleccionado: any;

  constructor(
    public dialogRef: MatDialogRef<AsignarNuevoHorarioComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    console.log(data);
    this.empleadoSeleccionado = data.empleado;
    this.formulario.employeeId = data.empleado.id;
    this.formulario.fullName = data.empleado.nombre;
    // Si tienes el usuario logueado, asigna crearteBY aquí
  }

  ngOnInit() {
    const hoy = new Date();
    this.formulario.startDate = this.getStartOfWeek(hoy);
    this.formulario.endDate = this.getEndOfWeek(hoy);
  }

  getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay() || 7;
    if (day !== 1) d.setDate(d.getDate() - (day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  getEndOfWeek(date: Date): Date {
    const d = this.getStartOfWeek(date);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  guardarAsignacion() {
    // Puedes buscar el turno seleccionado para llenar shiftDescription
    const turno = this.turnos.find(t => t.id === this.formulario.scheduleId);
    this.formulario.shiftDescription = turno ? turno.descripcion : '';

    // Aquí puedes emitir el formulario o hacer la petición al backend
    console.log('Asignación registrada:', this.formulario);

    this.dialogRef.close(this.formulario);
  }

  cerrar() {
    this.dialogRef.close();
  }
}
