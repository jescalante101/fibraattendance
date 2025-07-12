import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { Router } from '@angular/router';
import { AsignarTurnoMasivoComponent } from '../asignar-turno-masivo/asignar-turno-masivo.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-asignar-horario-empleado',
  templateUrl: './asignar-horario-empleado.component.html',
  styleUrls: ['./asignar-horario-empleado.component.css']
})
export class AsignarHorarioEmpleadoComponent implements OnInit {

  constructor(
    private dialog: MatDialog,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  filtro = '';
  pageNumber = 1;
  pageSize = 5;
  totalCount = 0;
  
  startDate = '';
  endDate = '';
  
  employees: (EmployeeScheduleAssignment & { selected?: boolean })[] = [];
  loading: boolean = false;

  displayedColumns: string[] = [
    'employeeId', 'nroDoc', 'fullNameEmployee', 'scheduleName', 'createdWeek',
    'locationName', 'areaName', 'startDate', 'endDate', 'remarks', 'acciones'
  ];

  ngOnInit(): void {
    this.cargarAsignaciones();
  }

  cargarAsignaciones() {
    this.loading = true;
    this.employeeScheduleAssignmentService.getEmployeeScheduleAssignments(this.pageNumber, this.pageSize, this.filtro, this.startDate, this.endDate)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          console.log('Asignaciones cargadas:', res);
          if (res.exito && res.data) {
            this.employees = res.data.items.map(item => ({ ...item, selected: false }));
            this.totalCount = res.data.totalCount;
            this.pageNumber = res.data.pageNumber;
            this.pageSize = res.data.pageSize;
          } else {
            this.employees = [];
            this.totalCount = 0;
          }
        },
        error: (err) => {
          console.error('Error cargando asignaciones:', err);
          this.employees = [];
          this.totalCount = 0;
        }
      });
  }
  irAEmpleados() {
    const dialogRef = this.dialog.open(AsignarTurnoMasivoComponent, {
      width: '95vw',
      height: '90vh',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.exito) {
        this.snackBar.open('Asignación masiva realizada correctamente.', 'Cerrar', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-success']
        });
        // Si quieres refrescar la lista de empleados, llama aquí a this.getEmployees();
      } else if (result && result.exito === false) {
        this.snackBar.open('No se pudo realizar la asignación masiva.', 'Cerrar', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  aplicarFiltro() {
    this.pageNumber = 1;
    this.cargarAsignaciones();
  }

  aplicarFiltroFechas() {
    this.pageNumber = 1;
    this.cargarAsignaciones();
  }

  onPageChange(event: PageEvent) {
    this.pageNumber = event.pageIndex + 1;
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
