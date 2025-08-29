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
import { ShiftsService } from 'src/app/core/services/shifts.service';
import { HolidaysService } from 'src/app/core/services/holidays.service';
import { HolidayYear, Holiday } from 'src/app/core/models/holiday.model';
import { ModalCompensatoryDayFormComponent } from 'src/app/components/asistencia/compensatory-day/modal-compensatory-day-form/modal-compensatory-day-form.component';

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
  private holidays: Holiday[] = [];
  
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
    private modalService: ModalService,
    private shiftService: ShiftsService,
    private holidaysService: HolidaysService

  ) {}

  ngOnInit(): void {
    // Si los datos vienen de un servicio de modal que los pone en 'data'
    if (this.data) {
      this.componentData = this.data;
    }
    this.processIncomingData();
    this.loadHolidays();
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
            const scheduleEvents = this.transformScheduleToEvents(response.schedule);
            const holidayEvents = this.transformHolidaysToEvents(startDate, endDate);
            const allEvents = [...scheduleEvents, ...holidayEvents];
            successCallback(allEvents);
          } else {
            const holidayEvents = this.transformHolidaysToEvents(startDate, endDate);
            this.toastService.info('Horario', 'No se encontraron horarios para este período.');
            successCallback(holidayEvents);
          }
        },
        error: (err) => {
          const holidayEvents = this.transformHolidaysToEvents(startDate, endDate);
          this.toastService.error('Horario', 'Error al cargar los horarios.');
          console.error('Error fetching schedule:', err);
          // Aún mostramos los feriados aunque falle la carga de horarios
          successCallback(holidayEvents);
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
    // Prevenir la propagación del evento para evitar que se active dateClick
    clickInfo.jsEvent.preventDefault();
    clickInfo.jsEvent.stopPropagation();
    
    const extendedProps = clickInfo.event.extendedProps;
    
    // Si es un evento de feriado, no mostrar menú contextual
    if (extendedProps.isHoliday) {
      return;
    }
    
    // Configurar información de la fecha seleccionada
    this.selectedDateInfo = {
      dateStr: clickInfo.event.startStr,
      date: extendedProps.fecha,
      hasSchedule: true,
      isException: extendedProps.scheduleDay?.isException || false,
      isPastDate: extendedProps.esFechaPasada,
      scheduleDay: extendedProps.scheduleDay
    };
    
    // Calcular posición del menú contextual basada en el evento clickeado
    const rect = clickInfo.el.getBoundingClientRect();
    this.contextMenuPosition = {
      x: rect.left + (rect.width / 2) - 100, // Centrar horizontalmente
      y: rect.bottom + 5 // Justo debajo del evento
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

  handleDateClick(dateClickInfo: any): void {
    // Verificar si es un clic directo en la celda (no en un evento)
    const target = dateClickInfo.jsEvent.target as HTMLElement;
    if (target.closest('.fc-event')) {
      return;
    }
    
    // Obtener información de la fecha clickeada
    const clickedDate = dateClickInfo.date;
    const dateStr = dateClickInfo.dateStr;
    
    // Buscar si existe un horario para esta fecha
    const scheduleDay = this.findScheduleForDate(dateStr);
    const hasSchedule = !!scheduleDay && scheduleDay.alias !== "Sin Asignación";
    
    // Solo mostrar menú si hay un horario asignado
    if (!hasSchedule) {
      return;
    }
    
    // Determinar si es fecha pasada
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(clickedDate);
    fechaComparar.setHours(0, 0, 0, 0);
    const isPastDate = fechaComparar < hoy;
    
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
    
    // Verificar si es un evento de feriado
    if (event.extendedProps.isHoliday) {
      mountInfo.el.title = this.getHolidayTooltipText(event.extendedProps.holidayData);
    } else if (event.extendedProps.scheduleDay) {
      mountInfo.el.title = this.getTooltipText(event.extendedProps.scheduleDay, event.extendedProps.fecha);
    }
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

  private getHolidayTooltipText(holiday: Holiday): string {
    const startDate = new Date(holiday.strDate);
    const endDate = new Date(holiday.endDate);
    const isMultiDay = startDate.getTime() !== endDate.getTime();
    
    if (isMultiDay) {
      return `🎉 FERIADO
    ${holiday.rmrks}
    Desde: ${startDate.toLocaleDateString('es-ES')}
    Hasta: ${endDate.toLocaleDateString('es-ES')}`;
        } else {
          return `🎉 FERIADO
    ${holiday.rmrks}
    Fecha: ${startDate.toLocaleDateString('es-ES')}`;
        }
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
    
    console.log('Eliminando excepción para:', this.selectedDateInfo.scheduleDay);
    
    // Aquí harías la llamada al API para eliminar la excepción
    this.shiftService.removerExeption(this.selectedDateInfo.scheduleDay.scheduleId).subscribe({

      next: () => {
        this.toastService.success('Excepción Eliminada', 'La excepción ha sido eliminada exitosamente');
        this.closeContextMenu();
        
        // Refrescar eventos del calendario
        if (this.calendarComponent?.getApi()) {
          this.calendarComponent.getApi().refetchEvents();
        }
      },
      error: (error) => {
        this.toastService.error('Error', 'Ocurrió un error al eliminar la excepción');
      }
    });
  }

  /**
   * Registrar día compensatorio desde el calendario
   */
  registrarDiaCompensatorio(): void {
    if (!this.selectedDateInfo) return;

    // Obtener datos del empleado desde componentData extendido
    const employeeData = (this.componentData as any)?.employeeData || 
                        (this.data as any)?.employeeData;
    
    if (!employeeData) {
      this.toastService.error('Error', 'No se pudieron obtener los datos del empleado');
      return;
    }

    const modalData = {
      mode: 'create' as const,
      employee: {
        employeeId: employeeData.employeeId,
        assignmentId: employeeData.assignmentId,
        fullName: employeeData.fullName,
        employeeArea: employeeData.employeeArea,
        employeeLocation: employeeData.employeeLocation,
        nroDoc: employeeData.nroDoc
      },
      // Pre-llenar la fecha del feriado trabajado con la fecha seleccionada
      compensatoryDay: {
        holidayWorkedDate: this.selectedDateInfo.dateStr
      }
    };

    console.log('Registrando día compensatorio para fecha:', this.selectedDateInfo.dateStr);
    console.log('Datos del modal:', modalData);

    this.modalService.open({
      title: `Registrar Día Compensatorio - ${employeeData.fullName}`,
      componentType: ModalCompensatoryDayFormComponent,
      componentData: modalData,
      width: '600px'
    }).then(result => {
      if (result && result.success) {
        this.toastService.success(
          'Éxito', 
          `Día compensatorio ${result.mode === 'create' ? 'creado' : 'actualizado'} correctamente`
        );
      }
      
      this.closeContextMenu();
    }).catch(error => {
      console.error('Error en modal de día compensatorio:', error);
      this.closeContextMenu();
    });
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

  // --- MÉTODOS PARA FERIADOS ---

  /**
   * Carga los feriados desde el servicio
   */
  private loadHolidays(): void {
    this.holidaysService.getHolidays().subscribe({
      next: (holidayYears: HolidayYear[]) => {
        // Extraer todos los feriados de todos los años
        this.holidays = holidayYears.flatMap(year => year.hld1s);
        console.log('Feriados cargados:', this.holidays.length);
        
        // Refrescar eventos del calendario si ya está renderizado
        if (this.calendarComponent?.getApi()) {
          this.calendarComponent.getApi().refetchEvents();
        }
      },
      error: (error) => {
        console.error('Error cargando feriados:', error);
        this.holidays = [];
      }
    });
  }

  /**
   * Transforma los feriados en eventos de fondo para FullCalendar
   */
  private transformHolidaysToEvents(startDate: Date, endDate: Date): EventInput[] {
    if (!this.holidays || this.holidays.length === 0) {
      return [];
    }

    return this.holidays
      .filter(holiday => {
        const holidayDate = new Date(holiday.strDate);
        const holidayEndDate = new Date(holiday.endDate);
        
        // Verificar si el feriado está dentro del rango visible del calendario
        return (holidayDate >= startDate && holidayDate <= endDate) ||
               (holidayEndDate >= startDate && holidayEndDate <= endDate) ||
               (holidayDate <= startDate && holidayEndDate >= endDate);
      })
      .map(holiday => {
        const startHoliday = new Date(holiday.strDate);
        const endHoliday = new Date(holiday.endDate);
        
        // Calcular si es un feriado de múltiples días
        const isMultiDay = startHoliday.getTime() !== endHoliday.getTime();
        
        return {
          id: `holiday-${holiday.hldCode}-${startHoliday.getTime()}`,
          title: `🎉 ${holiday.rmrks}`,
          start: this.formatDateForCalendar(startHoliday),
          end: isMultiDay ? this.formatDateForCalendar(new Date(endHoliday.getTime() + 24 * 60 * 60 * 1000)) : undefined,
          allDay: true,
          display: 'background', // Esto hace que sea un evento de fondo
          backgroundColor: '#fef3c7', // Amarillo suave para feriados
          borderColor: '#f59e0b',
          textColor: '#92400e',
          classNames: ['holiday-event'],
          extendedProps: {
            isHoliday: true,
            holidayData: holiday,
            description: holiday.rmrks
          }
        } as EventInput;
      });
  }

  /**
   * Formatea una fecha para FullCalendar (YYYY-MM-DD)
   */
  private formatDateForCalendar(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Verifica si una fecha es un día feriado
   */
  isHolidayDate(dateStr: string): boolean {
    if (!this.holidays || this.holidays.length === 0) {
      return false;
    }

    const targetDate = new Date(dateStr + 'T00:00:00');
    targetDate.setHours(0, 0, 0, 0);
    
    return this.holidays.some(holiday => {
      const holidayStart = new Date(holiday.strDate);
      const holidayEnd = new Date(holiday.endDate);
      
      holidayStart.setHours(0, 0, 0, 0);
      holidayEnd.setHours(0, 0, 0, 0);
      
      // Verificar si la fecha está dentro del rango del feriado
      return targetDate >= holidayStart && targetDate <= holidayEnd;
    });
  }
}
