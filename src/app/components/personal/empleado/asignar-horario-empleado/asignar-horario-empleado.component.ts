import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { Router } from '@angular/router';
import { AsignarTurnoMasivoComponent } from '../asignar-turno-masivo/asignar-turno-masivo.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShiftsService } from 'src/app/core/services/shifts.service';
import { ModalVerHorarioComponent } from './modal-ver-horario/modal-ver-horario.component';
import { ModalEditarAsignacionComponent } from './modal-editar-asignacion/modal-editar-asignacion.component';
import { ModalService } from 'src/app/shared/modal/modal.service';

@Component({
  selector: 'app-asignar-horario-empleado',
  templateUrl: './asignar-horario-empleado.component.html',
  styleUrls: ['./asignar-horario-empleado.component.css']
})
export class AsignarHorarioEmpleadoComponent implements OnInit {

  constructor(
    private dialog: MatDialog,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private snackBar: MatSnackBar,
    private shiftService: ShiftsService,
    private modalService:ModalService
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

  // Propiedades para el modal genérico
  isModalOpen = false;
  modalTitle = 'Horario del Empleado';
  modalComponentType = ModalVerHorarioComponent;
  modalComponentData: any = {};

  // Exponer Math para usar en el template
  Math = Math;

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

  getHorario(empleado: EmployeeScheduleAssignment) {
    this.loading = true;
    this.shiftService.getShiftByAssignedIdAndShiftId(empleado.assignmentId,empleado.scheduleId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (res) {
            // Configurar datos para el modal genérico
            var  orderingHorarios = res.horario.reverse();
            this.modalComponentData = {
              employeeName: empleado.fullNameEmployee,
              fecha_ini: empleado.startDate,
              fecha_fin: empleado.endDate,
              employeeId: empleado.employeeId,
              assignmentId: empleado.assignmentId,
              turno: {
                id: res.id,
                shiftCycle: res.shiftCycle,
                cycleUnit: res.cycleUnit,
                autoShift: res.autoShift,
                workDayOff: res.workDayOff,
                weekendType: res.weekendType, 
                alias: res.alias,
                horario: orderingHorarios
              }
            };
            this.modalService.open({
                title:`Horario de ${empleado.fullNameEmployee}`,
                componentType:ModalVerHorarioComponent,
                componentData:this.modalComponentData,
                width: '800px',
            });

          

          } else {
            this.snackBar.open('No se pudo obtener la información del horario.', 'Cerrar', {
              duration: 4000,
              verticalPosition: 'top',
              horizontalPosition: 'end',
              panelClass: ['snackbar-error']
            });
          }
        },
        error: (err) => {
          console.error('Error obteniendo horario:', err);
          this.snackBar.open('Error al obtener el horario del empleado.', 'Cerrar', {
            duration: 4000,
            verticalPosition: 'top',
            horizontalPosition: 'end',
            panelClass: ['snackbar-error']
          });
        }
      });
  }

  // Método para cerrar el modal
  onModalClose(): void {
    this.isModalOpen = false;
    console.log('Modal de horarios cerrado');
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
    
    // Configurar datos para el modal de edición
    const editData = {
      assignmentIds: [asignacion.assignmentId],
      employeeName: asignacion.fullNameEmployee,
      currentScheduleId: asignacion.scheduleId,
      currentStartDate: asignacion.startDate,
      currentEndDate: asignacion.endDate,
      currentRemarks: asignacion.remarks,
      employeeId: asignacion.employeeId,
      nroDoc: asignacion.nroDoc,
      areaId: asignacion.areaId,
      areaName: asignacion.areaName,
      locationId: asignacion.locationId,
      locationName: asignacion.locationName
    };

    this.modalService.open({
      title: `Editar Asignación - ${asignacion.fullNameEmployee}`,
      componentType: ModalEditarAsignacionComponent,
      componentData: editData,
      width: '1200px',
      height: '90vh'
    }).then(result => {
      if (result && result.updated) {
        this.snackBar.open('Asignación actualizada correctamente', 'Cerrar', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-success']
        });
        // Recargar la lista
        this.cargarAsignaciones();
      }
    });
  }

  eliminar(asignacion: EmployeeScheduleAssignment) {
    console.log('Eliminar asignación:', asignacion);
  }

  

}
