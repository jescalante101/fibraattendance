import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ColDef, GridReadyEvent, GridApi, GridOptions } from 'ag-grid-community';
import {  createFioriGridOptions,  localeTextFiori } from '../../../../shared/ag-grid-theme-fiori';
import {  CreatePersonalTransferDto } from '../../../../core/models/personal-transfer.model';
import { PersonalTransferService } from '../../../../core/services/personal-transfer.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { CostCenterService, CostCenter } from '../../../../core/services/cost-center.service';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { PersonService, EmployeesParameters } from '../../../../core/services/person.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Employee } from '../../empleado/empleado/model/employeeDto';
import { AuthService } from '../../../../core/services/auth.service';
import { DateRange } from '../../../../shared/components/date-range-picker/date-range-picker.component';
import { AppUserService, SedeArea, Area, CostCenter as OriginCostCenter } from '../../../../core/services/app-user.services';
import { SedeAreaCostoService } from '../../../../core/services/sede-area-costo.service';
import { SedeAreaCosto } from '../../../../models/site-area-ccost.model';


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

  // Configuración de transferencia (con origen y destino)
  transferConfig = {
    // ORIGEN
    fromBranchId: '',
    fromAreaId: '',
    fromCostCenterId: '',
    
    // DESTINO
    toBranchId: '',
    toAreaId: '',
    toCostCenterId: '',
    
    // Fechas
    startDate: '',
    endDate: '',
    
    // Observaciones
    observations: ''
  };

  // Date range (con FormControl para validación)
  dateRangeControl = new FormControl<DateRange | null>(null, Validators.required);

  // Filtros de empleados
  employeeFilters = {
    searchTerm: '',
    selectedAreas: [] as string[],
    selectedBranches: [] as string[]
  };

  // Empleados y selección (se usan con ag-Grid ahora)
  allEmployees: SelectedEmployee[] = [];
  selectedEmployees: SelectedEmployee[] = [];
  employeeTotalCount = 0;

  // Estados de UI
  loading = false;
  loadingEmployees = false;
  private employeesLoaded = false; // Flag para evitar cargas duplicadas

  // Estados para autocompletes ORIGEN
  showFromSedeDropdown = false;
  showFromAreaDropdown = false;
  showFromCostCenterDropdown = false;
  
  // Estados para autocompletes DESTINO
  showToSedeDropdown = false;
  showToAreaDropdown = false;
  showToCostCenterDropdown = false;

  // Listas para ORIGEN (desde AppUserService)
  originSedesAreas: SedeArea[] = [];
  filteredOriginAreas: Area[] = [];
  selectedOriginCostCenters: OriginCostCenter[] = [];
  
  // Listas para DESTINO (desde SedeAreaCostoService)
  destinationSedesAreas: SedeAreaCosto[] = [];
  filteredDestinationAreas: SedeAreaCosto[] = [];
  filteredDestinationCostCenters: SedeAreaCosto[] = [];

  // Listas para autocompletes (legacy - se mantendrán por compatibilidad)
  sedesList: CategoriaAuxiliar[] = [];
  areasList: RhArea[] = [];
  costCentersList: CostCenter[] = [];

  // Listas filtradas para autocompletes DESTINO
  filteredToSedesList: CategoriaAuxiliar[] = [];
  filteredToAreasList: RhArea[] = [];
  filteredToCostCentersList: CostCenter[] = [];

  // Términos de búsqueda para autocompletes
  fromSedeFilterTerm = '';
  fromAreaFilterTerm = '';
  fromCostCenterFilterTerm = '';
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
  
  columnDefs: ColDef[] = [
    {
      headerName: 'Colaborador',
      flex: 2,
      filter: 'agTextColumnFilter',
      checkboxSelection: true,
      headerCheckboxSelection: true, // Recomendado para seleccionar/deseleccionar todos
      headerCheckboxSelectionFilteredOnly: true,
      valueGetter: (params) => {
        const emp = params.data;
        const apellidos = `${emp.apellidoPaterno || ''} ${emp.apellidoMaterno || ''}`.trim();
        return `${apellidos}, ${emp.nombres || ''}`;
      },
      // Se elimina el cellRenderer para mantener una sola línea y evitar el "aplastamiento"
    },
    {
      headerName: 'ID',
      field: 'personalId',
      flex: 1,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Documento',
      field: 'nroDoc',
      flex: 1,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Sede Actual',
      field: 'categoriaAuxiliarDescripcion',
      flex: 1.5,
      filter: 'agTextColumnFilter',
      valueFormatter: (params) => params.value || '-',
    },
    {
      headerName: 'Área Actual',
      field: 'areaDescripcion',
      flex: 1.5,
      filter: 'agTextColumnFilter',
      valueFormatter: (params) => params.value || '-',
    }
  ];


  
  // Configuración de ag-Grid con tema Fiori y sidebar
  gridOptions: GridOptions = createFioriGridOptions({
    // Configuraciones específicas para transferencias masivas
    sideBar: {
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columnas',
          labelKey: 'columns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
          minWidth: 225,
          maxWidth: 300,
          width: 250
        },
        {
          id: 'filters',
          labelDefault: 'Filtros Avanzados',
          labelKey: 'filters', 
          iconKey: 'filter',
          toolPanel: 'agFiltersToolPanel',
          minWidth: 225,
          maxWidth: 300,
          width: 250
        }
      ],
      position: 'right',
      defaultToolPanel: 'filters',
      hiddenByDefault: false
    },
    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100
      },
    theme: 'legacy',
    // Configuración de selección múltiple
    rowSelection: 'multiple',
    rowMultiSelectWithClick: false,
    suppressRowDeselection: false,
    
    // Performance y UX para listas grandes
    suppressRowVirtualisation: false,
    suppressColumnVirtualisation: false,
    
    // Localización en español
    localeText: localeTextFiori
  });
  
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
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private appUserService: AppUserService,
    private sedeAreaCostoService: SedeAreaCostoService
  ) {}

  ngOnInit(): void {
    console.log('🚀 MassiveTransferModal: Initializing...');
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
    this.initializeForm();
    this.loadUserData();
    this.loadOriginData();
    this.loadDestinationData();
    this.loadAutocompleteData(); // Legacy data for compatibility
    console.log('✅ MassiveTransferModal: Initialized successfully');
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
   * Cargar datos de ORIGEN (sedes/áreas del usuario)
   */
  private loadOriginData(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('No user logged in');
      return;
    }

    this.appUserService.getSedesAreas(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedesAreas) => {
          this.originSedesAreas = sedesAreas;
          console.log('✅ Origin data loaded:', sedesAreas);
        },
        error: (error) => {
          console.error('Error loading origin data:', error);
          this.toastService.error('Error de Datos', 'No se pudieron cargar las ubicaciones de origen disponibles');
        }
      });
  }

  /**
   * Cargar datos de DESTINO (todas las sedes/áreas activas)
   */
  private loadDestinationData(): void {
    this.sedeAreaCostoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sedesAreasCosto) => {
          // Filtrar solo los activos
          this.destinationSedesAreas = sedesAreasCosto.filter(item => item.active === 'Y');
          console.log('✅ Destination data loaded:', this.destinationSedesAreas);
        },
        error: (error) => {
          console.error('Error loading destination data:', error);
          this.toastService.error('Error de Datos', 'No se pudieron cargar las ubicaciones de destino disponibles');
        }
      });
  }

  /**
   * Inicializar formulario con valores por defecto
   */
  private initializeForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.transferConfig.startDate = today;
    this.transferConfig.endDate = today;
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
   * Actualizar lista de empleados seleccionados (ya no se usa, ag-Grid maneja la selección)
   */
  private updateSelectedEmployees(): void {
    // Este método ya no es necesario con ag-Grid
    // La selección se maneja en onSelectionChanged()
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
    // Evitar cargas duplicadas
    if (this.employeesLoaded || this.loadingEmployees) {
      return;
    }
    
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
          this.employeesLoaded = true; // Marcar como cargado
          
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
          this.employeesLoaded = false; // Reset flag en caso de error
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
   * Cambio en selección de empleado individual (ya no se usa, ag-Grid maneja la selección)
   */
  onEmployeeSelectionChange(): void {
    // Este método ya no es necesario con ag-Grid
    // La selección se maneja en onSelectionChanged()
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
   * Filtrar áreas del origen por término de búsqueda
   */
  onAreaSearchChange(): void {
    // Este método ya no es necesario porque el filtro de áreas ahora se maneja
    // directamente a través del origen seleccionado en filteredOriginAreas
    // Mantenemos el método para evitar errores pero no hace nada
    console.log('Area search changed:', this.areaSearchTerm);
  }

  /**
   * Seleccionar todos los empleados filtrados
   */
  selectAllFiltered(): void {
    if (this.gridApi) {
      this.gridApi.selectAll();
    }
  }

  /**
   * Deseleccionar todos los empleados
   */
  deselectAll(): void {
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  }

  /**
   * Handle date range selection from reusable component
   */
  onDateRangeSelected(dateRange: DateRange): void {
    console.log('📅 Date range selected:', dateRange);
    
    this.transferConfig.startDate = dateRange.start;
    this.transferConfig.endDate = dateRange.end;
    
    console.log('✅ Transfer config updated:');
    console.log('   Start:', this.transferConfig.startDate);
    console.log('   End:', this.transferConfig.endDate);
    console.log('   Form valid:', this.isConfigValid());
  }

  /**
   * Handle raw date objects from reusable component (optional)
   */
  onDatesSelected(dates: Date[]): void {
    console.log('📅 Raw dates selected:', dates);
    // Additional logic if needed with raw Date objects
  }

  /**
   * Cambio en configuración de transferencia permanente
   */


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
        endDate:  this.transferConfig.endDate,
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
        fromBranches: Array.from(new Set(this.selectedEmployees.map(emp => emp.categoriaAuxiliarDescripcion).filter(Boolean))),
        fromAreas: Array.from(new Set(this.selectedEmployees.map(emp => emp.areaDescripcion).filter(Boolean)))
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
    const dateRangeValid = this.dateRangeControl.valid && this.dateRangeControl.value;
    const isValid = !!(
      this.transferConfig.toBranchId &&
      this.transferConfig.toAreaId &&
      dateRangeValid
    );
    
    // Debug para encontrar el problema
    console.log('🔍 Config Validation:', {
      toBranchId: !!this.transferConfig.toBranchId,
      toAreaId: !!this.transferConfig.toAreaId,
      dateRangeValid: dateRangeValid,
      dateRangeValue: this.dateRangeControl.value,
      startDate: this.transferConfig.startDate,
      endDate: this.transferConfig.endDate,
      isValid
    });
    
    return isValid;
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
      endDate: this.transferConfig.endDate,
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

  // ===============================
  // ORIGIN METHODS - SEDE
  // ===============================

  onOriginSedeChange(sedeId: string): void {
    console.log('Origin sede changed:', sedeId);
    
    this.transferConfig.fromBranchId = sedeId;
    this.transferConfig.fromAreaId = '';
    this.transferConfig.fromCostCenterId = '';
    
    // Filtrar áreas para la sede seleccionada
    const selectedSede = this.originSedesAreas.find(s => s.siteId === sedeId);
    if (selectedSede) {
      this.filteredOriginAreas = selectedSede.areas;
      this.selectedOriginCostCenters = selectedSede.costCenters;
    } else {
      this.filteredOriginAreas = [];
      this.selectedOriginCostCenters = [];
    }
    
    // Cargar empleados del origen seleccionado
    this.loadEmployeesFromOrigin();
  }

  onOriginAreaChange(areaId: string): void {
    console.log('Origin area changed:', areaId);
    this.transferConfig.fromAreaId = areaId;
    this.transferConfig.fromCostCenterId = '';
    
    // Cargar empleados del área específica
    this.loadEmployeesFromOrigin();
  }

  onOriginCostCenterChange(costCenterId: string): void {
    console.log('Origin cost center changed:', costCenterId);
    this.transferConfig.fromCostCenterId = costCenterId;
    
    // Opcional: recargar empleados si es necesario
    this.loadEmployeesFromOrigin();
  }

  // ===============================
  // DESTINATION METHODS - SEDE/AREA
  // ===============================

  onDestinationSedeChange(sedeId: string): void {
    console.log('Destination sede changed:', sedeId);
    
    this.transferConfig.toBranchId = sedeId;
    this.transferConfig.toAreaId = '';
    this.transferConfig.toCostCenterId = '';
    
    // Filtrar áreas para la sede de destino seleccionada
    this.filteredDestinationAreas = this.destinationSedesAreas
      .filter(item => item.siteId === sedeId);
    
    this.filteredDestinationCostCenters = [];
  }

  onDestinationAreaChange(areaId: string): void {
    console.log('Destination area changed:', areaId);
    this.transferConfig.toAreaId = areaId;
    this.transferConfig.toCostCenterId = '';
    
    // Filtrar centros de costo para la sede/área de destino
    this.filteredDestinationCostCenters = this.destinationSedesAreas
      .filter(item => item.siteId === this.transferConfig.toBranchId && item.areaId === areaId);
  }

  onDestinationCostCenterChange(costCenterId: string): void {
    console.log('Destination cost center changed:', costCenterId);
    this.transferConfig.toCostCenterId = costCenterId;
  }

  // ===============================
  // EMPLOYEE LOADING BASED ON ORIGIN
  // ===============================

  /**
   * Cargar empleados basado en la selección de origen
   */
  private loadEmployeesFromOrigin(): void {
    if (!this.transferConfig.fromBranchId) {
      console.warn('No origin branch selected');
      return;
    }

    if (!this.headerConfig?.selectedEmpresa) {
      this.toastService.warning('Configuración Requerida', 'No hay empresa seleccionada');
      return;
    }

    this.loadingEmployees = true;
    this.employeesLoaded = false;
    
    const employeeParams: EmployeesParameters = {
      searchText: this.employeeFilters.searchTerm || '',
      page: 1,
      pagesize: 1000,
      areaId: this.transferConfig.fromAreaId || null,
      ccostoId: this.transferConfig.fromCostCenterId || null,
      sede: this.transferConfig.fromBranchId,
      periodoId: this.headerConfig.selectedPeriodo?.periodoId || null,
      planillaId: this.headerConfig.selectedPlanilla?.planillaId || null,
      companiaId: this.headerConfig.selectedEmpresa.companiaId
    };

    console.log('Loading employees with params:', employeeParams);

    this.personService.getPersonalActivo(employeeParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingEmployees = false;
          this.employeesLoaded = true;
          
          if (response.exito && response.data) {
            const employees = response.data.items || [];
            this.allEmployeesData = employees.map(emp => ({
              ...emp,
              selected: false
            }));
            
            this.employeeTotalCount = response.data.totalCount || 0;
            this.applyFiltersToGrid();
            
            console.log(`✅ Loaded ${this.employeeTotalCount} employees from origin`);
            
            this.toastService.success(
              'Empleados Cargados', 
              `Se encontraron ${this.employeeTotalCount} empleados en la ubicación seleccionada`
            );
          } else {
            this.allEmployeesData = [];
            this.employeeTotalCount = 0;
            this.applyFiltersToGrid();
            
            this.toastService.warning(
              'Sin Resultados',
              'No se encontraron empleados en la ubicación seleccionada'
            );
          }
        },
        error: (error) => {
          this.loadingEmployees = false;
          this.employeesLoaded = false;
          this.allEmployeesData = [];
          this.employeeTotalCount = 0;
          this.applyFiltersToGrid();
          
          this.toastService.error(
            'Error al Cargar Empleados',
            'No se pudieron cargar los empleados del origen seleccionado'
          );
        }
      });
  }

  // ===============================
  // HELPER METHODS
  // ===============================

  getOriginSedeName(): string {
    if (!this.transferConfig.fromBranchId) return 'Seleccionar sede origen';
    const sede = this.originSedesAreas.find(s => s.siteId === this.transferConfig.fromBranchId);
    return sede?.siteName || 'Sede no encontrada';
  }

  getOriginAreaName(): string {
    if (!this.transferConfig.fromAreaId) return 'Seleccionar área origen';
    const area = this.filteredOriginAreas.find(a => a.areaId === this.transferConfig.fromAreaId);
    return area?.areaName || 'Área no encontrada';
  }

  getDestinationSedeOptions(): {siteId: string, siteName: string}[] {
    const uniqueSedes = new Map<string, string>();
    this.destinationSedesAreas.forEach(item => {
      uniqueSedes.set(item.siteId, item.siteName);
    });
    return Array.from(uniqueSedes.entries()).map(([siteId, siteName]) => ({siteId, siteName}));
  }

  getUniqueSedes(sedesAreas: SedeAreaCosto[]): {siteId: string, siteName: string}[] {
    const uniqueSedes = new Map<string, string>();
    sedesAreas.forEach(item => {
      uniqueSedes.set(item.siteId, item.siteName);
    });
    return Array.from(uniqueSedes.entries()).map(([siteId, siteName]) => ({siteId, siteName}));
  }
}
