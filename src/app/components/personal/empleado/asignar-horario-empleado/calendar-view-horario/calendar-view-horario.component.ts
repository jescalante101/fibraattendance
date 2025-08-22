import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CalendarOptions, EventInput, Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { FullCalendarComponent } from '@fullcalendar/angular';

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
  @Input() componentData: HorarioCalendarData = {};
  
  modalRef: any; // Referencia al modal padre
  data: any; // Datos recibidos del modal service
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

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
    dayCellDidMount: this.handleDayCellDidMount.bind(this)
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
    
    this.loadCalendarData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('CalendarViewHorario ngOnChanges - changes:', changes);
    if (changes['componentData'] && !changes['componentData'].firstChange) {
      this.loadCalendarData();
    }
  }

  private loadCalendarData(): void {
    console.log('CalendarViewHorario loadCalendarData - componentData:', this.componentData);
    console.log('CalendarViewHorario loadCalendarData - horarios:', this.componentData?.horarios);
    
    if (!this.componentData?.horarios) {
      console.log('CalendarViewHorario - No hay horarios, retornando');
      return;
    }

    const events: EventInput[] = this.transformHorariosToEvents();
    
    // Actualizar eventos del calendario
    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };

    // Si el calendario ya está inicializado, actualizar eventos
    if (this.calendarComponent?.getApi) {
      const calendarApi = this.calendarComponent.getApi();
      console.log('CalendarViewHorario - Actualizando eventos en calendario existente');
      calendarApi.removeAllEvents();
      calendarApi.addEventSource(events);
      console.log('CalendarViewHorario - Eventos actualizados en calendario');
    } else {
      console.log('CalendarViewHorario - Calendario no inicializado aún, eventos se aplicarán en la inicialización');
    }
  }

  private transformHorariosToEvents(): EventInput[] {
    const events: EventInput[] = [];
    const horarios = this.componentData?.horarios || [];
    
    console.log('CalendarViewHorario - transformHorariosToEvents - horarios:', horarios);
    console.log('CalendarViewHorario - transformHorariosToEvents - componentData:', this.componentData);
    
    // Obtener rango de fechas
    const fechaInicio = this.componentData?.fecha_ini ? new Date(this.componentData.fecha_ini) : new Date();
    const fechaFin = this.componentData?.fecha_fin ? new Date(this.componentData.fecha_fin) : this.getEndOfYear();
    
    console.log('CalendarViewHorario - fechaInicio:', fechaInicio);
    console.log('CalendarViewHorario - fechaFin:', fechaFin);

    // Generar eventos para cada día en el rango
    const currentDate = new Date(fechaInicio);
    
    while (currentDate <= fechaFin) {
      const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      
      // Buscar horario para este día de la semana
      const horarioDelDia = horarios.find(h => h.dayIndex === dayOfWeek);
      
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
    if (!this.componentData?.horarios) return 0;
    return this.componentData.horarios.filter(h => h.hasException).length;
  }
}