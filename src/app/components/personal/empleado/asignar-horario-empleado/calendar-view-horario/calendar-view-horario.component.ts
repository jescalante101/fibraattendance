import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CalendarOptions, EventInput, Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { ScheduleResponseDto, ScheduleDayDto } from 'src/app/core/models/schedule.model';

export interface HorarioCalendarData {
  employeeName?: string;
  turno?: {
    alias?: string;
    id?: number;
  };
  fecha_ini?: string;
  fecha_fin?: string;
  horarios?: Array<{
    dayIndex: number;
    dayName?: string;
    inTime: string;
    outTime?: string;
    workTimeDuration: number;
    dayDate?: string;
    hasException?: boolean;
    exceptionId?: string;
  }>;
}

@Component({
  selector: 'app-calendar-view-horario',
  templateUrl: './calendar-view-horario.component.html',
  styleUrls: ['./calendar-view-horario.component.css']
})
export class CalendarViewHorarioComponent implements OnInit, OnChanges {
  @Input() componentData: HorarioCalendarData | ScheduleResponseDto = {};
  
  modalRef: any; // Referencia al modal padre
  data: any; // Datos recibidos del modal service
  
  // Datos procesados para el calendario
  scheduleData: ScheduleResponseDto | null = null;
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  
  // Control para recargar eventos cuando el calendario esté listo
  private pendingEvents: EventInput[] = [];
  private calendarReady = false;

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    height: 'auto',
    events: [],
    eventDisplay: 'block',
    dayMaxEvents: 3,
    moreLinkClick: 'popover',
    eventClick: this.handleEventClick.bind(this),
    dateClick: this.handleDateClick.bind(this),
    eventDidMount: this.handleEventDidMount.bind(this),
    dayCellDidMount: this.handleDayCellDidMount.bind(this),
    viewDidMount: this.handleViewDidMount.bind(this)
  };

  currentMonth: Date = new Date();
  diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  ngOnInit(): void {
    console.log('CalendarViewHorario ngOnInit - componentData:', this.componentData);
    console.log('CalendarViewHorario ngOnInit - data:', this.data);
    
    // Asignar datos de la misma manera que ModalVerHorarioComponent
    if (this.data) {
      this.componentData = this.data;
      console.log('CalendarViewHorario - Datos asignados desde this.data:', this.componentData);
    }
    
    // Detectar y procesar el tipo de datos recibidos
    this.processIncomingData();
    this.loadCalendarData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('CalendarViewHorario ngOnChanges - changes:', changes);
    if (changes['componentData'] && !changes['componentData'].firstChange) {
      this.processIncomingData();
      this.loadCalendarData();
    }
  }

  /**
   * Procesar datos entrantes - puede ser formato antiguo (HorarioCalendarData) o nuevo (ScheduleResponseDto)
   */
  private processIncomingData(): void {
    const data = this.componentData as any;
    
    // Detectar si son datos del nuevo formato (ScheduleResponseDto)
    if (data && data.schedule && Array.isArray(data.schedule) && data.employeeId) {
      console.log('Detectados datos del nuevo formato ScheduleResponseDto');
      this.scheduleData = data as ScheduleResponseDto;
    } 
    // Formato antiguo (HorarioCalendarData)
    else if (data && data.horarios && Array.isArray(data.horarios)) {
      console.log('Detectados datos del formato antiguo HorarioCalendarData');
      this.scheduleData = null; // Usar lógica antigua
    }
    else {
      console.warn('Formato de datos no reconocido:', data);
      this.scheduleData = null;
    }
  }

  private loadCalendarData(): void {
    console.log('CalendarViewHorario loadCalendarData - scheduleData:', this.scheduleData);
    console.log('CalendarViewHorario loadCalendarData - componentData:', this.componentData);
    
    let events: EventInput[] = [];
    
    // Usar nuevo formato si está disponible
    if (this.scheduleData) {
      events = this.transformScheduleToEvents();
    } 
    // Usar formato antiguo como fallback
    else if ((this.componentData as HorarioCalendarData)?.horarios) {
      events = this.transformHorariosToEvents();
    }
    else {
      console.log('CalendarViewHorario - No hay datos válidos para mostrar');
      return;
    }

    // Guardar eventos para cargar cuando el calendario esté listo
    this.pendingEvents = events;
    
    // Si el calendario ya está inicializado y listo, cargar eventos inmediatamente
    if (this.calendarReady && this.calendarComponent?.getApi()) {
      this.loadEventsToCalendar();
    } else {
      console.log('CalendarViewHorario - Calendario no listo aún, eventos guardados como pendientes');
    }
  }

  /**
   * Transformar datos del nuevo formato ScheduleResponseDto a eventos de calendario
   */
  private transformScheduleToEvents(): EventInput[] {
    const events: EventInput[] = [];
    
    if (!this.scheduleData || !this.scheduleData.schedule) {
      console.log('No hay schedule data para transformar');
      return events;
    }

    console.log('Transformando schedule data:', this.scheduleData.schedule);

    this.scheduleData.schedule.forEach((scheduleDay: ScheduleDayDto) => {
      // Verificar si es fecha pasada
      const fechaEvento = new Date(scheduleDay.date);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      fechaEvento.setHours(0, 0, 0, 0);
      const esFechaPasada = fechaEvento < hoy;

      // Determinar si es día libre
      const esDiaLibre = scheduleDay.inTime === '--:--' || scheduleDay.outTime === '--:--' || scheduleDay.workTimeDurationMinutes === 0;

      // Crear evento para este día
      events.push({
        id: `schedule-${scheduleDay.date}`,
        title: esDiaLibre ? 'Día Libre' : `${scheduleDay.inTime} - ${scheduleDay.outTime}`,
        start: scheduleDay.date.split('T')[0], // Solo la fecha, sin la hora
        allDay: true,
        backgroundColor: this.getScheduleEventColor(scheduleDay, esFechaPasada, esDiaLibre),
        borderColor: this.getScheduleEventBorderColor(scheduleDay, esFechaPasada, esDiaLibre),
        textColor: this.getScheduleEventTextColor(scheduleDay, esFechaPasada, esDiaLibre),
        extendedProps: {
          scheduleDay: scheduleDay,
          fecha: fechaEvento,
          esFechaPasada: esFechaPasada,
          esDiaLibre: esDiaLibre,
          dayName: scheduleDay.dayName
        }
      });
    });

    console.log('Eventos generados desde schedule:', events);
    return events;
  }

  /**
   * Colores para eventos basados en ScheduleDayDto
   */
  private getScheduleEventColor(scheduleDay: ScheduleDayDto, esFechaPasada: boolean, esDiaLibre: boolean): string {
    if (esFechaPasada) return '#e5e7eb'; // gris para fechas pasadas
    if (esDiaLibre) return '#f3f4f6'; // gris claro para días libres
    if (scheduleDay.isException) return '#fed7aa'; // naranja para excepciones
    return '#dbeafe'; // azul para horarios normales
  }

  private getScheduleEventBorderColor(scheduleDay: ScheduleDayDto, esFechaPasada: boolean, esDiaLibre: boolean): string {
    if (esFechaPasada) return '#9ca3af';
    if (esDiaLibre) return '#d1d5db';
    if (scheduleDay.isException) return '#fb923c';
    return '#3b82f6';
  }

  private getScheduleEventTextColor(scheduleDay: ScheduleDayDto, esFechaPasada: boolean, esDiaLibre: boolean): string {
    if (esFechaPasada) return '#6b7280';
    if (esDiaLibre) return '#9ca3af';
    if (scheduleDay.isException) return '#ea580c';
    return '#1e40af';
  }

  private transformHorariosToEvents(): EventInput[] {
    const events: EventInput[] = [];
    const horarios = (this.componentData as HorarioCalendarData)?.horarios || [];
    
    console.log('CalendarViewHorario - transformHorariosToEvents - horarios:', horarios);
    console.log('CalendarViewHorario - transformHorariosToEvents - componentData:', this.componentData);
    
    // Obtener rango de fechas
    const oldData = this.componentData as HorarioCalendarData;
    const fechaInicio = oldData?.fecha_ini ? new Date(oldData.fecha_ini) : new Date();
    const fechaFin = oldData?.fecha_fin ? new Date(oldData.fecha_fin) : this.getEndOfYear();
    
    console.log('CalendarViewHorario - fechaInicio:', fechaInicio);
    console.log('CalendarViewHorario - fechaFin:', fechaFin);

    // Generar eventos para cada día en el rango
    const currentDate = new Date(fechaInicio);
    
    while (currentDate <= fechaFin) {
      const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      
      // Buscar horario para este día de la semana
      const horarioDelDia = horarios.find((h: any) => h.dayIndex === dayOfWeek);
      
      if (horarioDelDia) {
        // Verificar si es fecha pasada
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaComparar = new Date(currentDate);
        fechaComparar.setHours(0, 0, 0, 0);
        const esFechaPasada = fechaComparar < hoy;
        
        console.log(`CalendarViewHorario - Procesando ${currentDate.toDateString()}, día ${dayOfWeek}, horario encontrado:`, horarioDelDia);
        console.log(`CalendarViewHorario - Es fecha pasada: ${esFechaPasada} (fecha: ${fechaComparar.toDateString()}, hoy: ${hoy.toDateString()})`);
        
        // Crear evento para este día
        events.push({
          id: `horario-${currentDate.getTime()}-${dayOfWeek}`,
          title: this.formatHorarioDisplay(horarioDelDia),
          start: currentDate.toISOString().split('T')[0],
          allDay: true,
          backgroundColor: this.getEventColor(horarioDelDia, esFechaPasada),
          borderColor: this.getEventBorderColor(horarioDelDia, esFechaPasada),
          textColor: this.getEventTextColor(horarioDelDia, esFechaPasada),
          extendedProps: {
            horario: horarioDelDia,
            fecha: new Date(currentDate),
            esFechaPasada: esFechaPasada,
            dayOfWeek: dayOfWeek
          }
        });
      }
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('CalendarViewHorario - eventos generados:', events);
    console.log('CalendarViewHorario - cantidad de eventos:', events.length);
    
    return events;
  }

  private formatHorarioDisplay(horario: any): string {
    const horaInicio = this.formatHora(horario.inTime);
    const horaFin = horario.outTime || this.getHoraFin(horario.inTime, horario.workTimeDuration);
    return `${horaInicio} - ${horaFin}`;
  }

  private formatHora(timeString: string): string {
    if (!timeString) return '';
    
    // Si ya es formato HH:MM, devolverlo directamente
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    
    try {
      // Si es formato completo de fecha/hora
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      
      // Si es solo hora en formato "HH:MM:SS"
      if (timeString.includes(':')) {
        const parts = timeString.split(':');
        if (parts.length >= 2) {
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
      }
      
      return timeString;
    } catch {
      return timeString;
    }
  }

  private getHoraFin(inTime: string, workTimeDuration: number): string {
    if (!inTime || !workTimeDuration) return '';
    
    try {
      // Si inTime es solo hora "HH:MM", crear fecha temporal para calcular
      let startTime: Date;
      
      if (inTime.match(/^\d{2}:\d{2}$/)) {
        // Formato "HH:MM"
        const [hours, minutes] = inTime.split(':').map(Number);
        startTime = new Date();
        startTime.setHours(hours, minutes, 0, 0);
      } else {
        // Formato completo de fecha
        startTime = new Date(inTime);
      }
      
      if (!isNaN(startTime.getTime())) {
        const endDate = new Date(startTime.getTime() + (workTimeDuration * 60 * 1000));
        return endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      
      return '';
    } catch {
      return '';
    }
  }

  private getEventColor(horario: any, esFechaPasada: boolean): string {
    if (esFechaPasada) return '#e5e7eb'; // gris para fechas pasadas
    if (horario.hasException) return '#fed7aa'; // naranja para excepciones
    return '#dbeafe'; // azul para horarios normales
  }

  private getEventBorderColor(horario: any, esFechaPasada: boolean): string {
    if (esFechaPasada) return '#9ca3af';
    if (horario.hasException) return '#fb923c';
    return '#3b82f6';
  }

  private getEventTextColor(horario: any, esFechaPasada: boolean): string {
    if (esFechaPasada) return '#6b7280';
    if (horario.hasException) return '#ea580c';
    return '#1e40af';
  }

  private getEndOfYear(): Date {
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setMonth(11, 31); // Diciembre 31
    return endDate;
  }

  // Event handlers
  handleEventClick(clickInfo: any): void {
    const extendedProps = clickInfo.event.extendedProps;
    
    if (extendedProps.esFechaPasada) {
      console.log('No se puede editar horario de fecha pasada');
      return;
    }

    // Implementar lógica de edición
    this.editarHorario(extendedProps.horario, extendedProps.fecha);
  }

  handleDateClick(dateClickInfo: any): void {
    console.log('Fecha clickeada:', dateClickInfo.dateStr);
    // Implementar lógica para crear nuevo horario en fecha específica
  }

  handleEventDidMount(mountInfo: any): void {
    const extendedProps = mountInfo.event.extendedProps;
    
    // Agregar clases CSS personalizadas
    if (extendedProps.esFechaPasada) {
      mountInfo.el.classList.add('horario-pasado');
    }
    if (extendedProps.horario.hasException) {
      mountInfo.el.classList.add('horario-excepcion');
    }
    
    // Agregar tooltip
    mountInfo.el.title = this.getTooltipText(extendedProps.horario, extendedProps.fecha);
  }

  handleDayCellDidMount(mountInfo: any): void {
    // Personalizar celdas de días si es necesario
    const fecha = mountInfo.date;
    const hoy = new Date();
    
    if (fecha.toDateString() === hoy.toDateString()) {
      mountInfo.el.classList.add('dia-actual');
    }
  }

  private getTooltipText(horario: any, fecha: Date): string {
    const dayName = this.diasSemana[fecha.getDay()];
    const fechaStr = fecha.toLocaleDateString('es-ES');
    const duracion = this.formatDuracion(horario.workTimeDuration);
    
    let tooltip = `${dayName} ${fechaStr}\n`;
    tooltip += `${this.formatHorarioDisplay(horario)}\n`;
    tooltip += `Duración: ${duracion}`;
    
    if (horario.hasException) {
      tooltip += '\n⚠️ Excepción aplicada';
    }
    
    return tooltip;
  }

  private formatDuracion(minutes: number): string {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  private editarHorario(horario: any, fecha: Date): void {
    console.log('Editar horario:', horario, 'para fecha:', fecha);
    // Aquí integrar con el modal de edición existente o crear uno nuevo
    // Emitir evento o llamar servicio para abrir modal de edición
  }

  // Métodos públicos para navegación
  previousMonth(): void {
    if (this.calendarComponent?.getApi) {
      this.calendarComponent.getApi().prev();
    }
  }

  nextMonth(): void {
    if (this.calendarComponent?.getApi) {
      this.calendarComponent.getApi().next();
    }
  }

  goToToday(): void {
    if (this.calendarComponent?.getApi) {
      this.calendarComponent.getApi().today();
    }
  }

  getCurrentViewTitle(): string {
    if (this.calendarComponent?.getApi) {
      return this.calendarComponent.getApi().view.title;
    }
    return '';
  }

  getExceptionsCount(): number {
    // Usar nuevo formato si está disponible
    if (this.scheduleData?.schedule) {
      return this.scheduleData.schedule.filter(s => s.isException).length;
    }
    // Formato antiguo
    if ((this.componentData as HorarioCalendarData)?.horarios) {
      return (this.componentData as HorarioCalendarData).horarios!.filter(h => h.hasException).length;
    }
    return 0;
  }

  // Métodos para obtener información del empleado (compatibles con ambos formatos)
  getEmployeeName(): string {
    if (this.scheduleData) {
      return this.scheduleData.fullNameEmployee || 'Empleado';
    }
    return (this.componentData as HorarioCalendarData)?.employeeName || 'Empleado';
  }

  getTurnoInfo(): string {
    if (this.scheduleData) {
      return this.scheduleData.shiftInfo?.alias || 'No definido';
    }
    return (this.componentData as HorarioCalendarData)?.turno?.alias || 'No definido';
  }

  getDateRange(): string {
    if (this.scheduleData) {
      const start = new Date(this.scheduleData.queryRange.startDate).toLocaleDateString('es-ES');
      const end = new Date(this.scheduleData.queryRange.endDate).toLocaleDateString('es-ES');
      return `${start} - ${end}`;
    }
    
    const oldData = this.componentData as HorarioCalendarData;
    if (oldData?.fecha_ini && oldData?.fecha_fin) {
      const start = new Date(oldData.fecha_ini).toLocaleDateString('es-ES');
      const end = new Date(oldData.fecha_fin).toLocaleDateString('es-ES');
      return `${start} - ${end}`;
    }
    
    return 'No definido';
  }

  getTotalSchedulesCount(): number {
    // Usar nuevo formato si está disponible
    if (this.scheduleData?.schedule) {
      return this.scheduleData.schedule.length;
    }
    // Formato antiguo
    if ((this.componentData as HorarioCalendarData)?.horarios) {
      return (this.componentData as HorarioCalendarData).horarios!.length;
    }
    return 0;
  }

  // Callback cuando FullCalendar está completamente inicializado
  handleViewDidMount(mountInfo: any): void {
    console.log('CalendarViewHorario - Vista del calendario montada, calendario listo');
    this.calendarReady = true;
    
    // Si hay eventos pendientes, cargarlos ahora
    if (this.pendingEvents.length > 0) {
      console.log('CalendarViewHorario - Cargando eventos pendientes:', this.pendingEvents.length);
      this.loadEventsToCalendar();
    }
  }

  // Método para cargar eventos al calendario
  private loadEventsToCalendar(): void {
    if (this.calendarComponent?.getApi && this.pendingEvents.length > 0) {
      const calendarApi = this.calendarComponent.getApi();
      console.log('CalendarViewHorario - Cargando eventos al calendario:', this.pendingEvents.length);
      
      // Limpiar eventos existentes
      calendarApi.removeAllEvents();
      
      // Agregar nuevos eventos
      calendarApi.addEventSource(this.pendingEvents);
      
      console.log('CalendarViewHorario - Eventos cargados exitosamente');
    }
  }
}