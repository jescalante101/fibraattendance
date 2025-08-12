import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhArea } from 'src/app/core/services/rh-area.service';
import { EmployeesParameters, PersonService } from 'src/app/core/services/person.service';
import { AppUserService, SedeArea } from 'src/app/core/services/app-user.services';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { PageEvent } from '@angular/material/paginator';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignmentInsert } from 'src/app/core/services/employee-schedule-assignment.service';
import { forkJoin } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HeaderConfig, HeaderConfigService } from 'src/app/core/services/header-config.service';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';

@Component({
  selector: 'app-asignar-turno-masivo',
  templateUrl: './asignar-turno-masivo.component.html',
  styleUrls: ['./asignar-turno-masivo.component.css']
})
export class AsignarTurnoMasivoComponent implements OnInit {


  filtroForm!: FormGroup;
  personalForm!: FormGroup;
  turnoForm!: FormGroup;

  // Nuevas propiedades para los datos del endpoint
  sedesAreas: SedeArea[] = [];
  areasFiltradas: RhArea[] = [];
  
  // Propiedades para turnos
  turnos: Shift[] = [];
  loadingTurnos = false;
  
  // Propiedades existentes
  sedes: CategoriaAuxiliar[] = [];
  areas: RhArea[] = [];
  personalFiltrado: any[] = [];
  datosListos = false;
  loadingPersonal = false;

  // Para selección de empleados
  seleccionados = new Set<string>();

  // Paginación
  paginaActual = 1;
  pageSize = 15;
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

  constructor(
    private fb: FormBuilder,
    private personService: PersonService,
    private appUserService: AppUserService,
    private shiftsService: ShiftsService,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    @Optional() public dialogRef: MatDialogRef<AsignarTurnoMasivoComponent>,
    private snackBar: MatSnackBar,
    private headerConfigService: HeaderConfigService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    
  ) {}

  ngOnInit(): void {
    this.headerConfig = this.headerConfigService.loadHeaderConfig();
    this.inicializarFormularios();
    this.cargarDatosIniciales();
  }

  private inicializarFormularios(): void {
    this.filtroForm = this.fb.group({
      sede: [null, Validators.required],
      area: [null, Validators.required]
    });

    this.personalForm = this.fb.group({
      empleados: this.fb.array([], Validators.required)
    });

    this.turnoForm = this.fb.group({
      turno: [null, Validators.required],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
      observaciones: ['']
    });
  }

  private cargarDatosIniciales(): void {
    this.datosListos = false;
    
    // Usar el nuevo servicio para obtener sedes y áreas
    this.appUserService.getSedesAreas(1).subscribe({
      next: (sedesAreas) => {
        this.sedesAreas = sedesAreas;
        
        // Convertir los datos del endpoint al formato esperado por el componente
        this.sedes = sedesAreas.map(sede => ({
          categoriaAuxiliarId: sede.siteId,
          descripcion: sede.siteName,
          companiaId: '01', // Valor por defecto
          codigoAuxiliar: sede.siteId // Usar el siteId como código auxiliar
        }));
        
        // Inicializar áreas vacías hasta que se seleccione una sede
        this.areas = [];
        this.areasFiltradas = [];
        
        this.datosListos = true;
        // Seleccionar automáticamente la primera sede si existe
        if (this.sedes.length > 0) {
          this.filtroForm.patchValue({ sede: this.sedes[0].categoriaAuxiliarId });
          this.onSedeSeleccionada(this.sedes[0].categoriaAuxiliarId);
        }
      },

      error: err => {
        console.error('Error al cargar sedes y áreas:', err);
        this.sedesAreas = [];
        this.sedes = [];
        this.areas = [];
        this.areasFiltradas = [];
        this.datosListos = true;
      }
    });
  }

  // Método para cargar turnos
  cargarTurnos(): void {
    this.loadingTurnos = true;
    this.shiftsService.getShifts(1, 50).subscribe({
      next: (response) => {
        this.turnos = response.data;
        this.loadingTurnos = false;
      },
      error: (error) => {
        console.error('Error al cargar turnos:', error);
        this.turnos = [];
        this.loadingTurnos = false;
      }
    });
  }

  // Método para obtener resumen del horario
  getHorarioResumen(turno: Shift): string {
    if (!turno.horario || turno.horario.length === 0) {
      return 'Sin horario definido';
  }
    
    const diasLaborables = turno.horario.filter(h => h.workTimeDuration > 0);
    if (diasLaborables.length === 0) {
      return 'Sin días laborables';
    }
    
    const primerHorario = diasLaborables[0];
    const horaInicio = new Date(primerHorario.inTime).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${diasLaborables.length} días, ${horaInicio}`;
  }
  
  getPrimerHorarioValido(turno: Shift): any {
    if (!turno.horario || turno.horario.length === 0) return null;
    // Busca el primer horario con duración > 0
    const valido = turno.horario.find(h => h.workTimeDuration > 0);
    // Si no hay, retorna el primero
    return valido || turno.horario[0];
  }

  // Método para obtener tipo de ciclo
  getTipoCiclo(turno: Shift): string {
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

    // Obtner otros valores de localStorage o del headerConfig
    const companiaId = this.headerConfig?.selectedEmpresa?.companiaId || '01';
    const periodoId = this.headerConfig?.selectedPeriodo?.periodoId || null;
    const planillaId = this.headerConfig?.selectedPlanilla?.planillaId || null;

    const categoriaAuxiliarId = this.filtroForm.value.sede;
    const rhAreaId = this.filtroForm.value.area;
    console.log("Cargando personal con filtros:", { categoriaAuxiliarId, rhAreaId });
    const ccosto = null; // Filtro adicional de centro de costo
    const filtro = this.searchTermPersonal.trim();
    const employeeParams: EmployeesParameters = {
      searchText: filtro,
      page: this.paginaActual,
      pagesize: this.pageSize,
      areaId: rhAreaId || null,
      ccostoId: ccosto || null,
      sede: categoriaAuxiliarId || null,
      periodoId: periodoId, // Puedes ajustar esto según tu lógica
      planillaId: planillaId, // Puedes ajustar esto según tu lógica
      companiaId: companiaId // Valor por defecto
    };
    console.log("Params:", employeeParams);
    
    this.personService.getPersonalActivo(employeeParams).subscribe({
      next: res => {
        console.log("Response:", res);
        if (res.exito && res.data && res.data.items) {
          this.personalTotal = res.data.items;
          this.personalFiltrado = [...this.personalTotal];
          this.totalCount = res.data.totalCount || 0;
          this.hayMasPaginas = (res.data.pageNumber * res.data.pageSize) < res.data.totalCount;
        } else {
          this.personalTotal = [];
          this.personalFiltrado = [];
          this.totalCount = 0;
          this.hayMasPaginas = false;
        }
        //this.seleccionados.clear();
        //this.empleados.clear();
        this.loadingPersonal = false;
      },
      error: _ => {
        this.personalFiltrado = [];
        this.totalCount = 0;
        this.hayMasPaginas = false;
        this.seleccionados.clear();
        this.empleados.clear();
        this.loadingPersonal = false;
        console.log("Error al cargar personal");
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
    return this.personalFiltrado.length > 0 && this.seleccionados.size === this.personalFiltrado.length;
  }

  isIndeterminate(): boolean {
    return this.seleccionados.size > 0 && this.seleccionados.size < this.personalFiltrado.length;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.seleccionados.clear();
    } else {
      this.personalFiltrado.forEach(emp => this.seleccionados.add(emp.personalId));
    }
    this.syncFormArray();
  }

  isSelected(row: any): boolean {
    return this.seleccionados.has(row.personalId);
  }

  toggleSelection(row: any) {
    if (this.seleccionados.has(row.personalId)) {
      this.seleccionados.delete(row.personalId);
    } else {
      this.seleccionados.add(row.personalId);
    }
    this.syncFormArray();
  }

  private syncFormArray() {
    const arr = this.empleados;
    arr.clear();
    this.personalFiltrado.forEach(emp => {
      if (this.seleccionados.has(emp.personalId)) {
        arr.push(this.fb.control(emp.personalId));
      }
    });
    arr.markAsDirty();
    arr.markAsTouched();
  }

  guardarAsignacion() {
    const filtro = this.filtroForm.value;
    const empleados = this.personalForm.value.empleados;
    const turno = this.turnoForm.value;
    // Buscar datos de la sede y área seleccionada
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === filtro.sede);
    const area = this.areasFiltradas.find(a => a.areaId === filtro.area);
    const turnoSeleccionado = this.turnos.find(t => t.id === turno.turno);
    const now = new Date().toISOString();
    // Aquí deberías obtener el usuario logueado, por ahora lo dejamos como 'admin'
    const createdBy = 'huali';
    // Armar los registros para cada empleado seleccionado
    const registros: EmployeeScheduleAssignmentInsert[] = empleados.map((employeeId: string) => {
      // Buscar datos del empleado en la lista filtrada
      const empleado = this.personalFiltrado.find(e => e.personalId === employeeId);
      return {
        employeeId: employeeId,
        shiftId: turnoSeleccionado ? turnoSeleccionado.id : 0,
        startDate: turno.fechaInicio,
        endDate: turno.fechaFin,
        remarks: turno.observaciones || '',
        createdAt: now,
        crearteBY: createdBy,
        fullNameEmployee: empleado ? `${empleado.nombres} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno}` : '',
        shiftDescription: turnoSeleccionado ? turnoSeleccionado.alias : '',
        nroDoc: empleado ? empleado.nroDoc : '',
        areaId: area ? area.areaId : '',
        areaDescription: area ? area.descripcion : '',
        locationId: sede ? sede.categoriaAuxiliarId : '',
        locationName: sede ? sede.descripcion : ''
      };
    });
    console.log('Empleados seleccionados:', empleados);
    console.log('Personal filtrado:', this.personalFiltrado);
    console.log('Turno seleccionado:', turnoSeleccionado);
    console.log('Sede:', sede);
    console.log('Area:', area);
    console.log('Fecha inicio:', turno.fechaInicio);
    console.log('Fecha fin:', turno.fechaFin);
    console.log('Observaciones:', turno.observaciones);
    // Enviar el array de registros en una sola petición
    console.log('Registros:', registros);
    this.employeeScheduleAssignmentService.insertEmployeeScheduleAssignment(registros).subscribe({
      next: (response) => {
        console.log('Response:', response);
        if (response && response.exito) {
          this.dialogRef.close(response); // Cierra el modal y pasa la respuesta al padre
        } else {
          this.snackBar.open('No se pudo registrar la asignación.', 'Cerrar', {
            duration: 4000,
            verticalPosition: 'top',
            horizontalPosition: 'end',
            panelClass: ['snackbar-error']
          });
        }
      },
      error: (error) => {
        this.snackBar.open('Error al registrar asignaciones.', 'Cerrar', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  // Agregar estos métodos a tu componente

  // Método para filtrar áreas cuando se selecciona una sede
  onSedeSeleccionada(sedeId: string ): void {
    
    console.log('Sede seleccionada:', sedeId);
    if (!sedeId) return;
    
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === sedeId);
    if (!sede) return;
    
    this.filtroForm.patchValue({
      sede: sedeId,
      area: null // Resetear área cuando cambia la sede
    });
    
    // Filtrar áreas para la sede seleccionada
    const sedeSeleccionada = this.sedesAreas.find(s => s.siteId === sedeId);
    if (sedeSeleccionada) {
      this.areasFiltradas = sedeSeleccionada.areas.map(area => ({
        areaId: area.areaId,
        descripcion: area.areaName,
        companiaId: '1' // Valor por defecto
      }));
    } else {
      this.areasFiltradas = [];
    }
    
    // Marcar el campo como touched para validaciones
    this.filtroForm.get('sede')?.markAsTouched();
  }

  onAreaSeleccionada(area: RhArea): void {
    this.filtroForm.patchValue({
      area: area.areaId
    });
    // Marcar el campo como touched para validaciones
    this.filtroForm.get('area')?.markAsTouched();
  }

  // Método para mostrar detalle del horario en tooltip
  getHorarioDetalle(turno: Shift): string {
    if (!turno.horario || turno.horario.length === 0) {
      return 'Sin detalle de horario';
    }
    return turno.horario
      .map(h => `${this.getNombreDia(h.dayIndex)}: ${this.formatHora(h.inTime)} (${h.workTimeDuration} min) \nn`)
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

  // Método para limpiar la selección
  clearSelection(): void {
    this.seleccionados.clear();
    this.empleados.clear();
  }

  // Métodos para expansión de turnos
  onTurnoSelected(turno: Shift): void {
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
  getHorariosCount(turno: Shift): number {
    return turno.horario ? turno.horario.length : 0;
  }

  getHorariosValidos(turno: Shift): any[] {
    if (!turno.horario) return [];
    return turno.horario.filter(h => h.workTimeDuration > 0);
  }

  formatDuracion(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  // Método para obtener el turno seleccionado
  getTurnoSeleccionado(): Shift | null {
    const turnoId = this.turnoForm.get('turno')?.value;
    if (!turnoId) return null;
    return this.turnos.find(t => t.id === turnoId) || null;
  }

  // Step navigation methods
  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
      if (this.currentStep === 2) {
        this.cargarPersonal();
      } else if (this.currentStep === 3) {
        this.cargarTurnos();
      }
    }
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
}
