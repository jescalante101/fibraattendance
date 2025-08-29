import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Optional, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from 'src/app/shared/services/toast.service';
import { CompensatoryDayService } from 'src/app/core/services/compensatory-day.service';
import { CreateCompensatoryDay, UpdateCompensatoryDay, CompensatoryDay } from 'src/app/core/models/compensatory-day.model';
import { HeaderConfig, HeaderConfigService } from 'src/app/core/services/header-config.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

// Interfaz para datos de entrada del modal
export interface CompensatoryDayModalData {
  mode: 'create' | 'edit';
  employee: {
    employeeId: string;
    assignmentId?: number;
    fullName: string;
    employeeArea: string;
    employeeLocation: string;
    nroDoc?: string;
  };
  compensatoryDay?: {
    id?: number;
    holidayWorkedDate: string;
    compensatoryDayOffDate: string;
    reason: string;
    status: string;
  };
}

// Interfaz para datos de salida del modal
export interface CompensatoryDayFormResult {
  success: boolean;
  data?: CompensatoryDay;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-modal-compensatory-day-form',
  templateUrl: './modal-compensatory-day-form.component.html',
  styleUrls: ['./modal-compensatory-day-form.component.css']
})
export class ModalCompensatoryDayFormComponent implements OnInit, OnDestroy {

  @Input() data: CompensatoryDayModalData | null = null;

  @Output() closeEvent = new EventEmitter<CompensatoryDayFormResult | null>();

  private destroy$ = new Subject<void>();
  
  modalRef: any;
  
  // Form y datos principales
  compensatoryForm!: FormGroup;
  
  // Estados UI
  loading = false;
  saving = false;
  
  // Configuración
  headerConfig: HeaderConfig | null = null;
  
  // Datos del empleado y modo
  employee: CompensatoryDayModalData['employee'] | null = null;
  mode: 'create' | 'edit' = 'create';
  compensatoryDayId?: number;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService,
    private compensatoryDayService: CompensatoryDayService,
    @Optional() @Inject(MAT_DIALOG_DATA) public componentData: any,
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.processInputData();
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUser(): void {
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
  }

  private processInputData(): void {
    if (!this.data) {
      console.error('❌ No se proporcionaron datos para el modal');
      this.toastService.error('Error', 'No se proporcionaron datos para el modal');
      return;
    }

    this.mode = this.data.mode;
    this.employee = this.data.employee;
    
    if (this.mode === 'edit' && this.data.compensatoryDay) {
      this.compensatoryDayId = this.data.compensatoryDay.id;
    }
    
    console.log('📋 Datos procesados:', {
      mode: this.mode,
      employee: this.employee,
      compensatoryDay: this.data.compensatoryDay
    });
  }

  private initializeForm(): void {
    const compensatoryData = this.data?.compensatoryDay;
    
    this.compensatoryForm = this.fb.group({
      holidayWorkedDate: [
        compensatoryData?.holidayWorkedDate || '', 
        Validators.required
      ],
      compensatoryDayOffDate: [
        compensatoryData?.compensatoryDayOffDate || '', 
        Validators.required
      ],
      reason: [
        compensatoryData?.reason || '', 
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(200)
        ]
      ]
    });

    // Agregar validación personalizada para fechas
    this.compensatoryForm.addValidators(this.dateValidator);
  }

  // Validador personalizado para fechas
  private dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control || typeof control.get !== 'function') {
      return null;
    }
    
    const holidayDate = control.get('holidayWorkedDate')?.value;
    const compensatoryDate = control.get('compensatoryDayOffDate')?.value;
    
    if (holidayDate && compensatoryDate) {
      const holiday = new Date(holidayDate);
      const compensatory = new Date(compensatoryDate);
      
      if (compensatory <= holiday) {
        return { invalidDateRange: true };
      }
    }
    
    return null;
  }

  // Getters para el template
  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get isFormValid(): boolean {
    return this.compensatoryForm.valid;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Editar Día Compensatorio' : 'Nuevo Día Compensatorio';
  }

  get employeeInitials(): string {
    if (!this.employee?.fullName) return 'NA';
    return this.employee.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getFieldError(fieldName: string): string | null {
    const control = this.compensatoryForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        const fieldLabels: { [key: string]: string } = {
          holidayWorkedDate: 'Fecha del feriado trabajado',
          compensatoryDayOffDate: 'Fecha del día compensatorio',
          reason: 'Razón'
        };
        return `${fieldLabels[fieldName] || fieldName} es requerido`;
      }
      if (control.errors['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors['maxlength']) {
        return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    
    // Validación personalizada de rango de fechas
    if (this.compensatoryForm.errors?.['invalidDateRange'] && 
        (fieldName === 'compensatoryDayOffDate' || fieldName === 'holidayWorkedDate')) {
      return 'La fecha compensatoria debe ser posterior a la fecha del feriado trabajado';
    }
    
    return null;
  }

  // Acciones del modal
  onSave(): void {
    if (!this.isFormValid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.compensatoryForm.controls).forEach(key => {
        this.compensatoryForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.employee) {
      this.toastService.error('Error', 'Datos del empleado no disponibles');
      return;
    }

    this.saving = true;
    const formValues = this.compensatoryForm.value;
    const currentUser = this.authService.getCurrentUser();
    const companyId = this.headerConfig?.selectedEmpresa?.companiaId || '01';

    if (this.isEditMode && this.compensatoryDayId) {
      // Modo edición
      const updateData: UpdateCompensatoryDay = {
        compensatoryDayOffDate: formValues.compensatoryDayOffDate,
        status: this.data?.compensatoryDay?.status || 'P', // Mantener estado actual
        remarks: formValues.reason
      };

      console.log('🔄 Actualizando día compensatorio:', this.compensatoryDayId, updateData);

      this.compensatoryDayService.updateCompensatoryDay(this.compensatoryDayId, updateData)
        .subscribe({
          next: () => {
            console.log('✅ Día compensatorio actualizado exitosamente');
            this.toastService.success('Éxito', 'Día compensatorio actualizado correctamente');
            
            this.saving = false;
            const result: CompensatoryDayFormResult = {
              success: true,
              mode: 'edit'
            };
            
            this.closeEvent.emit(result);
            if (this.modalRef) {
              this.modalRef.closeModalFromChild(result);
            }
          },
          error: (error) => {
            console.error('❌ Error al actualizar día compensatorio:', error);
            this.handleSaveError(error);
          }
        });
    } else {
      // Modo creación
      const createData: CreateCompensatoryDay = {
        employeeId: this.employee.employeeId,
        assignmentId: Number(this.employee.assignmentId || 0),
        holidayWorkedDate: formValues.holidayWorkedDate,
        compensatoryDayOffDate: formValues.compensatoryDayOffDate,
        remarks: formValues.reason,
        companyId: companyId
      };

      console.log('🆕 Creando día compensatorio:', createData);

      this.compensatoryDayService.createCompensatoryDay(createData)
        .subscribe({
          next: (response) => {
            console.log('✅ Día compensatorio creado exitosamente:', response);
            this.toastService.success('Éxito', `Día compensatorio creado para ${this.employee!.fullName}`);
            
            this.saving = false;
            const result: CompensatoryDayFormResult = {
              success: true,
              data: response,
              mode: 'create'
            };
            
            this.closeEvent.emit(result);
            if (this.modalRef) {
              this.modalRef.closeModalFromChild(result);
            }
          },
          error: (error) => {
            console.error('❌ Error al crear día compensatorio:', error);
            this.handleSaveError(error);
          }
        });
    }
  }

  private handleSaveError(error: any): void {
    let errorMessage = this.isEditMode 
      ? 'No se pudo actualizar el día compensatorio'
      : 'No se pudo crear el día compensatorio';
      
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    this.toastService.error('Error', errorMessage);
    this.saving = false;
  }

  onCancel(): void {
    this.closeEvent.emit(null);
  }

  // Utilidades para el template
  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES');
  }
}