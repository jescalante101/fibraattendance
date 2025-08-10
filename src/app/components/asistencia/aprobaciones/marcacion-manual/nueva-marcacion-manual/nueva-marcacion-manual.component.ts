import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { PersonService } from 'src/app/core/services/person.service';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';
import { EmployeeScheduleAssignmentService } from 'src/app/core/services/employee-schedule-assignment.service';
import { EmployeeScheduleHours } from 'src/app/models/employee-schedule/employee-schedule-hours.model';
import { Subject, takeUntil } from 'rxjs';
import { HeaderConfig, HeaderConfigService } from '../../../../../core/services/header-config.service';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';

@Component({
  selector: 'app-nueva-marcacion-manual',
  templateUrl: './nueva-marcacion-manual.component.html',
  styleUrls: ['./nueva-marcacion-manual.component.css']
})
export class NuevaMarcacionManualComponent implements OnInit,OnDestroy {

  modalRef: any;
  // Control de pasos
  currentStep: number = 1;
  
  // Referencia a Math para uso en template
  Math = Math;
  
  // Formularios reactivos
  empleadoForm: FormGroup;
  marcacionForm: FormGroup;

  // Datos de empleados y departamentos
  empleados: MatTableDataSource<EmployeeScheduleHours> = new MatTableDataSource<EmployeeScheduleHours>([]);
  empleadosRaw: EmployeeScheduleHours[] = [];
  departamentos: RhArea[] = [];
  filteredDepartamentos: RhArea[] = [];
  
  // Estados de dropdown
  showDepartamentoDropdown: boolean = false;
  
  // Autocomplete de departamento (igual que empleado.component.ts)
  departamentoSearchTerm: string = '';
  highlightedDepartamentoIndex: number = -1;
  
  // Filtro de empleado usando ngModel como el departamento
  filtroEmpleadoText: string = '';

  // Estados de loading
  loadingAreas: boolean = false;
  loadingEmpleados: boolean = false;
  loadingGuardado: boolean = false;

  // Paginación
  totalEmpleados: number = 0;
  pageSize: number = 10;
  pageNumber: number = 1;

  // Selección
  empleadosSeleccionados: EmployeeScheduleHours[] = [];
  displayedColumns: string[] = ['select', 'nroDoc', 'fullNameEmployee', 'areaName'];
  expandedElement: EmployeeScheduleHours | null = null;
  expandedEmployee: EmployeeScheduleHours | null = null;
  displayedColumnsWithExpand: string[] = [];

  //Destroy
  // Aquí puedes agregar un Subject para manejar la limpieza de recursos si es necesario
   private destroy$ = new Subject<void>();
  //
  // Configuración del header
  headerConfig: HeaderConfig | null = null;
  constructor(
    private fb: FormBuilder,
    private rhAreaService: RhAreaService,
    private attManualLogService: AttManualLogService,
    private employeeScheduleAssignmentService: EmployeeScheduleAssignmentService,
    private HeaderConfigService: HeaderConfigService,
  ) {
    this.empleadoForm = this.fb.group({
      departamento: ['']
    });
    
    // Inicializar el autocomplete
    this.departamentoSearchTerm = 'Todas las áreas';
    this.marcacionForm = this.fb.group({
      fechaMarcacion: [null, Validators.required],
      horaMarcacion: ['', Validators.required],
      estadoMarcacion: ['entrada', Validators.required],
      incidencias: [''],
      motivo: ['', Validators.required]
    });
  }

  ngOnInit(): void {


    this.HeaderConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
    .subscribe(config => {
        console.log('Header config cambió:', config);
        this.headerConfig = config;
        // Recargar empleados cuando cambie la configuración
        this.cargarAreas();
        this.cargarEmpleados();
        this.empleadosSeleccionados = [];
        this.displayedColumnsWithExpand = ['expand', ...this.displayedColumns];
      }); 

    
  }

  ngOnDestroy(): void {
    // Aquí puedes limpiar recursos si es necesario
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarAreas() {
    this.loadingAreas = true;

    // get comnia
    
    const empresaId = this.headerConfig?.selectedEmpresa?.companiaId?.toString() || '';
    this.rhAreaService.getAreas(empresaId).subscribe({
      next: (areas) => {
        this.departamentos = areas;
        this.filteredDepartamentos = [...this.departamentos];
        this.loadingAreas = false;
      },
      error: (error) => {
        console.error('Error cargando áreas:', error);
        this.departamentos = [];
        this.filteredDepartamentos = [];
        this.loadingAreas = false;
      }
    });
  }

  cargarEmpleados() {
    this.loadingEmpleados = true;
    
    // Usar ngModel variables directamente como en el departamento
    const filtro = this.filtroEmpleadoText || '';
    const areaId = this.empleadoForm.value.departamento || '';
    
    console.log('Cargando empleados con filtros:', {
      filtro: filtro,
      areaId: areaId,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      filtroEmpleadoText: this.filtroEmpleadoText // Debug adicional
    });
    
    // Usar getEmployeeScheduleHours para traer empleados con horarios
    // Los parámetros son: nroDoc, fullName, pageNumber, pageSize, areaId
    this.employeeScheduleAssignmentService.getEmployeeScheduleHours(filtro, filtro, this.pageNumber, this.pageSize, areaId).subscribe({
      next: (response) => {
        console.log('Respuesta empleados con horarios:', response); // <-- Log para depuración
        this.empleadosRaw = response.data.items || [];
        this.totalEmpleados = response.data.totalCount || 0;
        this.updateEmpleadosTable();
        this.loadingEmpleados = false;
      },
      error: (error) => {
        this.empleadosRaw = [];
        this.totalEmpleados = 0;
        this.updateEmpleadosTable();
        console.error('Error cargando empleados con horarios:', error);
        this.loadingEmpleados = false;
      }
    });
  }

  buscarEmpleados() {
    console.log('🔍 buscarEmpleados() ejecutado');
    console.log('Valor actual del input (ngModel):', this.filtroEmpleadoText);
    this.pageNumber = 1;
    this.cargarEmpleados();
  }

  limpiarFiltroEmpleado() {
    this.filtroEmpleadoText = '';
    this.pageNumber = 1;
    this.cargarEmpleados();
  }

  onEmpleadoPage(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1;
    this.cargarEmpleados();
  }

  updateEmpleadosTable() {
    this.empleados.data = this.empleadosRaw;
  }

  isEmpleadoSeleccionado(row: EmployeeScheduleHours): boolean {
    return this.empleadosSeleccionados?.some(e => e.nroDoc === row.nroDoc) || false;
  }

  toggleSeleccionEmpleado(row: EmployeeScheduleHours, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const checked = checkbox.checked;
    
    if (checked) {
      if (!this.empleadosSeleccionados.some(e => e.nroDoc === row.nroDoc)) {
        this.empleadosSeleccionados.push(row);
      }
    } else {
      this.empleadosSeleccionados = this.empleadosSeleccionados.filter(e => e.nroDoc !== row.nroDoc);
    }
  }

  // Métodos para selección masiva
  isAllSelected(): boolean {
    const empleadosPagina = this.empleados.data;
    return empleadosPagina.length > 0 && empleadosPagina.every(emp => this.isEmpleadoSeleccionado(emp));
  }

  isSomeSelected(): boolean {
    const empleadosPagina = this.empleados.data;
    return empleadosPagina.some(emp => this.isEmpleadoSeleccionado(emp)) && !this.isAllSelected();
  }

  toggleSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const checked = checkbox.checked;
    const empleadosPagina = this.empleados.data;
    
    if (checked) {
      empleadosPagina.forEach(emp => {
        if (!this.isEmpleadoSeleccionado(emp)) {
          this.empleadosSeleccionados.push(emp);
        }
      });
    } else {
      this.empleadosSeleccionados = this.empleadosSeleccionados.filter(empSel =>
        !empleadosPagina.some(emp => emp.nroDoc === empSel.nroDoc)
      );
    }
  }

  guardarMarcacion() {
    if (this.marcacionForm.invalid || this.empleadosSeleccionados.length === 0) return;
    
    this.loadingGuardado = true;
    
    // Debug: Mostrar valores del formulario
    const formValue = this.marcacionForm.value;
    console.log('Valores del formulario:', formValue);
    console.log('Fecha marcación:', formValue.fechaMarcacion);
    console.log('Hora marcación:', formValue.horaMarcacion);
    console.log('Tipo de fecha:', typeof formValue.fechaMarcacion);
    console.log('Tipo de hora:', typeof formValue.horaMarcacion);
    
    // Crear lista de marcaciones manuales
    const marcacionesManuales: AttManualLog[] = this.empleadosSeleccionados.map(emp => {
      
      // Combinar fecha y hora para crear punchTime
      let punchTime: string;
      if (formValue.fechaMarcacion && formValue.horaMarcacion) {
        // Obtener fecha y hora por separado
        let fechaStr = formValue.fechaMarcacion;
        const horaStr = formValue.horaMarcacion;
        
        // Si la fecha es un objeto Date, convertir a string YYYY-MM-DD
        if (formValue.fechaMarcacion instanceof Date) {
          const year = formValue.fechaMarcacion.getFullYear();
          const month = String(formValue.fechaMarcacion.getMonth() + 1).padStart(2, '0');
          const day = String(formValue.fechaMarcacion.getDate()).padStart(2, '0');
          fechaStr = `${year}-${month}-${day}`;
        }
        
        // Crear punchTime directamente sin usar new Date() para evitar problemas de zona horaria
        punchTime = `${fechaStr}T${horaStr}:00`;
        console.log('Fecha y hora combinadas directamente:', punchTime);
      } else {
        console.log('Faltan fecha o hora, usando fecha actual');
        const ahora = new Date();
        const year = ahora.getFullYear();
        const month = String(ahora.getMonth() + 1).padStart(2, '0');
        const day = String(ahora.getDate()).padStart(2, '0');
        const hours = String(ahora.getHours()).padStart(2, '0');
        const minutes = String(ahora.getMinutes()).padStart(2, '0');
        punchTime = `${year}-${month}-${day}T${hours}:${minutes}:00`;
      }
      
      return {
        manualLogId: 0, // ID temporal para nuevas marcaciones
        abstractexceptionPtrId: 1, // Valor por defecto
        punchTime: punchTime,
        punchState: this.getPunchStateValue(formValue.estadoMarcacion),
        workCode: '', // Valor vacío como especificado
        applyReason: formValue.motivo || '',
        applyTime: new Date().toISOString(),
        auditReason: formValue.incidencias || '',
        auditTime: new Date().toISOString(),
        approvalLevel: 0,
        auditUserId: null,
        approver: '',
        employeeId: 0, // Valor null como especificado
        isMask: false, // Valor false como especificado
        temperature: null, // Valor null como especificado
        nroDoc: emp.nroDoc,
        fullName: emp.fullNameEmployee,

      };
    });
    console.log(marcacionesManuales);
    // Llamar al servicio para guardar las marcaciones
    this.attManualLogService.createManualLog(marcacionesManuales).subscribe({
      next: (response) => {
        console.log('Marcaciones guardadas exitosamente:', response);
        this.loadingGuardado = false;
        // Aquí puedes agregar un mensaje de éxito o cerrar el modal
        if (this.modalRef) {
          this.modalRef.closeModalFromChild(response);
        } 
      },
      error: (error) => {
        console.error('Error al guardar marcaciones:', error);
        this.loadingGuardado = false;
        // Aquí puedes agregar un mensaje de error
      }
    });
  }

  private getPunchStateValue(estadoMarcacion: string): number {
    switch (estadoMarcacion) {
      case 'entrada':
        return 0; // Entrada
      case 'salida':
        return 1; // Salida
      case 'salida_descanso':
        return 2; // Salida a descanso
      case 'entrada_descanso':
        return 3; // Entrada de descanso
      default:
        return 0; // Por defecto entrada
    }
  }

  /**
   * Agrupa los horarios por nameHora y muestra solo los rangos únicos por grupo
   */
  getHorariosAgrupados(horarios: any[]): { nameHora: string, inTime: string, outTime: string }[] {
    if (!horarios) return [];
    const map = new Map<string, { nameHora: string, inTime: string, outTime: string }>();
    horarios.forEach(horario => {
      const key = `${horario.nameHora}|${horario.inTime}|${horario.outTime}`;
      if (!map.has(key)) {
        map.set(key, {
          nameHora: horario.nameHora,
          inTime: horario.inTime,
          outTime: horario.outTime
        });
      }
    });
    return Array.from(map.values());
  }

  /**
   * Devuelve el string para el tooltip de empleados seleccionados extra
   */
  getEmpleadosTooltip(): string {
    return this.empleadosSeleccionados.slice(3).map(e => `${e.fullNameEmployee} (${e.nroDoc})`).join('\n');
  }

  // Métodos para navegación de pasos
  nextStep(): void {
    if (this.currentStep < 2 && this.empleadosSeleccionados.length > 0) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Método para expansión de empleados
  toggleExpandEmployee(employee: EmployeeScheduleHours): void {
    this.expandedEmployee = this.expandedEmployee === employee ? null : employee;
  }

  // Método para trackBy en ngFor
  trackByEmpleado(index: number, item: EmployeeScheduleHours): any {
    return item.nroDoc || index;
  }

  // Método para manejar eventos del paginador genérico
  onPaginatorChange(event: PaginatorEvent): void {
    console.log('📄 Paginador cambió:', event);
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    this.cargarEmpleados();
  }

  // Métodos de paginación simplificados (mantenidos para compatibilidad)
  previousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.cargarEmpleados();
    }
  }

  nextPage(): void {
    if (this.pageNumber * this.pageSize < this.totalEmpleados) {
      this.pageNumber++;
      this.cargarEmpleados();
    }
  }

  // Métodos para autocomplete de departamento (copiado exacto de empleado.component.ts)
  onDepartamentoSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.departamentoSearchTerm = target.value;
    this.filterDepartamentos();
    this.showDepartamentoDropdown = true;
    this.highlightedDepartamentoIndex = -1;
  }

  filterDepartamentos(): void {
    if (!this.departamentoSearchTerm.trim()) {
      this.filteredDepartamentos = [...this.departamentos];
    } else {
      this.filteredDepartamentos = this.departamentos.filter(dept => 
        dept.descripcion.toLowerCase().includes(this.departamentoSearchTerm.toLowerCase())
      );
    }
  }

  selectDepartamento(area: RhArea): void {
    this.departamentoSearchTerm = area.descripcion;
    this.empleadoForm.get('departamento')?.setValue(area.areaId);
    this.showDepartamentoDropdown = false;
    this.highlightedDepartamentoIndex = -1;
    console.log('Departamento seleccionado:', area.descripcion, 'ID:', area.areaId);
    this.onDepartamentoChange();
  }

  selectTodasLasAreas(): void {
    this.departamentoSearchTerm = 'Todas las áreas';
    this.empleadoForm.get('departamento')?.setValue('');
    this.showDepartamentoDropdown = false;
    this.highlightedDepartamentoIndex = -1;
    console.log('Seleccionado: Todas las áreas');
    this.onDepartamentoChange();
  }

  onDepartamentoBlur(): void {
    setTimeout(() => {
      this.showDepartamentoDropdown = false;
      this.highlightedDepartamentoIndex = -1;
      
      // Si no hay selección válida, limpiar
      if (this.departamentoSearchTerm && 
          this.departamentoSearchTerm !== 'Todas las áreas' && 
          !this.departamentos.find(d => d.descripcion === this.departamentoSearchTerm)) {
        this.departamentoSearchTerm = '';
        this.empleadoForm.get('departamento')?.setValue('');
        this.onDepartamentoChange();
      }
    }, 150);
  }

  onDepartamentoKeydown(event: KeyboardEvent): void {
    if (!this.showDepartamentoDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedDepartamentoIndex = Math.min(this.highlightedDepartamentoIndex + 1, this.filteredDepartamentos.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedDepartamentoIndex = Math.max(this.highlightedDepartamentoIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedDepartamentoIndex === -1) {
          // Seleccionar "Todas las áreas"
          this.selectTodasLasAreas();
        } else if (this.highlightedDepartamentoIndex >= 0 && this.highlightedDepartamentoIndex < this.filteredDepartamentos.length) {
          this.selectDepartamento(this.filteredDepartamentos[this.highlightedDepartamentoIndex]);
        }
        break;
      case 'Escape':
        this.showDepartamentoDropdown = false;
        this.highlightedDepartamentoIndex = -1;
        break;
    }
  }

  onDepartamentoChange(): void {
    this.pageNumber = 1;
    this.cargarEmpleados();
  }

}
