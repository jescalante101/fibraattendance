import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions, createFioriGridOptionsWithDynamicResize, createFioriGridOptionsWithFullDynamicResize } from '../../../../shared/ag-grid-theme-fiori';

// Real data imports
export interface CompensatoryDayFormData {
  sedeId: string;
  sedeName: string;
  areaId: string;
  areaName: string;
  holidayWorkedDate: string;
  compensatoryDayOffDate: string;
  reason: string;
  selectedEmployees: EmployeeScheduleAssignment[];
}

const INITIAL_FORM_DATA: CompensatoryDayFormData = {
  sedeId: '',
  sedeName: '',
  areaId: '',
  areaName: '',
  holidayWorkedDate: '',
  compensatoryDayOffDate: '',
  reason: '',
  selectedEmployees: []
};

import { AppUserService, SedeArea } from 'src/app/core/services/app-user.services';
import { AuthService } from '../../../../core/services/auth.service';
import { RhArea } from 'src/app/core/services/rh-area.service';
import { HeaderConfig, HeaderConfigService } from 'src/app/core/services/header-config.service';
import { CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';
import { CompensatoryDayService } from 'src/app/core/services/compensatory-day.service';
import { CreateCompensatoryDay } from 'src/app/core/models/compensatory-day.model';

@Component({
  selector: 'app-modal-crear-compensatorio',
  templateUrl: './modal-crear-compensatorio.component.html',
  styleUrls: ['./modal-crear-compensatorio.component.css']
})
export class ModalCrearCompensatorioComponent implements OnInit, OnDestroy {
  @Input() componentData: any = {};
  @Output() closeEvent = new EventEmitter<CompensatoryDayFormData | null>();

  private destroy$ = new Subject<void>();

  modalRef: any;

  // Form y datos principales
  compensatoryForm!: FormGroup;
  formData: CompensatoryDayFormData = { ...INITIAL_FORM_DATA };
  
  // Datos para autocomplete y empleados (reales de API)
  filteredSedes: CategoriaAuxiliar[] = [];
  filteredSedesArray: CategoriaAuxiliar[] = [];
  filteredAreas: RhArea[] = [];
  filteredAreasArray: RhArea[] = [];
  availableEmployees: EmployeeScheduleAssignment[] = [];
  selectedEmployees: EmployeeScheduleAssignment[] = [];
  totalEmployees = 0;
  loadingEmployees = false;
  
  // Estados UI
  loading = false;
  saving = false;
  showSedeDropdown = false;
  showAreaDropdown = false;
  
  // AG-Grid configuration
  availableGridApi!: GridApi;
  selectedGridApi!: GridApi;
  availableEmployeesColumnDefs: ColDef[] = [];
  selectedEmployeesColumnDefs: ColDef[] = [];
  availableEmployeesGridOptions: GridOptions = {};
  selectedEmployeesGridOptions: GridOptions = {};
  
  // Configuración visual



  //
  userId=0;
  userName:String ='';

  //
  headerConfig :HeaderConfig |  null = null ;
  // sede y area que el usuario esta manejando
  sedesAreas: SedeArea[] = [];
  areasFiltradas: RhArea[] = [];
  sedes: CategoriaAuxiliar[] = [];


  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private appUserService: AppUserService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private compensatoryDayService: CompensatoryDayService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.initializeForm();
    this.setupSedeSearch();
    this.setupAreaSearch();
    this.setupGrids();
    this.loadSedeArea();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

  }

  private loadUser(){
    const user = this.authService.getCurrentUser();
    if(user){
      this.userId = user.id;
      this.userName = user.username;
    }
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
  }

  private initializeForm(): void {
    this.compensatoryForm = this.fb.group({
      sedeSearch: ['', Validators.required],
      sedeId: [null, Validators.required],
      areaSearch: ['', Validators.required],
      areaId: [null, Validators.required],
      holidayWorkedDate: ['', Validators.required],
      compensatoryDayOffDate: ['', Validators.required],
      reason: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(200)
      ]]
    });
  }

  /***
   * MIS FUNCIONES PARA RECUEPRAR SEDE Y AREA 
   */
  private loadSedeArea(): void {
    this.loading = true;
    const companiaId = this.headerConfig?.selectedEmpresa?.companiaId || '01';
    
    this.appUserService.getSedesAreas(this.userId)
    .subscribe({
      next: (sedesAreas) => {
        this.sedesAreas = sedesAreas;
        
        // Mapear sedes para el autocomplete
        this.sedes = sedesAreas.map(sede => ({
          categoriaAuxiliarId: sede.siteId,
          descripcion: sede.siteName,
          companiaId: companiaId,
          codigoAuxiliar: sede.siteId
        }));
        
        // Mapear todas las áreas de todas las sedes
        this.areasFiltradas = sedesAreas.flatMap(sede => 
          sede.areas.map(area => ({
            areaId: area.areaId,
            descripcion: area.areaName,
            companiaId: companiaId,
            sedeId: sede.siteId // Agregar referencia a la sede
          } as RhArea & { sedeId: string }))
        );
        
        // Inicializar arrays filtrados para autocomplete
        this.filteredSedesArray = [...this.sedes];
        this.filteredSedes = [...this.sedes];
        this.filteredAreasArray = []; // Vacío hasta seleccionar sede
        this.filteredAreas = [];
        
        console.log('Sedes cargadas:', this.sedes.length);
        console.log('Áreas totales cargadas:', this.areasFiltradas.length);
        
        // Auto-seleccionar la primera sede [0]
        if (this.sedes.length > 0) {
          this.selectSede(this.sedes[0]);
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al obtener sedes y áreas:', error);
        this.toastService.error('Error', 'No se pudieron cargar las sedes y áreas disponibles');
        this.sedes = [];
        this.filteredSedesArray = [];
        this.filteredSedes = [];
        this.areasFiltradas = [];
        this.filteredAreasArray = [];
        this.filteredAreas = [];
        this.loading = false;
      }
    });
  }

  private setupSedeSearch(): void {
    const sedeSearchControl = this.compensatoryForm.get('sedeSearch');
    
    if (sedeSearchControl) {
      sedeSearchControl.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(searchTerm => {
          this.filterSedes(searchTerm);
        });
    }
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
          const employee = params.data as EmployeeScheduleAssignment;
          const fullName = employee.fullNameEmployee || 'Sin nombre';
          const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          return `
            <div class="flex items-center space-x-2 py-1">
              <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-xs font-medium text-blue-600">
                  ${initials}
                </span>
              </div>
              <div>
                <div class="text-sm font-medium text-slate-800">${fullName}</div>
                <div class="text-xs text-slate-500">${employee.areaName || 'Sin área'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        headerName: 'Documento',
        field: 'nroDoc',
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
          const employee = params.data as EmployeeScheduleAssignment;
          const fullName = employee.fullNameEmployee || 'Sin nombre';
          const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          return `
            <div class="flex items-center space-x-2 py-1">
              <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <span class="text-xs font-medium text-green-600">
                  ${initials}
                </span>
              </div>
              <div>
                <div class="text-sm font-medium text-slate-800">${fullName}</div>
                <div class="text-xs text-slate-500">${employee.areaName || 'Sin área'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        headerName: 'Documento',
        field: 'nroDoc',
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

  private filterSedes(searchTerm: string): void {
    if (!searchTerm || searchTerm.length === 0) {
      this.filteredSedes = [...this.sedes];
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredSedes = this.sedes.filter(sede =>
      sede.descripcion.toLowerCase().includes(term)
    );
  }

  private filterAreas(searchTerm: string): void {
    if (!searchTerm || searchTerm.length === 0) {
      // Solo mostrar áreas de la sede seleccionada
      const sedeId = this.formData.sedeId;
      if (sedeId) {
        this.filteredAreas = this.filteredAreasArray;
      } else {
        this.filteredAreas = [];
      }
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredAreas = this.filteredAreasArray.filter(area =>
      area.descripcion.toLowerCase().includes(term)
    );
  }

  // Gestión del autocomplete de sedes
  onSedeSearchFocus(): void {
    this.showSedeDropdown = true;
    this.filteredSedes = [...this.sedes];
  }

  onSedeSearchBlur(): void {
    // Delay para permitir clicks en el dropdown
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }

  selectSede(sede: CategoriaAuxiliar): void {
    console.log('🏢 Seleccionando sede:', sede.descripcion, 'ID:', sede.categoriaAuxiliarId);
    
    this.formData.sedeId = sede.categoriaAuxiliarId;
    this.formData.sedeName = sede.descripcion;
    
    // Actualizar form controls
    this.compensatoryForm.patchValue({
      sedeSearch: sede.descripcion,
      sedeId: sede.categoriaAuxiliarId
    });
    
    // Filtrar áreas para la sede seleccionada
    this.filterAreasBySede(sede.categoriaAuxiliarId);
    
    // Limpiar selección de área cuando cambia la sede
    this.clearAreaSelection();
    this.showSedeDropdown = false;
  }

  private filterAreasBySede(sedeId: string): void {
    console.log('🏢➡️🏭 Filtrando áreas para sede:', sedeId);
    console.log('📋 Áreas totales disponibles:', this.areasFiltradas.length);
    
    this.filteredAreasArray = (this.areasFiltradas as (RhArea & { sedeId: string })[]).filter(area => area.sedeId === sedeId);
    this.filteredAreas = [...this.filteredAreasArray];
    
    console.log(`✅ Áreas filtradas para sede ${sedeId}:`, this.filteredAreasArray.length);
    console.log('📄 Áreas encontradas:', this.filteredAreasArray);
  }

  clearSedeSelection(): void {
    this.formData.sedeId = '';
    this.formData.sedeName = '';
    this.filteredAreasArray = [];
    this.filteredAreas = [];
    
    this.compensatoryForm.patchValue({
      sedeSearch: '',
      sedeId: null
    });
    
    // También limpiar área
    this.clearAreaSelection();
  }

  // Gestión del autocomplete de áreas
  onAreaSearchFocus(): void {
    if (this.formData.sedeId) {
      this.showAreaDropdown = true;
      this.filteredAreas = [...this.filteredAreasArray];
    }
  }

  onAreaSearchBlur(): void {
    // Delay para permitir clicks en el dropdown
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }

  selectArea(area: RhArea): void {
    this.formData.areaId = area.areaId;
    this.formData.areaName = area.descripcion;
    
    // Actualizar form controls
    this.compensatoryForm.patchValue({
      areaSearch: area.descripcion,
      areaId: area.areaId
    });
    
    // Cargar empleados del área seleccionada
    this.loadEmployeesByArea(area.areaId);
    this.showAreaDropdown = false;
  }

  clearAreaSelection(): void {
    this.formData.areaId = '';
    this.formData.areaName = '';
    this.availableEmployees = [];
    this.selectedEmployees = [];
    this.formData.selectedEmployees = [];
    
    this.compensatoryForm.patchValue({
      areaSearch: '',
      areaId: null
    });
  }

  /**
   * Obtener fechas de la semana actual (lunes a domingo)
   */
  private getCurrentWeekDates(): { startDate: string, endDate: string } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, 2 = martes, 3 = miércoles, 4 = jueves, 5 = viernes, 6 = sábado
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Calcular lunes de la semana actual
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    
    // Calcular domingo de la semana actual (6 días después del lunes)
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Formatear fechas como YYYY-MM-DD
    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];
    
    console.log(`📅 Semana actual: ${startDate} (lunes) a ${endDate} (domingo)`);
    console.log(`🗓️ Hoy es: ${now.toISOString().split('T')[0]} (día ${dayOfWeek} = ${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayOfWeek]})`);
    
    return { startDate, endDate };
  }

  private loadEmployeesByArea(areaId: string): void {
    this.loadingEmployees = true;
    console.log('🔍 Iniciando carga de empleados para área:', areaId);
    
    // Obtener usuario actual
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.error('❌ No hay usuario logueado');
      this.loadingEmployees = false;
      return;
    }
    
    // Obtener solo el locationId de la sede seleccionada
    const selectedSedeId = this.formData.sedeId;
    if (!selectedSedeId) {
      console.error('❌ No hay sede seleccionada');
      this.loadingEmployees = false;
      return;
    }
    
    const locationIds = [selectedSedeId]; // Solo la sede seleccionada
    console.log('🏢 LocationId de la sede seleccionada:', locationIds);
    
    // Obtener fechas de la semana actual (lunes a domingo)
    const { startDate, endDate } = this.getCurrentWeekDates();
    console.log('📅 Fechas de la semana:', { startDate, endDate });
    
    // Console.log antes de recuperar el personal
    console.log('📞 Llamando al servicio getEmployeeScheduleAssignments con parámetros:', {
      pageNumber: 1,
      pageSize: 500,
      filter: '',
      startDate: startDate,
      endDate: endDate,
      locationId: locationIds,
      areaId: areaId // Ya es string
    });
    
    // Usar el servicio con parámetros corregidos según la definición
    this.employeeScheduleAssignmentService.getEmployeeScheduleAssignments(
      1,                    // pageNumber
      500,                  // pageSize (como solicitaste)
      '',                   // filter (vacío para obtener todos)
      startDate,            // startDate (lunes de la semana)
      endDate,              // endDate (domingo de la semana)
      locationIds,          // locationId (solo la sede seleccionada)
      areaId               // areaId (ya es string)
    ).subscribe({
      next: (response) => {
        console.log('📨 Respuesta completa del servicio:', response);
        console.log('📊 response.exito:', response.exito);
        console.log('📊 response.data:', response.data);
        console.log('📊 response.data.items:', response.data?.items);
        
        if (response.exito && response.data) {
          // Check multiple possible data structures
          let employees: EmployeeScheduleAssignment[] = [];
          
          if (response.data.items && Array.isArray(response.data.items)) {
            employees = response.data.items;
          } else if (Array.isArray(response.data)) {
            // Sometimes the data itself might be the array
            employees = response.data;
          } else {
            // Check for other possible property names
            console.log('🔍 Estructura de data completa:', JSON.stringify(response.data, null, 2));
            employees = [];
          }
          
          this.availableEmployees = employees;
          this.totalEmployees = response.data.totalCount || employees.length;
        } else {
          this.availableEmployees = [];
          this.totalEmployees = 0;
        }
        
        this.selectedEmployees = [];
        this.formData.selectedEmployees = [];
        
        console.log(`✅ Empleados cargados para área ${areaId}:`, this.availableEmployees.length);
        console.log('📄 Datos de empleados:', this.availableEmployees);
        
        // Actualizar grillas si están inicializadas
        if (this.availableGridApi) {
          // Limpiar datos existentes y agregar nuevos
          const existingData: EmployeeScheduleAssignment[] = [];
          this.availableGridApi.forEachNode(node => existingData.push(node.data));
          
          this.availableGridApi.applyTransaction({
            add: this.availableEmployees,
            remove: existingData
          });
        }
        
        if (this.selectedGridApi) {
          // Limpiar empleados seleccionados
          const existingSelected: EmployeeScheduleAssignment[] = [];
          this.selectedGridApi.forEachNode(node => existingSelected.push(node.data));
          
          if (existingSelected.length > 0) {
            this.selectedGridApi.applyTransaction({
              remove: existingSelected
            });
          }
        }
        
        this.loadingEmployees = false;
      },
      error: (error) => {
        console.error('❌ Error loading employees:', error);
        console.error('❌ Error completo:', JSON.stringify(error, null, 2));
        console.error('❌ Parámetros usados:', { 
          areaId: areaId, 
          locationId: locationIds,
          startDate, 
          endDate,
          page: 1, 
          pageSize: 500 
        });
        
        this.toastService.error('Error', 'No se pudieron cargar los empleados del área');
        this.availableEmployees = [];
        this.totalEmployees = 0;
        this.loadingEmployees = false;
      }
    });
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
    const selectedRows = this.availableGridApi.getSelectedRows();
    return selectedRows ? selectedRows.length : 0;
  }

  addSelectedEmployees(): void {
    if (!this.availableGridApi) return;
    
    const selectedRows = this.availableGridApi.getSelectedRows();
    console.log('➡️ Agregando empleados seleccionados:', selectedRows.length);
    
    if (selectedRows.length === 0) {
      console.warn('⚠️ No hay empleados seleccionados para agregar');
      return;
    }
    
    selectedRows.forEach(employee => {
      console.log('➕ Agregando empleado:', employee.fullNameEmployee);
      
      // 1. Agregar a seleccionados
      this.selectedEmployees.push(employee);
      
      // 2. Remover de disponibles
      const index = this.availableEmployees.findIndex(emp => emp.employeeId === employee.employeeId);
      if (index !== -1) {
        this.availableEmployees.splice(index, 1);
      }
    });
    
    // 3. Actualizar formData
    this.formData.selectedEmployees = [...this.selectedEmployees];
    
    console.log('📊 Estado después de agregar:');
    console.log('- Empleados seleccionados:', this.selectedEmployees.length);
    console.log('- Empleados disponibles:', this.availableEmployees.length);
    
    // 4. Actualizar grillas por separado
    if (this.availableGridApi) {
      this.availableGridApi.applyTransaction({
        remove: selectedRows
      });
      console.log('✅ Empleados removidos de la grilla de disponibles');
    }
    
    if (this.selectedGridApi) {
      this.selectedGridApi.applyTransaction({
        add: selectedRows
      });
      console.log('✅ Empleados agregados a la grilla de seleccionados');
    }
  }

  selectEmployee(employee: EmployeeScheduleAssignment): void {
    // Método mantenido para compatibilidad, pero ahora se usa addSelectedEmployees
    this.selectedEmployees.push(employee);
    const index = this.availableEmployees.findIndex(emp => emp.employeeId === employee.employeeId);
    if (index !== -1) {
      this.availableEmployees.splice(index, 1);
    }
    this.formData.selectedEmployees = [...this.selectedEmployees];
  }

  removeEmployee(employee: EmployeeScheduleAssignment): void {
    console.log('🔄 Removiendo empleado:', employee.fullNameEmployee, 'ID:', employee.employeeId);
    
    const selectedIndex = this.selectedEmployees.findIndex(emp => emp.employeeId === employee.employeeId);
    if (selectedIndex !== -1) {
      console.log('✅ Empleado encontrado en seleccionados, índice:', selectedIndex);
      
      // 1. Remover de la lista de seleccionados
      this.selectedEmployees.splice(selectedIndex, 1);
      
      // 2. Agregar a la lista de disponibles
      this.availableEmployees.push(employee);
      
      // 3. Actualizar formData
      this.formData.selectedEmployees = [...this.selectedEmployees];
      
      // 4. Reordenar empleados disponibles alfabéticamente
      this.availableEmployees.sort((a, b) => {
        const nameA = a.fullNameEmployee || '';
        const nameB = b.fullNameEmployee || '';
        return nameA.localeCompare(nameB);
      });
      
      console.log('📊 Estado después de remover:');
      console.log('- Empleados seleccionados:', this.selectedEmployees.length);
      console.log('- Empleados disponibles:', this.availableEmployees.length);
      
      // 5. Actualizar grillas por separado para evitar conflictos
      if (this.selectedGridApi) {
        this.selectedGridApi.applyTransaction({
          remove: [employee]
        });
        console.log('✅ Empleado removido de la grilla de seleccionados');
      }
      
      if (this.availableGridApi) {
        this.availableGridApi.applyTransaction({
          add: [employee]
        });
        console.log('✅ Empleado agregado a la grilla de disponibles');
      }
    } else {
      console.warn('⚠️ Empleado no encontrado en la lista de seleccionados');
    }
  }

  selectAllEmployees(): void {
    if (!this.availableGridApi) return;
    this.availableGridApi.selectAll();
  }

  removeAllEmployees(): void {
    // Mover todos los seleccionados a disponibles
    const employeesToAdd = [...this.selectedEmployees];
    this.availableEmployees.push(...employeesToAdd);
    
    const employeesToRemove = [...this.selectedEmployees];
    this.selectedEmployees = [];
    this.formData.selectedEmployees = [];
    
    // Reordenar empleados disponibles
    this.availableEmployees.sort((a, b) => {
      const nameA = a.fullNameEmployee || '';
      const nameB = b.fullNameEmployee || '';
      return nameA.localeCompare(nameB);
    });
    
    // Actualizar grillas usando transaction para mejor performance
    this.availableGridApi?.applyTransaction({
      add: employeesToAdd
    });
    this.selectedGridApi?.applyTransaction({
      remove: employeesToRemove
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
        return `${fieldName} es requerido`;
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
    console.log('🚀 Iniciando guardado de días compensatorios...');
    
    // Preparar datos para el API
    const formValues = this.compensatoryForm.value;
    const currentUser = this.authService.getCurrentUser();
    const companyId = this.headerConfig?.selectedEmpresa?.companiaId || '01';
    
    // Transformar empleados seleccionados a CreateCompensatoryDay[]
    const compensatoryDaysData: CreateCompensatoryDay[] = this.selectedEmployees.map(employee => ({
      employeeId: employee.employeeId,
      assignmentId: employee.assignmentId,
      holidayWorkedDate: formValues.holidayWorkedDate,
      compensatoryDayOffDate: formValues.compensatoryDayOffDate,
      remarks: formValues.reason,
      companyId: companyId
    }));

    console.log('🚀 Datos a enviar al API:', compensatoryDaysData);

    // Llamar al servicio bulk
    this.compensatoryDayService.createCompensatoryDayBulk(compensatoryDaysData)
      .subscribe({
        next: (response) => {
          console.log('✅ Días compensatorios creados exitosamente:', response);
          this.toastService.success(
            'Éxito', 
            `Se crearon ${response.length} días compensatorios para ${this.selectedEmployees.length} empleados`
          );
          
          // Preparar datos finales para el componente padre
          const finalData: CompensatoryDayFormData = {
            sedeId: this.formData.sedeId,
            sedeName: this.formData.sedeName,
            areaId: this.formData.areaId,
            areaName: this.formData.areaName,
            holidayWorkedDate: formValues.holidayWorkedDate,
            compensatoryDayOffDate: formValues.compensatoryDayOffDate,
            reason: formValues.reason,
            selectedEmployees: [...this.selectedEmployees]
          };
          
          this.saving = false;
          
          // Cerrar modal usando ambos métodos para compatibilidad
          this.closeEvent.emit(finalData);
          
          if (this.modalRef) {
            this.modalRef.closeModalFromChild(finalData); // Enviar finalData, no response
          } 
        },
        error: (error) => {
          console.error('❌ Error al crear días compensatorios:', error);
          console.error('❌ Error completo:', JSON.stringify(error, null, 2));
          
          let errorMessage = 'No se pudieron crear los días compensatorios';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.toastService.error('Error', errorMessage);
          this.saving = false;
        }
      });
  }

  onCancel(): void {
    this.closeEvent.emit(null);
  }

  // Utilidades para el template
  trackByEmployeeId(index: number, employee: EmployeeScheduleAssignment): string {
    return employee.employeeId;
  }
  
  trackByAreaId(index: number, area: RhArea): string {
    return area.areaId;
  }
  
  trackBySedeId(index: number, sede: CategoriaAuxiliar): string {
    return sede.categoriaAuxiliarId;
  }
}