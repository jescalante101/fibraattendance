import { Component, OnInit, Input, ChangeDetectorRef, OnDestroy, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastService } from 'src/app/shared/services/toast.service';
import { TimeIntervalService } from 'src/app/core/services/time-interval.service';
import { HeaderConfigService } from 'src/app/core/services/header-config.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { 
  AttTimeIntervalCreateDto, 
  AttTimeIntervalUpdateDto, 
  AttTimeIntervalDto,
} from 'src/app/core/models/att-time-interval-responde.model';
import { TimeIntervalSummary } from './util/calculate-summary';

interface AssignedBreak {
  id?: number;
  name: string;
  alias: string;
  duration: number;
}

@Component({
  selector: 'app-nuevo-horario-redesign',
  templateUrl: './nuevo-horario-redesign.component.html',
  styleUrls: ['./nuevo-horario-redesign.component.css']
})
export class NuevoHorarioRedesignComponent implements OnInit, OnDestroy {
  @Input() componentData: any = {};

  // Wizard state
  currentStep: number = 1;
  loading: boolean = false;
  showAdvancedRules: boolean = false;

  // Form
  horarioForm!: FormGroup;

  // Assigned breaks
  assignedBreaks: AssignedBreak[] = [];
  availableBreaks: any[] = [];
  showBreaksPopover: boolean = false;
  loadingBreaks: boolean = false;

  // Summary calculations
  currentSummary: TimeIntervalSummary | null = null;

  // Edit mode
  isEditMode: boolean = false;
  editingScheduleId?: number;

  // Destroy subject for subscriptions
  private destroy$ = new Subject<void>();

  // Modal resolve function (provided by ModalService)
  resolve: (data?: any) => void = () => {};
  
  // Modal reference (provided by ModalService)
  modalRef: any;

  constructor(
    private fb: FormBuilder,
    private timeIntervalService: TimeIntervalService,
    private authService: AuthService,
    private headerConfigService: HeaderConfigService,
    private attendanceService: AttendanceService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() public dialogRef: MatDialogRef<NuevoHorarioRedesignComponent>,
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.processComponentData();
    this.loadAvailableBreaks();
    
    if (this.isEditMode && this.editingScheduleId) {
      this.loadScheduleData(this.editingScheduleId);
    }

    // Initialize summary calculation
    setTimeout(() => {
      this.updateSummary();
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private processComponentData() {
    console.log('=== COMPONENT DATA DEBUG ===');
    console.log('componentData (@Input):', this.componentData);
    console.log('data (@Inject MAT_DIALOG_DATA):', this.data);
    
    // Usar data de MAT_DIALOG_DATA como fuente principal, fallback a componentData
    const dataSource = this.data || this.componentData;
    console.log('dataSource final:', dataSource);
    
    if (dataSource) {
      this.isEditMode = !!(dataSource.idHorario || dataSource.id);
      this.editingScheduleId = dataSource.idHorario || dataSource.id;
      
      console.log('isEditMode:', this.isEditMode);
      console.log('editingScheduleId:', this.editingScheduleId);
      
      // Set useMode if provided
      if (dataSource.use_mode !== undefined) {
        this.horarioForm.patchValue({
          useMode: dataSource.use_mode
        });
        console.log('useMode establecido:', dataSource.use_mode);
      }
    } else {
      console.log('No se recibieron datos desde ninguna fuente');
    }
    console.log('============================');
  }

  private initializeForm() {
    this.horarioForm = this.fb.group({
      // --- Campos que se envían directamente ---
      alias: ['', [Validators.required, Validators.minLength(3)]],
      useMode: [0],
      workTimeDuration: [480, [Validators.required, Validators.min(1)]],
      workDay: [1.0],
      inRequired: [true],
      outRequired: [true],
      totalMarkings: [4],
      minEarlyIn: [0],
      minLateOut: [45],
      overtimeLv1: [120],
      overtimeLv1Percentage: [25],
      overtimeLv2: [60],
      overtimeLv2Percentage: [35],
      overtimeLv3: [0],
      overtimeLv3Percentage: [100],
      punchInStartTime: ['06:00'],
      punchInEndTime: ['08:00'],
      punchOutStartTime: ['18:00'],
      punchOutEndTime: ['20:00'],
      breakTimeIds: [[]],
      roundingThresholdMinutes: [45],

      // --- Controles solo para la UI ---
      horaEntrada: ['07:00', Validators.required],
      horaSalida: ['19:00', Validators.required],
      enableOvertime: [true],
      allowLateToggle: [true],
      allowLeaveEarlyToggle: [true],
      earlyInToggle: [false],
      lateOutToggle: [true],


      // --- Valores numéricos para las tolerancias ---
      allowLateMinutes: [10],
      allowLeaveEarlyMinutes: [5]
    });

    // Watch for time changes to auto-calculate work duration
    this.horarioForm.get('horaEntrada')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateWorkDuration());
      
    this.horarioForm.get('horaSalida')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateWorkDuration());

    // Watch for form changes to update summary
    this.horarioForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateSummary());
  }

  private loadAvailableBreaks() {
    this.loadingBreaks = true;
    this.attendanceService.getDescansos(1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response?.data) {
            this.availableBreaks = response.data.map((item: any) => ({
              id: item.id,
              alias: item.alias,
              duration: item.duration,
              periodStart: item.periodStart
            }));
          } else {
            this.availableBreaks = [];
          }
          this.loadingBreaks = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading breaks:', error);
          this.toastService.error('Error', 'No se pudieron cargar los descansos disponibles');
          this.availableBreaks = [];
          this.loadingBreaks = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadScheduleData(scheduleId: number) {
    console.log('=== LOAD SCHEDULE DATA ===');
    console.log('Cargando datos para scheduleId:', scheduleId);
    
    this.loading = true;
    this.cdr.detectChanges();

    this.timeIntervalService.getTimeIntervalById(scheduleId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: AttTimeIntervalDto) => {
          console.log('Datos del horario cargados exitosamente:', data);
          this.populateFormFromScheduleData(data);
          console.log('Formulario poblado con datos del horario');
        },
        error: (error) => {
          console.error('Error loading schedule data:', error);
          this.toastService.error('Error', 'No se pudo cargar la información del horario');
        }
      });
  }

  private populateFormFromScheduleData(data: AttTimeIntervalDto) {
    // Extract time from DateTime string (format: "2000-01-01T08:00:00")
    const extractTimeFromDateTime = (dateTimeString: string): string => {
      if (!dateTimeString) return '08:00';
      
      try {
        if (dateTimeString.includes('T')) {
          // Extract time part from DateTime string
          const timePart = dateTimeString.split('T')[1];
          return timePart ? timePart.substring(0, 5) : '08:00'; // Get HH:mm
        } else if (dateTimeString.includes(':')) {
          // Already in time format
          return dateTimeString.substring(0, 5);
        }
        return '08:00';
      } catch (error) {
        console.error('Error extracting time:', error);
        return '08:00';
      }
    };

    // Calculate base end time from start time + workTimeDuration + breaks
    // Formula: inTime + workTimeDuration + total_break_time = base end time
    // This gives us the actual end time of the base schedule (without overtime)
    const startTimeFormatted = extractTimeFromDateTime(data.inTime);
    const totalBreakTime = (data.breaks || []).reduce((sum, breakItem) => sum + breakItem.duration, 0);
    const baseScheduleDuration = data.workTimeDuration + totalBreakTime;
    const endTime = this.calculateEndTimeFromDuration(startTimeFormatted, baseScheduleDuration);
    
    this.horarioForm.patchValue({
      // Campos que se envían directamente
      alias: data.alias,
      useMode: data.useMode,
      workTimeDuration: data.workTimeDuration,
      workDay: data.workDay,
      inRequired: data.inRequired === 1,
      outRequired: data.outRequired === 1,
      totalMarkings: data.totalMarkings,
      minEarlyIn: data.minEarlyIn,
      minLateOut: data.minLateOut,
      overtimeLv1: data.overtimeLv1,
      overtimeLv1Percentage: data.overtimeLv1Percentage,
      overtimeLv2: data.overtimeLv2,
      overtimeLv2Percentage: data.overtimeLv2Percentage,
      overtimeLv3: data.overtimeLv3,
      overtimeLv3Percentage: data.overtimeLv3Percentage,
      punchInStartTime: data.punchInWindow ? extractTimeFromDateTime(data.punchInWindow.split('-')[0].trim()) : '06:00',
      punchInEndTime: data.punchInWindow ? extractTimeFromDateTime(data.punchInWindow.split('-')[1].trim()) : '08:00',
      punchOutStartTime: data.punchOutWindow ? extractTimeFromDateTime(data.punchOutWindow.split('-')[0].trim()) : '18:00',
      punchOutEndTime: data.punchOutWindow ? extractTimeFromDateTime(data.punchOutWindow.split('-')[1].trim()) : '20:00',
      roundingThresholdMinutes: data.roundingThresholdMinutes,

      // Controles para la UI
      horaEntrada: startTimeFormatted,
      horaSalida: endTime,
      enableOvertime: data.overtimeLv === 1,
      allowLateToggle: data.allowLate > 0,
      allowLeaveEarlyToggle: data.allowLeaveEarly > 0,
      earlyInToggle: data.earlyIn === 1,
      lateOutToggle: data.lateOut === 1,
      
      // Valores numéricos para tolerancias
      allowLateMinutes: data.allowLate > 0 ? data.allowLate : 10,
      allowLeaveEarlyMinutes: data.allowLeaveEarly > 0 ? data.allowLeaveEarly : 5
    });

    // Load assigned breaks
    this.assignedBreaks = (data.breaks || []).map(breakItem => ({
      id: breakItem.id,
      name: breakItem.alias,
      alias: breakItem.alias,
      duration: breakItem.duration
    }));

    // Update breakTimeIds in form with existing breaks
    const existingBreakIds = this.assignedBreaks.filter(b => b.id).map(b => b.id!);
    this.horarioForm.patchValue({ breakTimeIds: existingBreakIds });
  }

  private calculateEndTimeFromDuration(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }

  private calculateWorkDuration() {
    const startTime = this.horarioForm.get('horaEntrada')?.value as string;
    const endTime = this.horarioForm.get('horaSalida')?.value as string;
    
    if (startTime && endTime) {
      const duration = this.calculateMinutesBetweenTimes(startTime, endTime);
      if (duration > 0) {
        // Subtract break time from work duration
        const totalBreakTime = this.assignedBreaks.reduce((sum, breakItem) => sum + breakItem.duration, 0);
        const workDuration = duration - totalBreakTime;
        
        this.horarioForm.patchValue({
          workTimeDuration: Math.max(workDuration, 0)
        }, { emitEvent: false });
      }
    }
  }

  private calculateMinutesBetweenTimes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    let start = startHours * 60 + startMinutes;
    let end = endHours * 60 + endMinutes;
    
    // Handle overnight shifts
    if (end < start) {
      end += 24 * 60; // Add 24 hours in minutes
    }
    
    return end - start;
  }

  // Wizard navigation
  nextStep() {
    if (this.canProceedToNextStep()) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!(this.horarioForm.get('alias')?.valid && 
               this.horarioForm.get('horaEntrada')?.valid && 
               this.horarioForm.get('horaSalida')?.valid && 
               this.horarioForm.get('workTimeDuration')?.valid);
      case 2:
        return true; // Overtime rules are optional
      default:
        return true;
    }
  }

  // Time change handlers
  onStartTimeChange(time: string) {
    this.horarioForm.patchValue({ horaEntrada: time });
    this.calculateWorkDuration();
  }

  onEndTimeChange(time: string) {
    this.horarioForm.patchValue({ horaSalida: time });
    this.calculateWorkDuration();
  }

  // Break management
  addBreak() {
    this.showBreaksPopover = !this.showBreaksPopover;
  }

  selectBreak(breakItem: any) {
    // Check if break is already assigned
    const alreadyAssigned = this.assignedBreaks.some(ab => ab.id === breakItem.id);
    if (alreadyAssigned) {
      this.toastService.warning('Advertencia', 'Este descanso ya está asignado');
      return;
    }

    const newBreak: AssignedBreak = {
      id: breakItem.id,
      name: breakItem.alias,
      alias: breakItem.alias,
      duration: breakItem.duration
    };
    
    this.assignedBreaks.push(newBreak);
    
    // Update breakTimeIds in form
    const breakIds = this.assignedBreaks.filter(b => b.id).map(b => b.id!);
    this.horarioForm.patchValue({ breakTimeIds: breakIds });
    
    this.calculateWorkDuration();
    this.showBreaksPopover = false;
    this.cdr.detectChanges();
  }

  closeBreaksPopover() {
    this.showBreaksPopover = false;
  }

  removeBreak(index: number) {
    this.assignedBreaks.splice(index, 1);
    
    // Update breakTimeIds in form
    const breakIds = this.assignedBreaks.filter(b => b.id).map(b => b.id!);
    this.horarioForm.patchValue({ breakTimeIds: breakIds });
    
    this.calculateWorkDuration();
  }

  // Overtime management
  addOvertimeLevel() {
    // Implementation for adding dynamic overtime levels
    this.toastService.info('Info', 'Funcionalidad de niveles dinámicos en desarrollo');
  }

  toggleAdvancedRules() {
    this.showAdvancedRules = !this.showAdvancedRules;
  }

  // Helper methods for template
  getStartTime(): string {
    return this.horarioForm.get('horaEntrada')?.value || '07:00';
  }

  getBaseEndTime(): string {
    return this.horarioForm.get('horaSalida')?.value || '19:00';
  }

  getEndTime(): string {
    const baseEndTime = this.horarioForm.get('horaSalida')?.value || '19:00';
    
    // Si no hay horas extras habilitadas, retornar tiempo base
    if (!this.horarioForm.get('enableOvertime')?.value) {
      return baseEndTime;
    }
    
    // Calcular tiempo total incluyendo horas extras
    const startTime = this.getStartTime();
    const baseMinutes = this.calculateMinutesBetweenTimes(startTime, baseEndTime);
    const overtimeMinutes = this.getTotalOvertimeMinutes();
    const totalMinutes = baseMinutes + overtimeMinutes;
    
    // Convertir tiempo de inicio + duración total a hora de fin
    return this.calculateEndTimeFromDuration(startTime, totalMinutes);
  }

  getWorkTimePercentage(): number {
    // La barra azul siempre debe ocupar el horario base completo (trabajo + descansos)
    // Solo se reduce cuando hay H.E. activas que extienden el timeline total
    const startTime = this.getStartTime();
    const baseEndTime = this.getBaseEndTime();
    const totalEndTime = this.getEndTime();
    
    const baseMinutes = this.calculateMinutesBetweenTimes(startTime, baseEndTime);
    const totalMinutes = this.calculateMinutesBetweenTimes(startTime, totalEndTime);
    
    // Si no hay H.E. (base = total), la barra azul ocupa 100%
    // Si hay H.E. (total > base), la barra azul es proporcional
    return totalMinutes > 0 ? (baseMinutes / totalMinutes) * 100 : 100;
  }

  getBreakPosition(breakItem: AssignedBreak): number {
    // Simplified calculation - in a real implementation, 
    // you'd need to know when each break occurs
    return 30;
  }

  getBreakWidth(breakItem: AssignedBreak): number {
    const total = this.calculateMinutesBetweenTimes(this.getStartTime(), this.getEndTime());
    return total > 0 ? (breakItem.duration / total) * 100 : 0;
  }

  getOvertimePercentage(): number {
    // Calculate total overtime percentage
    return this.getOvertimeLevel1Percentage() + this.getOvertimeLevel2Percentage();
  }

  getOvertimeLevel1Percentage(): number {
    if (!this.horarioForm.get('enableOvertime')?.value) {
      return 0;
    }
    
    const lv1 = (this.horarioForm.get('overtimeLv1')?.value as number) || 0;
    if (lv1 === 0) {
      return 0;
    }
    
    const total = this.calculateMinutesBetweenTimes(this.getStartTime(), this.getEndTime());
    return total > 0 ? (lv1 / total) * 100 : 0;
  }

  getOvertimeLevel2Percentage(): number {
    if (!this.horarioForm.get('enableOvertime')?.value) {
      return 0;
    }
    
    const lv2 = (this.horarioForm.get('overtimeLv2')?.value as number) || 0;
    if (lv2 === 0) {
      return 0;
    }
    
    const total = this.calculateMinutesBetweenTimes(this.getStartTime(), this.getEndTime());
    return total > 0 ? (lv2 / total) * 100 : 0;
  }

  // Save functionality
  guardarHorario() {
    if (this.horarioForm.invalid) {
      this.toastService.warning('Advertencia', 'Por favor completa todos los campos requeridos');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    if (this.isEditMode && this.editingScheduleId) {
      this.updateSchedule();
    } else {
      this.createSchedule();
    }
  }

  private createSchedule() {
    const scheduleData = this.prepareDataForSave();
    
    // Debug: Verificar que companyId se esté enviando correctamente
    console.log('=== COMPANY ID DEBUG ===');
    console.log('Header Config:', this.headerConfigService.getCurrentHeaderConfig());
    console.log('Selected Empresa:', this.headerConfigService.getCurrentHeaderConfig()?.selectedEmpresa);
    console.log('Company ID enviado:', scheduleData.companyId);
    console.log('Schedule Data completo:', scheduleData);
    console.log('========================');

    this.timeIntervalService.createTimeInterval(scheduleData)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.toastService.success('Éxito', 'Horario creado correctamente');
          this.modalRef.closeModalFromChild(response) ;

        },
        error: (error) => {
          console.error('Error creating schedule:', error);
          this.toastService.error('Error', 'No se pudo crear el horario. Inténtalo nuevamente');
        }
      });
  }

  private updateSchedule() {
    if (!this.editingScheduleId) return;

    const scheduleData: AttTimeIntervalUpdateDto = {
      id: this.editingScheduleId,
      ...this.prepareDataForSave()
    };
    
    this.timeIntervalService.updateTimeInterval(this.editingScheduleId, scheduleData)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.toastService.success('Éxito', 'Horario actualizado correctamente');
          // Como el PUT devuelve void, pasamos el ID del horario editado
          this.modalRef.closeModalFromChild({ id: this.editingScheduleId, success: true });
        },
        error: (error) => {
          console.error('Error updating schedule:', error);
          this.toastService.error('Error', 'No se pudo actualizar el horario. Inténtalo nuevamente');
        }
      });
  }

  private prepareDataForSave(): AttTimeIntervalCreateDto {
    const formValue = this.horarioForm.value;
    
    // Calculate components correctly - como estaba antes
    const workDuration = formValue.workTimeDuration || 0;
    const totalBreakTime = this.assignedBreaks.reduce((sum, breakItem) => sum + breakItem.duration, 0);
    
    // Calculate planned overtime (only when enabled)
    let plannedOvertimeMinutes = 0;
    if (formValue.enableOvertime) {
      plannedOvertimeMinutes += formValue.overtimeLv1 || 0;
      plannedOvertimeMinutes += formValue.overtimeLv2 || 0;
      plannedOvertimeMinutes += formValue.overtimeLv3 || 0;
    }
    
    // Total duration = work time + breaks + planned overtime
    const totalDuration = workDuration + totalBreakTime + plannedOvertimeMinutes;

    // Get company ID from header config service
    const companyId = this.headerConfigService.getCurrentHeaderConfig()?.selectedEmpresa?.companiaId || '';

    // Format time as DateTime using fixed date (2000-01-01) - only time matters
    const formatTimeAsDateTime = (timeString: string): string => {
      const baseDate = '2000-01-01';
      if (!timeString || !timeString.includes(':')) {
        return `${baseDate}T08:00:00`;
      }
      
      // Ensure time is in HH:mm format
      const timeParts = timeString.split(':');
      const hours = timeParts[0].padStart(2, '0');
      const minutes = (timeParts[1] || '00').padStart(2, '0');
      
      return `${baseDate}T${hours}:${minutes}:00`;
    };

    const dto: AttTimeIntervalCreateDto = {
      alias: formValue.alias || '',
      useMode: formValue.useMode || 0,
      inTime: formatTimeAsDateTime(formValue.horaEntrada || '07:00'),
      duration: totalDuration,
      workTimeDuration: workDuration,
      workDay: formValue.workDay || 1,
      companyId: companyId,
      
      // Punching Rules
      inRequired: formValue.inRequired ? 1 : 0,
      outRequired: formValue.outRequired ? 1 : 0,
      allowLate: formValue.allowLateToggle ? formValue.allowLateMinutes : 0,
      allowLeaveEarly: formValue.allowLeaveEarlyToggle ? formValue.allowLeaveEarlyMinutes : 0,
      totalMarkings: formValue.totalMarkings || 4,
      
      // Early/Late settings (these are boolean flags, not minutes)
      earlyIn: formValue.earlyInToggle ? 1 : 0,  // Switch: 1 = enabled, 0 = disabled
      lateOut: formValue.lateOutToggle ? 1 : 0,  // Switch: 1 = enabled, 0 = disabled
      minEarlyIn: formValue.minEarlyIn || 0,  // Threshold in minutes
      minLateOut: formValue.minLateOut || 45,  // Threshold in minutes
      
      // Overtime (only include if overtime is enabled)
      overtimeLv: formValue.enableOvertime ? 1 : 0,  // Master switch for overtime
      overtimeLv1: formValue.enableOvertime ? (formValue.overtimeLv1 || 0) : 0,
      overtimeLv1Percentage: formValue.enableOvertime ? formValue.overtimeLv1Percentage : undefined,
      overtimeLv2: formValue.enableOvertime ? (formValue.overtimeLv2 || 0) : 0,
      overtimeLv2Percentage: formValue.enableOvertime ? formValue.overtimeLv2Percentage : undefined,
      overtimeLv3: formValue.enableOvertime ? (formValue.overtimeLv3 || 0) : 0,
      overtimeLv3Percentage: formValue.enableOvertime ? formValue.overtimeLv3Percentage : undefined,
      
      // Punch times - send as HH:mm format only (no DateTime)
      punchInStartTime: formValue.punchInStartTime || '06:00',
      punchInEndTime: formValue.punchInEndTime || '08:00', 
      punchOutStartTime: formValue.punchOutStartTime || '18:00',
      punchOutEndTime: formValue.punchOutEndTime || '20:00',
      roundingThresholdMinutes: formValue.roundingThresholdMinutes,

      // Break IDs - Use form value if available, otherwise fall back to assignedBreaks
      breakTimeIds: (formValue.breakTimeIds && formValue.breakTimeIds.length > 0) 
        ? formValue.breakTimeIds 
        : this.assignedBreaks.filter(b => b.id).map(b => b.id!)
    };
    return dto;
  }

  cancelar() {
    // Cerrar el modal padre
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    } else if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // Summary calculation methods
  private updateSummary() {
    const formData = this.prepareDataForSave();
    this.currentSummary = this.calculateSummary(formData, this.availableBreaks);
  }

  private calculateSummary(formData: AttTimeIntervalCreateDto, allAvailableBreaks: any[]): TimeIntervalSummary {
    // Helper to format minutes into "Xh Ym"
    const formatMinutes = (totalMinutes: number): string => {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    };

    // Helper to format time from HH:mm string
    const formatTimeFromString = (timeString: string): string => {
      return timeString || '00:00';
    };

    // 1. Schedule Time Range
    const startTime = formData.inTime;
    const endTime = this.calculateEndTimeFromDuration(startTime, formData.duration);
    const scheduleRange = `${formatTimeFromString(startTime)} - ${formatTimeFromString(endTime)}`;

    // 2. Normal Work Day
    const normalWorkDay = formatMinutes(formData.workTimeDuration);

    // 3. Break Summary
    const totalBreakMinutes = this.assignedBreaks.reduce((sum, b) => sum + b.duration, 0);
    const breakSummary = `${this.assignedBreaks.length} configurados (${totalBreakMinutes} min)`;

    // 4. Overtime Summary
    const totalOvertimeMinutes = (formData.overtimeLv1 || 0) + (formData.overtimeLv2 || 0) + (formData.overtimeLv3 || 0);
    const overtimeSummary = formatMinutes(totalOvertimeMinutes);

    // 5. Total Duration
    const totalDuration = formatMinutes(formData.duration);

    return {
      alias: formData.alias,
      scheduleRange,
      normalWorkDay,
      breakSummary,
      overtimeSummary,
      totalDuration
    };
  }

  // Helper methods for template
  getTotalWorkingHours(): string {
    const workMinutes = this.horarioForm.get('workTimeDuration')?.value || 0;
    const overtimeMinutes = this.getTotalOvertimeMinutes();
    const totalMinutes = workMinutes + overtimeMinutes;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  getTotalOvertimeMinutes(): number {
    if (!this.horarioForm.get('enableOvertime')?.value) return 0;
    
    const lv1 = this.horarioForm.get('overtimeLv1')?.value || 0;
    const lv2 = this.horarioForm.get('overtimeLv2')?.value || 0;
    const lv3 = this.horarioForm.get('overtimeLv3')?.value || 0;
    
    return lv1 + lv2 + lv3;
  }

  getWorkTimeDurationFormatted(): string {
    const minutes = this.horarioForm.get('workTimeDuration')?.value || 0;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  getOvertimeFormatted(): string {
    const minutes = this.getTotalOvertimeMinutes();
    if (minutes === 0) return 'No configurado';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  getTotalBreakMinutes(): number {
    return this.assignedBreaks.reduce((sum, breakItem) => sum + breakItem.duration, 0);
  }

  // Level 3 label for holidays
  getLevel3Label(): string {
    return 'Feriado';
  }

  // Punch window helpers for summary
  getPunchInWindow(): string {
    const startTime = this.horarioForm.get('punchInStartTime')?.value || '07:45';
    const endTime = this.horarioForm.get('punchInEndTime')?.value || '08:45';
    return `${startTime} - ${endTime}`;
  }

  getPunchOutWindow(): string {
    const startTime = this.horarioForm.get('punchOutStartTime')?.value || '16:45';
    const endTime = this.horarioForm.get('punchOutEndTime')?.value || '17:45';
    return `${startTime} - ${endTime}`;
  }
}