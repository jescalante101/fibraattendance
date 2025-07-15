import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { PersonService } from 'src/app/core/services/person.service';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';

@Component({
  selector: 'app-nueva-marcacion-manual',
  templateUrl: './nueva-marcacion-manual.component.html',
  styleUrls: ['./nueva-marcacion-manual.component.css']
})
export class NuevaMarcacionManualComponent implements OnInit {

  modalRef: any;
  // Formularios reactivos
  empleadoForm: FormGroup;
  marcacionForm: FormGroup;

  // Datos de empleados y departamentos
  empleados: MatTableDataSource<any> = new MatTableDataSource<any>([]);
  empleadosRaw: Employee[] = [];
  departamentos: RhArea[] = [];

  // Estados de loading
  loadingAreas: boolean = false;
  loadingEmpleados: boolean = false;
  loadingGuardado: boolean = false;

  // Paginación
  totalEmpleados: number = 0;
  pageSize: number = 10;
  pageNumber: number = 1;

  // Selección
  empleadosSeleccionados: Employee[] = [];
  displayedColumns: string[] = ['select', 'idEmpleado', 'nombre', 'apellido', 'departamento'];

  constructor(
    private fb: FormBuilder,
    private rhAreaService: RhAreaService,
    private personService: PersonService,
    private attManualLogService: AttManualLogService
  ) {
    this.empleadoForm = this.fb.group({
      departamento: [''],
      filtroEmpleado: ['']
    });
    this.marcacionForm = this.fb.group({
      fechaMarcacion: [null, Validators.required],
      horaMarcacion: ['', Validators.required],
      estadoMarcacion: ['entrada', Validators.required],
      incidencias: [''],
      motivo: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.cargarAreas();
    this.cargarEmpleados();
    this.empleadosSeleccionados = [];
  }

  cargarAreas() {
    this.loadingAreas = true;
    this.rhAreaService.getAreas().subscribe({
      next: (areas) => {
        this.departamentos = areas;
        this.loadingAreas = false;
      },
      error: (error) => {
        console.error('Error cargando áreas:', error);
        this.loadingAreas = false;
      }
    });
  }

  cargarEmpleados() {
    this.loadingEmpleados = true;
    const filtro = this.empleadoForm.value.filtroEmpleado || '';
    const areaId = this.empleadoForm.value.departamento || '';
    
    this.personService.getPersonalActivo(this.pageNumber, this.pageSize, filtro, '', areaId).subscribe({
      next: (response) => {
        this.empleadosRaw = response.data.items || [];
        this.totalEmpleados = response.data.totalCount || 0;
        this.updateEmpleadosTable();
        this.loadingEmpleados = false;
      },
      error: (error) => {
        console.error('Error cargando empleados:', error);
        this.loadingEmpleados = false;
      }
    });
  }

  buscarEmpleados() {
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

  isEmpleadoSeleccionado(row: any): boolean {
    return this.empleadosSeleccionados?.some(e => e.personalId === row.personalId) || false;
  }

  toggleSeleccionEmpleado(row: any, checked: boolean) {
    if (checked) {
      if (!this.empleadosSeleccionados.some(e => e.personalId === row.personalId)) {
        this.empleadosSeleccionados.push(row);
      }
    } else {
      this.empleadosSeleccionados = this.empleadosSeleccionados.filter(e => e.personalId !== row.personalId);
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
        nroDoc: emp.nroDoc
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
}
