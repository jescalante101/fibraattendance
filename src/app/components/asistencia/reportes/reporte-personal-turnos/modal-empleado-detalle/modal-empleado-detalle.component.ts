import { Component, Input, OnInit } from '@angular/core';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { ErrorHandlerService } from 'src/app/shared/services/error-handler.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { ScheduleService } from 'src/app/core/services/schedule.service';
import { ScheduleResponseDto, ScheduleDayDto } from 'src/app/core/models/schedule.model';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

interface EmployeeDetailData {
  employee: EmployeeScheduleAssignment;
  scheduleData?: ScheduleResponseDto;
}

@Component({
  selector: 'app-modal-empleado-detalle',
  templateUrl: './modal-empleado-detalle.component.html',
  styleUrls: ['./modal-empleado-detalle.component.css']
})
export class ModalEmpleadoDetalleComponent implements OnInit {
  @Input() data: { employeeData: EmployeeScheduleAssignment } = { employeeData: {} as EmployeeScheduleAssignment };
  
  employee: EmployeeScheduleAssignment = {} as EmployeeScheduleAssignment;
  weeklySchedule: ScheduleResponseDto | null = null;
  
  activeTab: 'personal' | 'laboral' | 'horarios' | 'turnos' = 'personal';
  loading = false;
  loadingSchedule = false;

  // Control de fechas
  currentStartDate: Date = new Date();
  currentEndDate: Date = new Date();

  // FullCalendar configuration
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridWeek',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridWeek,dayGridMonth'
    },
    height: 'auto',
    weekends: true,
    events: [],
    eventDisplay: 'block',
    displayEventTime: true,
    eventTextColor: '#ffffff',
    eventBorderColor: 'transparent',
    eventClick: this.handleEventClick.bind(this),
    eventMouseEnter: this.handleEventMouseEnter.bind(this),
    eventMouseLeave: this.handleEventMouseLeave.bind(this)
  };

  constructor(
    private employeeScheduleService: EmployeeScheduleAssignmentService,
    private scheduleService: ScheduleService,
    private errorHandlerService: ErrorHandlerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    console.log('🔍 Modal empleado detalle - Data recibida:', this.data);
    
    if (this.data?.employeeData) {
      this.employee = this.data.employeeData;
      this.loadWeeklySchedule();
    }
  }

  private loadWeeklySchedule(): void {
    if (!this.employee.employeeId) {
      console.warn('⚠️ No hay employeeId disponible');
      return;
    }

    // Cargar la semana actual
    this.loadCurrentWeek();
  }

  private getStartOfWeek(date: Date): Date {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lunes como primer día
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  private getEndOfWeek(startDate: Date): Date {
    const endOfWeek = new Date(startDate);
    endOfWeek.setDate(startDate.getDate() + 6); // 7 días después del lunes
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  }


  setActiveTab(tab: 'personal' | 'laboral' | 'horarios' | 'turnos'): void {
    this.activeTab = tab;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-ES');
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  formatDateTime(dateString: string | null): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('es-ES');
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  // Getter para determinar el estado del empleado
  get employeeStatus(): { label: string, color: string } {
    const isTerminated = this.isEmployeeTerminated();
    const isOnVacation = this.isEmployeeOnVacation();

    if (isTerminated) {
      return { label: 'Cesado', color: 'bg-red-100 text-red-800' };
    } else if (isOnVacation) {
      return { label: 'De Vacaciones', color: 'bg-amber-100 text-amber-800' };
    } else {
      return { label: 'Activo', color: 'bg-green-100 text-green-800' };
    }
  }

  private isEmployeeTerminated(): boolean {
    // Lógica similar a la del componente principal
    return false; // Por ahora, ya que no tenemos fecha de cese en EmployeeScheduleAssignment
  }

  private isEmployeeOnVacation(): boolean {
    // Lógica similar a la del componente principal
    return false; // Por ahora, ya que no tenemos datos de vacaciones en EmployeeScheduleAssignment
  }

  // ============================================================================
  // FULLCALENDAR METHODS
  // ============================================================================

  private updateCalendarEvents(): void {
    if (!this.weeklySchedule || !this.weeklySchedule.schedule || this.weeklySchedule.schedule.length === 0) {
      console.warn('⚠️ No hay datos de horario para generar eventos');
      return;
    }

    const events: EventInput[] = [];
    const colors = [
      '#10b981', // verde
      '#3b82f6', // azul
      '#8b5cf6', // púrpura
      '#f59e0b', // amarillo
      '#ef4444', // rojo
      '#06b6d4', // cyan
      '#84cc16'  // lima
    ];

    this.weeklySchedule.schedule.forEach((day: ScheduleDayDto, index: number) => {
      // Color especial para excepciones
      const backgroundColor = day.isException ? '#ef4444' : colors[index % colors.length];
      const borderColor = day.isException ? '#dc2626' : colors[index % colors.length];

      // Usar la fecha del día
      const eventDate = new Date(day.date);
      
      events.push({
        id: `schedule-${day.scheduleId}-${day.date}`,
        title: `${day.alias}\n${day.dayName}\n${day.inTime} - ${day.outTime}`,
        start: eventDate.toISOString().split('T')[0],
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: '#ffffff',
        extendedProps: {
          scheduleDay: day,
          dayName: day.dayName,
          inTime: day.inTime,
          outTime: day.outTime,
          workDuration: day.workTimeDurationMinutes,
          duration: day.duration,
          isException: day.isException,
          description: this.buildEventDescription(day)
        }
      });
    });

    console.log('📅 Eventos generados para el calendario:', events);

    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
  }

  private buildEventDescription(day: ScheduleDayDto): string {
    let description = `${day.alias}\n`;
    description += `Día: ${day.dayName}\n`;
    description += `Fecha: ${new Date(day.date).toLocaleDateString('es-ES')}\n`;
    description += `Entrada: ${day.inTime}\n`;
    description += `Salida: ${day.outTime}\n`;
    description += `Duración trabajo: ${day.workTimeDurationMinutes} min\n`;
    description += `Duración total: ${day.duration} min`;
    
    if (day.isException) {
      description += `\n⚠️ EXCEPCIÓN PROGRAMADA`;
    }
    
    return description;
  }


  private handleEventClick(arg: any): void {
    const { scheduleDay } = arg.event.extendedProps;
    console.log('📅 Evento clickeado:', scheduleDay);
    
    // Mostrar información detallada del horario
    const title = scheduleDay.isException ? 
      `⚠️ ${scheduleDay.alias} (Con excepción)` : 
      `📅 ${scheduleDay.alias}`;
      
    const message = `${scheduleDay.dayName}: ${scheduleDay.inTime} - ${scheduleDay.outTime} (${scheduleDay.workTimeDurationMinutes} min)`;
    
    this.toastService.info(title, message);
  }

  private handleEventMouseEnter(arg: any): void {
    const description = arg.event.extendedProps.description;
    if (description) {
      arg.el.title = description;
    }
  }

  private handleEventMouseLeave(arg: any): void {
    // Limpiar tooltip
    arg.el.title = '';
  }

  getHorarioColor(index: number): string {
    const colors = [
      '#10b981', // verde
      '#3b82f6', // azul
      '#8b5cf6', // púrpura
      '#f59e0b', // amarillo
      '#ef4444', // rojo
      '#06b6d4', // cyan
      '#84cc16'  // lima
    ];
    return colors[index % colors.length];
  }

  hasExceptions(): boolean {
    if (!this.weeklySchedule || !this.weeklySchedule.schedule) return false;
    
    return this.weeklySchedule.schedule.some(day => day.isException === true);
  }

  // Métodos para navegación de semanas
  loadPreviousWeek(): void {
    const newStartDate = new Date(this.currentStartDate);
    newStartDate.setDate(this.currentStartDate.getDate() - 7);
    const newEndDate = new Date(this.currentEndDate);
    newEndDate.setDate(this.currentEndDate.getDate() - 7);
    
    this.loadScheduleForRange(newStartDate, newEndDate);
  }

  loadNextWeek(): void {
    const newStartDate = new Date(this.currentStartDate);
    newStartDate.setDate(this.currentStartDate.getDate() + 7);
    const newEndDate = new Date(this.currentEndDate);
    newEndDate.setDate(this.currentEndDate.getDate() + 7);
    
    this.loadScheduleForRange(newStartDate, newEndDate);
  }

  loadCurrentWeek(): void {
    const today = new Date();
    const startOfWeek = this.getStartOfWeek(today);
    const endOfWeek = this.getEndOfWeek(startOfWeek);
    
    this.loadScheduleForRange(startOfWeek, endOfWeek);
  }

  private loadScheduleForRange(startDate: Date, endDate: Date): void {
    if (!this.employee.employeeId) return;

    this.currentStartDate = startDate;
    this.currentEndDate = endDate;

    console.log('📞 Cargando horario para rango:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    this.loadingSchedule = true;

    this.scheduleService.getScheduleByDateRange(
      this.employee.employeeId, 
      startDate, 
      endDate
    ).subscribe({
      next: (scheduleData: ScheduleResponseDto) => {
        this.loadingSchedule = false;
        this.weeklySchedule = scheduleData;
        console.log('✅ Horario cargado exitosamente:', scheduleData);
        
        if (scheduleData && scheduleData.schedule && scheduleData.schedule.length > 0) {
          this.updateCalendarEvents();
        } else {
          console.warn('⚠️ No hay datos de horario para mostrar');
        }
      },
      error: (error) => {
        this.loadingSchedule = false;
        console.error('❌ Error cargando horario:', error);
        this.errorHandlerService.handleGenericError(error, 'No se pudo cargar el horario para el rango de fechas especificado');
      }
    });
  }

  get currentWeekLabel(): string {
    if (!this.currentStartDate || !this.currentEndDate) return '';
    
    return `${this.currentStartDate.toLocaleDateString('es-ES')} - ${this.currentEndDate.toLocaleDateString('es-ES')}`;
  }
}