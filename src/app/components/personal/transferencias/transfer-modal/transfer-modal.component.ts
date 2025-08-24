import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PersonalTransferDto, CreatePersonalTransferDto, UpdatePersonalTransferDto } from '../../../../core/models/personal-transfer.model';
import { PersonalTransferService } from '../../../../core/services/personal-transfer.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { CostCenterService, CostCenter } from '../../../../core/services/cost-center.service';
import { SedeAreaCostoService } from '../../../../core/services/sede-area-costo.service';
import { SedeAreaCosto } from '../../../../models/site-area-ccost.model';
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
  
  // Nueva lista unificada desde sede-area-costo.service
  sedeAreaCostoList: SedeAreaCosto[] = [];
  
  // Listas derivadas para autocompletes
  destinationSedesList: { siteId: string; siteName: string }[] = [];
  destinationAreasList: { areaId: string; areaName: string; siteId: string }[] = [];
  destinationCostCentersList: { costCenterId: string; costCenterName: string; siteId: string; areaId: string }[] = [];

  // Listas filtradas para autocompletes
  filteredSedesList: CategoriaAuxiliar[] = [];
  filteredAreasList: RhArea[] = [];
  filteredCostCentersList: CostCenter[] = [];
  
  // Listas filtradas para destination
  filteredDestinationSedesList: { siteId: string; siteName: string }[] = [];
  filteredDestinationAreasList: { areaId: string; areaName: string; siteId: string }[] = [];
  filteredDestinationCostCentersList: { costCenterId: string; costCenterName: string; siteId: string; areaId: string }[] = [];

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
    private sedeAreaCostoService: SedeAreaCostoService,
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

    // Cargar sedes (para origen)
    this.categoriaAuxiliarService.getCategoriasAuxiliar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedes) => {
          this.sedesList = sedes;
          this.filteredSedesList = sedes;
        },
        error: (error) => console.error('Error cargando sedes:', error)
      });

    // Cargar áreas (para origen)
    this.rhAreaService.getAreas(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.areasList = areas;
          this.filteredAreasList = areas;
        },
        error: (error) => console.error('Error cargando áreas:', error)
      });

    // Cargar centros de costo (para origen)
    this.costCenterService.getAll(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (costCenters) => {
          this.costCentersList = costCenters;
          this.filteredCostCentersList = costCenters;
        },
        error: (error) => console.error('Error cargando centros de costo:', error)
      });
    
    // Cargar datos unificados de sede-area-costo para destino
    this.loadDestinationData();
  }
  
  /**
   * Cargar datos de destino desde sede-area-costo.service
   */
  private loadDestinationData(): void {
    this.sedeAreaCostoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedeAreaCostoData) => {
          this.sedeAreaCostoList = sedeAreaCostoData;
          this.prepareDestinationLists();
        },
        error: (error) => console.error('Error cargando datos de sede-area-costo:', error)
      });
  }
  
  /**
   * Preparar listas derivadas para autocompletes de destino
   */
  private prepareDestinationLists(): void {
    // Obtener sedes únicas
    const sedesMap = new Map();
    this.sedeAreaCostoList.forEach(item => {
      if (!sedesMap.has(item.siteId)) {
        sedesMap.set(item.siteId, {
          siteId: item.siteId,
          siteName: item.siteName
        });
      }
    });
    this.destinationSedesList = Array.from(sedesMap.values());
    this.filteredDestinationSedesList = [...this.destinationSedesList];
    
    // Obtener áreas únicas
    const areasMap = new Map();
    this.sedeAreaCostoList.forEach(item => {
      const key = `${item.siteId}-${item.areaId}`;
      if (!areasMap.has(key)) {
        areasMap.set(key, {
          areaId: item.areaId,
          areaName: item.areaName,
          siteId: item.siteId
        });
      }
    });
    this.destinationAreasList = Array.from(areasMap.values());
    this.filteredDestinationAreasList = [...this.destinationAreasList];
    
    // Obtener centros de costo únicos
    const costCentersMap = new Map();
    this.sedeAreaCostoList.forEach(item => {
      if (item.costCenterId) {
        const key = `${item.siteId}-${item.areaId}-${item.costCenterId}`;
        if (!costCentersMap.has(key)) {
          costCentersMap.set(key, {
            costCenterId: item.costCenterId,
            costCenterName: item.costCenterName,
            siteId: item.siteId,
            areaId: item.areaId
          });
        }
      }
    });
    this.destinationCostCentersList = Array.from(costCentersMap.values());
    this.filteredDestinationCostCentersList = [...this.destinationCostCentersList];
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

    // Obtener descripciones de los servicios unificados
    const selectedBranch = this.destinationSedesList.find(s => s.siteId === this.formData.newBranchId);
    const selectedArea = this.filteredDestinationAreasList.find(a => a.areaId === this.formData.newAreaId);
    const selectedCostCenter = this.formData.newCostCenterId ? 
      this.filteredDestinationCostCentersList.find(cc => cc.costCenterId === this.formData.newCostCenterId) || null : null;

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
  private updateTransfer(selectedBranch: { siteId: string; siteName: string } | undefined, selectedArea: { areaId: string; areaName: string; siteId: string } | undefined, selectedCostCenter: { costCenterId: string; costCenterName: string; siteId: string; areaId: string } | null): void {
    if (!this.data.transferData?.id) {
      this.toastService.error('Error', 'No se pudo identificar la transferencia a actualizar');
      return;
    }

    this.loading = true;
    
    const updateData: UpdatePersonalTransferDto = {
      branchId: this.formData.newBranchId,
      branchDescription: selectedBranch?.siteName || '',
      areaId: this.formData.newAreaId,
      areaDescription: selectedArea?.areaName || '',
      costCenterId: this.formData.newCostCenterId || '',
      costCenterDescription: selectedCostCenter?.costCenterName || '',
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
  private createTransfer(selectedBranch: { siteId: string; siteName: string } | undefined, selectedArea: { areaId: string; areaName: string; siteId: string } | undefined, selectedCostCenter: { costCenterId: string; costCenterName: string; siteId: string; areaId: string } | null): void {
    this.loading = true;
    
    const createData: CreatePersonalTransferDto = {
      personalId: this.formData.selectedEmployee!.personalId,
      fullName: `${this.formData.selectedEmployee!.nombres || ''} ${this.formData.selectedEmployee!.apellidoPaterno || ''} ${this.formData.selectedEmployee!.apellidoMaterno || ''}`.trim(),
      branchId: this.formData.newBranchId,
      branchDescription: selectedBranch?.siteName || '',
      areaId: this.formData.newAreaId,
      areaDescription: selectedArea?.areaName || '',
      costCenterId: this.formData.newCostCenterId || '',
      costCenterDescription: selectedCostCenter?.costCenterName || '',
      startDate: this.formData.startDate,
      endDate: this.formData.isPermanent ? null : this.formData.endDate,
      observation: this.formData.observations || null,
      createdBy: this.currentUser?.username || 'Sistema',
      companyId: this.headerConfig?.selectedEmpresa?.companiaId || ''
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
  // AUTOCOMPLETE METHODS - SEDE (DESTINO)
  // ===============================

  getSedeFilterText(): string {
    if (this.formData.newBranchId) {
      const selectedSede = this.destinationSedesList.find(s => s.siteId === this.formData.newBranchId);
      return selectedSede?.siteName || '';
    }
    return this.sedeFilterTerm;
  }

  onSedeFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.sedeFilterTerm = value;
    this.filteredDestinationSedesList = this.destinationSedesList.filter(sede => 
      sede.siteName.toLowerCase().includes(value.toLowerCase())
    );
    this.showSedeDropdown = this.filteredDestinationSedesList.length > 0;
    
    // Reset dependent fields when sede changes
    this.formData.newAreaId = '';
    this.formData.newCostCenterId = '';
    this.areaFilterTerm = '';
    this.costCenterFilterTerm = '';
    this.updateDependentAreasList();
  }
  
  onSedeFocus(): void {
    if (this.filteredDestinationSedesList.length === 0) {
      this.filteredDestinationSedesList = [...this.destinationSedesList];
    }
    this.showSedeDropdown = this.filteredDestinationSedesList.length > 0;
  }

  onSedeSelected(sede: { siteId: string; siteName: string }): void {
    this.formData.newBranchId = sede.siteId;
    this.sedeFilterTerm = sede.siteName;
    this.showSedeDropdown = false;
    
    // Reset dependent fields
    this.formData.newAreaId = '';
    this.formData.newCostCenterId = '';
    this.areaFilterTerm = '';
    this.costCenterFilterTerm = '';
    
    // Update dependent lists
    this.updateDependentAreasList();
  }

  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }

  trackBySedeId(index: number, sede: { siteId: string; siteName: string }): string {
    return sede.siteId;
  }
  
  /**
   * Actualizar lista de áreas basada en la sede seleccionada
   */
  private updateDependentAreasList(): void {
    if (this.formData.newBranchId) {
      this.filteredDestinationAreasList = this.destinationAreasList.filter(area => 
        area.siteId === this.formData.newBranchId
      );
    } else {
      this.filteredDestinationAreasList = [...this.destinationAreasList];
    }
    this.updateDependentCostCentersList();
  }

  // ===============================
  // AUTOCOMPLETE METHODS - AREA (DESTINO)
  // ===============================

  getAreaFilterText(): string {
    if (this.formData.newAreaId) {
      const selectedArea = this.filteredDestinationAreasList.find(a => a.areaId === this.formData.newAreaId);
      return selectedArea?.areaName || '';
    }
    return this.areaFilterTerm;
  }

  onAreaFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.areaFilterTerm = value;
    
    let availableAreas = this.destinationAreasList;
    if (this.formData.newBranchId) {
      availableAreas = this.destinationAreasList.filter(area => area.siteId === this.formData.newBranchId);
    }
    
    this.filteredDestinationAreasList = availableAreas.filter(area => 
      area.areaName.toLowerCase().includes(value.toLowerCase())
    );
    this.showAreaDropdown = this.filteredDestinationAreasList.length > 0;
    
    // Reset dependent fields when area changes
    this.formData.newCostCenterId = '';
    this.costCenterFilterTerm = '';
    this.updateDependentCostCentersList();
  }
  
  onAreaFocus(): void {
    this.updateDependentAreasList();
    this.showAreaDropdown = this.filteredDestinationAreasList.length > 0;
  }

  onAreaSelected(area: { areaId: string; areaName: string; siteId: string }): void {
    this.formData.newAreaId = area.areaId;
    this.areaFilterTerm = area.areaName;
    this.showAreaDropdown = false;
    
    // Reset dependent fields
    this.formData.newCostCenterId = '';
    this.costCenterFilterTerm = '';
    
    // Update dependent lists
    this.updateDependentCostCentersList();
  }

  onAreaBlur(): void {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }

  trackByAreaId(index: number, area: { areaId: string; areaName: string; siteId: string }): string {
    return area.areaId;
  }
  
  /**
   * Actualizar lista de centros de costo basada en sede y área seleccionadas
   */
  private updateDependentCostCentersList(): void {
    if (this.formData.newBranchId && this.formData.newAreaId) {
      this.filteredDestinationCostCentersList = this.destinationCostCentersList.filter(cc => 
        cc.siteId === this.formData.newBranchId && cc.areaId === this.formData.newAreaId
      );
    } else if (this.formData.newBranchId) {
      this.filteredDestinationCostCentersList = this.destinationCostCentersList.filter(cc => 
        cc.siteId === this.formData.newBranchId
      );
    } else {
      this.filteredDestinationCostCentersList = [...this.destinationCostCentersList];
    }
  }

  // ===============================
  // AUTOCOMPLETE METHODS - COST CENTER (DESTINO)
  // ===============================

  getCostCenterFilterText(): string {
    if (this.formData.newCostCenterId) {
      const selectedCC = this.filteredDestinationCostCentersList.find(cc => cc.costCenterId === this.formData.newCostCenterId);
      return selectedCC?.costCenterName || '';
    }
    return this.costCenterFilterTerm;
  }

  onCostCenterFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.costCenterFilterTerm = value;
    
    let availableCostCenters = this.destinationCostCentersList;
    if (this.formData.newBranchId && this.formData.newAreaId) {
      availableCostCenters = this.destinationCostCentersList.filter(cc => 
        cc.siteId === this.formData.newBranchId && cc.areaId === this.formData.newAreaId
      );
    } else if (this.formData.newBranchId) {
      availableCostCenters = this.destinationCostCentersList.filter(cc => 
        cc.siteId === this.formData.newBranchId
      );
    }
    
    this.filteredDestinationCostCentersList = availableCostCenters.filter(cc => 
      cc.costCenterName.toLowerCase().includes(value.toLowerCase())
    );
    this.showCostCenterDropdown = this.filteredDestinationCostCentersList.length > 0;
  }
  
  onCostCenterFocus(): void {
    this.updateDependentCostCentersList();
    this.showCostCenterDropdown = this.filteredDestinationCostCentersList.length > 0;
  }

  onCostCenterSelected(costCenter: { costCenterId: string; costCenterName: string; siteId: string; areaId: string }): void {
    this.formData.newCostCenterId = costCenter.costCenterId;
    this.costCenterFilterTerm = costCenter.costCenterName;
    this.showCostCenterDropdown = false;
  }

  onCostCenterBlur(): void {
    setTimeout(() => {
      this.showCostCenterDropdown = false;
    }, 200);
  }

  trackByCostCenterId(index: number, costCenter: { costCenterId: string; costCenterName: string; siteId: string; areaId: string }): string {
    return costCenter.costCenterId;
  }
}