import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhArea } from 'src/app/core/services/rh-area.service';
import { CostCenterService, CostCenter } from 'src/app/core/services/cost-center.service';
import { EmployeesParameters, EmployeesWithoutShift, PersonService } from 'src/app/core/services/person.service';
import { AppUserService, SedeArea } from 'src/app/core/services/app-user.services';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { PageEvent } from '@angular/material/paginator';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignmentInsert } from 'src/app/core/services/employee-schedule-assignment.service';
import { forkJoin } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastService } from 'src/app/shared/services/toast.service';
import { HeaderConfig, HeaderConfigService } from 'src/app/core/services/header-config.service';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { DateRange } from 'src/app/shared/components/date-range-picker/date-range-picker.component';
import { ShiftListDto } from 'src/app/core/models/shift.model';

@Component({
  selector: 'app-asignar-turno-masivo',
  templateUrl: './asignar-turno-masivo.component.html',
  styleUrls: ['./asignar-turno-masivo.component.css']
})
export class AsignarTurnoMasivoComponent implements OnInit {
  modalRef: any; // Referencia al modal padre

  filtroForm!: FormGroup;
  personalForm!: FormGroup;
  turnoForm!: FormGroup;

  // Nuevas propiedades para los datos del endpoint
  sedesAreas: SedeArea[] = [];
  areasFiltradas: RhArea[] = [];
  
  // Propiedades para turnos
  turnos: ShiftListDto[] = [];
  turnosFiltrados: ShiftListDto[] = [];
  turnoSearchTerm: string = '';
  loadingTurnos = false;
  
  // Propiedades existentes
  sedes: CategoriaAuxiliar[] = [];
  areas: RhArea[] = [];
  costCenters: CostCenter[] = [];
  personalFiltrado: any[] = [];
  datosListos = false;
  loadingPersonal = false;
  
  // Estados para autocomplete de sede
  showSedeDropdown = false;
  filteredSedesArray: CategoriaAuxiliar[] = [];
  sedeFilterTerm = '';

  // Estados para autocomplete de centro de costo
  showCostCenterDropdown = false;
  filteredCostCentersArray: CostCenter[] = [];
  costCenterFilterTerm = '';

  // Estados para autocomplete de áreas (múltiple selección)
  showAreaDropdown = false;
  filteredAreasArray: RhArea[] = [];
  areaFilterTerm = '';
  selectedArea: RhArea | null = null;

  // Para selección de empleados
  seleccionados = new Set<string>();

  // Paginación
  paginaActual = 1;
  pageSize = 500;
  hayMasPaginas = false;
  totalCount = 0;

  // Nuevas propiedades para las mejoras
  searchTermPersonal = '';
  personalTotal: any[] = [];
  expandedTurnos = new Set<string>();
  
  // Array de días de la semana como en thorassemanal
  diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  diasAbreviados = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  headerConfig: HeaderConfig | null = null;
  
  // Step navigation
  currentStep = 1;
  
  // Math for template
  Math = Math;
  idUser:number=0;
  userLogin:string=''
  
  // ag-Grid configuration para empleados
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {
    ...createFioriGridOptions(),
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    // Add row styling for terminated and vacation employees
    getRowStyle: (params) => {
      if (params.data?.isTerminated) {
        return {
          backgroundColor: '#fef2f2', // red-50
          opacity: '0.8'
        };
      }
      if (params.data?.isOnVacation) {
        return {
          backgroundColor: '#fffbeb', // amber-50
          opacity: '0.8'
        };
      }
      return undefined;
    },
    // Disable row selection for terminated and vacation employees
    isRowSelectable: (params) => {
      return !params.data?.isTerminated && !params.data?.isOnVacation;
    }
  };
  gridApi: any;
  
  // ag-Grid configuration para áreas
  areasColumnDefs: ColDef[] = [];
  areasGridOptions: GridOptions = {
    ...createFioriGridOptions(),
    rowSelection: 'single',
    suppressRowClickSelection: true,
   
  };
  areasGridApi: any;

  constructor(
    private fb: FormBuilder,
    private personService: PersonService,
    private appUserService: AppUserService,
    private shiftsService: ShiftsService,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private costCenterService: CostCenterService,
    @Optional() public dialogRef: MatDialogRef<AsignarTurnoMasivoComponent>,
    private toastService: ToastService,
    private headerConfigService: HeaderConfigService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService
    
  ) {}

  ngOnInit(): void {
     this.loadUser();
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
    this.inicializarFormularios();
    this.cargarDatosIniciales();
    this.setupAgGrid();
  }

  private loadUser(){
    const user=this.authService.getCurrentUser();
    if(user){
      this.userLogin=user.username;
      this.idUser=user.id
    }
  }

  private inicializarFormularios(): void {
    // Mover fechas al filtroForm (Paso 1)
    this.filtroForm = this.fb.group({
      sede: [null, Validators.required],
      centroCosto: [null, Validators.required], // Requerido
      dateRange: [null, Validators.required] // DateRange picker
    });

    this.personalForm = this.fb.group({
      empleados: this.fb.array([], Validators.required)
    });

    // Remover fechas del turnoForm (ya están en filtroForm)
    this.turnoForm = this.fb.group({
      turno: [null, Validators.required],
      observaciones: ['']
    });
  }

  private cargarDatosIniciales(): void {
    this.datosListos = false;
    const companiaId = this.headerConfig?.selectedEmpresa?.companiaId || '01';
    // Usar el nuevo servicio para obtener sedes y áreas
    this.appUserService.getSedesAreas(
      this.idUser
    ).subscribe({
      next: (sedesAreas) => {
        this.sedesAreas = sedesAreas;
        
        // Convertir los datos del endpoint al formato esperado por el componente
        this.sedes = sedesAreas.map(sede => ({
          categoriaAuxiliarId: sede.siteId,
          descripcion: sede.siteName,
          companiaId: companiaId, // Valor por defecto
          codigoAuxiliar: sede.siteId // Usar el siteId como código auxiliar
        }));
        
        // Inicializar array filtrado para autocomplete
        this.filteredSedesArray = [...this.sedes];
        
        // Inicializar áreas vacías hasta que se seleccione una sede
        this.areas = [];
        this.areasFiltradas = [];
        this.filteredAreasArray = [];
        this.selectedArea = null;
        
        // Cargar centros de costo
        this.cargarCentrosCosto();
        
        this.datosListos = true;
        // Seleccionar automáticamente la primera sede si existe
        if (this.sedes.length > 0) {
          this.filtroForm.patchValue({ sede: this.sedes[0].categoriaAuxiliarId });
          this.onSedeSeleccionada(this.sedes[0].categoriaAuxiliarId);
        }
      },

      error: err => {
        console.error('Error al cargar sedes y áreas:', err);
        this.toastService.error('Error al cargar', 'No se pudieron cargar las sedes y áreas disponibles');
        this.sedesAreas = [];
        this.sedes = [];
        this.filteredSedesArray = [];
        this.areas = [];
        this.areasFiltradas = [];
        this.datosListos = true;
      }
    });
  }
  
  /**
   * Cargar centros de costo
   */
  private cargarCentrosCosto(): void {
    const companiaId = this.headerConfig?.selectedEmpresa?.companiaId || '01';
    
    this.costCenterService.getAll(companiaId).subscribe({
      next: (centrosCosto) => {
        this.costCenters = centrosCosto;
        this.filteredCostCentersArray = [...this.costCenters];
        console.log('Centros de costo cargados:', centrosCosto);
      },
      error: (error) => {
        console.error('Error cargando centros de costo:', error);
        this.costCenters = [];
        this.filteredCostCentersArray = [];
      }
    });
  }

  // Método para cargar turnos
  cargarTurnos(): void {
    this.loadingTurnos = true;
    this.shiftsService.getShifts(1, 100).subscribe({ // Aumentar para traer más turnos
      next: (response) => {
        this.turnos = response.data;
        this.filtrarTurnos(); // Filtrar inicialmente
        this.loadingTurnos = false;
      },
      error: (error) => {
        console.error('Error al cargar turnos:', error);
        this.toastService.error('Error al cargar', 'No se pudieron cargar los turnos disponibles');
        this.turnos = [];
        this.turnosFiltrados = [];
        this.loadingTurnos = false;
      }
    });
  }

  // Nuevos métodos para la UI de Turnos
  crearNuevoTurno(): void {
    this.toastService.info('Función no implementada', 'La creación de nuevos turnos no está disponible en esta versión.');
  }

  filtrarTurnos(): void {
    const searchTerm = this.turnoSearchTerm.toLowerCase().trim();
    if (!searchTerm) {
      this.turnosFiltrados = [...this.turnos];
    } else {
      this.turnosFiltrados = this.turnos.filter(turno =>
        turno.alias.toLowerCase().includes(searchTerm)
      );
    }
  }

  getTurnoDuracionSemanal(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    // Sumar la duración de trabajo de todos los días (convertir de "8h 30m" a minutos)
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.workHours || '0h 0m');
      return total + minutes;
    }, 0);
  }

  // Método para obtener resumen del horario
  getHorarioResumen(turno: ShiftListDto): string {
    if (!turno.horario || turno.horario.length === 0) {
      return 'Sin horario definido';
    }
    
    // Filtrar días con horas de trabajo > 0
    const diasLaborables = turno.horario.filter(h => {
      const workMinutes = this.convertDurationToMinutes(h.workHours || '0h 0m');
      return workMinutes > 0;
    });
    
    if (diasLaborables.length === 0) {
      return 'Sin días laborables';
    }
    
    const primerHorario = diasLaborables[0];
    const horaInicio = primerHorario.inTime; // Ya viene en formato "08:00"
    
    return `${diasLaborables.length} días, ${horaInicio}`;
  }
  
  getPrimerHorarioValido(turno: ShiftListDto): any {
    if (!turno.horario || turno.horario.length === 0) return null;
    // Busca el primer horario con duración de trabajo > 0
    const valido = turno.horario.find(h => {
      const workMinutes = this.convertDurationToMinutes(h.workHours || '0h 0m');
      return workMinutes > 0;
    });
    // Si no hay, retorna el primero
    return valido || turno.horario[0];
  }

  // Método para obtener tipo de ciclo
  getTipoCiclo(turno: ShiftListDto): string {
    if (turno.shiftCycle === 1) {
      return 'Semanal';
    } else if (turno.shiftCycle === 2) {
      return 'Quincenal';
    } else {
      return `Ciclo ${turno.shiftCycle}`;
    }
  }

  cargarPersonal() {
    this.loadingPersonal = true;

    // Primero obtenemos las fechas del filtroForm
    const dateRange = this.filtroForm.value.dateRange;
    
    if (!dateRange || !dateRange.start) {
      this.toastService.error('Error', 'Debe seleccionar un rango de fechas para continuar');
      this.loadingPersonal = false;
      return;
    }
    
    const fechaInicio = dateRange.start;
    const fechaFin = dateRange.end;

    console.log('Obteniendo empleados por rango de fechas:', { fechaInicio, fechaFin });
    
    // 1. Primero obtenemos los IDs de empleados que ya tienen asignación en el rango de fechas
    this.employeeScheduleAssignmentService.getEmployeeIdsByDateRange(fechaInicio, fechaFin || fechaInicio).subscribe({
      next: (employeeIds) => {
        console.log('IDs con asignación:', employeeIds);
        
        // 2. Ahora buscamos personal sin horario usando los IDs obtenidos
        this.buscarPersonalSinHorario(employeeIds || []);
      },
      error: (error) => {
        console.error('Error obteniendo IDs por fechas:', error);
        // En caso de error, continuamos con array vacío para no bloquear el flujo
        this.buscarPersonalSinHorario([]);
      }
    });
  }
  
  /**
   * Busca personal sin horario usando el nuevo servicio
   */
  /**
   * Check if employee is terminated based on fechaCese
   * Employee is terminated if fechaCese is greater than the start of current month
   */
  private isEmployeeTerminated(fechaCese: string | null): boolean {
    if (!fechaCese) return false;
    
    try {
      const ceaseDate = new Date(fechaCese);
      const currentDate = new Date();
      const startOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      return ceaseDate > startOfCurrentMonth;
    } catch (error) {
      console.error('Error parsing fechaCese:', error);
      return false;
    }
  }

  /**
   * Check if employee is on vacation during the selected date range
   */
  private isEmployeeOnVacation(vacacionesFechaInicio: string | null, vacacionesFechaFin: string | null): boolean {
    if (!vacacionesFechaInicio || !vacacionesFechaFin) return false;
    
    const dateRange = this.filtroForm.value.dateRange;
    if (!dateRange || !dateRange.start || !dateRange.end) return false;
    
    try {
      const vacationStart = new Date(vacacionesFechaInicio);
      const vacationEnd = new Date(vacacionesFechaFin);
      const selectedStart = new Date(dateRange.start);
      const selectedEnd = new Date(dateRange.end);
      
      // Check if vacation period overlaps with selected date range
      // Vacation overlaps if: vacation_start <= selected_end AND vacation_end >= selected_start
      return vacationStart <= selectedEnd && vacationEnd >= selectedStart;
    } catch (error) {
      console.error('Error parsing vacation dates:', error);
      return false;
    }
  }

  private buscarPersonalSinHorario(personalIdsExcluir: string[]) {
    // Obtener otros valores de localStorage o del headerConfig
    const companiaId = this.headerConfig?.selectedEmpresa?.companiaId || '01';
    const periodoId = this.headerConfig?.selectedPeriodo?.periodoId || null;
    const planillaId = this.headerConfig?.selectedPlanilla?.planillaId || null;

    const categoriaAuxiliarId = this.filtroForm.value.sede;
    const rhAreaId = this.selectedArea ? this.selectedArea.areaId : null; // ✅ Área seleccionada
    console.log("Cargando personal sin horario con filtros:", { categoriaAuxiliarId, rhAreaId, personalIdsExcluir });
    const filtro = this.searchTermPersonal.trim();
    
    const employeeParams: EmployeesWithoutShift = {
      searchText: filtro,
      page: this.paginaActual,
      pagesize: this.pageSize,
      areaId: rhAreaId ? [rhAreaId] : [], // ✅ Array con una sola área
      ccostoId: null, // NO filtrar por centro de costo en la búsqueda de empleados
      sede: categoriaAuxiliarId || null,
      periodoId: periodoId,
      planillaId: planillaId,
      companiaId: companiaId,
      personalIds: personalIdsExcluir // IDs a excluir (los que ya tienen asignación)
    };

    
    this.personService.getPersonalWithoutShift(employeeParams).subscribe({
      next: res => {
        console.log('Respuesta de getPersonalWithoutShift:', res);
        
        if (res.exito && res.data && res.data.items) {
          // ✅ FIX: Add fullName field to data for AG-Grid filtering, terminated status and vacation status
          this.personalTotal = res.data.items.map((emp: any) => ({
            ...emp,
            fullName: `${emp.apellidoPaterno} ${emp.apellidoMaterno}, ${emp.nombres}`.trim(),
            isTerminated: this.isEmployeeTerminated(emp.fechaCese),
            isOnVacation: this.isEmployeeOnVacation(emp.vacacionesFechaInicio, emp.vacacionesFechaFin)
          }));
          this.personalFiltrado = [...this.personalTotal];
          this.totalCount = res.data.totalCount || 0;
          this.hayMasPaginas = (res.data.pageNumber * res.data.pageSize) < res.data.totalCount;
          
          // Actualizar ag-Grid data
          this.updateGridData();
        } else {
          this.personalTotal = [];
          this.personalFiltrado = [];
          this.totalCount = 0;
          this.hayMasPaginas = false;
          
          // Limpiar ag-Grid data
          this.updateGridData();
        }
        //this.seleccionados.clear();
        //this.empleados.clear();
        this.loadingPersonal = false;
      },
      error: (error) => {
       
        this.toastService.error('Error al cargar', 'No se pudo cargar el personal. Verifica los filtros seleccionados');
        this.personalFiltrado = [];
        this.totalCount = 0;
        this.hayMasPaginas = false;
        this.seleccionados.clear();
        this.empleados.clear();
        
        // Limpiar ag-Grid data en caso de error
        this.updateGridData();
        
        this.loadingPersonal = false;
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.paginaActual = event.pageIndex + 1;
    this.cargarPersonal();
  }

  cambiarPagina(delta: number) {
    const nuevaPagina = this.paginaActual + delta;
    if (nuevaPagina < 1) return;
    this.paginaActual = nuevaPagina;
    this.cargarPersonal();
  }

  get empleados(): FormArray {
    return this.personalForm.get('empleados') as FormArray;
  }

  isAllSelected(): boolean {
    const activeEmployees = this.personalFiltrado.filter(emp => !emp.isTerminated && !emp.isOnVacation);
    return activeEmployees.length > 0 && this.seleccionados.size === activeEmployees.length;
  }

  isIndeterminate(): boolean {
    const activeEmployees = this.personalFiltrado.filter(emp => !emp.isTerminated && !emp.isOnVacation);
    return this.seleccionados.size > 0 && this.seleccionados.size < activeEmployees.length;
  }

  masterToggle() {
    const activeEmployees = this.personalFiltrado.filter(emp => !emp.isTerminated && !emp.isOnVacation);
    
    if (this.isAllSelected()) {
      this.seleccionados.clear();
    } else {
      // Only select active (non-terminated, non-vacation) employees
      activeEmployees.forEach(emp => this.seleccionados.add(emp.personalId));
    }
    
    // Update AG-Grid selection
    if (this.gridApi) {
      this.gridApi.forEachNode((node: any) => {
        if (node.data && !node.data.isTerminated && !node.data.isOnVacation) {
          const shouldBeSelected = this.seleccionados.has(node.data.personalId);
          node.setSelected(shouldBeSelected);
        }
      });
    }
    
    this.syncFormArray();
  }

  isSelected(row: any): boolean {
    return this.seleccionados.has(row.personalId);
  }

  toggleSelection(row: any) {
    // Prevent selection of terminated employees
    if (row.isTerminated) {
      console.warn('Cannot select terminated employee:', row.fullName);
      return;
    }
    
    // Prevent selection of employees on vacation
    if (row.isOnVacation) {
      console.warn('Cannot select employee on vacation:', row.fullName);
      return;
    }
    
    if (this.seleccionados.has(row.personalId)) {
      this.seleccionados.delete(row.personalId);
    } else {
      this.seleccionados.add(row.personalId);
    }
    
    // Update AG-Grid selection
    if (this.gridApi) {
      this.gridApi.forEachNode((node: any) => {
        if (node.data && node.data.personalId === row.personalId) {
          node.setSelected(this.seleccionados.has(row.personalId));
        }
      });
    }
    
    this.syncFormArray();
  }

  private syncFormArray() {
    const arr = this.empleados;
    arr.clear();
    
    let agregados = 0;
    this.personalFiltrado.forEach(emp => {
      if (this.seleccionados.has(emp.personalId)) {
        arr.push(this.fb.control(emp.personalId));
        agregados++;
        console.log(`    + Agregado al FormArray: ${emp.nombres} ${emp.apellidoPaterno} (${emp.personalId})`);
      }
    });
        
    arr.markAsDirty();
    arr.markAsTouched();
    console.log('====================');
  }

  guardarAsignacion() {
    console.log('=== INICIO GUARDAR ASIGNACIÓN ===');
    console.log('🔍 currentStep:', this.currentStep);
    
    const filtro = this.filtroForm.value;
    const empleados = this.personalForm.value.empleados;
    const turno = this.turnoForm.value;
   
    
    // Buscar datos de la sede y obtener área seleccionada
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === filtro.sede);
    const area = this.selectedArea; // ✅ Usar área seleccionada directamente
    const turnoSeleccionado = this.turnos.find(t => t.id === turno.turno);
    
    console.log('🔍 DEBUG - guardarAsignacion:');
    console.log('selectedArea:', this.selectedArea);
    console.log('area:', area);
    console.log('sede:', sede);
    console.log('filtro:', filtro);
    console.log('filtroForm.value completo:', this.filtroForm.value);
    
    // Obtener centro de costo seleccionado
    const centroCostoSeleccionado = this.costCenters.find(cc => cc.ccostoId === filtro.centroCosto);
    
    // Obtener compañía ID del headerConfig
    const companiaId = this.headerConfig?.selectedEmpresa?.companiaId || '01';
    
    const now = new Date().toISOString();

  
    // Armar los registros para cada empleado seleccionado
    const registros: EmployeeScheduleAssignmentInsert[] = empleados.map((employeeId: string) => {
      // Buscar datos del empleado en la lista filtrada
      const empleado = this.personalFiltrado.find(e => e.personalId === employeeId);
      return {
        assignmentId: 0, // Se agrega para cumplir con la interfaz
        employeeId: employeeId,
        shiftId: turnoSeleccionado ? turnoSeleccionado.id : 0,
        startDate: filtro.dateRange?.start || null, // Desde dateRange
        endDate: filtro.dateRange?.end || null,     // Desde dateRange
        remarks: turno.observaciones || '',
        createdAt: now,
        createdBy: this.userLogin, // Corregido el typo crearteBY
        fullNameEmployee: empleado ? `${empleado.apellidoPaterno} ${empleado.apellidoMaterno}, ${empleado.nombres}` : '',
        shiftDescription: turnoSeleccionado ? turnoSeleccionado.alias : '',
        nroDoc: empleado ? empleado.nroDoc : '',
        areaId:empleado.areaId,
        areaDescription: empleado.areaDescripcion,
        locationId: sede ? sede.categoriaAuxiliarId : '',
        locationName: sede ? sede.descripcion : '',
        // Nuevos campos requeridos
        companiaId: companiaId,
        ccostId: centroCostoSeleccionado ? centroCostoSeleccionado.ccostoId : '',
        ccostDescription: centroCostoSeleccionado ? centroCostoSeleccionado.descripcion : ''
      };
      
     
    });

    console.log('🔍 DEBUG - Todos los registros a enviar:', registros);
    
    this.employeeScheduleAssignmentService.insertEmployeeScheduleAssignment(registros).subscribe({
      next: (response) => {
        console.log('Response:', response);
        if (response && response.exito) {
          this.toastService.success('Asignaciones creadas', `Se asignaron turnos a ${registros.length} empleados correctamente`);
          
          // Cerrar modal usando la referencia apropiada
          if (this.modalRef) {
            this.modalRef.closeModalFromChild(response);
          } else if (this.dialogRef) {
            this.dialogRef.close(response);
          }
        } else {
          this.toastService.error('Error en asignación', 'No se pudo registrar la asignación de turnos. Verifica los datos');
        }
      },
      error: (error) => {
        console.error('Error al registrar asignaciones:', error);
        this.toastService.error('Error al asignar', 'No se pudieron crear las asignaciones de turno. Intenta nuevamente');
      }
    });
  }

  // Método para filtrar áreas cuando se selecciona una sede
  onSedeSeleccionada(sedeId: string ): void {
    
    console.log('Sede seleccionada:', sedeId);
    if (!sedeId) return;
    
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === sedeId);
    if (!sede) return;
    
    this.filtroForm.patchValue({
      sede: sedeId
    });
    
    // Filtrar áreas para la sede seleccionada y cargar en arrays de autocomplete
    const sedeSeleccionada = this.sedesAreas.find(s => s.siteId === sedeId);
    console.log('🔍 onSedeSelected - sedeId:', sedeId);
    console.log('🔍 onSedeSelected - sedeSeleccionada:', sedeSeleccionada);
    
    if (sedeSeleccionada) {
      this.areasFiltradas = sedeSeleccionada.areas.map(area => ({
        areaId: area.areaId,
        descripcion: area.areaName,
        companiaId: '01' // Valor por defecto
      }));
      this.filteredAreasArray = [...this.areasFiltradas];
      console.log('🔍 onSedeSelected - areasFiltradas:', this.areasFiltradas);
      console.log('🔍 onSedeSelected - filteredAreasArray:', this.filteredAreasArray);
    } else {
      console.error('No se encontró sede con ID:', sedeId);
      this.areasFiltradas = [];
      this.filteredAreasArray = [];
    }
    
    // Limpiar selección de área cuando cambia la sede
    this.selectedArea = null;
    this.areaFilterTerm = '';
    
    // ✅ Limpiar el form control también
    this.filtroForm.patchValue({
      area: null
    });
    
    // Marcar el campo como touched para validaciones
    this.filtroForm.get('sede')?.markAsTouched();
  }


  // Método para mostrar detalle del horario en tooltip
  getHorarioDetalle(turno: ShiftListDto): string {
    if (!turno.horario || turno.horario.length === 0) {
      return 'Sin detalle de horario';
    }
    return turno.horario
      .map(h => `${this.getNombreDia(h.dayIndex)}: ${h.inTime} - ${h.outTime} (${h.workHours})\n`)
      .join('\n');
  }

  getNombreDia(index: number): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[index % 7] || `Día ${index}`;
  }

  formatHora(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  getHoraFin(inTime: string, workTimeDuration: number): string {
    if (!inTime || !workTimeDuration) return '';
    let inicio: Date;
  
    // Si inTime es solo hora (ej: "08:00" o "08:00:00")
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(inTime)) {
      // Usa una fecha base (hoy) y setea la hora
      const [h, m, s] = inTime.split(':').map(Number);
      inicio = new Date();
      inicio.setHours(h, m, s || 0, 0);
    } else {
      // Si es un string ISO válido
      inicio = new Date(inTime);
    }
  
    if (isNaN(inicio.getTime())) return '';
  
    inicio.setMinutes(inicio.getMinutes() + workTimeDuration);
    return inicio.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  // Métodos para la búsqueda de personal
  onSearchPersonalChange(): void {
    this.paginaActual = 1;
    this.cargarPersonal();
  }
  buscarEmpleado(){
    this.paginaActual = 1;
    this.cargarPersonal();
  }

  // Método para obtener el número de seleccionados
  getSelectedCount(): number {
    return this.seleccionados.size;
  }

  // Método para obtener el rango de fechas seleccionado formateado
  getSelectedDateRange(): string {
    const dateRange = this.filtroForm.value.dateRange;
    if (!dateRange || !dateRange.start || !dateRange.end) {
      return '';
    }

    try {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      const formatOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };
      
      const startFormatted = startDate.toLocaleDateString('es-ES', formatOptions);
      const endFormatted = endDate.toLocaleDateString('es-ES', formatOptions);
      
      return `${startFormatted} - ${endFormatted}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return '';
    }
  }

  // Método para limpiar la selección
  clearSelection(): void {
    this.seleccionados.clear();
    this.empleados.clear();
    this.selectedArea = null; // ✅ También limpiar área seleccionada
    this.areaFilterTerm = '';
    
    // ✅ Limpiar el form control también
    this.filtroForm.patchValue({
      area: null
    });
    
    // ✅ Recargar personal sin filtros de área
    this.paginaActual = 1;
    this.cargarPersonal();
  }

  // Métodos para expansión de turnos
  onTurnoSelected(turno: ShiftListDto): void {
    this.turnoForm.patchValue({ turno: turno.id });
    // Auto-expandir el turno seleccionado
    this.expandedTurnos.add(turno.id.toString());
  }

  toggleTurnoExpansion(turnoId: string): void {
    if (this.expandedTurnos.has(turnoId)) {
      this.expandedTurnos.delete(turnoId);
    } else {
      this.expandedTurnos.add(turnoId);
    }
  }

  isTurnoExpanded(turnoId: string): boolean {
    return this.expandedTurnos.has(turnoId);
  }

  // Métodos para obtener información de horarios
  getHorariosCount(turno: ShiftListDto): number {
    return turno.horario ? turno.horario.length : 0;
  }

  getHorariosValidos(turno: ShiftListDto): any[] {
    if (!turno.horario) return [];
    return turno.horario.filter(h => {
      const workMinutes = this.convertDurationToMinutes(h.workHours || '0h 0m');
      return workMinutes > 0;
    });
  }

  formatDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  // Método para convertir duración "8h 30m" a minutos (para compatibilidad con nuevo formato)
  private convertDurationToMinutes(duration: string): number {
    if (!duration) return 0;
    
    const regex = /(\d+)h\s*(\d+)m/;
    const match = duration.match(regex);
    
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return (hours * 60) + minutes;
    }
    
    return 0;
  }

  // Métodos para obtener totales semanales por tipo de hora
  getTotalBreakHours(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.breakHours || '0h 0m');
      return total + minutes;
    }, 0);
  }

  getTotalOvertimeHours(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.overtimeHours || '0h 0m');
      return total + minutes;
    }, 0);
  }

  getTotalDurationHours(turno: ShiftListDto): number {
    if (!turno.horario || turno.horario.length === 0) return 0;
    return turno.horario.reduce((total, h) => {
      const minutes = this.convertDurationToMinutes(h.totalDuration || '0h 0m');
      return total + minutes;
    }, 0);
  }

  // Método para obtener el turno seleccionado
  getTurnoSeleccionado(): ShiftListDto | null {
    const turnoId = this.turnoForm.get('turno')?.value;
    if (!turnoId) return null;
    return this.turnos.find(t => t.id === turnoId) || null;
  }

  // Step navigation methods
  nextStep(): void {
    console.log('🔍 nextStep - selectedArea antes:', this.selectedArea);
    if (this.currentStep < 3) {
      this.currentStep++;
      if (this.currentStep === 2) {
        this.cargarPersonal();
      } else if (this.currentStep === 3) {
        this.cargarTurnos();
      }
    }
    console.log('🔍 nextStep - selectedArea después:', this.selectedArea);
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Pagination methods
  previousPage(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
      this.cargarPersonal();
    }
  }

  
  onPageChangeCustom(event: PaginatorEvent) {
    this.paginaActual = event.pageNumber;
    this.pageSize = event.pageSize;
    this.totalCount=event.totalRecords
    this.cargarPersonal();
  }

  getDayName(dayIndex:number):string{
    const dia = dayIndex % 7;
    return this.diasSemana[dia]
  }

  getDayAbbreviation(dayIndex:number):string{
    const dia = dayIndex % 7;
    return this.diasAbreviados[dia]
  }
  
  // ===============================
  // MÉTODOS DE AUTOCOMPLETE - SEDE
  // ===============================
  
  getSedeFilterText(): string {
    if (this.filtroForm.get('sede')?.value) {
      const selectedSede = this.sedes.find(sede => sede.categoriaAuxiliarId === this.filtroForm.get('sede')?.value);
      return selectedSede?.descripcion || '';
    }
    return this.sedeFilterTerm;
  }
  
  onSedeFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.sedeFilterTerm = value;
    this.filteredSedesArray = this.sedes.filter(sede => 
      sede.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showSedeDropdown = this.filteredSedesArray.length > 0;
  }
  
  onSedeFocus(): void {
    if (this.filteredSedesArray.length === 0) {
      this.filteredSedesArray = [...this.sedes];
    }
    this.showSedeDropdown = this.filteredSedesArray.length > 0;
  }
  
  onSedeSelected(sede: CategoriaAuxiliar): void {
    this.filtroForm.patchValue({ sede: sede.categoriaAuxiliarId });
    this.sedeFilterTerm = sede.descripcion;
    this.showSedeDropdown = false;
    console.log('Sede seleccionada:', sede);
    
    // Llamar al método existente para filtrar áreas
    this.onSedeSeleccionada(sede.categoriaAuxiliarId);
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
  // MÉTODOS DE AUTOCOMPLETE - CENTRO DE COSTO
  // ===============================
  
  getCostCenterFilterText(): string {
    if (this.filtroForm.get('centroCosto')?.value) {
      const selectedCC = this.costCenters.find(cc => cc.ccostoId === this.filtroForm.get('centroCosto')?.value);
      return selectedCC?.descripcion || '';
    }
    return this.costCenterFilterTerm;
  }
  
  onCostCenterFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.costCenterFilterTerm = value;
    this.filteredCostCentersArray = this.costCenters.filter(cc => 
      cc.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showCostCenterDropdown = this.filteredCostCentersArray.length > 0;
  }
  
  onCostCenterFocus(): void {
    if (this.filteredCostCentersArray.length === 0) {
      this.filteredCostCentersArray = [...this.costCenters];
    }
    this.showCostCenterDropdown = this.filteredCostCentersArray.length > 0;
  }

  onCostCenterSelected(costCenter: CostCenter): void {
    this.filtroForm.patchValue({ centroCosto: costCenter.ccostoId });
    this.costCenterFilterTerm = costCenter.descripcion;
    this.showCostCenterDropdown = false;
    console.log('Centro de costo seleccionado:', costCenter);
  }

  onCostCenterBlur(): void {
    setTimeout(() => {
      this.showCostCenterDropdown = false;
    }, 200);
  }

  trackByCostCenterId(index: number, costCenter: CostCenter): string {
    return costCenter.ccostoId;
  }

  // ===============================
  // MÉTODOS DE AUTOCOMPLETE - ÁREA (MÚLTIPLE SELECCIÓN)
  // ===============================
  
  getAreaFilterText(): string {
    if (this.selectedArea) {
      return this.selectedArea.descripcion;
    }
    return this.areaFilterTerm || 'Seleccionar área';
  }
  
  onAreaFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.areaFilterTerm = value;
    this.filteredAreasArray = this.areasFiltradas.filter(area => 
      area.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    this.showAreaDropdown = this.filteredAreasArray.length > 0;
  }
  
  onAreaFocus(): void {
    console.log('🔍 onAreaFocus - areasFiltradas:', this.areasFiltradas);
    if (this.filteredAreasArray.length === 0) {
      this.filteredAreasArray = [...this.areasFiltradas];
    }
    this.showAreaDropdown = this.filteredAreasArray.length > 0;
    console.log('🔍 onAreaFocus - showAreaDropdown:', this.showAreaDropdown);
    console.log('🔍 onAreaFocus - filteredAreasArray:', this.filteredAreasArray);
  }

  onAreaBlur(): void {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }

  trackByAreaId(index: number, area: RhArea): string {
    return area.areaId;
  }

  onAreaSelected(area: RhArea): void {
    console.log('🔍 onAreaSelected llamado con:', area);
    
    this.selectedArea = area;
    this.areaFilterTerm = '';
    this.showAreaDropdown = false;
    
    // ✅ Actualizar el form control también
    this.filtroForm.patchValue({
      area: area.areaId
    });
    
    console.log('🔍 selectedArea después de asignar:', this.selectedArea);
    console.log('🔍 Form value area después de patch:', this.filtroForm.value.area);
    
    // ✅ Aplicar filtro automáticamente
    this.paginaActual = 1; // Reset paginación
    this.cargarPersonal();
  }

  removeAreaSelection(): void {
    this.selectedArea = null;
    this.areaFilterTerm = '';
    
    // ✅ Limpiar el form control también
    this.filtroForm.patchValue({
      area: null
    });
    
    console.log('🔍 Área removida');
    
    // ✅ Aplicar filtro automáticamente cuando se remueve un área
    this.paginaActual = 1; // Reset paginación
    this.cargarPersonal();
  }

  // ===============================
  // MÉTODOS PARA DATE RANGE PICKER
  // ===============================
  
  onDateRangeSelected(dateRange: DateRange): void {
    console.log('Rango de fechas seleccionado:', dateRange);
    
    // Verificar que el rango sea válido y actualizar el FormControl
    if (dateRange && dateRange.start && dateRange.end) {
      // Marcar el control como touched para activar la validación
      this.filtroForm.get('dateRange')?.markAsTouched();
      this.filtroForm.get('dateRange')?.updateValueAndValidity();
      console.log('✅ FormControl dateRange updated and validated');
    }
  }

  /**
   * Establece un rango de fechas predefinido
   */
  setPresetDateRange(preset: string): void {
    const today = new Date();
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let startDate: Date;
    let endDate: Date = new Date(today);

    switch (preset) {
      case 'today':
        // Hoy - crear copias independientes sin mutación
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        break;
      case 'yesterday':
        // Ayer - crear fecha específica
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        break;
      case 'last7days':
        // Últimos 7 días (incluyendo hoy) - desde hace 6 días hasta hoy
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        break;
      case 'last30days':
        // Últimos 30 días (incluyendo hoy) - desde hace 29 días hasta hoy
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28);
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        break;
      case 'thisMonth':
        // Este mes: primer día al último día del mes actual
        startDate = new Date(today.getFullYear(), today.getMonth(), 2); // Día 2 para que aparezca como 1
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1); // Día 1 del siguiente mes para que aparezca como último día del mes actual
        break;
      case 'lastMonth':
        // Mes pasado: primer día al último día del mes anterior
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 2); // Día 2 para que aparezca como 1
        endDate = new Date(today.getFullYear(), today.getMonth(), 1); // Día 1 del mes actual para que aparezca como último día del mes anterior
        break;
      case 'thisWeek':
        // Esta semana: Lunes a Domingo (corregido con +1 día)
        const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const mondayOffset = dayOfWeek === 0 ? -5 : 2 - dayOfWeek; // Ajustado +1 día
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset + 7); // +7 días para el domingo
        break;
      case 'nextWeek':
        // Siguiente semana: Lunes a Domingo de la próxima semana (corregido con +1 día)
        const currentDayOfWeek = today.getDay();
        const nextMondayOffset = currentDayOfWeek === 0 ? 2 : 9 - currentDayOfWeek; // Ajustado +1 día
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + nextMondayOffset);
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + nextMondayOffset + 7); // +7 días
        break;
      case 'wholeYear':
        // Todo el año: 1 de enero al 31 de diciembre del año actual (corregido con +1 día)
        startDate = new Date(today.getFullYear(), 0, 2); // 2 de enero para que aparezca como 1
        endDate = new Date(today.getFullYear() + 1, 0, 1); // 1 de enero del siguiente año para que aparezca como 31 de diciembre
        break;
      default:
        return;
    }

    const dateRange: DateRange = {
      start: formatDate(startDate),
      end: formatDate(endDate)
    };


    // Actualizar el form control del date range picker
    this.filtroForm.patchValue({ dateRange });
    
    // Marcar como touched y válido después de aplicar el preset
    this.filtroForm.get('dateRange')?.markAsTouched();
    this.filtroForm.get('dateRange')?.updateValueAndValidity();
    
    console.log(`✅ Preset "${preset}" aplicado correctamente:`, dateRange);
  }

  // ===============================
  // MÉTODOS DE AG-GRID
  // ===============================
  
  private setupAgGrid(): void {
    // Configuración para grid de empleados
    this.columnDefs = [
      {
        field: 'select',
        headerName: '',
        width: 50,
        pinned: 'left',
        lockPosition: true,
        resizable: false,
        sortable: false,
        filter: false,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        suppressHeaderMenuButton: true,
        suppressMovable: true
      },
      {
        field: 'personalId',
        headerName: 'ID Personal',
        width: 100,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center">
              <span class="text-xs font-medium text-fiori-primary">#${params.value}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'nroDoc',
        headerName: 'Documento',
        width: 120,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-info mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="font-mono">${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'fullName',
        headerName: 'Nombre Completo',
        flex: 1,
        cellRenderer: (params: any) => {
          // ✅ Use the fullName field that already exists in data for filtering
          const fullName = params.value || params.data.fullName;
          const isTerminated = params.data?.isTerminated;
          const isOnVacation = params.data?.isOnVacation;
          const fechaCese = params.data?.fechaCese;
          const vacacionesFechaInicio = params.data?.vacacionesFechaInicio;
          const vacacionesFechaFin = params.data?.vacacionesFechaFin;
          
          // Priority: terminated > vacation > normal
          let bgColor = 'bg-fiori-muted';
          let textColor = 'text-fiori-text';
          let iconColor = 'text-fiori-subtext';
          let opacity = '';
          
          if (isTerminated) {
            bgColor = 'bg-red-50';
            textColor = 'text-red-600';
            iconColor = 'text-red-400';
            opacity = 'opacity-75';
          } else if (isOnVacation) {
            bgColor = 'bg-amber-50';
            textColor = 'text-amber-600';
            iconColor = 'text-amber-400';
            opacity = 'opacity-75';
          }
          
          let statusBadges = '';
          
          // Terminated badge (highest priority)
          if (isTerminated) {
            const ceaseDate = fechaCese ? new Date(fechaCese).toLocaleDateString('es-ES') : '';
            statusBadges = `
              <div class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                Cesado ${ceaseDate}
              </div>`;
          } 
          // Vacation badge (if not terminated)
          else if (isOnVacation) {
            const vacationStart = vacacionesFechaInicio ? new Date(vacacionesFechaInicio).toLocaleDateString('es-ES') : '';
            const vacationEnd = vacacionesFechaFin ? new Date(vacacionesFechaFin).toLocaleDateString('es-ES') : '';
            const vacationPeriod = vacationStart && vacationEnd ? `${vacationStart} - ${vacationEnd}` : '';
            statusBadges = `
              <div class="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                </svg>
                Vacaciones ${vacationPeriod}
              </div>`;
          }
          
          return `<div class="flex items-center py-1 ${opacity}">
            <div class="w-8 h-8 ${bgColor} rounded-full flex items-center justify-center mr-3">
              <svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <div class="text-sm font-medium ${textColor}" title="${fullName}">${fullName}</div>
              ${statusBadges}
            </div>
          </div>`;
        }
      },
      {
        field: 'areaDescripcion',
        headerName: 'Área',
        width: 150,
        cellRenderer: (params: any) => {
          const area = params.value || '-';
          return `<div class="flex items-center py-1">
            <div class="w-6 h-6 bg-fiori-accent/10 rounded-lg flex items-center justify-center mr-2">
              <svg class="w-3 h-3 text-fiori-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div class="text-sm text-fiori-text">${area}</div>
          </div>`;
        }
      }
    ];
    
    // Configuración para grid de áreas
    this.areasColumnDefs = [
      {
        field: 'select',
        headerName: '',
        width: 50,
        maxWidth:50,
        pinned: 'left',
        lockPosition: true,
        resizable: false,
        sortable: false,
        filter: false,
        checkboxSelection: true,
        headerCheckboxSelection: false,
        suppressHeaderMenuButton: true,
        suppressMovable: true
      },
      {
        field: 'descripcion',
        headerName: 'NOMBRE',
        flex: 1,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-2">
            <div class="w-6 h-6 bg-fiori-accent/10 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-3 h-3 text-fiori-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-fiori-text">${params.value}</div>
            </div>
          </div>`;
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // Configurar el event listener para selección
    params.api.addEventListener('selectionChanged', () => {
      this.onGridSelectionChanged();
    });
    
    params.api.sizeColumnsToFit();
  }

  onAreasGridReady(params: GridReadyEvent): void {
    this.areasGridApi = params.api;
    
    // Configurar el event listener para selección de áreas
    params.api.addEventListener('selectionChanged', () => {
      this.onAreaGridSelectionChanged();
    });
    
    params.api.sizeColumnsToFit();
  }

  onAreaGridSelectionChanged(): void {
    if (!this.areasGridApi) return;
    
    try {
      const selectedRows = this.areasGridApi.getSelectedRows();
      if (selectedRows.length > 0) {
        const selectedArea = selectedRows[0];
        this.filtroForm.patchValue({ area: selectedArea.areaId });
        console.log('Área seleccionada desde grid:', selectedArea);
      } else {
        this.filtroForm.patchValue({ area: null });
      }
    } catch (error) {
      console.error('Error en onAreaGridSelectionChanged:', error);
    }
  }

  onGridSelectionChanged(): void {
    if (!this.gridApi || this.loadingPersonal) {
      return; // No procesar si está cargando o no hay API
    }
    
    try {
      const selectedRows = this.gridApi.getSelectedRows();
      
      // Filter out terminated and vacation employees from selection
      const validSelectedRows = selectedRows.filter((row: any) => !row.isTerminated && !row.isOnVacation);
      
      // If any terminated or vacation employees were selected, deselect them
      if (selectedRows.length !== validSelectedRows.length) {
        // Deselect terminated and vacation employees
        this.gridApi.forEachNode((node: any) => {
          if ((node.data?.isTerminated || node.data?.isOnVacation) && node.isSelected()) {
            node.setSelected(false);
          }
        });
      }
      
      // Limpiar selecciones anteriores
      this.seleccionados.clear();
      
      // Agregar nuevas selecciones (solo empleados activos)
      validSelectedRows.forEach((row: any) => {
        if (row && row.personalId) {
          this.seleccionados.add(row.personalId);
        }
      });
      
      // Sincronizar con FormArray
      this.syncFormArray();
      
      console.log('🔄 AG-GRID SELECTION CHANGED:');
      console.log('  - Selected rows count:', validSelectedRows.length);
      console.log('  - Selected IDs:', Array.from(this.seleccionados));
    } catch (error) {
      console.error('Error en onGridSelectionChanged:', error);
    }
  }

  // Método para actualizar la data del grid cuando se cargan empleados
  private updateGridData(): void {
    if (this.gridApi) {
      try {
        // Asegurar que personalFiltrado es un array
        const data = Array.isArray(this.personalFiltrado) ? this.personalFiltrado : [];
        this.gridApi.setRowData(data);
        
        // Limpiar selecciones cuando se actualiza la data
        this.seleccionados.clear();
        this.empleados.clear();
        
        console.log('📊 Grid data updated:', data.length, 'rows');
      } catch (error) {
        console.error('Error actualizando data del grid:', error);
      }
    }
  }
}
