import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../../../../../core/services/attendance.service';
import { ShiftsService, ScheduleExceptionRegister, HorarioShift } from '../../../../../core/services/shifts.service';
import { ToastService } from '../../../../../shared/services/toast.service';

@Component({
  selector: 'app-modal-registrar-excepcion',
  templateUrl: './modal-registrar-excepcion.component.html',
  styleUrls: ['./modal-registrar-excepcion.component.css']
})
export class ModalRegistrarExcepcionComponent implements OnInit {
  
  data: any; // Datos recibidos del modal padre
  modalRef: any; // Referencia al modal padre
  
  exceptionForm!: FormGroup;
  horarios: any[] = [];
  loading = false;
  selectedHorario: any = null;

  // Datos del horario seleccionado (viene del componente padre)
  selectedHorarioShift!: HorarioShift;
  employeeData: any;

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private shiftsService: ShiftsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    console.log('Modal Registrar Excepción - data:', this.data);
    
    // Extraer datos del horario seleccionado
    this.selectedHorarioShift = this.data?.horario;
    this.employeeData = this.data?.employeeData;
    
    console.log('selectedHorarioShift:', this.selectedHorarioShift);
    console.log('employeeData:', this.employeeData);
    console.log('employeeId capturado:', this.employeeData?.employeeId);
    
    // Inicializar selectedHorario como null explícitamente
    this.selectedHorario = null;
    
    this.initializeForm();
    this.loadHorarios();
  }

  initializeForm(): void {
    this.exceptionForm = this.fb.group({
      timeIntervalId: ['', Validators.required],
      remarks: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  loadHorarios(): void {
    this.loading = true;
    this.attendanceService.getHorarios(1, 100).subscribe({
      next: (response) => {
        console.log('Horarios cargados:', response);
        this.horarios = response.data || response || [];
        
        // Pre-seleccionar el horario actual si existe coincidencia por hora
        this.preselectCurrentSchedule();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar horarios:', error);
        this.toastService.error('Error al cargar', 'No se pudieron cargar los horarios disponibles');
        this.loading = false;
      }
    });
  }

  preselectCurrentSchedule(): void {
    if (this.selectedHorarioShift?.inTime && this.horarios.length > 0) {
      const currentHour = this.selectedHorarioShift.inTime;
      const matchingHorario = this.horarios.find(h => 
        h.horaEntrada === currentHour || 
        this.formatHora(h.horaEntrada) === this.formatHora(currentHour)
      );
      
      if (matchingHorario) {
        this.selectedHorario = matchingHorario;
        this.exceptionForm.patchValue({
          timeIntervalId: matchingHorario.idHorio
        });
      }
    }
  }

  onHorarioSelect(horario: any): void {
    this.selectedHorario = horario;
    this.exceptionForm.patchValue({
      timeIntervalId: horario.idHorio
    });
  }

  formatHora(dateStr: string): string {
    if (!dateStr) return '';
    // Si es solo hora (ej: "08:00" o "08:00:00")
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      return dateStr.substring(0, 5);
    }
    // Si es fecha completa ISO
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  onSubmit(): void {
    if (this.exceptionForm.valid) {
      this.loading = true;
      
      console.log('Datos para registrar excepción:');
      console.log('- employeeId:', this.employeeData?.employeeId);
      console.log('- assignmentId:', this.employeeData?.assignmentId);
      console.log('- employeeName:', this.employeeData?.employeeName);
      
      const exceptionData: ScheduleExceptionRegister = {
        employeeId: this.employeeData?.employeeId || '',
        assignmentId: this.employeeData?.assignmentId || 0,
        exceptionDate: new Date(this.selectedHorarioShift.dayDate),
        dayIndex: this.selectedHorarioShift.dayIndex,
        timeIntervalId: parseInt(this.exceptionForm.value.timeIntervalId),
        exceptionType: 1,
        startDate: new Date(this.selectedHorarioShift.dayDate),
        remarks: this.exceptionForm.value.remarks,
        createdBy: 'Huali'
      };

      console.log('Registrando excepción:', exceptionData);

      this.shiftsService.registerShiftException(exceptionData).subscribe({
        next: (response) => {
          console.log('Excepción registrada exitosamente:', response);
          this.toastService.success('Excepción registrada', 'La excepción de horario se registró correctamente');
          this.loading = false;
          // Cerrar modal y devolver resultado
          this.modalRef?.closeModalFromChild({ 
            success: true, 
            data: response,
            message: 'Excepción registrada exitosamente'
          });
        },
        error: (error) => {
          console.error('Error al registrar excepción:', error);
          this.toastService.error('Error al registrar', 'No se pudo registrar la excepción. Verifica los datos e intenta nuevamente');
          this.loading = false;
          // Mostrar error pero mantener modal abierto
        }
      });
    } else {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.exceptionForm.controls).forEach(key => {
        this.exceptionForm.get(key)?.markAsTouched();
      });
      this.toastService.warning('Formulario incompleto', 'Por favor completa todos los campos requeridos');
    }
  }

  cerrar(): void {
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    }
  }

  // Getters para acceso fácil a los controles del formulario
  get timeIntervalId() { return this.exceptionForm.get('timeIntervalId'); }
  get remarks() { return this.exceptionForm.get('remarks'); }
}