import { Component, Inject, Input, input, OnInit, Optional } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { HorarioShift, ShiftsService } from '../../../../../core/services/shifts.service';
import { ModalRegistrarExcepcionComponent } from '../modal-registrar-excepcion/modal-registrar-excepcion.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { MatSnackBar } from '@angular/material/snack-bar';


interface HorarioData {
  employeeName: string;
  scheduleName: string;
  startDate: string;
  endDate: string;
  horarios: {
    id: number;
    dayIndex: number;  
    inTime: string;
    workTimeDuration: number;
  }[];
}

@Component({
  selector: 'app-modal-ver-horario',
  templateUrl: './modal-ver-horario.component.html',
  styleUrls: ['./modal-ver-horario.component.css']
})
export class ModalVerHorarioComponent implements OnInit {

 // @Input() componentData: any;

  diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  diasAbreviados = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  

  modalRef: any; // Referencia al modal padre
  componentData:any;

  constructor(
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private modalService: ModalService,
    private shiftService: ShiftsService,
    private dialogConfirm: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Los datos llegan a través de componentData
    console.log('Modal Ver Horario - data:', this.data);
    this.componentData = this.data;
    console.log('ComponentData asignado:', this.componentData);
    console.log('Horarios disponibles:', this.componentData?.turno?.horario);
  }

  // Método auxiliar para verificar si hay horarios
  hasHorarios(): boolean {
    return this.componentData?.turno?.horario && this.componentData.turno.horario.length > 0;
  }

  // Método auxiliar para obtener los horarios
  getHorarios(): HorarioShift[] {
    return this.componentData?.horario || this.componentData?.turno?.horario || [];
  }

  getDayName(dayIndex: number): string {
    const dia = dayIndex % 7;
    return this.diasSemana[dia];
  }

  getDayAbbreviation(dayIndex: number): string {
    const dia = dayIndex % 7;
    return this.diasAbreviados[dia];
  }

  formatHora(dateStr: string): string {
    // Si es solo hora (ej: "08:00" o "08:00:00")
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      return dateStr.substring(0, 5);
    }
    // Si es fecha completa ISO
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  

  getHoraFin(inTime: string, workTimeDuration: number): string {
    if (!inTime || !workTimeDuration) return '';
    let inicio: Date;
  
    // Si inTime es solo hora (ej: "08:00" o "08:00:00")
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(inTime)) {
      // Usa una fecha base (hoy) y setea la hora
      const [h, m, s] = inTime.split(':').map(Number);
      inicio = new Date();
      inicio.setHours(h, m, s || 0, 0);
    } else {
      // Si es un string ISO válido
      inicio = new Date(inTime);
    }
  
    if (isNaN(inicio.getTime())) return '';
  
    inicio.setMinutes(inicio.getMinutes() + workTimeDuration);
    return inicio.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  formatFecha(fecha: string | Date): string {
    if (!fecha) return 'No definida';
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  // Método para verificar si un horario tiene excepción
  hasExceptionStyle(hasException: boolean): string {
    return hasException ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200';
  }

  // Método para el color del texto cuando hay excepción
  getExceptionTextColor(hasException: boolean): string {
    return hasException ? 'text-orange-900' : 'text-gray-900';
  }

  // Método para formatear la fecha del día
  formatDayDate(dayDate: Date | string): string {
    if (!dayDate) return '';
    return new Date(dayDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }

  // Método para verificar si una fecha es anterior a hoy
  isFechaPasada(dayDate: Date | string): boolean {
    if (!dayDate) return false;
    const fecha = new Date(dayDate);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    fecha.setHours(0, 0, 0, 0);
    return fecha < hoy;
  }

  // Método para verificar si se puede editar (fecha <= hoy)
  canEdit(dayDate: Date | string): boolean {
    if (!dayDate) return true;
    const fecha = new Date(dayDate);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    console.log('Comparando fecha:', fecha, 'con hoy:', hoy);
    return fecha < hoy;
  }

  // Método para obtener estilos de horario bloqueado
  getBlockedStyle(hasException: boolean, dayDate: Date | string): string {
    const isPasada = this.isFechaPasada(dayDate);
    if (isPasada) {
      return 'bg-gray-100 border-gray-300 opacity-75';
    }
    return hasException ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200';
  }

  // Método para obtener color de texto para horarios bloqueados
  getBlockedTextColor(hasException: boolean, dayDate: Date | string): string {
    const isPasada = this.isFechaPasada(dayDate);
    if (isPasada) {
      return 'text-gray-500';
    }
    return hasException ? 'text-orange-900' : 'text-gray-900';
  }

  // Método para manejar edición (solo si no está bloqueado)
  editarHorario(horario: HorarioShift): void {
    if (this.canEdit(horario.dayDate)) {
      console.log('No se puede editar horario de fecha pasada:', horario);
      return;
    }
    
    console.log('Abrir modal de excepción para horario:', horario);
    console.log('componentData disponible:', this.componentData);
    console.log('data disponible:', this.data);
    
    // Preparar datos para el modal de excepción
    const modalData = {
      horario: horario,
      employeeData: {
        employeeId: this.componentData?.employeeId || this.data?.employeeId,
        employeeName: this.componentData?.employeeName || this.data?.employeeName,
        assignmentId: this.componentData?.assignmentId || this.data?.assignmentId,
      }
    };
    
    console.log('modalData a enviar:', modalData);
    
    // Abrir modal de registrar excepción
    interface ModalOpenOptions {
      title: string;
      componentType: any;
      componentData: any;
      width?: string;
      height?: string;
    }

    interface ModalResult {
      success?: boolean;
      [key: string]: any;
    }

    this.modalService.open({
      title: 'Registrar Excepción de Horario',
      componentType: ModalRegistrarExcepcionComponent,
      componentData: modalData,
      width: '900px',
      height: 'auto'
    } as ModalOpenOptions).then((result: ModalResult) => {
      if (result?.success) {
      console.log('Excepción registrada exitosamente:', result);
      // Aquí puedes actualizar la vista o mostrar un mensaje de éxito
      // También podrías emitir un evento para que el componente padre se actualice
      }
    }).catch((error: unknown) => {
      console.error('Error al abrir modal de excepción:', error);
    });
  }

  // revover Exeptions
  borrarException(hours:HorarioShift){
    // modal de confimacion
     const dialogRef = this.dialogConfirm.open(ModalConfirmComponent, {
          width: '400px',
          data: {
            tipo: 'warning',
            titulo: 'Confirmar eliminación',
            mensaje: `¿Estás seguro de que deseas Remover el registro de ${hours.alias}?`,
            confirmacion: true,
            textoConfirmar: 'Eliminar'
          }
        });
        dialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (confirmed) {
            console.log("Borrar",hours.exceptionId)
            this.shiftService.removerExeption(hours.exceptionId!).subscribe({
              next: () => {
                this.snackBar.open('Registro eliminado', 'Cerrar', { duration: 3000 });
                this.cerrar();
              },
              error: () => this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 })
            });
          }
        });
  }

  cerrar(): void {
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    }
  }
}