import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ColDef, GridReadyEvent, GridApi, GridOptions } from 'ag-grid-community';
import { AG_GRID_LOCALE_ES } from '../../../../ag-grid-locale.es';
import { PersonalTransferDto, CreatePersonalTransferDto } from '../../../../core/models/personal-transfer.model';
import { PersonalTransferService } from '../../../../core/services/personal-transfer.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { CostCenterService, CostCenter } from '../../../../core/services/cost-center.service';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { PersonService, EmployeesParameters } from '../../../../core/services/person.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Employee } from '../../empleado/empleado/model/employeeDto';
import { AuthService } from '../../../../core/services/auth.service';

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

  // Configuración de transferencia (simplificada)
  transferConfig = {
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

  // Paginación de empleados
  employeePage = 1;
  employeePageSize = 50; // Tamaño de página para empleados
  employeeTotalCount = 0;
  employeeTotalPages = 0;

  // Estados de UI
  loading = false;
  loadingEmployees = false;

  // Estados para autocompletes (simplificado)
  showToSedeDropdown = false;
  showToAreaDropdown = false;
  showToCostCenterDropdown = false;

  // Listas para autocompletes
  sedesList: CategoriaAuxiliar[] = [];
  areasList: RhArea[] = [];
  costCentersList: CostCenter[] = [];

  // Listas filtradas para autocompletes (simplificado)
  filteredToSedesList: CategoriaAuxiliar[] = [];
  filteredToAreasList: RhArea[] = [];
  filteredToCostCentersList: CostCenter[] = [];

  // Términos de búsqueda para autocompletes (simplificado)
  toSedeFilterTerm = '';
  toAreaFilterTerm = '';
  toCostCenterFilterTerm = '';
  
  // Areas para filtro lateral
  filterAreas: RhArea[] = [];
  filteredAreas: RhArea[] = [];
  areaSearchTerm: string = '';
  
  // Configuración del header
  headerConfig: HeaderConfig | null = null;

  // Datos del usuario
  userLogin: string = '';

  // Configuración de ag-Grid
  gridApi!: GridApi;
  localeText = AG_GRID_LOCALE_ES;
  
  columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'selected',
      checkboxSelection: true,
      headerCheckboxSelection: false, // Quitamos el checkbox del header para evitar duplicado
      width: 50,
      pinned: 'left',
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true
    },
    {
      headerName: 'Colaborador',
      field: 'fullName',
      flex: 2,
      filter: 'agTextColumnFilter',
      valueGetter: (params) => {
        const emp = params.data;
        return `${emp.nombres || ''} ${emp.apellidoPaterno || ''} ${emp.apellidoMaterno || ''}`.trim();
      }
    },
    {
      headerName: 'Documento',
      field: 'nroDoc',
      flex: 1,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'ID Personal',
      field: 'personalId',
      flex: 1,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'Sede Actual',
      field: 'categoriaAuxiliarDescripcion',
      flex: 1.5,
      filter: 'agSetColumnFilter',
      valueFormatter: (params) => params.value || '-'
    },
    {
      headerName: 'Área Actual',
      field: 'areaDescripcion',
      flex: 1.5,
      filter: 'agSetColumnFilter',
      valueFormatter: (params) => params.value || '-'
    }
  ];


  // Configuración de ag-Grid
  gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
      floatingFilter: true
    },
    localeText: this.localeText,
    suppressHorizontalScroll: false,
    rowSelection: 'multiple',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    suppressRowClickSelection: true,
    enableRangeSelection: false,
    animateRows: true,
    enableCellTextSelection: true,
    suppressMenuHide: true,
    sideBar: false
  };
  
  // Datos de empleados
  allEmployeesData: SelectedEmployee[] = [];



  constructor(
    private personalTransferService: PersonalTransferService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private costCenterService: CostCenterService,
    private headerConfigService: HeaderConfigService,
    private personService: PersonService,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
    this.initializeForm();
    this.loadAutocompleteData();
    this.loadUserData();
    this.loadAllEmployees();
  }

  

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar los datos del usuario
   */
  private loadUserData(): void {
    const user=this.authService.getCurrentUser();
    if(user){
      this.userLogin=user.username;

    }
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
        next: (sedes) => {
          this.sedesList = sedes;
          this.filteredToSedesList = sedes;
        },
        error: (error) => {
          console.error('Error cargando sedes:', error);
          this.toastService.error('Error de Datos', 'No se pudieron cargar las sedes disponibles');
        }
      });

    // Cargar áreas
    this.rhAreaService.getAreas(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.areasList = areas;
          this.filterAreas = [...areas];
          this.filteredAreas = [...areas];
          this.filteredToAreasList = areas;
        },
        error: (error) => {
          console.error('Error cargando áreas:', error);
          this.toastService.error('Error de Datos', 'No se pudieron cargar las áreas disponibles');
        }
      });

    // Cargar centros de costo
    this.costCenterService.getAll(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (costCenters) => {
          this.costCentersList = costCenters;
          this.filteredToCostCentersList = costCenters;
        },
        error: (error) => {
          console.error('Error cargando centros de costo:', error);
          this.toastService.error('Error de Datos', 'No se pudieron cargar los centros de costo disponibles');
        }
      });
  }

  /**
   * Carga inicial de empleados (solo se ejecuta una vez)
   */
  private loadEmployeesInitial(): void {
    if (this.loadingEmployees) {
      return;
    }
    
    this.loadEmployees();
  }

  /**
   * Cargar todos los empleados activos usando PersonService
   */
  private loadEmployees(): void {
    if (!this.headerConfig?.selectedEmpresa) {
      this.toastService.warning('Configuración Requerida', 'No hay empresa seleccionada');
      return;
    }

    this.loadingEmployees = true;
    
    const employeeParams: EmployeesParameters = {
      searchText: this.employeeFilters.searchTerm || '',
      page: this.employeePage,
      pagesize: this.employeePageSize,
      areaId: this.employeeFilters.selectedAreas.length > 0 ? this.employeeFilters.selectedAreas[0] : null,
      ccostoId: null, // No filtro específico por centro de costo por ahora
      sede: null, // No filtrar por sede en origen
      periodoId: this.headerConfig.selectedPeriodo?.periodoId || null,
      planillaId: this.headerConfig.selectedPlanilla?.planillaId || null,
      companiaId: this.headerConfig.selectedEmpresa.companiaId
    };

    this.personService.getPersonalActivo(employeeParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingEmployees = false;
          if (response.exito && response.data) {
            // Mapear empleados activos y agregar propiedad 'selected'
            const employees = response.data.items || [];
            this.allEmployees = employees.map(emp => ({
              ...emp,
              selected: false
            }));
            
            // Configurar paginación desde la respuesta del servidor
            this.employeeTotalCount = response.data.totalCount || 0;
            this.employeeTotalPages = Math.ceil(this.employeeTotalCount / this.employeePageSize);
            
            this.filteredEmployees = [...this.allEmployees];
            this.updateSelectedEmployees();
            
            
            // Toast de éxito si es la primera carga
            if (this.employeePage === 1 && this.allEmployees.length > 0) {
              this.toastService.success(
                'Empleados Activos Cargados', 
                `Se encontraron ${this.employeeTotalCount} empleados activos disponibles`
              );
            }
          } else {
            this.allEmployees = [];
            this.employeeTotalCount = 0;
            
            this.toastService.warning(
              'Sin Resultados',
              response.mensaje || 'No se encontraron empleados activos'
            );
          }
        },
        error: (error) => {
          this.loadingEmployees = false;
          this.allEmployees = [];
          this.filteredEmployees = [];
          this.employeeTotalCount = 0;
          
          this.toastService.error(
            'Error al Cargar Empleados',
            'No se pudieron cargar los empleados activos. Intente nuevamente.'
          );
        }
      });
  }

  /**
   * Aplicar filtros locales a empleados (después de cargar del servidor)
   */
  private applyEmployeeFilters(): void {
    // Los filtros ya se aplican en el servidor, solo mantenemos referencia
    this.filteredEmployees = [...this.allEmployees];
    this.updateSelectedEmployees();
  }

  /**
   * Filtrar empleados por área
   */
  onAreaFilterChange(areaId: string, checked: boolean): void {
    if (checked) {
      // Solo permitir una área seleccionada a la vez para simplificar
      this.employeeFilters.selectedAreas = [areaId];
    } else {
      this.employeeFilters.selectedAreas = [];
    }
    this.applyFiltersToGrid();
  }


  /**
   * Buscar empleados con debounce
   */
  private searchEmployeesDebounced = this.debounce(() => {
    this.applyFiltersToGrid();
  }, 500);

  /**
   * Función debounce helper
   */
  private debounce(func: Function, delay: number) {
    let timeoutId: any;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Aplicar filtros al grid
   */
  private applyFiltersToGrid(): void {
    let filteredData = [...this.allEmployeesData];
    
    // Filtro por área
    if (this.employeeFilters.selectedAreas.length > 0) {
      filteredData = filteredData.filter(emp => 
        this.employeeFilters.selectedAreas.includes(emp.areaId || '')
      );
    }
    
    // Filtro por búsqueda
    if (this.employeeFilters.searchTerm) {
      const searchTerm = this.employeeFilters.searchTerm.toLowerCase();
      filteredData = filteredData.filter(emp => 
        (emp.nombres || '').toLowerCase().includes(searchTerm) ||
        (emp.apellidoPaterno || '').toLowerCase().includes(searchTerm) ||
        (emp.apellidoMaterno || '').toLowerCase().includes(searchTerm) ||
        (emp.nroDoc || '').toLowerCase().includes(searchTerm) ||
        (emp.personalId || '').toLowerCase().includes(searchTerm)
      );
    }
    
    this.allEmployees = filteredData;
  }

  /**
   * Cambio en el término de búsqueda
   */
  onSearchTermChange(): void {
    this.searchEmployeesDebounced();
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
   * Evento cuando ag-Grid está listo
   */
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // Auto-resize columns to fit
    this.gridApi.sizeColumnsToFit();
  }

  /**
   * Cargar todos los empleados desde el servidor
   */
  private loadAllEmployees(): void {
    if (!this.headerConfig?.selectedEmpresa) {
      this.toastService.warning('Configuración Requerida', 'No hay empresa seleccionada');
      return;
    }

    this.loadingEmployees = true;
    
    const employeeParams: EmployeesParameters = {
      searchText: this.employeeFilters.searchTerm || '',
      page: 1,
      pagesize: 1000, // Cargar muchos registros
      areaId: this.employeeFilters.selectedAreas.length > 0 ? this.employeeFilters.selectedAreas[0] : null,
      ccostoId: null,
      sede: null,
      periodoId: this.headerConfig.selectedPeriodo?.periodoId || null,
      planillaId: this.headerConfig.selectedPlanilla?.planillaId || null,
      companiaId: this.headerConfig.selectedEmpresa.companiaId
    };

    this.personService.getPersonalActivo(employeeParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingEmployees = false;
          if (response.exito && response.data) {
            const employees = response.data.items || [];
            this.allEmployeesData = employees.map(emp => ({
              ...emp,
              selected: false
            }));
            
            this.employeeTotalCount = response.data.totalCount || 0;
            this.applyFiltersToGrid();
            
            this.toastService.success(
              'Empleados Activos Cargados', 
              `Se encontraron ${this.employeeTotalCount} empleados activos disponibles`
            );
          } else {
            this.allEmployeesData = [];
            this.employeeTotalCount = 0;
            
            this.toastService.warning(
              'Sin Resultados',
              response.mensaje || 'No se encontraron empleados activos'
            );
          }
        },
        error: (error) => {
          this.loadingEmployees = false;
          this.allEmployeesData = [];
          this.employeeTotalCount = 0;
          
          this.toastService.error(
            'Error al Cargar Empleados',
            'No se pudieron cargar los empleados activos. Intente nuevamente.'
          );
        }
      });
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
   * Manejo de selección en ag-Grid
   */
  onSelectionChanged(): void {
    if (!this.gridApi) return;
    
    const selectedNodes = this.gridApi.getSelectedNodes();
    this.selectedEmployees = selectedNodes.map(node => ({
      ...node.data,
      selected: true
    }));
  }

  /**
   * Filtrar áreas por término de búsqueda
   */
  onAreaSearchChange(): void {
    if (!this.areaSearchTerm.trim()) {
      this.filteredAreas = [...this.filterAreas];
    } else {
      const searchTerm = this.areaSearchTerm.toLowerCase();
      this.filteredAreas = this.filterAreas.filter(area =>
        area.descripcion.toLowerCase().includes(searchTerm)
      );
    }
  }

  /**
   * Seleccionar todos los empleados filtrados
   */
  selectAllFiltered(): void {
    if (this.gridApi) {
      this.gridApi.selectAll();
    } else {
      this.filteredEmployees.forEach(emp => emp.selected = true);
      this.updateSelectedEmployees();
      this.allSelected = true;
    }
  }

  /**
   * Deseleccionar todos los empleados
   */
  deselectAll(): void {
    if (this.gridApi) {
      this.gridApi.deselectAll();
    } else {
      this.allEmployees.forEach(emp => emp.selected = false);
      this.updateSelectedEmployees();
      this.allSelected = false;
    }
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

    // Obtener descripciones de los servicios
    const selectedBranch = this.sedesList.find(s => s.categoriaAuxiliarId === this.transferConfig.toBranchId);
    const selectedArea = this.areasList.find(a => a.areaId === this.transferConfig.toAreaId);
    const selectedCostCenter = this.transferConfig.toCostCenterId ? 
      this.costCentersList.find(cc => cc.ccostoId === this.transferConfig.toCostCenterId) : null;

    const previewData = {
      transferInfo: {
        toBranch: selectedBranch?.descripcion || 'No seleccionada',
        toArea: selectedArea?.descripcion || 'No seleccionada',
        toCostCenter: selectedCostCenter?.descripcion || 'No seleccionado',
        startDate: this.transferConfig.startDate,
        endDate: this.transferConfig.isPermanent ? 'Permanente' : this.transferConfig.endDate,
        observations: this.transferConfig.observations || 'Sin observaciones'
      },
      employees: this.selectedEmployees.map(emp => ({
        personalId: emp.personalId,
        fullName: `${emp.nombres || ''} ${emp.apellidoPaterno || ''} ${emp.apellidoMaterno || ''}`.trim(),
        currentBranch: emp.categoriaAuxiliarDescripcion || 'No asignada',
        currentArea: emp.areaDescripcion || 'No asignada',
        document: emp.nroDoc
      })),
      summary: {
        totalEmployees: this.selectedEmployees.length,
        fromBranches: [...new Set(this.selectedEmployees.map(emp => emp.categoriaAuxiliarDescripcion).filter(Boolean))],
        fromAreas: [...new Set(this.selectedEmployees.map(emp => emp.areaDescripcion).filter(Boolean))]
      }
    };

    // TODO: Mostrar modal de vista previa con los datos estructurados
    console.log('Vista previa de transferencias masivas:', previewData);
    
    // Por ahora, mostrar un alert con resumen
    const summary = `
🔄 VISTA PREVIA DE TRANSFERENCIAS MASIVAS\n
📊 Resumen:
- ${previewData.summary.totalEmployees} empleados seleccionados
- Origen: ${previewData.summary.fromBranches.join(', ')} (${previewData.summary.fromAreas.join(', ')})
- Destino: ${previewData.transferInfo.toBranch} - ${previewData.transferInfo.toArea}
- Fecha: ${previewData.transferInfo.startDate} → ${previewData.transferInfo.endDate}

¿Proceder con las transferencias?`;
    
    if (confirm(summary)) {
      this.onExecuteTransfers();
    }
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

    this.loading = true;

    // Obtener descripciones de los servicios
    const selectedBranch = this.sedesList.find(s => s.categoriaAuxiliarId === this.transferConfig.toBranchId);
    const selectedArea = this.areasList.find(a => a.areaId === this.transferConfig.toAreaId);
    const selectedCostCenter = this.transferConfig.toCostCenterId ? 
      this.costCentersList.find(cc => cc.ccostoId === this.transferConfig.toCostCenterId) : null;

    const transfers: CreatePersonalTransferDto[] = this.selectedEmployees.map(employee => ({
      personalId: employee.personalId, // personalId en Employee
      fullName: `${employee.apellidoPaterno || ''} ${employee.apellidoMaterno || ''}, ${employee.nombres || ''} `.trim(),
      branchId: this.transferConfig.toBranchId,
      branchDescription: selectedBranch?.descripcion || '',
      areaId: this.transferConfig.toAreaId,
      areaDescription: selectedArea?.descripcion || '',
      costCenterId: this.transferConfig.toCostCenterId || '',
      costCenterDescription: selectedCostCenter?.descripcion || '',
      startDate: this.transferConfig.startDate,
      endDate: this.transferConfig.isPermanent ? null : this.transferConfig.endDate,
      observation: this.transferConfig.observations || null,
      createdBy: this.userLogin
    }));

    // Llamar al servicio para crear las transferencias masivas
    this.personalTransferService.createPersonalTransferMassive(transfers)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            
            const transferCount = response.data?.length || 0;
            
            // Toast de éxito
            this.toastService.success(
              'Transferencias Creadas',
              `Se procesaron ${transferCount} transferencias exitosamente`
            );
            
            // Cerrar modal con resultado exitoso
            if (this.modalRef) {
              this.modalRef.closeModalFromChild({
                action: 'save',
                success: true,
                data: response.data,
                message: `Se crearon ${transferCount} transferencias exitosamente`
              });
            }
          } else {
            
            // Toast de error
            this.toastService.error(
              'Error al Procesar',
              response.message || 'Error desconocido al crear las transferencias'
            );
          }
        },
        error: (error) => {
          this.loading = false;
          
          let errorMessage = 'Error al crear las transferencias masivas';
          let errorTitle = 'Error de Transferencias';
          
          if (error.message) {
            errorMessage = error.message;
          } else if (error.errors && error.errors.length > 0) {
            errorMessage = error.errors.join(', ');
          } else if (error.status) {
            errorTitle = `Error ${error.status}`;
            errorMessage = 'Error de conexión con el servidor. Verifique su conexión e intente nuevamente.';
          }
          
          // Toast de error
          this.toastService.error(errorTitle, errorMessage);
        }
      });
  }

  /**
   * Mostrar error al usuario (método legacy - ahora usamos toasts)
   */
  private showError(message: string): void {
    this.toastService.error('Error', message);
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

  // ===============================
  // AUTOCOMPLETE METHODS - TO SEDE
  // ===============================

  getToSedeFilterText(): string {
    if (this.transferConfig.toBranchId) {
      const selectedSede = this.sedesList.find(s => s.categoriaAuxiliarId === this.transferConfig.toBranchId);
      return selectedSede?.descripcion || '';
    }
    return this.toSedeFilterTerm;
  }

  onToSedeFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.toSedeFilterTerm = value;
    this.filteredToSedesList = this.sedesList.filter(sede => 
      sede.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showToSedeDropdown = this.filteredToSedesList.length > 0;
  }

  onToSedeSelected(sede: CategoriaAuxiliar): void {
    this.transferConfig.toBranchId = sede.categoriaAuxiliarId;
    this.toSedeFilterTerm = sede.descripcion;
    this.showToSedeDropdown = false;
  }

  onToSedeBlur(): void {
    setTimeout(() => {
      this.showToSedeDropdown = false;
    }, 200);
  }

  // ===============================
  // AUTOCOMPLETE METHODS - TO AREA
  // ===============================

  getToAreaFilterText(): string {
    if (this.transferConfig.toAreaId) {
      const selectedArea = this.areasList.find(a => a.areaId === this.transferConfig.toAreaId);
      return selectedArea?.descripcion || '';
    }
    return this.toAreaFilterTerm;
  }

  onToAreaFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.toAreaFilterTerm = value;
    this.filteredToAreasList = this.areasList.filter(area => 
      area.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showToAreaDropdown = this.filteredToAreasList.length > 0;
  }

  onToAreaSelected(area: RhArea): void {
    this.transferConfig.toAreaId = area.areaId;
    this.toAreaFilterTerm = area.descripcion;
    this.showToAreaDropdown = false;
  }

  onToAreaBlur(): void {
    setTimeout(() => {
      this.showToAreaDropdown = false;
    }, 200);
  }

  // ===============================
  // AUTOCOMPLETE METHODS - TO COST CENTER
  // ===============================

  getToCostCenterFilterText(): string {
    if (this.transferConfig.toCostCenterId) {
      const selectedCC = this.costCentersList.find(cc => cc.ccostoId === this.transferConfig.toCostCenterId);
      return selectedCC?.descripcion || '';
    }
    return this.toCostCenterFilterTerm;
  }

  onToCostCenterFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.toCostCenterFilterTerm = value;
    this.filteredToCostCentersList = this.costCentersList.filter(cc => 
      cc.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showToCostCenterDropdown = this.filteredToCostCentersList.length > 0;
  }

  onToCostCenterSelected(costCenter: CostCenter): void {
    this.transferConfig.toCostCenterId = costCenter.ccostoId;
    this.toCostCenterFilterTerm = costCenter.descripcion;
    this.showToCostCenterDropdown = false;
  }

  onToCostCenterBlur(): void {
    setTimeout(() => {
      this.showToCostCenterDropdown = false;
    }, 200);
  }

  // ===============================
  // TRACKBY METHODS
  // ===============================

  trackBySedeId(index: number, sede: CategoriaAuxiliar): string {
    return sede.categoriaAuxiliarId;
  }

  trackByAreaId(index: number, area: RhArea): string {
    return area.areaId;
  }

  trackByCostCenterId(index: number, costCenter: CostCenter): string {
    return costCenter.ccostoId;
  }
}