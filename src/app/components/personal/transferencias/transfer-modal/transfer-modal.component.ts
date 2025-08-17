import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PersonalTransferDto, CreatePersonalTransferDto, UpdatePersonalTransferDto } from '../../../../core/models/personal-transfer.model';
import { PersonalTransferService } from '../../../../core/services/personal-transfer.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { CostCenterService, CostCenter } from '../../../../core/services/cost-center.service';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { PersonService } from '../../../../core/services/person.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Employee } from '../../empleado/empleado/model/employeeDto';
import { DateRange } from '../../../../shared/components/date-range-picker/date-range-picker.component';

export interface TransferModalData {
  employee?: Employee; // Empleado prellenado
  mode: 'create' | 'edit';
  transferData?: PersonalTransferDto; // Para modo edición
  transferId?: number; // ID de la transferencia para cargar datos en modo edición
}

@Component({
  selector: 'app-transfer-modal',
  templateUrl: './transfer-modal.component.html',
  styleUrls: ['./transfer-modal.component.css']
})
export class TransferModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  data: TransferModalData = { mode: 'create' }; // Datos pasados desde el modal service
  modalRef: any; // Referencia al modal padre

  // Datos del formulario
  formData = {
    // Empleado
    selectedEmployee: null as Employee | null,
    employeeSearchTerm: '',
    
    // Ubicación origen (datos actuales del empleado)
    currentBranch: '',
    currentArea: '',
    currentCostCenter: '',
    
    // Ubicación destino
    newBranchId: '',
    newAreaId: '',
    newCostCenterId: '',
    
    // Fechas (simplified - handled by DateRangePicker)
    startDate: '',
    endDate: '',
    isPermanent: false,
    
    // Observaciones
    observations: ''
  };

  // FormControl for date range picker
  dateRangeControl = new FormControl<DateRange | null>(null, Validators.required);

  // Estados de UI
  showEmployeeDropdown = false;
  employeeSearchResults: Employee[] = [];
  loading = false;

  // Estados para autocompletes
  showSedeDropdown = false;
  showAreaDropdown = false;
  showCostCenterDropdown = false;

  // Listas para autocompletes
  sedesList: CategoriaAuxiliar[] = [];
  areasList: RhArea[] = [];
  costCentersList: CostCenter[] = [];

  // Listas filtradas para autocompletes
  filteredSedesList: CategoriaAuxiliar[] = [];
  filteredAreasList: RhArea[] = [];
  filteredCostCentersList: CostCenter[] = [];

  // Términos de búsqueda para autocompletes
  sedeFilterTerm = '';
  areaFilterTerm = '';
  costCenterFilterTerm = '';
  
  // Configuración del header
  headerConfig: HeaderConfig | null = null;

  // Usuario logueado
  currentUser: any = null;

  constructor(
    private personalTransferService: PersonalTransferService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private costCenterService: CostCenterService,
    private headerConfigService: HeaderConfigService,
    private personService: PersonService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
    this.loadCurrentUser();
    this.loadAutocompleteData();
    this.initializeFormAndData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar usuario logueado
   */
  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  /**
   * Inicializar formulario y cargar datos si es necesario
   */
  private initializeFormAndData(): void {
    if (this.data.mode === 'edit' && this.data.transferId) {
      this.loadTransferForEdit(this.data.transferId);
    } else {
      this.initializeForm();
    }
  }

  /**
   * Cargar datos de transferencia para edición
   */
  private loadTransferForEdit(transferId: number): void {
    this.loading = true;
    
    this.personalTransferService.getPersonalTransferById(transferId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            this.data.transferData = response.data;
            this.initializeForm();
          } else {
            this.toastService.error('Error', 'No se pudo cargar la transferencia');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error cargando transferencia:', error);
          this.toastService.error('Error', 'Error al cargar los datos de la transferencia');
        }
      });
  }

  /**
   * Inicializar formulario con datos prellenados
   */
  private initializeForm(): void {
    // Si hay empleado prellenado
    if (this.data.employee) {
      this.formData.selectedEmployee = this.data.employee;
      this.formData.employeeSearchTerm = `${this.data.employee.nombres || ''} ${this.data.employee.apellidoPaterno || ''} ${this.data.employee.apellidoMaterno || ''}`.trim();
      
      // Prellenar datos actuales del empleado
      this.formData.currentBranch = this.data.employee.categoriaAuxiliarDescripcion || '';
      this.formData.currentArea = this.data.employee.areaDescripcion || '';
      this.formData.currentCostCenter = this.data.employee.ccostoDescripcion || '';
    }

    // Si es modo edición, prellenar con datos de transferencia
    if (this.data.mode === 'edit' && this.data.transferData) {
      const transfer = this.data.transferData;
      
      // Cargar datos del empleado si están disponibles
      if (!this.formData.selectedEmployee) {
        this.loadEmployeeForTransfer(transfer.personalId);
      }
      
      // Los datos de la transferencia van en "Ubicación Actual" porque es donde está ahora el empleado
      this.formData.currentBranch = transfer.branchDescription || '';
      this.formData.currentArea = transfer.areaDescription || '';
      this.formData.currentCostCenter = transfer.costCenterDescription || '';
      
      // Las fechas y observaciones se prellenan para edición
      this.formData.startDate = transfer.startDate ? transfer.startDate.split('T')[0] : '';
      this.formData.endDate = transfer.endDate ? transfer.endDate.split('T')[0] : '';
      this.formData.isPermanent = !transfer.endDate;
      this.formData.observations = transfer.observation || '';
      
      // Los campos "Nueva Ubicación" quedan vacíos para que el usuario los llene
      this.formData.newBranchId = '';
      this.formData.newAreaId = '';
      this.formData.newCostCenterId = '';
      
      // Limpiar términos de filtro para autocompletes (nueva ubicación debe estar vacía)
      this.sedeFilterTerm = '';
      this.areaFilterTerm = '';
      this.costCenterFilterTerm = '';
    } else {
      // Valores por defecto para nueva transferencia
      const today = new Date().toISOString().split('T')[0];
      this.formData.startDate = today;
      this.formData.isPermanent = true;
    }
  }

  /**
   * Cargar datos del empleado para transferencia en modo edición
   */
  private loadEmployeeForTransfer(personalId: string): void {
    // TODO: Implementar carga de empleado por personalId usando PersonService
    // Por ahora simulamos con los datos de la transferencia
    if (this.data.transferData) {
      const transfer = this.data.transferData;
      this.formData.selectedEmployee = {
        personalId: transfer.personalId,
        nombres: transfer.fullName.split(' ')[0] || '',
        apellidoPaterno: transfer.fullName.split(' ')[1] || '',
        apellidoMaterno: transfer.fullName.split(' ').slice(2).join(' ') || '',
        nroDoc: '',
        categoriaAuxiliarDescripcion: '',
        areaDescripcion: '',
        ccostoDescripcion: ''
      } as Employee;
      
      this.formData.employeeSearchTerm = transfer.fullName;
    }
  }


  /**
   * Cargar datos para autocompletes
   */
  private loadAutocompleteData(): void {
    if (!this.headerConfig?.selectedEmpresa) {
      console.warn('No hay empresa seleccionada');
      return;
    }

    const companiaId = this.headerConfig.selectedEmpresa.companiaId;

    // Cargar sedes
    this.categoriaAuxiliarService.getCategoriasAuxiliar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedes) => {
          this.sedesList = sedes;
          this.filteredSedesList = sedes;
        },
        error: (error) => console.error('Error cargando sedes:', error)
      });

    // Cargar áreas
    this.rhAreaService.getAreas(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.areasList = areas;
          this.filteredAreasList = areas;
        },
        error: (error) => console.error('Error cargando áreas:', error)
      });

    // Cargar centros de costo
    this.costCenterService.getAll(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (costCenters) => {
          this.costCentersList = costCenters;
          this.filteredCostCentersList = costCenters;
        },
        error: (error) => console.error('Error cargando centros de costo:', error)
      });
  }

  /**
   * Buscar empleados
   */
  onEmployeeSearch(searchTerm: string): void {
    this.formData.employeeSearchTerm = searchTerm;
    
    if (searchTerm.length < 3) {
      this.employeeSearchResults = [];
      this.showEmployeeDropdown = false;
      return;
    }

    // TODO: Implementar búsqueda de empleados
    // Por ahora mostrar dropdown vacío
    this.showEmployeeDropdown = true;
  }

  /**
   * Seleccionar empleado
   */
  selectEmployee(employee: Employee): void {
    this.formData.selectedEmployee = employee;
    this.formData.employeeSearchTerm = `${employee.nombres || ''} ${employee.apellidoPaterno || ''} ${employee.apellidoMaterno || ''}`.trim();
    this.showEmployeeDropdown = false;

    // Actualizar datos actuales del empleado
    this.formData.currentBranch = employee.categoriaAuxiliarDescripcion || '';
    this.formData.currentArea = employee.areaDescripcion || '';
    this.formData.currentCostCenter = employee.ccostoDescripcion || '';
  }

  /**
   * Toggle transferencia permanente
   */
  onPermanentChange(): void {
    if (this.formData.isPermanent) {
      this.formData.endDate = '';
      // Reset date range control if permanent
      this.dateRangeControl.setValue(null);
    }
  }

  /**
   * Handle date range selection from reusable component
   */
  onDateRangeSelected(dateRange: DateRange): void {
    console.log('📅 Date range selected:', dateRange);
    
    this.formData.startDate = dateRange.start;
    this.formData.endDate = dateRange.end;
    
    // If end date is selected, uncheck permanent
    if (dateRange.end) {
      this.formData.isPermanent = false;
    }
    
    console.log('✅ Transfer form updated:');
    console.log('   Start:', this.formData.startDate);
    console.log('   End:', this.formData.endDate);
    console.log('   Permanent:', this.formData.isPermanent);
  }

  /**
   * Handle raw date objects from reusable component (optional)
   */
  onDatesSelected(dates: Date[]): void {
    console.log('📅 Raw dates selected:', dates);
    // Additional logic if needed with raw Date objects
  }

  /**
   * Validar formulario
   */
  isFormValid(): boolean {
    const dateValid = this.formData.isPermanent || (this.dateRangeControl.valid && this.dateRangeControl.value);
    
    const isValid = !!(
      this.formData.selectedEmployee &&
      this.formData.newBranchId &&
      this.formData.newAreaId &&
      this.formData.startDate &&
      dateValid
    );

    console.log('🔍 Form Validation:', {
      selectedEmployee: !!this.formData.selectedEmployee,
      newBranchId: !!this.formData.newBranchId,
      newAreaId: !!this.formData.newAreaId,
      startDate: !!this.formData.startDate,
      isPermanent: this.formData.isPermanent,
      dateRangeValid: this.dateRangeControl.valid,
      dateValid,
      isValid
    });

    return isValid;
  }

  /**
   * Guardar transferencia
   */
  onSave(): void {
    if (!this.isFormValid()) {
      return;
    }

    // Obtener descripciones de los servicios
    const selectedBranch = this.sedesList.find(s => s.categoriaAuxiliarId === this.formData.newBranchId);
    const selectedArea = this.areasList.find(a => a.areaId === this.formData.newAreaId);
    const selectedCostCenter = this.formData.newCostCenterId ? 
      this.costCentersList.find(cc => cc.ccostoId === this.formData.newCostCenterId) || null : null;

    if (this.data.mode === 'edit') {
      // Modo edición - actualizar transferencia
      this.updateTransfer(selectedBranch, selectedArea, selectedCostCenter);
    } else {
      // Modo creación - crear nueva transferencia
      this.createTransfer(selectedBranch, selectedArea, selectedCostCenter);
    }
  }

  /**
   * Actualizar transferencia existente
   */
  private updateTransfer(selectedBranch: CategoriaAuxiliar | undefined, selectedArea: RhArea | undefined, selectedCostCenter: CostCenter | null): void {
    if (!this.data.transferData?.id) {
      this.toastService.error('Error', 'No se pudo identificar la transferencia a actualizar');
      return;
    }

    this.loading = true;
    
    const updateData: UpdatePersonalTransferDto = {
      branchId: this.formData.newBranchId,
      branchDescription: selectedBranch?.descripcion || '',
      areaId: this.formData.newAreaId,
      areaDescription: selectedArea?.descripcion || '',
      costCenterId: this.formData.newCostCenterId || '',
      costCenterDescription: selectedCostCenter?.descripcion || '',
      startDate: this.formData.startDate,
      endDate: this.formData.isPermanent ? null : this.formData.endDate,
      observation: this.formData.observations || null,
      updatedBy: this.currentUser?.username || 'Sistema'
    };

    this.personalTransferService.updatePersonalTransfer(this.data.transferData.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.toastService.success('Éxito', 'Transferencia actualizada correctamente');
            // Cerrar modal con resultado exitoso
            if (this.modalRef) {
              this.modalRef.closeModalFromChild({
                action: 'save',
                success: true,
                data: response.data,
                message: 'Transferencia actualizada correctamente'
              });
            }
          } else {
            this.toastService.error('Error', response.message || 'Error al actualizar la transferencia');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error actualizando transferencia:', error);
          this.toastService.error('Error', 'Error al actualizar la transferencia');
        }
      });
  }

  /**
   * Crear nueva transferencia
   */
  private createTransfer(selectedBranch: CategoriaAuxiliar | undefined, selectedArea: RhArea | undefined, selectedCostCenter: CostCenter | null): void {
    this.loading = true;
    
    const createData: CreatePersonalTransferDto = {
      personalId: this.formData.selectedEmployee!.personalId,
      fullName: `${this.formData.selectedEmployee!.nombres || ''} ${this.formData.selectedEmployee!.apellidoPaterno || ''} ${this.formData.selectedEmployee!.apellidoMaterno || ''}`.trim(),
      branchId: this.formData.newBranchId,
      branchDescription: selectedBranch?.descripcion || '',
      areaId: this.formData.newAreaId,
      areaDescription: selectedArea?.descripcion || '',
      costCenterId: this.formData.newCostCenterId || '',
      costCenterDescription: selectedCostCenter?.descripcion || '',
      startDate: this.formData.startDate,
      endDate: this.formData.isPermanent ? null : this.formData.endDate,
      observation: this.formData.observations || null,
      createdBy: this.currentUser?.username || 'Sistema'
    };

    this.personalTransferService.createPersonalTransfer(createData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.toastService.success('Éxito', 'Transferencia creada correctamente');
            // Cerrar modal con resultado exitoso
            if (this.modalRef) {
              this.modalRef.closeModalFromChild({
                action: 'save',
                success: true,
                data: response.data,
                message: 'Transferencia creada correctamente'
              });
            }
          } else {
            this.toastService.error('Error', response.message || 'Error al crear la transferencia');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error creando transferencia:', error);
          this.toastService.error('Error', 'Error al crear la transferencia');
        }
      });
  }

  /**
   * Cancelar
   */
  onCancel(): void {
    // Cerrar modal sin datos
    if (this.modalRef) {
      this.modalRef.closeModalFromChild({
        action: 'cancel'
      });
    }
  }

  /**
   * Obtener título del modal
   */
  getModalTitle(): string {
    if (this.data.mode === 'edit') {
      return 'Editar Transferencia de Personal';
    }
    return 'Nueva Transferencia de Personal';
  }

  /**
   * Obtener texto del botón de guardado
   */
  getSaveButtonText(): string {
    if (this.data.mode === 'edit') {
      return 'Actualizar Transferencia';
    }
    return 'Guardar Transferencia';
  }

  // ===============================
  // AUTOCOMPLETE METHODS - SEDE
  // ===============================

  getSedeFilterText(): string {
    if (this.formData.newBranchId) {
      const selectedSede = this.sedesList.find(s => s.categoriaAuxiliarId === this.formData.newBranchId);
      return selectedSede?.descripcion || '';
    }
    return this.sedeFilterTerm;
  }

  onSedeFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.sedeFilterTerm = value;
    this.filteredSedesList = this.sedesList.filter(sede => 
      sede.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showSedeDropdown = this.filteredSedesList.length > 0;
  }

  onSedeSelected(sede: CategoriaAuxiliar): void {
    this.formData.newBranchId = sede.categoriaAuxiliarId;
    this.sedeFilterTerm = sede.descripcion;
    this.showSedeDropdown = false;
  }

  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }

  trackBySedeId(index: number, sede: CategoriaAuxiliar): string {
    return sede.categoriaAuxiliarId;
  }

  // ===============================
  // AUTOCOMPLETE METHODS - AREA
  // ===============================

  getAreaFilterText(): string {
    if (this.formData.newAreaId) {
      const selectedArea = this.areasList.find(a => a.areaId === this.formData.newAreaId);
      return selectedArea?.descripcion || '';
    }
    return this.areaFilterTerm;
  }

  onAreaFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.areaFilterTerm = value;
    this.filteredAreasList = this.areasList.filter(area => 
      area.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showAreaDropdown = this.filteredAreasList.length > 0;
  }

  onAreaSelected(area: RhArea): void {
    this.formData.newAreaId = area.areaId;
    this.areaFilterTerm = area.descripcion;
    this.showAreaDropdown = false;
  }

  onAreaBlur(): void {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }

  trackByAreaId(index: number, area: RhArea): string {
    return area.areaId;
  }

  // ===============================
  // AUTOCOMPLETE METHODS - COST CENTER
  // ===============================

  getCostCenterFilterText(): string {
    if (this.formData.newCostCenterId) {
      const selectedCC = this.costCentersList.find(cc => cc.ccostoId === this.formData.newCostCenterId);
      return selectedCC?.descripcion || '';
    }
    return this.costCenterFilterTerm;
  }

  onCostCenterFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.costCenterFilterTerm = value;
    this.filteredCostCentersList = this.costCentersList.filter(cc => 
      cc.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showCostCenterDropdown = this.filteredCostCentersList.length > 0;
  }

  onCostCenterSelected(costCenter: CostCenter): void {
    this.formData.newCostCenterId = costCenter.ccostoId;
    this.costCenterFilterTerm = costCenter.descripcion;
    this.showCostCenterDropdown = false;
  }

  onCostCenterBlur(): void {
    setTimeout(() => {
      this.showCostCenterDropdown = false;
    }, 200);
  }

  trackByCostCenterId(index: number, costCenter: CostCenter): string {
    return costCenter.ccostoId;
  }
}