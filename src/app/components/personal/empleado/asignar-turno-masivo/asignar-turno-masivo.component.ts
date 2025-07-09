import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { PersonService } from 'src/app/core/services/person.service';
import { forkJoin } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-asignar-turno-masivo',
  templateUrl: './asignar-turno-masivo.component.html',
  styleUrls: ['./asignar-turno-masivo.component.css']
})
export class AsignarTurnoMasivoComponent implements OnInit {
  filtroForm!: FormGroup;
  personalForm!: FormGroup;
  turnoForm!: FormGroup;

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
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private personService: PersonService
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
    forkJoin({
      sedes: this.categoriaAuxiliarService.getCategoriasAuxiliar(),
      areas: this.rhAreaService.getAreas()
    }).subscribe({
      next: ({ sedes, areas }) => {
        this.sedes = sedes;
        this.areas = areas;
        this.datosListos = true;
      },
      error: err => {
        this.sedes = [];
        this.areas = [];
        this.datosListos = true;
      }
    });
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
        this.seleccionados.clear();
        this.empleados.clear();
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
    console.log('Filtro:', filtro);
    console.log('Empleados seleccionados:', empleados);
    console.log('Turno:', turno);
  }

  // Agregar estos métodos a tu componente

  onSedeSeleccionada(sede: CategoriaAuxiliar): void {
    this.filtroForm.patchValue({
      sede: sede.categoriaAuxiliarId
    });
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

}
