

import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ModalNuevoTurnoComponent } from './modal-nuevo-turno/modal-nuevo-turno.component';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';

@Component({
  selector: 'app-turno',
  templateUrl: './turno.component.html',
  styleUrls: ['./turno.component.css']
})
export class TurnoComponent implements OnInit {

  dataHorarios: Shift[] = [];
  dataHorariosFiltrados: Shift[] = [];
  filtroTexto: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  totalRecords: number = 0;
  pageSize: number = 15;
  pageNumber: number = 1;
  datosSeleccionado: any[] = [];

  constructor(private service: ShiftsService, private modalService: ModalService,  private dialog: MatDialog,) { }

  ngOnInit() {
    this.loadTurnosData();
  }

  updateThorarioSelect(select: any[]) {
    console.log(select);
    this.datosSeleccionado = select;
  }

  loadTurnosData() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.service.getShifts(this.pageNumber, this.pageSize).subscribe(
      (data) => {
        console.log(data);
        this.dataHorarios = data.data;
        this.dataHorariosFiltrados = [...data.data];
        this.totalRecords = data.totalRecords;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error al cargar turnos:', error);
        this.errorMessage = 'No se pudieron cargar los turnos. Por favor, intente nuevamente.';
        this.isLoading = false;
        this.dataHorarios = [];
        this.dataHorariosFiltrados = [];
        this.totalRecords = 0;
      }
    );
  }

  getAreas(horario: any[]): string {
    // Extrae los alias únicos
    const aliasUnicos = Array.from(new Set(horario.map(item => item.alias)));
    return aliasUnicos.join(', ');
  }

  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24; // Usamos el módulo 24 para manejar el cambio de día
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  ExtraerHoraDeFecha(fechaHora: string ): string {
    const fecha = new Date(fechaHora);
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    const segundos = fecha.getSeconds();
    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  calcularHoraSalida(horaIngreso: string, tiempoTrabajoMinutos: number): string {
    const horaIngresoCorta = horaIngreso.substring(0, 5);
    const minutosIngreso = this.timeToMinutes(horaIngresoCorta);
    const minutosSalidaTotales = minutosIngreso + tiempoTrabajoMinutos;
    const horaSalida = this.minutesToTime(minutosSalidaTotales);

    if (horaIngreso.length > 5) {
      const segundos = horaIngreso.substring(5);
      return horaSalida + segundos;
    }

    return horaSalida;
  }

  onPageChangeCustom(event: any) {
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    
    // Si pageSize es 0 (mostrar todos), no recargar del servidor
    // Solo actualizar los datos filtrados localmente
    if (this.pageSize === 0) {
      // No hacer nada, los datos ya están filtrados
      return;
    } else {
      // Comportamiento normal: recargar datos del servidor
      this.loadTurnosData();
    }
  }

  openNuevoTurnoModal(): void {
    this.modalService.open({
      title: 'Nuevo Turno',
      componentType: ModalNuevoTurnoComponent,
      componentData: {},
      width: '900px'
    }).then(result => {
      if (result) {
        console.log('Turno creado:', result);
        this.loadTurnosData();
      }
    });
  }

  openEditTurnoModal(turno: Shift): void {
    this.modalService.open({
      title: 'Editar Turno',
      componentType: ModalNuevoTurnoComponent,
      componentData: { turno: turno },
      width: '900px'
    }).then(result => {
      if (result) {
        console.log('Turno actualizado:', result);
        this.loadTurnosData();
      }
    });
  }

  // Métodos para estadísticas
  getTurnosAutomaticos(): number {
    return this.dataHorarios.filter(turno => turno.autoShift).length;
  }

  getTurnosManuales(): number {
    return this.dataHorarios.filter(turno => !turno.autoShift).length;
  }

  // Método para recargar datos en caso de error
  retryLoadData(): void {
    this.loadTurnosData();
  }

  // Método para eliminar turno
  deleteTurno(turno: Shift): void {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
        width: '400px',
        height: '200px',
        hasBackdrop: true,
        data: {
          tipo: 'danger',
          titulo: '¿Eliminar horario?',
          mensaje: '¿Estás seguro de que deseas eliminar este horario? Esta acción no se puede deshacer.',
          confirmacion: true,
          textoConfirmar: 'Eliminar'
        }
      });
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // El usuario confirmó
          this.service.deleteShift(turno.id).subscribe(
        (response) => {
          console.log('Turno eliminado exitosamente:', response);
          this.loadTurnosData();
          // Resetear el error message si existía
          this.errorMessage = '';
        },
        (error) => {
          console.error('Error al eliminar turno:', error);
          this.errorMessage = `No se pudo eliminar el turno "${turno.alias}". Por favor, intente nuevamente.`;
        }
      );
        }
      });

    
  }

  // Métodos para filtrado local
  filtrarDatos(): void {
    if (!this.filtroTexto || this.filtroTexto.trim() === '') {
      this.dataHorariosFiltrados = [...this.dataHorarios];
      return;
    }

    const filtro = this.filtroTexto.toLowerCase().trim();
    this.dataHorariosFiltrados = this.dataHorarios.filter(turno => 
      turno.alias?.toLowerCase().includes(filtro) ||
      turno.id?.toString().includes(filtro) ||
      this.getAreas(turno.horario)?.toLowerCase().includes(filtro) ||
      (turno.cycleUnit === 1 ? 'semanal' : 'diario').includes(filtro) ||
      turno.shiftCycle?.toString().includes(filtro) ||
      (turno.autoShift ? 'automatico' : 'manual').includes(filtro)
    );
  }

  limpiarFiltro(): void {
    this.filtroTexto = '';
    this.dataHorariosFiltrados = [...this.dataHorarios];
  }

}
