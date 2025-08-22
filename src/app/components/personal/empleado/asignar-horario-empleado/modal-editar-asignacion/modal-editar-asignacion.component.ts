import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment, EmployeeScheduleAssignmentInsert, EmployeeScheduleAssignmentUpdate } from 'src/app/core/services/employee-schedule-assignment.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from 'src/app/core/services/auth.service';
import { ShiftListDto } from 'src/app/core/models/shift.model';

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
  turnos: ShiftListDto[] = [];
  turnosFiltrados: ShiftListDto[] = [];
  turnoSearchTerm: string = '';
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
      dateRange: [null, Validators.required],
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
    
    // Obtener usuario actual
    this.getCurrentUserLogin();
    
    // El modal service asigna los datos a 'data', usar ese directamente
    this.datat = this.data || { assignmentIds: [] };
    this.isMultipleEdit = this.datat.assignmentIds?.length > 1;
    
    console.log('Final datat:', this.datat);
    console.log('isMultipleEdit:', this.isMultipleEdit);
    
    // Pre-cargar datos actuales si es edición individual
    if (!this.isMultipleEdit && this.datat.currentScheduleId) {
      const dateRange = {
        start: this.datat.currentStartDate || '',
        end: this.datat.currentEndDate || ''
      };
      
      console.log('Pre-llenando formulario con:', {
        scheduleId: this.datat.currentScheduleId,
        dateRange: dateRange,
        remarks: this.datat.currentRemarks
      });
      
      // Usar setTimeout para asegurar que el componente date-range-picker esté inicializado
      setTimeout(() => {
        this.editForm.patchValue({
          scheduleId: this.datat.currentScheduleId,
          dateRange: dateRange,
          remarks: this.datat.currentRemarks
        });
        console.log('Form después de pre-llenar:', this.editForm.value);
      }, 200);
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
            this.turnosFiltrados = [...this.turnos]; // Inicializar filtrados
            console.log('Turnos asignados:', this.turnos);
            console.log('Cantidad de turnos:', this.turnos.length);
          } else {
            this.turnos = [];
            this.turnosFiltrados = [];
            console.log('No hay datos en la respuesta');
          }
        },
        error: (err) => {
          console.error('Error cargando turnos:', err);
          this.turnos = [];
          this.turnosFiltrados = [];
          this.snackBar.open('Error al cargar los turnos', 'Cerrar', {
            duration: 3000,
            verticalPosition: 'top',
            horizontalPosition: 'end',
            panelClass: ['snackbar-error']
          });
        }
      });
  }

  onTurnoSelected(turno: ShiftListDto): void {
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
    // Si ya está en formato HH:MM, devolverlo tal como está
    if (timeString && timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    // Si es una fecha completa, extraer la hora
    if (timeString && timeString.length > 10) {
      return timeString.substring(11, 16);
    }
    return timeString || '00:00';
  }

  getHoraFin(inTime: string, workTimeDuration: number): string {
    // Si inTime está en formato HH:MM, crear una fecha temporal para los cálculos
    let date: Date;
    
    if (inTime.match(/^\d{2}:\d{2}$/)) {
      // Formato HH:MM - crear fecha temporal
      const [hours, minutes] = inTime.split(':').map(Number);
      date = new Date();
      date.setHours(hours, minutes, 0, 0);
    } else {
      // Formato de fecha completa
      date = new Date(inTime);
    }
    
    if (isNaN(date.getTime())) return '';
    
    date.setMinutes(date.getMinutes() + workTimeDuration);
    return date.toTimeString().substring(0, 5); // Devuelve HH:MM
  }

  formatDuracion(minutes: number): string {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  // Método para convertir duración "8h 30m" a minutos (para compatibilidad con nuevo formato)
  private convertDurationToMinutes(duration: string): number {
    if (!duration) return 0;
    
    const regex = /(\d+)h\s*(\d+)m/;
    const match = duration.match(regex);
    
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return (hours * 60) + minutes;
    }
    
    return 0;
  }

  // Métodos para obtener totales semanales por tipo de hora
  getTotalBreakHours(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.breakHours || '0h 0m');
      return total + minutes;
    }, 0);
  }

  getTotalOvertimeHours(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.overtimeHours || '0h 0m');
      return total + minutes;
    }, 0);
  }

  getTotalDurationHours(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.totalDuration || '0h 0m');
      return total + minutes;
    }, 0);
  }

  getTurnoDuracionSemanal(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    // Sumar la duración de trabajo de todos los días (convertir de "8h 30m" a minutos)
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.workHours || '0h 0m');
      return total + minutes;
    }, 0);
  }

  getHorariosValidos(turno: ShiftListDto): any[] {
    if (!turno.horario) return [];
    return turno.horario.filter(h => {
      const workMinutes = this.convertDurationToMinutes(h.workHours || '0h 0m');
      return workMinutes > 0;
    });
  }

  getTurnoSeleccionado(): ShiftListDto | null {
    const selectedId = this.editForm.get('scheduleId')?.value;
    return this.turnos.find(t => t.id === selectedId) || null;
  }

  filtrarTurnos(): void {
    if (!this.turnoSearchTerm.trim()) {
      this.turnosFiltrados = [...this.turnos];
    } else {
      const searchTerm = this.turnoSearchTerm.toLowerCase().trim();
      this.turnosFiltrados = this.turnos.filter(turno => 
        turno.alias?.toLowerCase().includes(searchTerm) 
      );
    }
  }

  onDateRangeSelected(dateRange: {start: string, end: string}): void {
    this.editForm.patchValue({ dateRange });
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
    const dateRange = formData.dateRange || {};
    const updateDataArray: EmployeeScheduleAssignmentUpdate[] = this.datat.assignmentIds.map((assignmentId) => ({
      assignmentId: assignmentId, // Incluir el ID de la asignación
      employeeId: this.datat.employeeId || '',
      nroDoc: this.datat.nroDoc || '',
      fullNameEmployee: this.datat.employeeName || '',
      scheduleName: this.getTurnoSeleccionado()?.alias || '',
      scheduleId: formData.scheduleId,
      startDate: dateRange.start || '',
      endDate: dateRange.end || '',
      remarks: formData.remarks || '',
      createdAt: new Date().toISOString(),
      createdWeek: 0, // TODO: calcular la semana
      areaId: this.datat.areaId || 0,
      areaName: this.datat.areaName || '',
      locationId: this.datat.locationId || 0,
      locationName: this.datat.locationName || '',
      updatedAt: new Date().toISOString(),
      updatedBy: this.userLogin || '',
      companiaId:  '', // DEL FILTRO GLOBAL
      ccostId: '',
      ccostDescription: '',
      shiftId: formData.scheduleId,
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