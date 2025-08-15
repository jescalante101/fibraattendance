import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PersonalTransferDto, CreatePersonalTransferDto } from '../../../../core/models/personal-transfer.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { CostCenterService, CostCenter } from '../../../../core/services/cost-center.service';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { PersonService } from '../../../../core/services/person.service';
import { Employee } from '../../empleado/empleado/model/employeeDto';

export interface MassiveTransferModalData {
  mode: 'massive';
}

export interface SelectedEmployee extends Employee {
  selected: boolean;
}

@Component({
  selector: 'app-massive-transfer-modal',
  templateUrl: './massive-transfer-modal.component.html',
  styleUrls: ['./massive-transfer-modal.component.css']
})
export class MassiveTransferModalComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  data: MassiveTransferModalData = { mode: 'massive' }; // Datos pasados desde el modal service
  modalRef: any; // Referencia al modal padre

  // Configuración de transferencia
  transferConfig = {
    // Ubicación origen
    fromBranchId: '',
    fromAreaId: '',
    fromCostCenterId: '',
    
    // Ubicación destino
    toBranchId: '',
    toAreaId: '',
    toCostCenterId: '',
    
    // Fechas
    startDate: '',
    endDate: '',
    isPermanent: true,
    
    // Observaciones
    observations: ''
  };

  // Filtros de empleados
  employeeFilters = {
    searchTerm: '',
    selectedAreas: [] as string[],
    selectedBranches: [] as string[]
  };

  // Empleados y selección
  allEmployees: SelectedEmployee[] = [];
  filteredEmployees: SelectedEmployee[] = [];
  selectedEmployees: SelectedEmployee[] = [];
  allSelected = false;

  // Estados de UI
  loading = false;
  loadingEmployees = false;

  // Listas para autocompletes
  sedesList: CategoriaAuxiliar[] = [];
  areasList: RhArea[] = [];
  costCentersList: CostCenter[] = [];
  
  // Areas para filtro lateral
  filterAreas: RhArea[] = [];
  
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
    this.initializeForm();
    this.loadAutocompleteData();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar formulario con valores por defecto
   */
  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.transferConfig.startDate = today;
    this.transferConfig.isPermanent = true;
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
        next: (sedes) => this.sedesList = sedes,
        error: (error) => console.error('Error cargando sedes:', error)
      });

    // Cargar áreas
    this.rhAreaService.getAreas(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.areasList = areas;
          this.filterAreas = [...areas];
        },
        error: (error) => console.error('Error cargando áreas:', error)
      });

    // Cargar centros de costo
    this.costCenterService.getAll(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (costCenters) => this.costCentersList = costCenters,
        error: (error) => console.error('Error cargando centros de costo:', error)
      });
  }

  /**
   * Cargar empleados
   */
  private loadEmployees(): void {
    if (!this.headerConfig?.selectedEmpresa) {
      return;
    }

    this.loadingEmployees = true;
    
    // TODO: Implementar llamada al servicio de empleados
    // Por ahora empleados de ejemplo
    setTimeout(() => {
      this.allEmployees = [
        {
          personalId: '1',
          nombres: 'AGUILAR',
          apellidoPaterno: 'APOLAYA',
          apellidoMaterno: 'JORGE',
          nroDoc: '12345678',
          categoriaAuxiliarDescripcion: 'Lima Centro',
          areaDescripcion: 'Contabilidad',
          ccostoDescripcion: 'CC001',
          fechaIngreso: '2024-01-01T00:00:00.000Z',
          fechaCese: '',
          selected: false
        },
        {
          personalId: '2',
          nombres: 'BLANCO',
          apellidoPaterno: 'VILCAPUMA',
          apellidoMaterno: 'JUAN',
          nroDoc: '87654321',
          categoriaAuxiliarDescripcion: 'Lima Centro',
          areaDescripcion: 'Ventas',
          ccostoDescripcion: 'CC002',
          fechaIngreso: '2024-01-01T00:00:00.000Z',
          fechaCese: '',
          selected: false
        },
        {
          personalId: '3',
          nombres: 'CABANILLAS',
          apellidoPaterno: 'LAY',
          apellidoMaterno: 'JUAN',
          nroDoc: '11223344',
          categoriaAuxiliarDescripcion: 'Lima Norte',
          areaDescripcion: 'RRHH',
          ccostoDescripcion: 'CC003',
          fechaIngreso: '2024-01-01T00:00:00.000Z',
          fechaCese: '',
          selected: false
        }
      ];
      
      this.filteredEmployees = [...this.allEmployees];
      this.loadingEmployees = false;
    }, 1000);
  }

  /**
   * Filtrar empleados por área
   */
  onAreaFilterChange(areaId: string, checked: boolean): void {
    if (checked) {
      this.employeeFilters.selectedAreas.push(areaId);
    } else {
      const index = this.employeeFilters.selectedAreas.indexOf(areaId);
      if (index > -1) {
        this.employeeFilters.selectedAreas.splice(index, 1);
      }
    }
    this.applyFilters();
  }

  /**
   * Aplicar filtros a empleados
   */
  public applyFilters(): void {
    this.filteredEmployees = this.allEmployees.filter(employee => {
      // Filtro por término de búsqueda
      if (this.employeeFilters.searchTerm) {
        const searchTerm = this.employeeFilters.searchTerm.toLowerCase();
        const fullName = `${employee.nombres || ''} ${employee.apellidoPaterno || ''} ${employee.apellidoMaterno || ''}`.toLowerCase();
        if (!fullName.includes(searchTerm) && 
            !(employee.nroDoc || '').includes(searchTerm) &&
            !employee.personalId.includes(searchTerm)) {
          return false;
        }
      }

      // Filtro por áreas seleccionadas (si hay alguna seleccionada)
      if (this.employeeFilters.selectedAreas.length > 0) {
        const area = this.areasList.find(a => a.descripcion === employee.areaDescripcion);
        if (!area || !this.employeeFilters.selectedAreas.includes(area.areaId)) {
          return false;
        }
      }

      return true;
    });

    this.updateSelectedEmployees();
  }

  /**
   * Actualizar lista de empleados seleccionados
   */
  private updateSelectedEmployees(): void {
    this.selectedEmployees = this.filteredEmployees.filter(emp => emp.selected);
  }

  /**
   * Seleccionar/deseleccionar todos los empleados
   */
  toggleAllEmployees(): void {
    this.filteredEmployees.forEach(emp => emp.selected = this.allSelected);
    this.updateSelectedEmployees();
  }

  /**
   * Cambio en selección de empleado individual
   */
  onEmployeeSelectionChange(): void {
    this.updateSelectedEmployees();
    this.allSelected = this.filteredEmployees.length > 0 && 
                      this.filteredEmployees.every(emp => emp.selected);
  }

  /**
   * Seleccionar todos los empleados filtrados
   */
  selectAllFiltered(): void {
    this.filteredEmployees.forEach(emp => emp.selected = true);
    this.updateSelectedEmployees();
    this.allSelected = true;
  }

  /**
   * Deseleccionar todos los empleados
   */
  deselectAll(): void {
    this.allEmployees.forEach(emp => emp.selected = false);
    this.updateSelectedEmployees();
    this.allSelected = false;
  }

  /**
   * Cambio en configuración de transferencia permanente
   */
  onPermanentChange(): void {
    if (this.transferConfig.isPermanent) {
      this.transferConfig.endDate = '';
    }
  }

  /**
   * Vista previa de transferencias
   */
  showPreview(): void {
    if (!this.isConfigValid() || this.selectedEmployees.length === 0) {
      return;
    }

    // TODO: Mostrar modal de vista previa
    console.log('Vista previa:', {
      config: this.transferConfig,
      employees: this.selectedEmployees
    });
  }

  /**
   * Validar configuración
   */
  isConfigValid(): boolean {
    return !!(
      this.transferConfig.toBranchId &&
      this.transferConfig.toAreaId &&
      this.transferConfig.startDate &&
      (this.transferConfig.isPermanent || this.transferConfig.endDate)
    );
  }

  /**
   * Validar formulario completo
   */
  isFormValid(): boolean {
    return this.isConfigValid() && this.selectedEmployees.length > 0;
  }

  /**
   * Ejecutar transferencias masivas
   */
  onExecuteTransfers(): void {
    if (!this.isFormValid()) {
      return;
    }

    // Obtener descripciones de los servicios
    const selectedBranch = this.sedesList.find(s => s.categoriaAuxiliarId === this.transferConfig.toBranchId);
    const selectedArea = this.areasList.find(a => a.areaId === this.transferConfig.toAreaId);
    const selectedCostCenter = this.transferConfig.toCostCenterId ? 
      this.costCentersList.find(cc => cc.ccostoId === this.transferConfig.toCostCenterId) : null;

    const transfers: CreatePersonalTransferDto[] = this.selectedEmployees.map(employee => ({
      personalId: employee.personalId,
      fullName: `${employee.nombres || ''} ${employee.apellidoPaterno || ''} ${employee.apellidoMaterno || ''}`.trim(),
      branchId: this.transferConfig.toBranchId,
      branchDescription: selectedBranch?.descripcion || '',
      areaId: this.transferConfig.toAreaId,
      areaDescription: selectedArea?.descripcion || '',
      costCenterId: this.transferConfig.toCostCenterId || '',
      costCenterDescription: selectedCostCenter?.descripcion || '',
      startDate: this.transferConfig.startDate,
      endDate: this.transferConfig.isPermanent ? null : this.transferConfig.endDate,
      observation: this.transferConfig.observations || null,
      createdBy: 'Sistema' // TODO: Obtener usuario actual
    }));

    // Cerrar modal con los datos
    if (this.modalRef) {
      this.modalRef.closeModalFromChild({
        action: 'save',
        data: transfers
      });
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
   * Obtener nombre de sede por ID
   */
  getBranchName(branchId: string): string {
    const branch = this.sedesList.find(b => b.categoriaAuxiliarId === branchId);
    return branch ? branch.descripcion : 'Seleccionar sede';
  }

  /**
   * Obtener nombre de área por ID
   */
  getAreaName(areaId: string): string {
    const area = this.areasList.find(a => a.areaId === areaId);
    return area ? area.descripcion : 'Seleccionar área';
  }

  /**
   * Verificar si área está seleccionada en filtros
   */
  isAreaFilterSelected(areaId: string): boolean {
    return this.employeeFilters.selectedAreas.includes(areaId);
  }
}