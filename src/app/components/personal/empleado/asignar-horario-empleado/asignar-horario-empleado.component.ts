import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-asignar-horario-empleado',
  templateUrl: './asignar-horario-empleado.component.html',
  styleUrls: ['./asignar-horario-empleado.component.css']
})
export class AsignarHorarioEmpleadoComponent implements OnInit {

  constructor(
    private dialog: MatDialog,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private router: Router
  ) { }

  filtro = '';
  page = 1;
  pageSize = 5;
  totalCount = 0;
  
  startDate = '';
  endDate = '';
  
  asignaciones: (EmployeeScheduleAssignment & { selected?: boolean })[] = [];
  isLoading: boolean = false;

  ngOnInit(): void {
    this.cargarAsignaciones();
  }

  cargarAsignaciones() {
    this.isLoading = true;
    this.employeeScheduleAssignmentService.getEmployeeScheduleAssignments(this.page, this.pageSize, this.filtro, this.startDate, this.endDate)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res) => {
          console.log('Asignaciones cargadas:', res);
          if (res.exito && res.data) {
            this.asignaciones = res.data.items.map(item => ({ ...item, selected: false }));
            this.totalCount = res.data.totalCount;
            this.page = res.data.pageNumber;
            this.pageSize = res.data.pageSize;
          } else {
            this.asignaciones = [];
            this.totalCount = 0;
          }
        },
        error: (err) => {
          console.error('Error cargando asignaciones:', err);
          this.asignaciones = [];
          this.totalCount = 0;
        }
      });
  }
  irAEmpleados() {
    this.router.navigate(['/panel/personal/empleado/empleado'], { queryParams: { modoAsignar: true } });
  }

  aplicarFiltro() {
    this.page = 1;
    this.cargarAsignaciones();
  }

  aplicarFiltroFechas() {
    this.page = 1;
    this.cargarAsignaciones();
  }

  cambiarPagina(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.cargarAsignaciones();
  }

  editar(asignacion: EmployeeScheduleAssignment) {
    console.log('Editar asignación:', asignacion);
  }

  eliminar(asignacion: EmployeeScheduleAssignment) {
    console.log('Eliminar asignación:', asignacion);
  }

}
