import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PersonalTransferDto, CreatePersonalTransferDto, UpdatePersonalTransferDto } from '../../../../core/models/personal-transfer.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { CostCenterService, CostCenter } from '../../../../core/services/cost-center.service';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { PersonService } from '../../../../core/services/person.service';
import { Employee } from '../../empleado/empleado/model/employeeDto';

export interface TransferModalData {
  employee?: Employee; // Empleado prellenado
  mode: 'create' | 'edit';
  transferData?: PersonalTransferDto; // Para modo edición
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
    
    // Fechas
    startDate: '',
    endDate: '',
    isPermanent: false,
    
    // Observaciones
    observations: ''
  };

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

  constructor(
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private costCenterService: CostCenterService,
    private headerConfigService: HeaderConfigService,
    private personService: PersonService
  ) {}

  ngOnInit(): void {
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
    this.loadAutocompleteData();
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      this.formData.newBranchId = transfer.branchId || '';
      this.formData.newAreaId = transfer.areaId || '';
      this.formData.newCostCenterId = transfer.costCenterId || '';
      this.formData.startDate = transfer.startDate || '';
      this.formData.endDate = transfer.endDate || '';
      this.formData.isPermanent = !transfer.endDate;
      this.formData.observations = transfer.observation || '';
    } else {
      // Valores por defecto para nueva transferencia
      const today = new Date().toISOString().split('T')[0];
      this.formData.startDate = today;
      this.formData.isPermanent = true;
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
    }
  }

  /**
   * Validar formulario
   */
  isFormValid(): boolean {
    return !!(
      this.formData.selectedEmployee &&
      this.formData.newBranchId &&
      this.formData.newAreaId &&
      this.formData.startDate &&
      (this.formData.isPermanent || this.formData.endDate)
    );
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
      this.costCentersList.find(cc => cc.ccostoId === this.formData.newCostCenterId) : null;

    if (this.data.mode === 'edit') {
      // Modo edición - enviar solo campos modificados
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
        updatedBy: 'Sistema' // TODO: Obtener usuario actual
      };
      // Cerrar modal con los datos
      if (this.modalRef) {
        this.modalRef.closeModalFromChild({
          action: 'save',
          data: updateData
        });
      }
    } else {
      // Modo creación - enviar datos completos
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
        createdBy: 'Sistema' // TODO: Obtener usuario actual
      };
      // Cerrar modal con los datos
    if (this.modalRef) {
      this.modalRef.closeModalFromChild({
        action: 'save',
        data: createData
      });
    }
    }
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