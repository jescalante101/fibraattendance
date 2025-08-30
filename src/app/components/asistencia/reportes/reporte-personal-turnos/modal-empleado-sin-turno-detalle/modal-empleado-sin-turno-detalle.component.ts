import { Component, Input, OnInit } from '@angular/core';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';
import { ErrorHandlerService } from 'src/app/shared/services/error-handler.service';
import { ToastService } from 'src/app/shared/services/toast.service';

@Component({
  selector: 'app-modal-empleado-sin-turno-detalle',
  templateUrl: './modal-empleado-sin-turno-detalle.component.html',
  styleUrls: ['./modal-empleado-sin-turno-detalle.component.css']
})
export class ModalEmpleadoSinTurnoDetalleComponent implements OnInit {
  @Input() data: { employeeData: Employee } = { employeeData: {} as Employee };
  
  employee: Employee = {} as Employee;
  
  activeTab: 'personal' | 'laboral' | 'estado' = 'personal';
  loading = false;

  constructor(
    private errorHandlerService: ErrorHandlerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    console.log('🔍 Modal empleado sin turno detalle - Data recibida:', this.data);
    
    if (this.data?.employeeData) {
      this.employee = this.data.employeeData;
    }
  }

  setActiveTab(tab: 'personal' | 'laboral' | 'estado'): void {
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
      return { label: 'Pendiente Asignación', color: 'bg-blue-100 text-blue-800' };
    }
  }

  private isEmployeeTerminated(): boolean {
    if (!this.employee.fechaCese) return false;
    
    const ceaseDate = new Date(this.employee.fechaCese);
    
    // Verificar si la fecha es 1/1/1900 (fecha por defecto del sistema que indica que NO está cesado)
    if (ceaseDate.getFullYear() === 1900 && ceaseDate.getMonth() === 0 && ceaseDate.getDate() === 1) {
      return false;
    }
    
    const today = new Date();
    return ceaseDate <= today;
  }

  private isEmployeeOnVacation(): boolean {
    if (!this.employee.vacacionesActivo || !this.employee.vacacionesFechaInicio || !this.employee.vacacionesFechaFin) {
      return false;
    }
    
    const today = new Date();
    const vacationStart = new Date(this.employee.vacacionesFechaInicio);
    const vacationEnd = new Date(this.employee.vacacionesFechaFin);
    
    return today >= vacationStart && today <= vacationEnd;
  }

  // Getter para el nombre completo formateado
  get fullName(): string {
    const nombres = this.employee.nombres || '';
    const paterno = this.employee.apellidoPaterno || '';
    const materno = this.employee.apellidoMaterno || '';
    
    return `${paterno} ${materno}, ${nombres}`.replace(/,\s*$/, '').replace(/^\s*,/, '').trim();
  }

  // Getter para determinar el sexo
  get gender(): string {
    if (!this.employee.sexoId) return 'No especificado';
    return this.employee.sexoId === '01' ? 'Masculino' : 'Femenino';
  }
}