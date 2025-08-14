import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment, EmployeeScheduleAssignmentInsert, EmployeeScheduleAssignmentUpdate } from 'src/app/core/services/employee-schedule-assignment.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from 'src/app/core/services/auth.service';

export interface EditarAsignacionData {
  assignmentIds: number[];
  employeeName?: string;
  currentScheduleId?: number;
  currentStartDate?: string;
  currentEndDate?: string;
  currentRemarks?: string;
  employeeId?: string;
  nroDoc?: string;
  areaId?: number;
  areaName?: string;
  locationId?: number;
  locationName?: string;
}

@Component({
  selector: 'app-modal-editar-asignacion',
  templateUrl: './modal-editar-asignacion.component.html',
  styleUrls: ['./modal-editar-asignacion.component.css']
})
export class ModalEditarAsignacionComponent implements OnInit {
  datat: EditarAsignacionData = { assignmentIds: [] };
  componentData: any = {};
  modalRef: any; // Referencia al modal padre
  
  editForm: FormGroup;
  turnos: Shift[] = [];
  loading = false;
  isMultipleEdit = false;

  // Días de la semana
  diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // usuario logueado
  userLogin: string =''


  constructor(
    private fb: FormBuilder,
    private shiftsService: ShiftsService,
    private employeeScheduleService: EmployeeScheduleAssignmentService,
    private snackBar: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService

  ) {
    this.editForm = this.fb.group({
      scheduleId: [null, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    console.log('ngOnInit ejecutándose...');
    
    // Usar setTimeout para asegurar que los datos estén disponibles
    setTimeout(() => {
      this.initializeData();
    }, 100);
  }

  private getCurrentUserLogin(): void {
   const user=this.authService.getCurrentUser();
   if(user){
    this.userLogin=user.username;
   }

  }



  initializeData(): void {
    console.log('initializeData ejecutándose...');
    console.log('this.componentData:', this.componentData);
    console.log('this.data:', this.data);
    
    // El modal service asigna los datos a 'data', usar ese directamente
    this.datat = this.data || { assignmentIds: [] };
    this.isMultipleEdit = this.datat.assignmentIds?.length > 1;
    
    console.log('Final datat:', this.datat);
    console.log('isMultipleEdit:', this.isMultipleEdit);
    
    // Pre-cargar datos actuales si es edición individual
    if (!this.isMultipleEdit && this.datat.currentScheduleId) {
      console.log('Pre-llenando formulario con:', {
        scheduleId: this.datat.currentScheduleId,
        startDate: this.datat.currentStartDate,
        endDate: this.datat.currentEndDate,
        remarks: this.datat.currentRemarks
      });
      
      this.editForm.patchValue({
        scheduleId: this.datat.currentScheduleId,
        startDate: this.datat.currentStartDate,
        endDate: this.datat.currentEndDate,
        remarks: this.datat.currentRemarks
      });
      console.log('Form después de pre-llenar:', this.editForm.value);
    }

    this.cargarTurnos();
  }

  cargarTurnos(): void {
    console.log('Iniciando carga de turnos...');
    this.loading = true;
    this.shiftsService.getShifts(
      1, // Página 1
      100 // Tamaño de página grande para cargar todos los turnos
    )
      .pipe(finalize(() => {
        this.loading = false;
        console.log('Carga de turnos finalizada, loading =', this.loading);
      }))
      .subscribe({
        next: (response) => {
          console.log('Respuesta completa del servicio de turnos:', response);
          if (response && response.data) {
            this.turnos = response.data;
            console.log('Turnos asignados:', this.turnos);
            console.log('Cantidad de turnos:', this.turnos.length);
          } else {
            this.turnos = [];
            console.log('No hay datos en la respuesta');
          }
        },
        error: (err) => {
          console.error('Error cargando turnos:', err);
          this.turnos = [];
          this.snackBar.open('Error al cargar los turnos', 'Cerrar', {
            duration: 3000,
            verticalPosition: 'top',
            horizontalPosition: 'end',
            panelClass: ['snackbar-error']
          });
        }
      });
  }

  onTurnoSelected(turno: Shift): void {
    this.editForm.patchValue({ scheduleId: turno.id });
  }

  getDayName(dayIndex: number): string {
    const dia = dayIndex % 7;
    return this.diasSemana[dia];
  }

  getDayAbbreviation(dayIndex: number): string {
    const dia = dayIndex % 7;
    const abrev = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return abrev[dia];
  }

  formatHora(timeString: string): string {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeString;
    }
  }

  getHoraFin(inTime: string, workTimeDuration: number): string {
    if (!inTime || !workTimeDuration) return '';
    try {
      const startDate = new Date(inTime);
      const endDate = new Date(startDate.getTime() + (workTimeDuration * 60 * 1000));
      return endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  }

  formatDuracion(minutes: number): string {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  getHorariosValidos(turno: Shift): any[] {
    return turno.horario?.filter(h => h.dayIndex !== undefined && h.inTime && h.workTimeDuration) || [];
  }

  getTurnoSeleccionado(): Shift | null {
    const selectedId = this.editForm.get('scheduleId')?.value;
    return this.turnos.find(t => t.id === selectedId) || null;
  }

  onSubmit(): void {
    if (this.editForm.valid) {
      const formData = this.editForm.value;
      
      // TODO: Implementar la actualización cuando el API soporte arrays
      console.log('Datos a actualizar:', {
        assignmentIds: this.data.assignmentIds,
        formData: formData
      });

      // Por ahora, actualizar uno por uno
      this.actualizarAsignaciones(formData);
    }
  }

  private actualizarAsignaciones(formData: any): void {
    this.loading = true;
    
    // Crear array de asignaciones para actualizar
    const updateDataArray: EmployeeScheduleAssignmentUpdate[] = this.datat.assignmentIds.map((assignmentId) => ({
      assignmentId: assignmentId, // Incluir el ID de la asignación
      employeeId: this.datat.employeeId || '',
      nroDoc: this.datat.nroDoc || '',
      fullNameEmployee: this.datat.employeeName || '',
      scheduleName: this.getTurnoSeleccionado()?.alias || '',
      scheduleId: formData.scheduleId,
      startDate: formData.startDate,
      endDate: formData.endDate || '',
      remarks: formData.remarks || '',
      createdAt: new Date().toISOString(),
      createdWeek: 0, // TODO: calcular la semana
      areaId: this.datat.areaId || 0,
      areaName: this.datat.areaName || '',
      locationId: this.datat.locationId || 0,
      locationName: this.datat.locationName || '',
      updatedAt: new Date().toISOString(),
      updatedBy: this.userLogin || ''
    }));

    console.log('Datos a enviar al API:', updateDataArray);
    
    this.employeeScheduleService.updateEmployeeScheduleAssignment(updateDataArray)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          console.log('Respuesta de actualización:', response);
          if (response.exito) {
            this.snackBar.open('Asignación(es) actualizada(s) correctamente', 'Cerrar', {
              duration: 3000,
              verticalPosition: 'top',
              horizontalPosition: 'end',
              panelClass: ['snackbar-success']
            });
            this.closeWithResult({ updated: true }); // Cerrar modal y retornar resultado
          } else {
            this.snackBar.open('Error al actualizar la asignación', 'Cerrar', {
              duration: 3000,
              verticalPosition: 'top',
              horizontalPosition: 'end',
              panelClass: ['snackbar-error']
            });
          }
        },
        error: (err) => {
          console.error('Error actualizando asignación:', err);
          this.snackBar.open('Error al actualizar la asignación', 'Cerrar', {
            duration: 3000,
            verticalPosition: 'top',
            horizontalPosition: 'end',
            panelClass: ['snackbar-error']
          });
        }
      });
  }

  onCancel(): void {
    this.closeWithResult(null);
  }

  private closeWithResult(data: any): void {
    if (this.modalRef && this.modalRef.closeModalFromChild) {
      this.modalRef.closeModalFromChild(data);
    }
  }
}