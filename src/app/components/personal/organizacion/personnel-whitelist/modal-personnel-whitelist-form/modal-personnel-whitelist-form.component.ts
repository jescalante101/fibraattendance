import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';

import { PersonnelWhitelistService } from '../../../../../core/services/personnel-white-list.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { ErrorHandlerService } from '../../../../../shared/services/error-handler.service';

import {
  PersonnelWhitelistDto,
  PersonnelWhitelistCreateEditDto
} from '../../../../../core/models/personnel-white-list.model';

// Interfaces para empleados (puedes ajustar según tu sistema)
interface Employee {
  id: string;
  name: string;
  document?: string;
  area?: string;
  position?: string;
}

@Component({
  selector: 'app-modal-personnel-whitelist-form',
  templateUrl: './modal-personnel-whitelist-form.component.html',
  styleUrls: ['./modal-personnel-whitelist-form.component.css']
})
export class ModalPersonnelWhitelistFormComponent implements OnInit, OnDestroy {
  
  @Output() closeEvent = new EventEmitter<any>();
  
  // Form y datos
  whitelistForm!: FormGroup;
  mode: 'create' | 'edit' = 'create';
  editingItem: PersonnelWhitelistDto | null = null;
  
  // Estados
  loading = false;
  saving = false;
  
  // Autocomplete de empleados
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  showEmployeeDropdown = false;
  selectedEmployee: Employee | null = null;
  employeeSearchTerm = '';
  
  // Modal data (se inyecta desde el servicio)
  componentData: any = {};
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private personnelWhitelistService: PersonnelWhitelistService,
    private toastService: ToastService,
    private errorHandler: ErrorHandlerService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.setupFormData();
    this.loadEmployees();
    this.setupEmployeeSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.whitelistForm = this.fb.group({
      employeeSearch: ['', [Validators.required]],
      employeeId: ['', [Validators.required]],
      employeeName: ['', [Validators.required]],
      remarks: ['', [Validators.maxLength(500)]]
    });
  }

  private setupFormData(): void {
    // Obtener datos del modal
    this.mode = this.componentData?.mode || 'create';
    this.editingItem = this.componentData?.data || null;

    if (this.mode === 'edit' && this.editingItem) {
      // Llenar formulario con datos existentes
      this.whitelistForm.patchValue({
        employeeSearch: this.editingItem.employeeName,
        employeeId: this.editingItem.employeeId,
        employeeName: this.editingItem.employeeName,
        remarks: this.editingItem.remarks || ''
      });

      // Simular empleado seleccionado
      this.selectedEmployee = {
        id: this.editingItem.employeeId,
        name: this.editingItem.employeeName
      };

      this.employeeSearchTerm = this.editingItem.employeeName;
    }
  }

  private loadEmployees(): void {
    // TODO: Implementar servicio para cargar empleados
    // Por ahora usamos datos simulados
    this.employees = [
      { id: 'EMP001', name: 'Juan Pérez García', document: '12345678', area: 'Sistemas', position: 'Desarrollador' },
      { id: 'EMP002', name: 'María López Rodríguez', document: '87654321', area: 'RRHH', position: 'Analista' },
      { id: 'EMP003', name: 'Carlos Mendoza Silva', document: '11223344', area: 'Contabilidad', position: 'Contador' },
      { id: 'EMP004', name: 'Ana Martínez Torres', document: '44332211', area: 'Ventas', position: 'Ejecutiva' },
      { id: 'EMP005', name: 'Pedro González Morales', document: '55667788', area: 'Operaciones', position: 'Supervisor' }
    ];
    this.filteredEmployees = [...this.employees];
  }

  private setupEmployeeSearch(): void {
    this.whitelistForm.get('employeeSearch')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.employeeSearchTerm = searchTerm || '';
        this.filterEmployees();
        
        // Reset selected employee if search changes
        if (searchTerm !== this.selectedEmployee?.name) {
          this.selectedEmployee = null;
          this.whitelistForm.patchValue({
            employeeId: '',
            employeeName: ''
          });
        }
      });
  }

  private filterEmployees(): void {
    const term = this.employeeSearchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredEmployees = [...this.employees];
    } else {
      this.filteredEmployees = this.employees.filter(employee => 
        employee.name.toLowerCase().includes(term) ||
        employee.id.toLowerCase().includes(term) ||
        employee.document?.toLowerCase().includes(term) ||
        employee.area?.toLowerCase().includes(term)
      );
    }
  }

  // Eventos del autocomplete
  onEmployeeSearchFocus(): void {
    if (this.filteredEmployees.length === 0) {
      this.filteredEmployees = [...this.employees];
    }
    this.showEmployeeDropdown = this.filteredEmployees.length > 0;
  }

  onEmployeeSearchBlur(): void {
    setTimeout(() => {
      this.showEmployeeDropdown = false;
    }, 200);
  }

  selectEmployee(employee: Employee): void {
    this.selectedEmployee = employee;
    this.employeeSearchTerm = employee.name;
    this.showEmployeeDropdown = false;

    // Actualizar formulario
    this.whitelistForm.patchValue({
      employeeSearch: employee.name,
      employeeId: employee.id,
      employeeName: employee.name
    });
  }

  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.id;
  }

  // Validaciones
  get isFormValid(): boolean {
    return this.whitelistForm.valid && this.selectedEmployee !== null;
  }

  getFieldError(fieldName: string): string | null {
    const field = this.whitelistForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors?.['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no puede exceder ${field.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      employeeSearch: 'Empleado',
      remarks: 'Observaciones'
    };
    return labels[fieldName] || fieldName;
  }

  // Acciones del modal
  onSave(): void {
    if (!this.isFormValid) {
      this.markFormGroupTouched();
      this.toastService.warning('Validación', 'Por favor complete todos los campos requeridos');
      return;
    }

    const formData: PersonnelWhitelistCreateEditDto = {
      employeeId: this.whitelistForm.value.employeeId,
      employeeName: this.whitelistForm.value.employeeName,
      remarks: this.whitelistForm.value.remarks || null
    };

    this.saving = true;

    if (this.mode === 'create') {
      this.personnelWhitelistService.createWhitelist(formData)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.saving = false)
        )
        .subscribe({
          next: (result) => {
            this.closeModal({ success: true, message: 'Empleado agregado correctamente a la lista blanca' });
          },
          error: (error) => {
            this.errorHandler.handleSaveError(error, 'empleado en lista blanca');
          }
        });
    } else {
      this.personnelWhitelistService.updateWhitelist(this.editingItem!.id, formData)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.saving = false)
        )
        .subscribe({
          next: () => {
            this.closeModal({ success: true, message: 'Empleado actualizado correctamente en la lista blanca' });
          },
          error: (error) => {
            this.errorHandler.handleSaveError(error, 'empleado en lista blanca');
          }
        });
    }
  }

  onCancel(): void {
    this.closeModal(null);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.whitelistForm.controls).forEach(key => {
      const control = this.whitelistForm.get(key);
      control?.markAsTouched();
    });
  }

  private closeModal(result: any): void {
    this.closeEvent.emit(result);
  }

  // Getters para el template
  get modalTitle(): string {
    return this.mode === 'create' 
      ? 'Agregar Empleado a Lista Blanca'
      : 'Editar Empleado en Lista Blanca';
  }

  get saveButtonText(): string {
    if (this.saving) {
      return this.mode === 'create' ? 'Agregando...' : 'Actualizando...';
    }
    return this.mode === 'create' ? 'Agregar a Lista Blanca' : 'Actualizar Empleado';
  }
}