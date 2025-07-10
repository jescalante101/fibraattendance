import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhArea } from 'src/app/core/services/rh-area.service';
import { PersonService } from 'src/app/core/services/person.service';
import { AppUserService, SedeArea } from 'src/app/core/services/app-user.services';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { PageEvent } from '@angular/material/paginator';
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignmentInsert } from 'src/app/core/services/employee-schedule-assignment.service';
import { forkJoin } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

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

  constructor(
    private fb: FormBuilder,
    private personService: PersonService,
    private appUserService: AppUserService,
    private shiftsService: ShiftsService,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private dialogRef: MatDialogRef<AsignarTurnoMasivoComponent>,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
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
    this.appUserService.getSedesAreas(3).subscribe({
      next: (sedesAreas) => {
        this.sedesAreas = sedesAreas;
        
        // Convertir los datos del endpoint al formato esperado por el componente
        this.sedes = sedesAreas.map(sede => ({
          categoriaAuxiliarId: sede.siteId,
          descripcion: sede.siteName,
          companiaId: '1', // Valor por defecto
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
    const categoriaAuxiliarId = this.filtroForm.value.sede;
    const rhAreaId = this.filtroForm.value.area;
    this.personService.getPersonalActivo(this.paginaActual, this.pageSize, '', categoriaAuxiliarId, rhAreaId).subscribe({
      next: res => {
        if (res.exito && res.data && res.data.items) {
          this.personalFiltrado = res.data.items;
          this.totalCount = res.data.totalCount || 0;
          this.hayMasPaginas = (res.data.pageNumber * res.data.pageSize) < res.data.totalCount;
        } else {
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
        scheduleId: turnoSeleccionado ? turnoSeleccionado.id : 0,
        startDate: turno.fechaInicio,
        endDate: turno.fechaFin,
        remarks: turno.observaciones || '',
        createdAt: now,
        crearteBY: createdBy,
        fullName: empleado ? `${empleado.nombres} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno}` : '',
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
  onSedeSeleccionada(sedeId: string): void {
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === sedeId);
    if (!sede) return;
    this.filtroForm.patchValue({
      sede: sede.categoriaAuxiliarId,
      area: null // Resetear área cuando cambia la sede
    });
    
    // Filtrar áreas para la sede seleccionada
    const sedeSeleccionada = this.sedesAreas.find(s => s.siteId === sede.categoriaAuxiliarId);
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

}
