import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, HostListener } from '@angular/core';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { ScheduleResponseDto, ScheduleDayDto } from 'src/app/core/models/schedule.model';
import { ScheduleService } from 'src/app/core/services/schedule.service';
import { finalize } from 'rxjs';
import { ToastService } from 'src/app/shared/services/toast.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ModalRegistrarExcepcionComponent } from '../modal-registrar-excepcion/modal-registrar-excepcion.component';

// Se mantiene la interfaz por si se usa en otro lado, pero el componente priorizará ScheduleResponseDto
export interface HorarioCalendarData {
  employeeName?: string;
  turno?: {
    alias?: string;
    id?: number;
  };
  fecha_ini?: string;
  fecha_fin?: string;
  horarios?: any[];
}

@Component({
  selector: 'app-calendar-view-horario',
  templateUrl: './calendar-view-horario.component.html',
  styleUrls: ['./calendar-view-horario.component.css']
})
export class CalendarViewHorarioComponent implements OnInit, OnChanges {
  @Input() componentData: ScheduleResponseDto | null = null;
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  // --- PROPIEDADES REFACTORIZADAS ---
  isLoading = true; // Para mostrar un spinner de carga
  scheduleData: ScheduleResponseDto | null = null;
  private employeeId: string | null = null;
  
  // Referencia al modal padre y datos (si se usan con un servicio de modal)
  modalRef: any;
  data: any;

  diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // --- PROPIEDADES PARA MENÚ CONTEXTUAL ---
  showContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedDateInfo: {
    dateStr: string;
    date: Date;
    hasSchedule: boolean;
    isException: boolean;
    isPastDate: boolean;
    scheduleDay?: any;
  } | null = null;

  // --- OPCIONES DEL CALENDARIO REFACTORIZADAS ---
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    locale: esLocale,
    headerToolbar: false, // Se maneja con nuestros propios botones para consistencia
    height: '100%',
    
    // LA MAGIA ESTÁ AQUÍ: events ahora es una función que FullCalendar llamará automáticamente
    events: this.fetchEvents.bind(this),

    eventDisplay: 'block',
    dayMaxEvents: 3,
    moreLinkClick: 'popover',
    eventClick: this.handleEventClick.bind(this),
    dateClick: this.handleDateClick.bind(this),
    eventDidMount: this.handleEventDidMount.bind(this),
    dayCellDidMount: this.handleDayCellDidMount.bind(this),
    datesSet: this.handleDatesSet.bind(this)
  };

  constructor(
    private scheduleService: ScheduleService, // Inyectamos el servicio para hacer peticiones
    private toastService: ToastService,
    private modalService: ModalService

  ) {}

  ngOnInit(): void {
    // Si los datos vienen de un servicio de modal que los pone en 'data'
    if (this.data) {
      this.componentData = this.data;
    }
    this.processIncomingData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['componentData'] && !changes['componentData'].firstChange) {
      this.processIncomingData();
      // Si los datos de entrada cambian, refrescamos los eventos del calendario
      if (this.calendarComponent?.getApi()) {
        this.calendarComponent.getApi().refetchEvents();
      }
    }
  }

  /**
   * Extrae la información necesaria del @Input.
   */
  private processIncomingData(): void {
    const data = this.componentData;
    if (data && data.schedule && data.employeeId) {
      this.scheduleData = data;
      this.employeeId = data.employeeId;
    } else {
      this.toastService.error('Horario', 'Datos de horario incompletos o en formato no reconocido.');
      this.scheduleData = null;
      this.employeeId = null;
    }
  }

  /**
   * Función que FullCalendar usa para obtener eventos dinámicamente.
   * Se ejecuta al cargar y cada vez que la vista (ej. el mes) cambia.
   */
  fetchEvents(fetchInfo:{
    start: Date;
    end: Date;
  } , successCallback: (events: EventInput[]) => void, failureCallback: (error: any) => void): void {
    if (!this.employeeId) {
      this.toastService.warning('Horario', 'No se ha proporcionado un ID de empleado.');
      successCallback([]);
      return;
    }

    this.isLoading = true;
    const startDate = fetchInfo.start;
    const endDate = fetchInfo.end;

    this.scheduleService.getScheduleByDateRange(this.employeeId, startDate, endDate)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (response && response.schedule) {
            const events = this.transformScheduleToEvents(response.schedule);
            successCallback(events);
          } else {
            this.toastService.info('Horario', 'No se encontraron horarios para este período.');
            successCallback([]);
          }
        },
        error: (err) => {
          this.toastService.error('Horario', 'Error al cargar los horarios.');
          console.error('Error fetching schedule:', err);
          failureCallback(err);
        }
      });
  }

  /**
   * Transforma los datos del API en eventos que FullCalendar puede renderizar.
   */
  private transformScheduleToEvents(scheduleDays: ScheduleDayDto[]): EventInput[] {
    return scheduleDays
      .filter((scheduleDay: ScheduleDayDto) => {
        // Filtrar días con "Sin Asignación" para mostrar celdas vacías
        return scheduleDay.alias !== "Sin Asignación";
      })
      .map((scheduleDay: ScheduleDayDto) => {
      const fechaEvento = new Date(scheduleDay.date);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      // Aseguramos que la fecha del evento no tenga en cuenta la zona horaria para la comparación
      const fechaComparar = new Date(fechaEvento.getUTCFullYear(), fechaEvento.getUTCMonth(), fechaEvento.getUTCDate());
      const esFechaPasada = fechaComparar < hoy;
      const esDiaLibre = scheduleDay.inTime === '--:--' || scheduleDay.outTime === '--:--' || scheduleDay.workTimeDurationMinutes === 0;

      return {
        id: `schedule-${scheduleDay.date}`,
        title: esDiaLibre ? 'Día Libre' : `${scheduleDay.inTime} - ${scheduleDay.outTime}`,
        start: scheduleDay.date.split('T')[0],
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
      };
    });
  }

  // --- Funciones de Coloreado (sin cambios) ---
  private getScheduleEventColor(scheduleDay: ScheduleDayDto, esFechaPasada: boolean, esDiaLibre: boolean): string {
    if (esFechaPasada) return '#e5e7eb';
    if (esDiaLibre) return '#f3f4f6';
    if (scheduleDay.isException) return '#fed7aa';
    return '#dbeafe';
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

  // --- Handlers de Eventos del Calendario ---
  handleEventClick(clickInfo: any): void {
    const extendedProps = clickInfo.event.extendedProps;
    if (extendedProps.esFechaPasada) {
      this.toastService.info('Editar Horario', 'No se puede editar un horario de una fecha pasada.');
      return;
    }
    this.editarHorario(extendedProps.scheduleDay, extendedProps.fecha);
  }

  handleDateClick(dateClickInfo: any): void {
    console.log('Fecha clickeada:', dateClickInfo.dateStr);
    
    // Obtener información de la fecha clickeada
    const clickedDate = dateClickInfo.date;
    const dateStr = dateClickInfo.dateStr;
    
    // Determinar si es fecha pasada
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(clickedDate);
    fechaComparar.setHours(0, 0, 0, 0);
    const isPastDate = fechaComparar < hoy;
    
    // Buscar si existe un horario para esta fecha
    const scheduleDay = this.findScheduleForDate(dateStr);
    const hasSchedule = !!scheduleDay;
    const isException = scheduleDay?.isException || false;
    
    // Configurar información de la fecha seleccionada
    this.selectedDateInfo = {
      dateStr: dateStr,
      date: clickedDate,
      hasSchedule: hasSchedule,
      isException: isException,
      isPastDate: isPastDate,
      scheduleDay: scheduleDay
    };
    
    // Calcular posición del menú contextual
    const rect = dateClickInfo.dayEl.getBoundingClientRect();
    this.contextMenuPosition = {
      x: rect.left + (rect.width / 2) - 100, // Centrar horizontalmente
      y: rect.bottom + 5 // Justo debajo de la celda
    };
    
    // Ajustar posición si se sale de la pantalla
    const menuWidth = 200;
    const menuHeight = 250;
    
    if (this.contextMenuPosition.x + menuWidth > window.innerWidth) {
      this.contextMenuPosition.x = window.innerWidth - menuWidth - 10;
    }
    if (this.contextMenuPosition.x < 10) {
      this.contextMenuPosition.x = 10;
    }
    if (this.contextMenuPosition.y + menuHeight > window.innerHeight) {
      this.contextMenuPosition.y = rect.top - menuHeight - 5; // Mostrar arriba
    }
    
    // Mostrar menú contextual
    this.showContextMenu = true;
  }

  handleEventDidMount(mountInfo: any): void {
    const { event } = mountInfo;
    mountInfo.el.title = this.getTooltipText(event.extendedProps.scheduleDay, event.extendedProps.fecha);
  }
  
  handleDayCellDidMount(mountInfo: any): void {
    const hoy = new Date();
    if (mountInfo.date.toDateString() === hoy.toDateString()) {
      mountInfo.el.classList.add('dia-actual');
    }
  }

  handleDatesSet(dateInfo: any): void {
    // Forzamos a re-renderizar el header para actualizar el título del mes/año
    // Esto es un pequeño truco por si Angular no detecta el cambio automáticamente
    this.calendarComponent.getApi().updateSize();
  }

  private getTooltipText(scheduleDay: ScheduleDayDto, fecha: Date): string {
    const dayName = this.diasSemana[fecha.getUTCDay()];
    const fechaStr = fecha.toLocaleDateString('es-ES', { timeZone: 'UTC' });
    
    if (scheduleDay.isException) {
      return `${dayName} ${fechaStr}
Excepción: ${scheduleDay.isException || 'Detalle no disponible'}`;
    }
    
    if (scheduleDay.inTime === '--:--') {
      return `${dayName} ${fechaStr}
Día Libre`;
    }

    const duracion = this.formatDuracion(scheduleDay.workTimeDurationMinutes);
    return `${dayName} ${fechaStr}
Horario: ${scheduleDay.inTime} - ${scheduleDay.outTime}
Duración: ${duracion}`;
  }

  private formatDuracion(minutes: number): string {
    if (minutes === undefined || minutes === null) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  private editarHorario(scheduleDay: ScheduleDayDto, fecha: Date): void {
    console.log('Editar horario:', scheduleDay, 'para fecha:', fecha);
    this.toastService.info('Editar Horario', 'La funcionalidad de edición aún no está implementada.');
    // Aquí se llamaría al modal de edición
  }

  // --- Controles de Navegación ---
  previousMonth(): void {
    this.calendarComponent?.getApi().prev();
  }

  nextMonth(): void {
    this.calendarComponent?.getApi().next();
  }

  goToToday(): void {
    this.calendarComponent?.getApi().today();
  }

  getCurrentViewTitle(): string {
    return this.calendarComponent?.getApi()?.view.title || 'Cargando...';
  }

  // --- Métodos para la Cabecera (sin cambios) ---
  getEmployeeName(): string {
    return this.scheduleData?.fullNameEmployee || 'Empleado';
  }

  getTurnoInfo(): string {
    return this.scheduleData?.shiftInfo?.alias || 'No definido';
  }

  getDateRange(): string {
    if (this.scheduleData?.queryRange) {
      const start = new Date(this.scheduleData.queryRange.startDate).toLocaleDateString('es-ES');
      const end = new Date(this.scheduleData.queryRange.endDate).toLocaleDateString('es-ES');
      return `${start} - ${end}`;
    }
    return 'Rango no definido';
  }

  getTotalSchedulesCount(): number {
    if (!this.scheduleData?.schedule) return 0;
    
    // Contar solo los días que tienen horario real (no "Sin Asignación")
    return this.scheduleData.schedule.filter(s => s.alias !== "Sin Asignación").length;
  }

  getExceptionsCount(): number {
    return this.scheduleData?.schedule?.filter(s => s.isException).length || 0;
  }

  // --- MÉTODOS PARA MENÚ CONTEXTUAL ---

  /**
   * Busca el horario para una fecha específica
   */
  private findScheduleForDate(dateStr: string): any {
    if (!this.scheduleData?.schedule) return null;
    
    return this.scheduleData.schedule.find(schedule => 
      schedule.date.split('T')[0] === dateStr
    );
  }

  /**
   * Cierra el menú contextual
   */
  closeContextMenu(): void {
    this.showContextMenu = false;
    this.selectedDateInfo = null;
  }

  /**
   * Ver detalles del horario
   */
  viewScheduleDetails(): void {
    if (!this.selectedDateInfo?.scheduleDay) return;
    
    const schedule = this.selectedDateInfo.scheduleDay;
    const details = `
Fecha: ${this.selectedDateInfo.date.toLocaleDateString('es-ES')}
Día: ${schedule.dayName}
Horario: ${schedule.inTime} - ${schedule.outTime}
Duración trabajo: ${this.formatDuracion(schedule.workTimeDurationMinutes)}
Duración total: ${this.formatDuracion(schedule.duration)}
${schedule.isException ? '⚠️ Excepción activa' : ''}
${schedule.alias ? 'Alias: ' + schedule.alias : ''}
    `.trim();
    
    this.toastService.info('Detalles del Horario', details);
    this.closeContextMenu();
  }

  /**
   * Editar horario existente
   */
  editSchedule(): void {
    if (!this.selectedDateInfo?.scheduleDay) return;
    
    console.log('Editando horario para:', this.selectedDateInfo.dateStr);
    console.log('Datos del horario:', this.selectedDateInfo.scheduleDay);
    
    // Aquí integrarías con el modal de edición existente
    this.toastService.info('Editar Horario', 'Funcionalidad de edición en desarrollo');
    this.closeContextMenu();
  }

  /**
   * Agregar excepción para una fecha
   */
  addException(): void {
    if (!this.selectedDateInfo) return;

    console.log('selectedDateInfo para excepción:', this.selectedDateInfo);
    console.log('scheduleDay con scheduleId:', this.selectedDateInfo.scheduleDay);

    const modalData = {
      horario: this.selectedDateInfo,
      employeeData: {
        employeeId: this.componentData?.employeeId || this.data?.employeeId,
        employeeName: this.componentData?.fullNameEmployee || this.data?.employeeName,
        assignmentId: this.componentData?.assignmentId || this.data?.assignmentId,
        scheduleId: this.selectedDateInfo.scheduleDay?.scheduleId // Nuevo campo agregado
      }
    };

    this.modalService.open({
      title: 'Registrar Excepción de Horario',
      componentType: ModalRegistrarExcepcionComponent,
      componentData: modalData,
      width: '900px',
      height: 'auto'
    });

    
    console.log('Agregando excepción para:', this.selectedDateInfo.dateStr);
    
    // Aquí integrarías con un modal para crear excepciones
    this.toastService.info('Agregar Excepción', 'Funcionalidad de excepciones en desarrollo');
    this.closeContextMenu();
  }

  /**
   * Eliminar excepción existente
   */
  removeException(): void {
    if (!this.selectedDateInfo?.isException) return;
    
    console.log('Eliminando excepción para:', this.selectedDateInfo.dateStr);
    
    // Aquí harías la llamada al API para eliminar la excepción
    this.toastService.success('Excepción Eliminada', 'La excepción ha sido eliminada exitosamente');
    this.closeContextMenu();
    
    // Refrescar eventos del calendario
    if (this.calendarComponent?.getApi()) {
      this.calendarComponent.getApi().refetchEvents();
    }
  }

  /**
   * Listener global para cerrar menú al hacer clic fuera
   */
  @HostListener('document:click', ['$event'])
  onGlobalClick(event: MouseEvent): void {
    if (this.showContextMenu) {
      // Verificar si el clic fue dentro del menú contextual
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        this.closeContextMenu();
      }
    }
  }

  /**
   * Listener para cerrar menú con tecla Escape
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showContextMenu) {
      this.closeContextMenu();
    }
  }
}
