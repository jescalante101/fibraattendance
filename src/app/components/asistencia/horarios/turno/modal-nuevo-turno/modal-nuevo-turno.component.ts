import { Component, OnInit, Input } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';

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

  constructor(
    private attendanceService: AttendanceService
  ) {}

  ngOnInit() {
    this.loadHorarios();
    this.initSemana();
    this.initMes(new Date().getFullYear(), new Date().getMonth());
    this.initDia();
  }

  loadHorarios() {
    this.attendanceService.getHorarios(this.pageNumber, this.pageSize).subscribe(
      (data) => {
        this.dataHorarios = data.data;
        this.totalRecords = data.totalRecords;
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
    if (this.modalRef) {
      this.modalRef.closeModalFromChild({
        nombre: this.nombreTurno,
        automatico: this.turnoAutomatico,
        horarios: this.horariosSeleccionados,
        dia: this.horariosDiaPorFila,
        semana: this.horariosSemanaPorFila,
        mes: this.horariosMesPorFila
      });
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
  
}