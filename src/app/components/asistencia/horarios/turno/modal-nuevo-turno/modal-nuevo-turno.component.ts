import { Component, OnInit, Input } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ShiftsService, ShiftRegister, Detalle, ShiftRegisterUpdate } from 'src/app/core/services/shifts.service';
import { ModalService } from 'src/app/shared/modal/modal.service';

@Component({
  selector: 'app-modal-nuevo-turno',
  templateUrl: './modal-nuevo-turno.component.html',
  styleUrls: ['./modal-nuevo-turno.component.css'],
})
export class ModalNuevoTurnoComponent implements OnInit {
  @Input() data: any; // Recibe datos del modal genérico
  modalRef: any;      // Referencia al modal genérico para cerrarlo

  // Propiedades para el turno
  nombreTurno: string = '';
  turnoAutomatico: boolean = false;
  
  // Modo del modal: 'create' | 'edit'
  modalMode: 'create' | 'edit' = 'create';
  turnoId: number | null = null;

  // Propiedades para la tabla de horarios
  dataHorarios: any[] = [];
  horariosSeleccionados: any[] = [];
  totalRecords: number = 0;
  pageSize: number = 50;
  pageNumber: number = 1;

  // Vista seleccionada
  tipoVistaHorario: string = 'Semana';

  // Días de la semana y mes
  diasSemana: string[] = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb'];
  diasMes: number[] = [];
  diasMesColumnas: string[] = [];

  // Ciclo
  cicloValor: number = 1;

  // Para mostrar contenido en cards
  mostrarContenidoCard: boolean[] = [];
  mostrarContenidoCardSemana: boolean[][] = [];
  mostrarContenidoCardMes: boolean[][] = [];

  // Para Día: un array de arrays, cada fila puede tener varios horarios seleccionados
  horariosDiaPorFila: any[][] = [];

  // Para Semana: array de filas, cada fila es un objeto { [dia]: any[] }
  horariosSemanaPorFila: { [dia: string]: any[] }[] = [];

  // Para Mes: array de filas, cada fila es un array de días, cada día es un array de horarios
  horariosMesPorFila: any[][][] = [];

  // Usuario
  usuario: string = '';



  constructor(
    private attendanceService: AttendanceService,
    private shiftsService: ShiftsService,
    private modalService: ModalService,
    private authService: AuthService,


  ) {}

  ngOnInit() {
    this.loadHorarios();
    this.initSemana();
    this.initMes(new Date().getFullYear(), new Date().getMonth());
    this.initDia();
    
    // Verificar si es modo edición
    if (this.data && this.data.turno) {
      this.modalMode = 'edit';
      // Los datos se cargarán en loadHorarios() después de obtener la lista de horarios
    }
    this.getUsuario();
  }

  // Obtener el usuario desde el servicio de autenticación
  getUsuario() {
    this.usuario = this.authService.getCurrentUser()?.username || '';

  }


  loadHorarios() {
    this.attendanceService.getHorarios(this.pageNumber, this.pageSize).subscribe(
      (data) => {
        this.dataHorarios = data.data;
        this.totalRecords = data.totalRecords;
        
        // Si estamos en modo edición, cargar los datos después de obtener los horarios
        if (this.modalMode === 'edit' && this.data && this.data.turno) {
          this.loadTurnoData(this.data.turno);
        }
      },
      (error) => {
        alert('Error al cargar los horarios');
      }
    );
  }

  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1;
    this.loadHorarios();
  }

  toggleHorarioSelection(horario: any) {
    const index = this.horariosSeleccionados.findIndex(h => h.idHorio === horario.idHorio);
    if (index === -1) {
      this.horariosSeleccionados.push(horario);
    } else {
      this.horariosSeleccionados.splice(index, 1);
    }
  }

  isSelected(horario: any): boolean {
    return this.horariosSeleccionados.findIndex(h => h.idHorio === horario.idHorio) !== -1;
  }

  // Inicializa para Día
  initDia() {
    this.horariosDiaPorFila = Array(this.cicloValor).fill(null).map(() => []);
    this.mostrarContenidoCard = Array(this.cicloValor).fill(false);
  }

  // Inicializa para Semana
  initSemana() {
    this.horariosSemanaPorFila = [];
    this.mostrarContenidoCardSemana = [];
    for (let i = 0; i < this.cicloValor; i++) {
      const semana: { [key: string]: any[] } = {};
      this.diasSemana.forEach(dia => {
        semana[dia] = [];
      });
      this.horariosSemanaPorFila.push(semana);
      this.mostrarContenidoCardSemana.push(Array(this.diasSemana.length).fill(false));
    }
  }

  // Inicializa para Mes
  initMes(year: number, month: number) {
    const diasEnElMes = new Date(year, month + 1, 0).getDate();
    this.diasMes = Array.from({ length: diasEnElMes }, (_, i) => i + 1);
    this.diasMesColumnas = this.diasMes.map((_, i) => 'dia' + i);
    this.horariosMesPorFila = [];
    this.mostrarContenidoCardMes = [];
    for (let i = 0; i < this.cicloValor; i++) {
      this.horariosMesPorFila.push(Array(diasEnElMes).fill(null).map(() => []));
      this.mostrarContenidoCardMes.push(Array(diasEnElMes).fill(false));
    }
  }

  // Cuando haces click en un card de Día
  onCardClick(i: number) {
    this.mostrarContenidoCard[i] = !this.mostrarContenidoCard[i];
  }

  // Cuando haces click en un card de Semana
  onCardClickSemana(i: number, j: number) {
    this.mostrarContenidoCardSemana[i][j] = !this.mostrarContenidoCardSemana[i][j];
  }

  // Cuando haces click en un card de Mes
  onCardClickMes(i: number, j: number) {
    this.mostrarContenidoCardMes[i][j] = !this.mostrarContenidoCardMes[i][j];
  }

  // Para agregar/quitar horarios seleccionados en cada card
  toggleHorarioEnDia(i: number, horario: any) {
    const idx = this.horariosDiaPorFila[i].findIndex(h => h.idHorio === horario.idHorio);
    if (idx === -1) {
      this.horariosDiaPorFila[i].push(horario);
    } else {
      this.horariosDiaPorFila[i].splice(idx, 1);
    }
  }

  toggleHorarioEnSemana(i: number, dia: string, horario: any) {
    const idx = this.horariosSemanaPorFila[i][dia].findIndex(h => h.idHorio === horario.idHorio);
    if (idx === -1) {
      this.horariosSemanaPorFila[i][dia].push(horario);
    } else {
      this.horariosSemanaPorFila[i][dia].splice(idx, 1);
    }
  }

  toggleHorarioEnMes(i: number, j: number, horario: any) {
    const idx = this.horariosMesPorFila[i][j].findIndex(h => h.idHorio === horario.idHorio);
    if (idx === -1) {
      this.horariosMesPorFila[i][j].push(horario);
    } else {
      this.horariosMesPorFila[i][j].splice(idx, 1);
    }
  }

  // Devuelve los horarios seleccionados para mostrar en el card
  getHorariosSeleccionadosPorCardDia(i: number): string {
    return this.horariosDiaPorFila[i].map(h => h.nombre).join(', ') || 'Sin horario';
  }
  getHorariosSeleccionadosPorCardSemana(i: number, dia: string): string {
    return this.horariosSemanaPorFila[i][dia].map(h => h.nombre).join(', ') || 'Sin horario';
  }
  getHorariosSeleccionadosPorCardMes(i: number, j: number): string {
    return this.horariosMesPorFila[i][j].map(h => h.nombre).join(', ') || 'Sin horario';
  }

  guardarTurno() {
    if (!this.nombreTurno.trim()) {
      alert('Debe ingresar un nombre para el turno');
      return;
    }

    
    
    if (this.modalMode === 'edit' && this.turnoId) {
      const shiftRegister: ShiftRegisterUpdate = this.buildShiftRegisterUpdate();
      // Actualizar turno existente
      console.log("shiftRegister Update", shiftRegister);


      this.shiftsService.updateShift(shiftRegister, this.turnoId).subscribe(
        (response) => {
          console.log('Turno actualizado exitosamente:', response);
          if (this.modalRef) {
            this.modalRef.closeModalFromChild(response);
          }
        },
        (error) => {
          console.error('Error al actualizar turno:', error);
          alert('Error al actualizar el turno. Por favor intente nuevamente.');
        }
      );
    } else {
      const shiftRegister: ShiftRegister = this.buildShiftRegister();
      // Crear nuevo turno
      this.shiftsService.registerShift(shiftRegister).subscribe(
        (response) => {
          console.log('Turno registrado exitosamente:', response);
          if (this.modalRef) {
            this.modalRef.closeModalFromChild(response);
          }
        },
        (error) => {
          console.error('Error al registrar turno:', error);
          alert('Error al registrar el turno. Por favor intente nuevamente.');
        }
      );
    }
  }

  cancelar() {
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    }
  }

  onCicloValorChange() {
    if (this.tipoVistaHorario === 'Semana') {
      this.initSemana();
    } else if (this.tipoVistaHorario === 'Mes') {
      this.initMes(new Date().getFullYear(), new Date().getMonth());
    } else if (this.tipoVistaHorario === 'Dia') {
      this.initDia();
    }
  }

  isHorarioCheckedDia(i: number, horario: any): boolean {
    return this.horariosDiaPorFila[i].some(h => h.idHorio === horario.idHorio);
  }

  // Para Semana
  isHorarioCheckedSemana(i: number, dia: string, horario: any): boolean {
    return this.horariosSemanaPorFila[i][dia].some(h => h.idHorio === horario.idHorio);
  }

  // Para Mes
  isHorarioCheckedMes(i: number, j: number, horario: any): boolean {
    return this.horariosMesPorFila[i][j].some(h => h.idHorio === horario.idHorio);
  }

  asignarHorariosSeleccionadosASemana(i: number, dia: string) {
    this.horariosSemanaPorFila[i][dia] = [...this.horariosSeleccionados];
  }

  limpiarHorariosSemanaCelda(i: number, dia: string) {
    this.horariosSemanaPorFila[i][dia] = [];
  }

  asignarHorariosSeleccionadosADia(i: number) {
    this.horariosDiaPorFila[i] = [...this.horariosSeleccionados];
  }

  limpiarHorariosDiaCelda(i: number) {
    this.horariosDiaPorFila[i] = [];
  }

  asignarHorariosSeleccionadosAMes(i: number, j: number) {
    this.horariosMesPorFila[i][j] = [...this.horariosSeleccionados];
  }

  limpiarHorariosMesCelda(i: number, j: number) {
    this.horariosMesPorFila[i][j] = [];
  }

  /**
   * Construye el objeto ShiftRegister desde los datos del formulario
   */
  private buildShiftRegister(): ShiftRegister {
    const detalles: Detalle[] = [];

    // Mapear según el tipo de vista seleccionada
    if (this.tipoVistaHorario === 'Semana') {
      detalles.push(...this.buildDetallesFromSemana());
    } else if (this.tipoVistaHorario === 'Dia') {
      detalles.push(...this.buildDetallesFromDia());
    } else if (this.tipoVistaHorario === 'Mes') {
      detalles.push(...this.buildDetallesFromMes());
    }

    return {
      alias: this.nombreTurno,
      cycleUnit: this.getCycleUnit(),
      shiftCycle: this.cicloValor,
      workWeekend: true, // Valor por defecto, se puede hacer configurable
      weekendType: 0,    // Valor por defecto
      workDayOff: false, // Valor por defecto
      dayOffType: 0,     // Valor por defecto
      autoShift: this.turnoAutomatico,
      detalles: detalles,
      createdBy: this.usuario,
      createdAt: new Date().toISOString(),


      active: 'Y'
    };
  }

  /**
   * Construye el objeto ShiftRegister desde los datos del formulario
   */
  private buildShiftRegisterUpdate(): ShiftRegisterUpdate {
    const detalles: Detalle[] = [];

    // Mapear según el tipo de vista seleccionada
    if (this.tipoVistaHorario === 'Semana') {
      detalles.push(...this.buildDetallesFromSemana());
    } else if (this.tipoVistaHorario === 'Dia') {
      detalles.push(...this.buildDetallesFromDia());
    } else if (this.tipoVistaHorario === 'Mes') {
      detalles.push(...this.buildDetallesFromMes());
    }

    return {
      alias: this.nombreTurno,
      cycleUnit: this.getCycleUnit(),
      shiftCycle: this.cicloValor,
      workWeekend: true, // Valor por defecto, se puede hacer configurable
      weekendType: 0,    // Valor por defecto
      workDayOff: false, // Valor por defecto
      dayOffType: 0,     // Valor por defecto
      autoShift: this.turnoAutomatico,
      detalles: detalles,
      updatedBy: this.usuario,
      updatedAt: new Date().toISOString(),



      active: 'Y'
    };
  }

  /**
   * Obtiene el cycleUnit basado en el tipo de vista
   */
  private getCycleUnit(): number {
    switch (this.tipoVistaHorario) {
      case 'Semana': return 1; // Semanal
      case 'Dia': return 0;    // Diario
      case 'Mes': return 2;    // Mensual (si existe)
      default: return 1;
    }
  }

  /**
   * Construye detalles desde la vista Semana
   */
  private buildDetallesFromSemana(): Detalle[] {
    const detalles: Detalle[] = [];
    
    this.horariosSemanaPorFila.forEach((semana, semanaIndex) => {
      this.diasSemana.forEach((dia, diaIndex) => {
        const horariosDelDia = semana[dia];
        if (horariosDelDia && horariosDelDia.length > 0) {
          horariosDelDia.forEach(horario => {
            const dayIndex = this.calculateDayIndex(semanaIndex, diaIndex);
            detalles.push({
              timeIntervalId: horario.idHorio,
              dayIndex: dayIndex
            });
          });
        }
      });
    });

    return detalles;
  }

  /**
   * Construye detalles desde la vista Día
   */
  private buildDetallesFromDia(): Detalle[] {
    const detalles: Detalle[] = [];

    this.horariosDiaPorFila.forEach((horarios, diaIndex) => {
      if (horarios && horarios.length > 0) {
        horarios.forEach(horario => {
          detalles.push({
            timeIntervalId: horario.idHorio,
            dayIndex: diaIndex
          });
        });
      }
    });

    return detalles;
  }

  /**
   * Construye detalles desde la vista Mes
   */
  private buildDetallesFromMes(): Detalle[] {
    const detalles: Detalle[] = [];

    this.horariosMesPorFila.forEach((mes, mesIndex) => {
      mes.forEach((horarios, diaIndex) => {
        if (horarios && horarios.length > 0) {
          horarios.forEach(horario => {
            const dayIndex = this.calculateDayIndexForMonth(mesIndex, diaIndex);
            detalles.push({
              timeIntervalId: horario.idHorio,
              dayIndex: dayIndex
            });
          });
        }
      });
    });

    return detalles;
  }

  /**
   * Calcula el dayIndex para múltiples semanas
   * @param semanaIndex - Índice de la semana (0, 1, 2...)
   * @param diaIndex - Índice del día en la semana (0=Dom, 1=Lun, etc.)
   */
  private calculateDayIndex(semanaIndex: number, diaIndex: number): number {
    return (semanaIndex * 7) + diaIndex;
  }

  /**
   * Calcula el dayIndex para múltiples meses
   * @param mesIndex - Índice del mes
   * @param diaIndex - Índice del día en el mes
   */
  private calculateDayIndexForMonth(mesIndex: number, diaIndex: number): number {
    // Para meses, cada día tiene su propio índice secuencial
    return (mesIndex * 31) + diaIndex; // Asumiendo máximo 31 días por mes
  }

  /**
   * Carga los datos de un turno existente para edición
   */
  private loadTurnoData(turno: any) {
    console.log('=== CARGANDO DATOS DEL TURNO PARA EDICIÓN ===');
    console.log('Turno recibido:', turno);
    
    this.turnoId = turno.id;
    this.nombreTurno = turno.alias;
    this.turnoAutomatico = turno.autoShift;
    this.cicloValor = turno.shiftCycle;
    
    // Determinar el tipo de vista basado en cycleUnit
    if (turno.cycleUnit === 1) {
      this.tipoVistaHorario = 'Semana';
    } else if (turno.cycleUnit === 0) {
      this.tipoVistaHorario = 'Dia';
    } else {
      this.tipoVistaHorario = 'Mes';
    }

    console.log(`📋 Configuración cargada:`); 
    console.log(`   - Nombre: ${this.nombreTurno}`);
    console.log(`   - Automático: ${this.turnoAutomatico}`);
    console.log(`   - Ciclo: ${this.cicloValor}`);
    console.log(`   - Tipo Vista: ${this.tipoVistaHorario}`);

    // Reinicializar las estructuras según el tipo
    this.onCicloValorChange();

    // Cargar los horarios asignados
    if (turno.horario && turno.horario.length > 0) {
      console.log(`📅 Procesando ${turno.horario.length} horarios asignados:`);
      turno.horario.forEach((h: any, index: number) => {
        console.log(`   ${index + 1}. DayIndex: ${h.dayIndex} | Alias: ${h.alias} | InTime: ${h.inTime}`);
      });
      
      this.loadHorarioAssignments(turno.horario);
    } else {
      console.log('⚠️ No hay horarios asignados al turno');
    }
    
    console.log('=== FIN CARGA DATOS DEL TURNO ===');
  }

  /**
   * Carga las asignaciones de horarios existentes
   */
  private loadHorarioAssignments(horarios: any[]) {
    console.log('loadHorarioAssignments - horarios recibidos:', horarios);
    console.log('loadHorarioAssignments - dataHorarios disponibles:', this.dataHorarios);
    
    // Mapear los horarios por dayIndex
    const horariosByDayIndex = new Map<number, any[]>();
    
    horarios.forEach(horario => {
      const dayIndex = horario.dayIndex;
      // Intentar diferentes campos posibles para el ID
      const timeIntervalId = horario.timeIntervalId || horario.idHorio || horario.inTime || horario.id;
      
      console.log(`Procesando horario completo:`, horario);
      console.log(`  - dayIndex: ${dayIndex}`);
      console.log(`  - timeIntervalId: ${timeIntervalId}`);
      console.log(`  - alias: ${horario.alias}`);
      
      if (!horariosByDayIndex.has(dayIndex)) {
        horariosByDayIndex.set(dayIndex, []);
      }
      
      // Buscar el horario completo en dataHorarios por diferentes criterios
      let horarioCompleto = this.dataHorarios.find(h => h.idHorio === timeIntervalId);
      
      // Si no se encuentra por idHorio, intentar por alias si existe
      if (!horarioCompleto && horario.alias) {
        horarioCompleto = this.dataHorarios.find(h => h.nombre === horario.alias);
        console.log(`Búsqueda por alias "${horario.alias}":`, horarioCompleto ? 'Encontrado' : 'No encontrado');
      }
      
      // Si aún no se encuentra, intentar por inTime
      if (!horarioCompleto && horario.inTime) {
        horarioCompleto = this.dataHorarios.find(h => h.horaEntrada === horario.inTime);
        console.log(`Búsqueda por horaEntrada "${horario.inTime}":`, horarioCompleto ? 'Encontrado' : 'No encontrado');
      }
      
      if (horarioCompleto) {
        horariosByDayIndex.get(dayIndex)!.push(horarioCompleto);
        console.log(`✅ Horario encontrado: ${horarioCompleto.nombre} para dayIndex ${dayIndex}`);
        
        // Agregarlo a horariosSeleccionados si no está ya
        if (!this.horariosSeleccionados.find(h => h.idHorio === horarioCompleto.idHorio)) {
          this.horariosSeleccionados.push(horarioCompleto);
        }
      } else {
        console.error(`❌ No se encontró horario con ningún criterio para:`, horario);
        console.log('Horarios disponibles en dataHorarios:', this.dataHorarios.map(h => ({
          idHorio: h.idHorio,
          nombre: h.nombre,
          horaEntrada: h.horaEntrada
        })));
      }
    });

    console.log('📊 Mapa final de horarios por dayIndex:', horariosByDayIndex);
    console.log('📝 Horarios seleccionados:', this.horariosSeleccionados.map(h => h.nombre));

    // Asignar a las estructuras según el tipo de vista
    if (this.tipoVistaHorario === 'Semana') {
      this.loadSemanasFromMap(horariosByDayIndex);
    } else if (this.tipoVistaHorario === 'Dia') {
      this.loadDiasFromMap(horariosByDayIndex);
    } else if (this.tipoVistaHorario === 'Mes') {
      this.loadMesesFromMap(horariosByDayIndex);
    }

    // Debug final
    this.debugFinalStructures();
  }

  /**
   * Carga horarios en estructura semanal
   */
  private loadSemanasFromMap(horariosByDayIndex: Map<number, any[]>) {    
    horariosByDayIndex.forEach((horarios, dayIndex) => {
      const semanaIndex = Math.floor(dayIndex / 7);
      const diaIndex = dayIndex % 7;
      const diaName = this.diasSemana[diaIndex];
      
      // Asegurar que el array existe
      if (!this.horariosSemanaPorFila[semanaIndex]) {
        console.warn(`Semana ${semanaIndex} no existe en horariosSemanaPorFila`);
        return;
      }
      
      if (!this.horariosSemanaPorFila[semanaIndex][diaName]) {
        console.warn(`Día ${diaName} no existe en semana ${semanaIndex}`);
        return;
      }
      
      this.horariosSemanaPorFila[semanaIndex][diaName] = [...horarios];
      console.log(`✅ Asignados ${horarios.length} horarios a semana ${semanaIndex}, día ${diaName}`);
    });
  }

  /**
   * Carga horarios en estructura diaria
   */
  private loadDiasFromMap(horariosByDayIndex: Map<number, any[]>) {
    horariosByDayIndex.forEach((horarios, dayIndex) => {
      if (dayIndex < this.horariosDiaPorFila.length) {
        this.horariosDiaPorFila[dayIndex] = [...horarios];
        console.log(`✅ Asignados ${horarios.length} horarios al día ${dayIndex}`);
      } else {
        console.warn(`DayIndex ${dayIndex} fuera de rango para horariosDiaPorFila`);
      }
    });
  }

  /**
   * Carga horarios en estructura mensual
   */
  private loadMesesFromMap(horariosByDayIndex: Map<number, any[]>) {
    horariosByDayIndex.forEach((horarios, dayIndex) => {
      const mesIndex = Math.floor(dayIndex / 31);
      const diaIndex = dayIndex % 31;
      
      if (this.horariosMesPorFila[mesIndex] && this.horariosMesPorFila[mesIndex][diaIndex]) {
        this.horariosMesPorFila[mesIndex][diaIndex] = [...horarios];
        console.log(`✅ Asignados ${horarios.length} horarios al mes ${mesIndex}, día ${diaIndex}`);
      } else {
        console.warn(`Posición no válida: mes ${mesIndex}, día ${diaIndex}`);
      }
    });
  }

  /**
   * Obtiene el título del modal según el modo
   */
  getModalTitle(): string {
    return this.modalMode === 'edit' ? 'Editar Turno' : 'Nuevo Turno';
  }

  /**
   * Obtiene el texto del botón según el modo
   */
  getButtonText(): string {
    return this.modalMode === 'edit' ? 'Actualizar Turno' : 'Guardar Turno';
  }

  /**
   * Debug: Muestra las estructuras finales después de la carga
   */
  private debugFinalStructures(): void {
    console.log('🔍 === DEBUG ESTRUCTURAS FINALES ===');
    
    if (this.tipoVistaHorario === 'Semana') {
      console.log('📅 Estructura Semanal:');
      this.horariosSemanaPorFila.forEach((semana, semanaIndex) => {
        console.log(`  Semana ${semanaIndex}:`);
        this.diasSemana.forEach(dia => {
          const horarios = semana[dia];
          if (horarios && horarios.length > 0) {
            console.log(`    ${dia}: ${horarios.map(h => h.nombre).join(', ')}`);
          }
        });
      });
    }
    
    if (this.tipoVistaHorario === 'Dia') {
      console.log('📅 Estructura Diaria:');
      this.horariosDiaPorFila.forEach((horarios, diaIndex) => {
        if (horarios && horarios.length > 0) {
          console.log(`  Día ${diaIndex}: ${horarios.map(h => h.nombre).join(', ')}`);
        }
      });
    }
    
    if (this.tipoVistaHorario === 'Mes') {
      console.log('📅 Estructura Mensual:');
      this.horariosMesPorFila.forEach((mes, mesIndex) => {
        console.log(`  Mes ${mesIndex}:`);
        mes.forEach((horarios, diaIndex) => {
          if (horarios && horarios.length > 0) {
            console.log(`    Día ${diaIndex}: ${horarios.map(h => h.nombre).join(', ')}`);
          }
        });
      });
    }
    
    console.log('🔍 === FIN DEBUG ESTRUCTURAS ===');
  }
  
}