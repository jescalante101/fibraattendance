import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from '../../../../../shared/ag-grid-theme-fiori';

export interface BulkPersonnelWhitelistFormData {
  sedeId: string;
  sedeName: string;
  areaId: string;
  areaName: string;
  remarks: string;
  selectedEmployees: Employee[];
}

const INITIAL_FORM_DATA: BulkPersonnelWhitelistFormData = {
  sedeId: '',
  sedeName: '',
  areaId: '',
  areaName: '',
  remarks: '',
  selectedEmployees: []
};

import { PersonnelWhitelistService } from '../../../../../core/services/personnel-white-list.service';
import { PersonService, EmployeesParameters } from '../../../../../core/services/person.service';
import { RhAreaService, RhArea } from '../../../../../core/services/rh-area.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../../core/services/categoria-auxiliar.service';
import { HeaderConfigService, HeaderConfig } from '../../../../../core/services/header-config.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { ErrorHandlerService } from '../../../../../shared/services/error-handler.service';
import { PersonnelWhitelistCreateEditDto } from '../../../../../core/models/personnel-white-list.model';
import { Employee } from '../../../../personal/empleado/empleado/model/employeeDto';

interface EmployeeStats {
  available: number;
  selected: number;
}

@Component({
  selector: 'app-modal-bulk-personnel-whitelist',
  templateUrl: './modal-bulk-personnel-whitelist.component.html',
  styleUrls: ['./modal-bulk-personnel-whitelist.component.css']
})
export class ModalBulkPersonnelWhitelistComponent implements OnInit, OnDestroy {
  @Input() componentData: any = {};
  @Output() closeEvent = new EventEmitter<BulkPersonnelWhitelistFormData | null>();

  private destroy$ = new Subject<void>();

  // Form y datos principales
  bulkForm!: FormGroup;
  formData: BulkPersonnelWhitelistFormData = { ...INITIAL_FORM_DATA };
  
  // Datos para autocomplete y empleados
  allSedes: CategoriaAuxiliar[] = [];
  allAreas: RhArea[] = [];
  filteredSedes: CategoriaAuxiliar[] = [];
  filteredAreas: RhArea[] = [];
  availableEmployees: Employee[] = [];
  selectedEmployees: Employee[] = [];
  totalEmployees = 0;
  loadingEmployees = false;
  
  // Estados UI
  loading = false;
  saving = false;
  
  // Autocomplete states
  sedeSearchTerm = '';
  showSedeDropdown = false;
  highlightedSedeIndex = -1;
  
  areaSearchTerm = '';
  showAreaDropdown = false;
  highlightedAreaIndex = -1;
  
  // AG-Grid configuration
  availableGridApi!: GridApi;
  selectedGridApi!: GridApi;
  availableEmployeesColumnDefs: ColDef[] = [];
  selectedEmployeesColumnDefs: ColDef[] = [];
  availableEmployeesGridOptions: GridOptions = {};
  selectedEmployeesGridOptions: GridOptions = {};
  modalRef: any; 
  
  // Configuración visual
  employeeStats: EmployeeStats = {
    available: 0,
    selected: 0
  };

  headerConfig: HeaderConfig | null = null;
  
  constructor(
    private fb: FormBuilder,
    private personnelWhitelistService: PersonnelWhitelistService,
    private personService: PersonService,
    private rhAreaService: RhAreaService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService,
    private errorHandler: ErrorHandlerService
  ) {
    this.initializeForm();
    this.setupGridColumns();
    this.setupGridOptions();
  }

  ngOnInit(): void {
    this.headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    this.loadSedes();
    this.setupFormWatchers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.bulkForm = this.fb.group({
      sedeSearch: ['', [Validators.required]],
      areaSearch: ['', [Validators.required]], 
      remarks: ['', [Validators.maxLength(500)]]
    });
  }

  private setupGridOptions(): void {
    this.availableEmployeesGridOptions = {
      ...createFioriGridOptions(),
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      onGridReady: (params) => { this.onAvailableGridReady(params); },
      onSelectionChanged: () => { this.onAvailableSelectionChanged(); }
    };
    
    this.selectedEmployeesGridOptions = {
      ...createFioriGridOptions(),
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      onGridReady: (params) => { this.selectedGridApi = params.api; }
    };
  }

  private setupGridColumns(): void {
    // Columnas empleados disponibles
    this.availableEmployeesColumnDefs = [
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left'
      },
      {
        headerName: 'N° Doc',
        field: 'nroDoc',
        width: 120,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="font-mono">${params.value}</span>
          </div>`;
        }
      },
      {
        headerName: 'Personal',
        field: 'empleado',
        width: 280,
        cellRenderer: (params: any) => {
          const emp = params.data;
          const fullName = `${emp.apellidoPaterno} ${emp.apellidoMaterno}, ${emp.nombres}`;
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900" title="${fullName}">${fullName}</div>
            </div>
          </div>`;
        }
      },
      {
        headerName: 'Sede',
        field: 'categoriaAuxiliarDescripcion',
        width: 150,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-gray-400">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <span>${params.value}</span>
          </div>`;
        }
      },
      {
        headerName: 'Área',
        field: 'areaDescripcion',
        width: 150,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-gray-400">-</span>';
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <span>${params.value}</span>
          </div>`;
        }
      }
    ];
    
    // Columnas empleados seleccionados
    this.selectedEmployeesColumnDefs = [
      {
        headerName: 'N° Doc',
        field: 'nroDoc',
        width: 110,
        cellRenderer: (params: any) => {
          return `<span class="font-mono text-sm">${params.value}</span>`;
        }
      },
      {
        headerName: 'Colaborador',
        field: 'empleado',
        flex: 1,
        cellRenderer: (params: any) => {
          const emp = params.data;
          const fullName = `${emp.apellidoPaterno} ${emp.apellidoMaterno}, ${emp.nombres}`;
          return `<div class="text-sm font-medium text-gray-900">${fullName}</div>`;
        }
      },
      {
        headerName: 'Área',
        field: 'areaDescripcion',
        width: 130
      },
      {
        headerName: 'Acciones',
        width: 80,
        cellRenderer: (params: any) => {
          return `<button class="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded" onclick="window.removeFromBulkSelection(${params.node.rowIndex})" title="Quitar">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>`;
        }
      }
    ];
  }

  private setupFormWatchers(): void {
    this.bulkForm.get('sedeSearch')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(searchTerm => {
        this.sedeSearchTerm = searchTerm || '';
        this.filterSedes();
        if (searchTerm !== this.formData.sedeName) {
          this.formData.sedeId = '';
          this.resetAreaSelection();
        }
      });
    
    this.bulkForm.get('areaSearch')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(searchTerm => {
        this.areaSearchTerm = searchTerm || '';
        this.filterAreas();
        if (searchTerm !== this.formData.areaName) {
          this.formData.areaId = '';
          this.availableEmployees = [];
          this.updateEmployeeStats();
        }
      });
  }

  private loadSedes(): void {
    this.loading = true;
    this.categoriaAuxiliarService.getCategoriasAuxiliar()
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next: (sedes) => {
          this.allSedes = sedes || [];
          this.filteredSedes = [...this.allSedes];
        },
        error: (error) => this.errorHandler.handleLoadError(error, 'sedes')
      });
  }

  private loadAreas(): void {
    if (!this.headerConfig?.selectedEmpresa?.companiaId) {
      this.toastService.error('Error', 'No se pudo obtener el ID de la compañía');
      return;
    }
    this.loading = true;
    this.rhAreaService.getAreas(this.headerConfig.selectedEmpresa.companiaId)
      .pipe(finalize(() => this.loading = false), takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.allAreas = areas || [];
          this.filteredAreas = [...this.allAreas];
        },
        error: (error) => this.errorHandler.handleLoadError(error, 'áreas')
      });
  }

  private filterSedes(): void {
    const searchTerm = this.sedeSearchTerm.toLowerCase().trim();
    if (!searchTerm) {
      this.filteredSedes = [...this.allSedes];
      return;
    }
    this.filteredSedes = this.allSedes.filter(sede => 
      sede.descripcion.toLowerCase().includes(searchTerm)
    );
    this.highlightedSedeIndex = -1;
  }

  private filterAreas(): void {
    const searchTerm = this.areaSearchTerm.toLowerCase().trim();
    if (!searchTerm) {
      this.filteredAreas = [...this.allAreas];
      return;
    }
    this.filteredAreas = this.allAreas.filter(area => 
      area.descripcion.toLowerCase().includes(searchTerm)
    );
    this.highlightedAreaIndex = -1;
  }

  onSedeSearchChange(event: Event): void {
    this.showSedeDropdown = true;
    this.highlightedSedeIndex = -1;
  }

  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }

  onAreaSearchChange(event: Event): void {
    this.showAreaDropdown = this.formData.sedeId ? true : false;
    this.highlightedAreaIndex = -1;
  }

  onAreaBlur(): void {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }

  selectSede(sede: CategoriaAuxiliar): void {
    this.bulkForm.get('sedeSearch')?.setValue(sede.descripcion, { emitEvent: false });
    this.formData.sedeId = sede.categoriaAuxiliarId;
    this.formData.sedeName = sede.descripcion;
    this.showSedeDropdown = false;
    this.resetAreaSelection();
    this.loadAreas();
  }

  onSedeKeydown(event: KeyboardEvent): void {
    if (!this.showSedeDropdown) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedSedeIndex = Math.min(this.highlightedSedeIndex + 1, this.filteredSedes.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedSedeIndex = Math.max(this.highlightedSedeIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedSedeIndex > -1) {
        this.selectSede(this.filteredSedes[this.highlightedSedeIndex]);
      }
    } else if (event.key === 'Escape') {
      this.showSedeDropdown = false;
    }
  }

  onAreaSearchFocus(): void {
    if (!this.formData.sedeId) {
      this.toastService.warning('Validación', 'Primero debe seleccionar una sede');
      return;
    }
    this.showAreaDropdown = this.filteredAreas.length > 0;
  }

  selectArea(area: RhArea): void {
    this.bulkForm.get('areaSearch')?.setValue(area.descripcion, { emitEvent: false });
    this.formData.areaId = area.areaId;
    this.formData.areaName = area.descripcion;
    this.showAreaDropdown = false;
    this.loadAvailableEmployees();
  }

  onAreaKeydown(event: KeyboardEvent): void {
    if (!this.showAreaDropdown) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedAreaIndex = Math.min(this.highlightedAreaIndex + 1, this.filteredAreas.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedAreaIndex = Math.max(this.highlightedAreaIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedAreaIndex > -1) {
        this.selectArea(this.filteredAreas[this.highlightedAreaIndex]);
      }
    } else if (event.key === 'Escape') {
      this.showAreaDropdown = false;
    }
  }

  private resetAreaSelection(): void {
    this.bulkForm.get('areaSearch')?.setValue('');
    this.formData.areaId = '';
    this.formData.areaName = '';
    this.allAreas = [];
    this.filteredAreas = [];
    this.availableEmployees = [];
    this.selectedEmployees = [];
    this.updateEmployeeStats();
  }

  private loadAvailableEmployees(): void {
    if (!this.formData.areaId) return;
    this.loadingEmployees = true;
    const params: EmployeesParameters = {
      searchText: '',
      page: 1,
      pagesize: 500, // Aumentar para traer más empleados
      areaId: this.formData.areaId,
      ccostoId: null,
      sede: this.formData.sedeId,
      periodoId: this.headerConfig?.selectedPeriodo?.periodoId?.toString() || null,
      planillaId: this.headerConfig?.selectedPlanilla?.planillaId?.toString() || null,
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId?.toString() || null
    };
    this.personService.getPersonalActivo(params)
      .pipe(finalize(() => this.loadingEmployees = false), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.exito && response.data) {
            this.availableEmployees = response.data.items || [];
            this.updateEmployeeStats();
          } else {
            this.availableEmployees = [];
            this.updateEmployeeStats();
          }
        },
        error: (error) => {
          this.errorHandler.handleLoadError(error, 'empleados');
          this.availableEmployees = [];
          this.updateEmployeeStats();
        }
      });
  }

  onAvailableGridReady(params: GridReadyEvent): void {
    this.availableGridApi = params.api;
    this.setupWindowMethods();
  }

  onSelectedGridReady(params: GridReadyEvent): void {
    this.selectedGridApi = params.api;
  }

  onAvailableSelectionChanged(): void {
    this.updateEmployeeStats();
  }

  addSelectedEmployees(): void {
    if (!this.availableGridApi) return;
    const selectedNodes = this.availableGridApi.getSelectedNodes();
    const newEmployees = selectedNodes.map(node => node.data).filter(emp => 
      !this.selectedEmployees.some(selected => selected.nroDoc === emp.nroDoc)
    );
    this.selectedEmployees = [...this.selectedEmployees, ...newEmployees];
    this.updateEmployeeStats();
    this.availableGridApi.deselectAll();
  }

  removeAllEmployees(): void {
    this.selectedEmployees = [];
    this.updateEmployeeStats();
  }

  removeFromBulkSelection(rowIndex: number): void {
    this.selectedEmployees.splice(rowIndex, 1);
    this.updateEmployeeStats();
  }

  private updateEmployeeStats(): void {
    this.employeeStats.available = this.availableEmployees.length;
    this.employeeStats.selected = this.selectedEmployees.length;
  }

  get isFormValid(): boolean {
    return this.bulkForm.valid && 
           !!this.formData.sedeId && 
           !!this.formData.areaId && 
           this.selectedEmployees.length > 0;
  }

  getFieldError(fieldName: string): string | null {
    const control = this.bulkForm.get(fieldName);
    if (control && control.touched) {
      if (control.errors?.['required']) {
        switch (fieldName) {
          case 'sedeSearch': return 'Debe seleccionar una sede';
          case 'areaSearch': return 'Debe seleccionar un área';
          default: return 'Este campo es requerido';
        }
      }
      if (control.errors?.['maxlength']) {
        return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
      }
      
      // Validaciones personalizadas para autocompletes
      if (fieldName === 'sedeSearch' && control.value && !this.formData.sedeId) {
        return 'Debe seleccionar una sede válida de la lista';
      }
      if (fieldName === 'areaSearch' && control.value && !this.formData.areaId) {
        return 'Debe seleccionar un área válida de la lista';
      }
    }
    return null;
  }

  getSelectedAvailableCount(): number {
    return this.availableGridApi ? this.availableGridApi.getSelectedRows().length : 0;
  }

  onSave(): void {
    if (!this.isFormValid) {
      this.markFormGroupTouched();
      this.toastService.warning('Validación', 'Por favor complete todos los campos requeridos y seleccione al menos un empleado');
      return;
    }
    const employeesToAdd: PersonnelWhitelistCreateEditDto[] = this.selectedEmployees.map(emp => ({
      employeeId: emp.personalId || '',
      employeeName: `${emp.apellidoPaterno} ${emp.apellidoMaterno}, ${emp.nombres}` || '',
      remarks: this.bulkForm.value.remarks || null,
      position: emp.cargoDescripcion || null,
    }));
    this.saving = true;
    this.personnelWhitelistService.createBulkWhitelist(employeesToAdd)
      .pipe(finalize(() => this.saving = false), takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.toastService.success('Éxito', result.message || `Se registraron ${employeesToAdd.length} empleados correctamente`);
          this.closeEvent.emit(this.formData);
        },
        error: (error) => this.errorHandler.handleSaveError(error, 'empleados en lista blanca')
      });
  }

  onCancel(): void {
    this.closeEvent.emit(null);
  }

  private markFormGroupTouched(): void {
    Object.values(this.bulkForm.controls).forEach(control => control.markAsTouched());
  }

  private setupWindowMethods(): void {
    (window as any).removeFromBulkSelection = (rowIndex: number) => this.removeFromBulkSelection(rowIndex);
  }

  trackBySedeId = (index: number, sede: CategoriaAuxiliar) => sede.categoriaAuxiliarId;
  trackByAreaId = (index: number, area: RhArea) => area.areaId;
}