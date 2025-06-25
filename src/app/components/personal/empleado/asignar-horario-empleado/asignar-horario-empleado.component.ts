import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { PersonService } from 'src/app/core/services/person.service';

@Component({
  selector: 'app-asignar-horario-empleado',
  templateUrl: './asignar-horario-empleado.component.html',
  styleUrls: ['./asignar-horario-empleado.component.css']
})
export class AsignarHorarioEmpleadoComponent implements OnInit {

 empleados: any[] = [];
  horarios: any[] = [];
  page = 1;
  pageSize = 10;
  totalItems = 0;
  filtroEmpleado = '';
  filtrosHorarios: { [key: string]: string } = {}; // key = personal_Id
  empleadosFiltrados: any[] = [];
  horariosFiltrados: any[] = [];

  asignaciones: { [key: string]: number } = {}; // key = personal_Id, value = horario_Id


    // Paginación
  pageNumber = 1;

  constructor(
    private horariosService: AttendanceService,
    private personalService: PersonService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.obtenerEmpleados();
    this.obtenerHorarios();
  }

  obtenerEmpleados(): void {
    this.personalService.getPersonalActivo().subscribe((data) => {
      this.empleados = data;
      this.totalItems = data.length;
    });
  }

  obtenerHorarios(): void {
    this.horariosService.getHorarios(1, 15).subscribe((res) => {
      this.horarios = res.data;
    });
  }

  // get empleadosFiltrados(): any[] {
  //   if (!this.filtroEmpleado.trim()) return this.paginados;
  //   return this.paginados.filter((e) => {
  //     const nombreCompleto = `${e.apellido_Paterno} ${e.apellido_Materno} ${e.nombres}`.toLowerCase();
  //     return nombreCompleto.includes(this.filtroEmpleado.toLowerCase());
  //   });
  // }

  get paginados(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.empleados.slice(start, start + this.pageSize);
  }

  filtrarHorarios(personalId: string): any[] {
    const filtro = this.filtrosHorarios[personalId]?.toLowerCase() || '';
    return this.horarios.filter((h) => h.alias.toLowerCase().includes(filtro));
  }

  cambiarPagina(event: any): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
  }

  asignarHorario(personalId: string, horarioId: number): void {
    console.log(`Asignar horario ${horarioId} al empleado ${personalId}`);
    // Aquí podrías agregar un servicio POST para enviar la asignación
  }

  actualizarEmpleadosFiltrados(): void {
    let filtrados = this.empleados;

    if (this.filtroEmpleado.trim()) {
      const termino = this.filtroEmpleado.toLowerCase();
      filtrados = filtrados.filter((e) => {
        const nombreCompleto = `${e.apellido_Paterno} ${e.apellido_Materno} ${e.nombres}`.toLowerCase();
        return nombreCompleto.includes(termino);
      });
    }

    const start = (this.pageNumber - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.empleadosFiltrados = filtrados.slice(start, end);
    this.totalItems = filtrados.length;
  }

   handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1;
    this.actualizarEmpleadosFiltrados();
  }

   onBuscarEmpleado(): void {
    this.pageNumber = 1;
    this.actualizarEmpleadosFiltrados();
  }

  guardarAsignacion(personaID:number): void {
    // Aquí podrías agregar la lógica para guardar las asignaciones de horarios
    console.log('Asignaciones guardadas');
  }

  openModalNuevoDescanso():void{
    // Aquí podrías abrir un modal para crear un nuevo descanso
    console.log('Abrir modal para nuevo descanso');
  }

  eliminarSeleccionados(): void {
    // Aquí podrías agregar la lógica para eliminar los horarios seleccionados
    console.log('Eliminar horarios seleccionados');
  }

}
