import { Component, Input, OnInit } from '@angular/core';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { EmployeeScheduleHours } from 'src/app/models/employee-schedule/employee-schedule-hours.model';
import { ErrorHandlerService } from 'src/app/shared/services/error-handler.service';
import { ToastService } from 'src/app/shared/services/toast.service';

interface EmployeeDetailData {
  employee: EmployeeScheduleAssignment;
  scheduleHours?: EmployeeScheduleHours;
}

@Component({
  selector: 'app-modal-empleado-detalle',
  templateUrl: './modal-empleado-detalle.component.html',
  styleUrls: ['./modal-empleado-detalle.component.css']
})
export class ModalEmpleadoDetalleComponent implements OnInit {
  @Input() data: { employeeData: EmployeeScheduleAssignment } = { employeeData: {} as EmployeeScheduleAssignment };
  
  employee: EmployeeScheduleAssignment = {} as EmployeeScheduleAssignment;
  scheduleHours: EmployeeScheduleHours | null = null;
  
  activeTab: 'personal' | 'laboral' | 'horarios' | 'turnos' = 'personal';
  loading = false;
  loadingScheduleHours = false;

  constructor(
    private employeeScheduleService: EmployeeScheduleAssignmentService,
    private errorHandlerService: ErrorHandlerService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    console.log('🔍 Modal empleado detalle - Data recibida:', this.data);
    
    if (this.data?.employeeData) {
      this.employee = this.data.employeeData;
      this.loadScheduleHours();
    }
  }

  private loadScheduleHours(): void {
    if (!this.employee.nroDoc) return;

    this.loadingScheduleHours = true;
    this.employeeScheduleService.getEmployeeScheduleHours(
      this.employee.nroDoc,
      this.employee.fullNameEmployee || '',
      1,
      15,
      this.employee.areaId?.toString() || ''
    ).subscribe({
      next: (response) => {
        this.loadingScheduleHours = false;
        if (response.exito && response.data && response.data.items && response.data.items.length > 0) {
          this.scheduleHours = response.data.items[0];
          console.log('📅 Horarios cargados:', this.scheduleHours);
        }
      },
      error: (error) => {
        this.loadingScheduleHours = false;
        console.warn('⚠️ No se pudieron cargar los horarios:', error);
        // No mostrar error ya que los horarios son complementarios
      }
    });
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
}