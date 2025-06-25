import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-asignar-nuevo-horario',
  templateUrl: './asignar-nuevo-horario.component.html',
  styleUrls: ['./asignar-nuevo-horario.component.css']
})
export class AsignarNuevoHorarioComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<AsignarNuevoHorarioComponent>) {}

  ngOnInit() {}

  filtro = '';

  empleadosSinHorario = [
    { id: 1, nombre: 'Pedro Álvarez' },
    { id: 2, nombre: 'Ana Castillo' },
    { id: 3, nombre: 'Luis Mendoza' },
  ];

  slideOver = false;
  empleadoSeleccionado: any = null;

  formDetalle = {
    horario: '',
    semana: null as number | null,
    fechaInicio: '',
    fechaFin: '',
    observacion: ''
  };

  // Empleados filtrados según búsqueda
  get empleadosFiltrados() {
    return this.empleadosSinHorario.filter(e =>
      e.nombre.toLowerCase().includes(this.filtro.toLowerCase())
    );
  }

  // Abre el slide-over y resetea el formulario
  abrirSlideOver(emp: any) {
    this.empleadoSeleccionado = emp;
    this.slideOver = true;

    this.formDetalle = {
      horario: '',
      semana: null,
      fechaInicio: '',
      fechaFin: '',
      observacion: ''
    };
  }

  // Cierra el slide-over
  cerrarSlideOver() {
    this.slideOver = false;
    this.empleadoSeleccionado = null;
  }

  // Simula guardar asignación
  guardarHorario() {
    const data = {
      ...this.formDetalle,
      empleado: this.empleadoSeleccionado
    };

    console.log('✅ Asignación registrada:', data);

    // Elimina al empleado de la lista mock
    this.empleadosSinHorario = this.empleadosSinHorario.filter(
      e => e.id !== this.empleadoSeleccionado.id
    );

    this.cerrarSlideOver();
  }

  cerrar() {
    this.dialogRef.close();
  }
}
