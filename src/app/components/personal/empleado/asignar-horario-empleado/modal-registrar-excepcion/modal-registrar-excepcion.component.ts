import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AttendanceService } from '../../../../../core/services/attendance.service';
import { ShiftsService, ScheduleExceptionRegister, HorarioShift } from '../../../../../core/services/shifts.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { HeaderConfig } from 'src/app/core/services/header-config.service';
import { HeaderConfigService } from '../../../../../core/services/header-config.service';
import { TimeIntervalService } from 'src/app/core/services/time-interval.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { TimeIntervalDetailDto } from 'src/app/core/models/att-time-interval-responde.model';

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
  selectedHorarioShift!: TimeIntervalDetailDto;
  employeeData: any;
  selectedDateInfo: any;
  
  // Horario actual del empleado (basado en scheduleId)
  currentSchedule: any = null;

  //header configuration
  headerConfig: any =null;
  //login user
  usernameLogin:any;



  constructor(
    private fb: FormBuilder,
    private shiftsService: ShiftsService,
    private toastService: ToastService,
    private headerConfigService:HeaderConfigService,
    private timeIntervalService:TimeIntervalService,
    private authService:AuthService

  ) {}

  ngOnInit(): void {
    console.log('Modal Registrar Excepción - data:', this.data);
    
    // Extraer datos del horario y fecha seleccionada
    this.selectedDateInfo = this.data?.horario;
    this.selectedHorarioShift = this.selectedDateInfo?.scheduleDay;
    this.employeeData = this.data?.employeeData;
    
    console.log('selectedDateInfo:', this.selectedDateInfo);
    console.log('selectedHorarioShift:', this.selectedHorarioShift);
    console.log('employeeData:', this.employeeData);
    console.log('employeeId capturado:', this.employeeData?.employeeId);
    console.log('fecha seleccionada:', this.selectedDateInfo?.date);
    console.log('scheduleId desde calendar:', this.employeeData?.scheduleId);
    console.log('scheduleId desde scheduleDay:', this.selectedHorarioShift?.id);
    
    // Inicializar selectedHorario como null explícitamente
    this.selectedHorario = null;
    
    // Inicializar headerConfig ANTES de cargar horarios
    this.headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    console.log('headerConfig:', this.headerConfig);
    
    this.initializeForm();
    this.loadHorarios();
    this.loadUserLogin();
  }

  initializeForm(): void {
    this.exceptionForm = this.fb.group({
      timeIntervalId: ['', Validators.required],
      remarks: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  loadUserLogin(){
   const user=this.authService.getCurrentUser();
   if(user){
    this.usernameLogin=user.username;
   }
  }


  loadHorarios(): void {
    this.loading = true;
    
    // Obtener companyId igual que en horario.component.ts
    const header = this.headerConfigService.getCurrentHeaderConfig();
    const companyId = header?.selectedEmpresa?.companiaId || '';
    console.log('header:', header);
    console.log('companyId:', companyId);

    if (!companyId) {
      this.toastService.error('Error', 'No se pudo obtener la información de la compañía');
      this.loading = false;
      return;
    }
    
    this.timeIntervalService.getTimeIntervals(companyId, 1, 100).subscribe({
      next: (response) => {
        console.log('Horarios cargados:', response);
        console.log('Estructura de un horario:', response.data?.[0]);
        this.horarios = response.data || response || [];
        
        // Buscar el horario actual del empleado basado en scheduleId
        this.findCurrentSchedule();
        
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

  findCurrentSchedule(): void {
    const scheduleId = this.employeeData?.scheduleId;
    console.log('Buscando horario actual con scheduleId:', scheduleId);
    
    if (scheduleId && this.horarios.length > 0) {
      this.currentSchedule = this.horarios.find(h => h.id === scheduleId);
      console.log('Horario actual encontrado:', this.currentSchedule);
      
      if (!this.currentSchedule) {
        console.warn('No se encontró horario con scheduleId:', scheduleId);
      }
    } else {
      console.warn('No se puede buscar horario actual - scheduleId o horarios faltantes');
    }
  }

  preselectCurrentSchedule(): void {
    // Si encontramos el horario actual, lo pre-seleccionamos
    if (this.currentSchedule) {
      this.selectedHorario = this.currentSchedule;
      this.exceptionForm.patchValue({
        timeIntervalId: this.currentSchedule.id
      });
      console.log('Horario actual pre-seleccionado:', this.currentSchedule);
      return;
    }
    
    // Fallback: buscar por hora si no se encontró por ID
    if (this.selectedHorarioShift?.formattedStartTime && this.horarios.length > 0) {
      const currentHour = this.selectedHorarioShift.formattedStartTime;
      const matchingHorario = this.horarios.find(h => 
        h.formattedStartTime === currentHour || 
        this.formatHora(h.formattedStartTime) === this.formatHora(currentHour)
      );
      
      if (matchingHorario) {
        this.selectedHorario = matchingHorario;
        this.exceptionForm.patchValue({
          timeIntervalId: matchingHorario.id
        });
        console.log('Horario pre-seleccionado por coincidencia de hora:', matchingHorario);
      }
    }
  }

  onHorarioSelect(horario: any): void {
    this.selectedHorario = horario;
    this.exceptionForm.patchValue({
      timeIntervalId: horario.id
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

  calculateDayIndex(selectedDate: Date): number {
    // El dayIndex representa el día de la semana (1 = Lunes, 0 = Domingo)
    const dayOfWeek = selectedDate.getDay();
    // JavaScript getDay() retorna 0 = Domingo, 1 = Lunes, etc.
    // Convertimos a formato donde 1 = Lunes, 0 = Domingo
   return dayOfWeek
  }

  onSubmit(): void {
    if (this.exceptionForm.valid) {
      this.loading = true;
      
      console.log('Datos para registrar excepción:');
      console.log('- employeeId:', this.employeeData?.employeeId);
      console.log('- assignmentId:', this.employeeData?.assignmentId);
      console.log('- employeeName:', this.employeeData?.employeeName);
      console.log('- scheduleId (horario actual):', this.employeeData?.scheduleId || this.selectedHorarioShift?.id);
      console.log('- selectedHorario (nuevo horario):', this.selectedHorario);
      console.log('- timeIntervalId from form (nuevo):', this.exceptionForm.value.timeIntervalId);
      
      // Obtener la fecha seleccionada desde el calendario
      const selectedDate = this.selectedDateInfo?.date || new Date();
      const dayIndex = this.calculateDayIndex(selectedDate);
      
      const exceptionData: ScheduleExceptionRegister = {
        employeeId: this.employeeData?.employeeId || '',
        assignmentId: this.employeeData?.assignmentId || 0,
        exceptionDate: selectedDate,
        dayIndex: dayIndex,
        timeIntervalId: parseInt(this.exceptionForm.value.timeIntervalId),
        exceptionType: 1,
        startDate: selectedDate,
        remarks: this.exceptionForm.value.remarks,
        createdBy: this.usernameLogin
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