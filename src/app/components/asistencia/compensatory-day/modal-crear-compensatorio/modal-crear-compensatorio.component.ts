import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions, createFioriGridOptionsWithDynamicResize, createFioriGridOptionsWithFullDynamicResize } from '../../../../shared/ag-grid-theme-fiori';

// Mock imports
import {
  AreaOption,
  Employee,
  CompensatoryDayFormData,
  MOCK_AREAS,
  INITIAL_FORM_DATA,
  getEmployeesByArea,
  getEmployeeStats,
  MODAL_CONFIG,
  FORM_VALIDATIONS
} from './modal-crear-compensatorio-mock';

@Component({
  selector: 'app-modal-crear-compensatorio',
  templateUrl: './modal-crear-compensatorio.component.html',
  styleUrls: ['./modal-crear-compensatorio.component.css']
})
export class ModalCrearCompensatorioComponent implements OnInit, OnDestroy {
  @Input() componentData: any = {};
  @Output() closeEvent = new EventEmitter<CompensatoryDayFormData | null>();

  private destroy$ = new Subject<void>();

  // Form y datos principales
  compensatoryForm!: FormGroup;
  formData: CompensatoryDayFormData = { ...INITIAL_FORM_DATA };
  
  // Datos para autocomplete y empleados
  areas: AreaOption[] = MOCK_AREAS;
  filteredAreas: AreaOption[] = MOCK_AREAS;
  availableEmployees: Employee[] = [];
  selectedEmployees: Employee[] = [];
  
  // Estados UI
  loading = false;
  saving = false;
  showAreaDropdown = false;
  
  // AG-Grid configuration
  availableGridApi!: GridApi;
  selectedGridApi!: GridApi;
  availableEmployeesColumnDefs: ColDef[] = [];
  selectedEmployeesColumnDefs: ColDef[] = [];
  availableEmployeesGridOptions: GridOptions = {};
  selectedEmployeesGridOptions: GridOptions = {};
  
  // Configuración visual
  config = MODAL_CONFIG;
  validations = FORM_VALIDATIONS;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupAreaSearch();
    this.setupGrids();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.compensatoryForm = this.fb.group({
      areaSearch: ['', Validators.required],
      areaId: [null, Validators.required],
      holidayWorkedDate: ['', Validators.required],
      compensatoryDayOffDate: ['', Validators.required],
      reason: ['', [
        Validators.required,
        Validators.minLength(this.validations.reason.minLength),
        Validators.maxLength(this.validations.reason.maxLength)
      ]]
    });
  }

  private setupAreaSearch(): void {
    const areaSearchControl = this.compensatoryForm.get('areaSearch');
    
    if (areaSearchControl) {
      areaSearchControl.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(searchTerm => {
          this.filterAreas(searchTerm);
        });
    }
  }

  private setupGrids(): void {
    // Configuración para la grilla de empleados disponibles
    this.availableEmployeesColumnDefs = [
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left'
      },
      {
        headerName: 'Empleado',
        field: 'fullName',
        flex: 2,
        cellRenderer: (params: any) => {
          const employee = params.data as Employee;
          return `
            <div class="flex items-center space-x-2 py-1">
              <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-xs font-medium text-blue-600">
                  ${employee.fullName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div class="text-sm font-medium text-slate-800">${employee.fullName}</div>
                <div class="text-xs text-slate-500">${employee.position}</div>
              </div>
            </div>
          `;
        }
      },
      {
        headerName: 'Documento',
        field: 'documentNumber',
        width: 100,
        cellClass: 'text-xs text-slate-600'
      }
    ];

    this.availableEmployeesGridOptions = createFioriGridOptions({
      rowSelection: 'multiple',
      suppressRowClickSelection: false,
      rowHeight: 45,
      headerHeight: 35,
      suppressHorizontalScroll: true,
      pagination: false,
      animateRows: true
    });

    // Configuración para la grilla de empleados seleccionados
    this.selectedEmployeesColumnDefs = [
      {
        headerName: 'Empleado',
        field: 'fullName',
        flex: 2,
        cellRenderer: (params: any) => {
          const employee = params.data as Employee;
          return `
            <div class="flex items-center space-x-2 py-1">
              <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span class="text-xs font-medium text-green-600">
                  ${employee.fullName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div class="text-sm font-medium text-slate-800">${employee.fullName}</div>
                <div class="text-xs text-slate-500">${employee.position}</div>
              </div>
            </div>
          `;
        }
      },
      {
        headerName: 'Documento',
        field: 'documentNumber',
        width: 100,
        cellClass: 'text-xs text-slate-600'
      },
      {
        headerName: '',
        width: 80,
        cellRenderer: () => `
          <button class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors">
            Quitar
          </button>
        `,
        onCellClicked: (params: any) => {
          this.removeEmployee(params.data);
        }
      }
    ];

    this.selectedEmployeesGridOptions = createFioriGridOptions({
      suppressRowClickSelection: true,
      rowHeight: 45,
      headerHeight: 35,
      suppressHorizontalScroll: true,
      pagination: false,
      animateRows: true
    });
  }

  private filterAreas(searchTerm: string): void {
    if (!searchTerm || searchTerm.length === 0) {
      this.filteredAreas = [...this.areas];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredAreas = this.areas.filter(area =>
      area.name.toLowerCase().includes(term) ||
      area.departmentName.toLowerCase().includes(term)
    );
  }

  // Gestión del autocomplete de áreas
  onAreaSearchFocus(): void {
    this.showAreaDropdown = true;
    this.filteredAreas = [...this.areas];
  }

  onAreaSearchBlur(): void {
    // Delay para permitir clicks en el dropdown
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }

  selectArea(area: AreaOption): void {
    this.formData.areaId = area.id;
    this.formData.areaName = area.name;
    
    // Actualizar form controls
    this.compensatoryForm.patchValue({
      areaSearch: `${area.name} (${area.departmentName})`,
      areaId: area.id
    });
    
    // Cargar empleados del área seleccionada
    this.loadEmployeesByArea(area.id);
    this.showAreaDropdown = false;
  }

  clearAreaSelection(): void {
    this.formData.areaId = 0;
    this.formData.areaName = '';
    this.availableEmployees = [];
    this.selectedEmployees = [];
    this.formData.selectedEmployees = [];
    
    this.compensatoryForm.patchValue({
      areaSearch: '',
      areaId: null
    });
  }

  private loadEmployeesByArea(areaId: number): void {
    this.loading = true;
    
    // Simular carga con delay
    setTimeout(() => {
      this.availableEmployees = getEmployeesByArea(areaId);
      this.selectedEmployees = [];
      this.formData.selectedEmployees = [];
      
      // Actualizar grillas si están inicializadas
      if (this.availableGridApi) {
        // Limpiar datos existentes y agregar nuevos
        const existingData: Employee[] = [];
        this.availableGridApi.forEachNode(node => existingData.push(node.data));
        
        this.availableGridApi.applyTransaction({
          add: this.availableEmployees,
          remove: existingData
        });
      }
      
      if (this.selectedGridApi) {
        // Limpiar empleados seleccionados
        const existingSelected: Employee[] = [];
        this.selectedGridApi.forEachNode(node => existingSelected.push(node.data));
        
        if (existingSelected.length > 0) {
          this.selectedGridApi.applyTransaction({
            remove: existingSelected
          });
        }
      }
      
      this.loading = false;
    }, 300);
  }

  // AG-Grid event handlers
  onAvailableGridReady(params: GridReadyEvent): void {
    this.availableGridApi = params.api;
  }

  onSelectedGridReady(params: GridReadyEvent): void {
    this.selectedGridApi = params.api;
  }

  onAvailableSelectionChanged(): void {
    // Este método se llamará cuando cambien las selecciones en la grilla
    const selectedRows = this.availableGridApi.getSelectedRows();
    console.log('Empleados seleccionados:', selectedRows);
  }

  getSelectedAvailableCount(): number {
    if (!this.availableGridApi) return 0;
    return this.availableGridApi.getSelectedRows().length;
  }

  addSelectedEmployees(): void {
    if (!this.availableGridApi) return;
    
    const selectedRows = this.availableGridApi.getSelectedRows();
    selectedRows.forEach(employee => {
      // Agregar a seleccionados
      this.selectedEmployees.push({ ...employee, isSelected: true });
      
      // Remover de disponibles
      const index = this.availableEmployees.findIndex(emp => emp.id === employee.id);
      if (index !== -1) {
        this.availableEmployees.splice(index, 1);
      }
    });
    
    // Actualizar formData
    this.formData.selectedEmployees = [...this.selectedEmployees];
    
    // Actualizar grillas
    this.availableGridApi.applyTransaction({
      remove: selectedRows
    });
    this.selectedGridApi?.applyTransaction({
      add: selectedRows
    });
  }

  selectEmployee(employee: Employee): void {
    // Método mantenido para compatibilidad, pero ahora se usa addSelectedEmployees
    this.selectedEmployees.push({ ...employee, isSelected: true });
    const index = this.availableEmployees.findIndex(emp => emp.id === employee.id);
    if (index !== -1) {
      this.availableEmployees.splice(index, 1);
    }
    this.formData.selectedEmployees = [...this.selectedEmployees];
  }

  removeEmployee(employee: Employee): void {
    const index = this.selectedEmployees.findIndex(emp => emp.id === employee.id);
    if (index !== -1) {
      // Mover de seleccionados a disponibles
      const availableEmp = { ...employee, isSelected: false };
      this.availableEmployees.push(availableEmp);
      this.selectedEmployees.splice(index, 1);
      
      // Actualizar formData
      this.formData.selectedEmployees = [...this.selectedEmployees];
      
      // Reordenar empleados disponibles alfabéticamente
      this.availableEmployees.sort((a, b) => a.fullName.localeCompare(b.fullName));
      
      // Actualizar grillas
      this.availableGridApi?.applyTransaction({
        add: [availableEmp]
      });
      this.selectedGridApi?.applyTransaction({
        remove: [employee]
      });
    }
  }

  selectAllEmployees(): void {
    if (!this.availableGridApi) return;
    this.availableGridApi.selectAll();
  }

  removeAllEmployees(): void {
    // Mover todos los seleccionados a disponibles
    this.selectedEmployees.forEach(emp => {
      const availableEmp = { ...emp, isSelected: false };
      this.availableEmployees.push(availableEmp);
    });
    
    this.selectedEmployees = [];
    this.formData.selectedEmployees = [];
    
    // Reordenar empleados disponibles
    this.availableEmployees.sort((a, b) => a.fullName.localeCompare(b.fullName));
    
    // Actualizar grillas usando transaction para mejor performance
    const employeesToAdd = this.selectedEmployees.map(emp => ({ ...emp, isSelected: false }));
    this.availableGridApi?.applyTransaction({
      add: employeesToAdd
    });
    this.selectedGridApi?.applyTransaction({
      remove: [...this.selectedEmployees]
    });
  }

  // Estadísticas para mostrar en UI
  get employeeStats() {
    return {
      available: this.availableEmployees.length,
      selected: this.selectedEmployees.length,
      total: this.availableEmployees.length + this.selectedEmployees.length
    };
  }

  // Validaciones del formulario
  get isFormValid(): boolean {
    return this.compensatoryForm.valid && this.selectedEmployees.length > 0;
  }

  getFieldError(fieldName: string): string | null {
    const control = this.compensatoryForm.get(fieldName);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) {
        return this.validations[fieldName as keyof typeof this.validations]?.message || `${fieldName} es requerido`;
      }
      if (control.errors['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors['maxlength']) {
        return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
      }
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

    this.saving = true;
    
    // Preparar datos finales
    const formValues = this.compensatoryForm.value;
    const finalData: CompensatoryDayFormData = {
      areaId: this.formData.areaId,
      areaName: this.formData.areaName,
      holidayWorkedDate: formValues.holidayWorkedDate,
      compensatoryDayOffDate: formValues.compensatoryDayOffDate,
      reason: formValues.reason,
      selectedEmployees: [...this.selectedEmployees]
    };

    // Simular guardado
    setTimeout(() => {
      console.log('Datos a guardar:', finalData);
      this.saving = false;
      this.closeEvent.emit(finalData);
    }, 1000);
  }

  onCancel(): void {
    this.closeEvent.emit(null);
  }

  // Utilidades para el template
  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.id;
  }
}