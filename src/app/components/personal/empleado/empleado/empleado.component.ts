import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { PersonService } from 'src/app/core/services/person.service';
import { Employee } from './model/employeeDto';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { ActivatedRoute } from '@angular/router';
import { AsignarTurnoMasivoComponent } from '../asignar-turno-masivo/asignar-turno-masivo.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IclockTransactionComponent } from '../iclock-transaction/iclock-transaction.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { HeaderConfigService, HeaderConfig } from 'src/app/core/services/header-config.service';
import { EmployeesParameters } from '../../../../core/services/person.service';

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrls: ['./empleado.component.css']
})
export class EmpleadoComponent implements OnInit, OnDestroy {

  constructor(
    private personalService: PersonService,
    private dialog: MatDialog,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private modalService:ModalService,
    private headerConfigService: HeaderConfigService
  )
     { }
  mostrarBotonAsignar = false;

  employees: Employee[] = [];
  loading = true;
  skeletonArray = Array(10); // 10 filas de skeleton

  allSelected = false;
  totalCount = 0;
  page = 1;
  pageSize = 10;
  filtro = '';

  categoriaAuxiliarList: CategoriaAuxiliar[] = [];
  selectedCategoriaAuxiliar: string = '';

  rhAreaList: RhArea[] = [];
  selectedRhArea: string = '';

  // Configuración del header
  headerConfig: HeaderConfig | null = null;

  // Subject para controlar subscripciones
  private destroy$ = new Subject<void>();

  // Exponer Math para usar en el template
  Math = Math;

  displayedColumns: string[] = [];

  // Propiedades para autocomplete de Sede
  sedeSearchTerm = '';
  sedesFiltradas: CategoriaAuxiliar[] = [];
  showSedeDropdown = false;
  highlightedSedeIndex = -1;

  // Propiedades para autocomplete de Área
  areaSearchTerm = '';
  areasFiltradas: RhArea[] = [];
  showAreaDropdown = false;
  highlightedAreaIndex = -1;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.mostrarBotonAsignar = params['modoAsignar'] === 'true' || params['modoAsignar'] === true;
    });
    
    // Suscribirse a cambios en la configuración del header
    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        console.log('Header config cambió:', config);
        this.headerConfig = config;
        // Recargar empleados cuando cambie la configuración
        this.getEmployees();
        this.getRhAreas();
      });
    
    this.setDisplayedColumns();
    this.getCategoriasAuxiliar();
  
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setDisplayedColumns() {
    this.displayedColumns = this.mostrarBotonAsignar
      ? ['select', 'nroDoc', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'categoriaAuxiliarDescripcion', 'areaDescripcion', 'asignar']
      : ['personalId', 'nroDoc', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'categoriaAuxiliarDescripcion', 'areaDescripcion', 'acciones'];
  }

  getEmployees() {
    this.loading = true;
    
    // Obtener filtros del header config
    const empresaId = this.headerConfig?.selectedEmpresa?.companiaId?.toString() || '';
    const planillaId = this.headerConfig?.selectedPlanilla?.planillaId?.toString() || '';
    const periodoId = this.headerConfig?.selectedPeriodo?.periodoId?.toString() || '';
    
    // Usar los filtros del header junto con los filtros locales
    const ccosto = null; // Empresa como centro de costo
    const sede =  this.selectedCategoriaAuxiliar; // Planilla o categoria auxiliar
    const areaId = this.selectedRhArea; // Área seleccionada localmente   

    const params: EmployeesParameters = {
      searchText: this.filtro,
      page: this.page,
      pagesize: this.pageSize,
      areaId: areaId || null,
      ccostoId: ccosto || null,
      sede: sede || null,
      periodoId: periodoId || null,
      planillaId: planillaId || null,
      companiaId: empresaId || null
    };
    
    console.log('Parametros de búsqueda:', params);
    

    this.personalService.getPersonalActivo(
     params// ccosto (usando empresa)
    )
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          if (res.exito && res.data) {
            this.employees = res.data.items.map(emp => ({ ...emp, selected: this.mostrarBotonAsignar ? false : undefined }));
            this.totalCount = res.data.totalCount;
            this.page = res.data.pageNumber;
            this.pageSize = res.data.pageSize;
          } else {
            this.employees = [];
            this.totalCount = 0;
          }
        },
        error: _ => {
          this.employees = [];
          this.totalCount = 0;
        }
      });
  }

  getCategoriasAuxiliar() {
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe({
      next: (data) => {
        this.categoriaAuxiliarList = data;
        this.sedesFiltradas = [...data]; // Inicializar autocomplete
      },
      error: (err) => {
        this.categoriaAuxiliarList = [];
        this.sedesFiltradas = []; // Inicializar autocomplete
      }
    });
  }

  getRhAreas() {
    const empresaId = this.headerConfig?.selectedEmpresa?.companiaId?.toString() || '';
    this.rhAreaService.getAreas(empresaId).subscribe({
      next: (data) => {
        this.rhAreaList = data;
        this.areasFiltradas = [...data]; // Inicializar autocomplete
      },
      error: (err) => {
        this.rhAreaList = [];
        this.areasFiltradas = []; // Inicializar autocomplete
      }
    });
  }

  buscarEmpleado() {
    this.page = 1;
    this.getEmployees();
  }

  limpiarFiltros() {
    // Limpiar filtro de búsqueda
    this.filtro = '';
    
    // Limpiar autocompletes de sede
    this.sedeSearchTerm = '';
    this.selectedCategoriaAuxiliar = '';
    this.showSedeDropdown = false;
    this.highlightedSedeIndex = -1;
    this.sedesFiltradas = [...this.categoriaAuxiliarList];
    
    // Limpiar autocompletes de área
    this.areaSearchTerm = '';
    this.selectedRhArea = '';
    this.showAreaDropdown = false;
    this.highlightedAreaIndex = -1;
    this.areasFiltradas = [...this.rhAreaList];
    
    // Resetear paginación
    this.page = 1;
    
    // Buscar empleados sin filtros
    this.getEmployees();
  }

  toggleAllEmployees() {
    this.employees.forEach(emp => emp.selected = this.allSelected);
  }

  changePage(nuevaPagina: number) {
    if (nuevaPagina > 0 && (nuevaPagina - 1) * this.pageSize < this.totalCount) {
      this.page = nuevaPagina;
      this.getEmployees();
    }
  }

  onPageChange(event: PageEvent) {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getEmployees();
  }

  onCategoriaAuxiliarChange() {
    console.log('onCategoriaAuxiliarChange - selectedCategoriaAuxiliar:', this.selectedCategoriaAuxiliar);
    this.page = 1;
    this.getEmployees();
  }

  onRhAreaChange() {
    console.log('onRhAreaChange - selectedRhArea:', this.selectedRhArea);
    this.page = 1;
    this.getEmployees();
  }

  abrirAsignarTurnoMasivo() {
    const dialogRef = this.dialog.open(AsignarTurnoMasivoComponent, {
      width: '95vw',
      height: '90vh',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.exito) {
        this.snackBar.open('Asignación masiva realizada correctamente.', 'Cerrar', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-success']
        });
        // Si quieres refrescar la lista de empleados, llama aquí a this.getEmployees();
      } else if (result && result.exito === false) {
        this.snackBar.open('No se pudo realizar la asignación masiva.', 'Cerrar', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  abrirAsignarTurnoMasivoService() {
    this.modalService.open({
      width: '80vw',
      componentType: AsignarTurnoMasivoComponent,
      title: 'Asignación Masiva de Turnos'
    }).then(result => {
      if (result && result.exito) {
        this.snackBar.open('Asignación masiva realizada correctamente.', 'Cerrar', {
          duration: 4000,
          verticalPosition: 'top',
          horizontalPosition: 'end',
          panelClass: ['snackbar-success']
        });
      }
    })
  }

  verMarcaciones(empleado: Employee) {
    const empCode = empleado.nroDoc;
    if (!empCode) {
      this.snackBar.open('No se pudo obtener el código del empleado', 'Cerrar', {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'end',
        panelClass: ['snackbar-error']
      });
      return;
    }
    this.modalService.open({
      width: '1200px',
      title: `Marcaciones de ${empleado.nombres} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno}`,
      componentType: IclockTransactionComponent,
      componentData: { empCode, empleado }
    }).then(result => {
      if (result) {
        console.log('Marcaciones abiertas:', result);
      }
    }).catch(error => {
      console.error('Error al abrir el modal de marcaciones:', error);
    })
  }

  // Métodos para autocomplete de Sede
  onSedeSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.sedeSearchTerm = target.value;
    this.filterSedes();
    this.showSedeDropdown = true;
    this.highlightedSedeIndex = -1;
  }

  filterSedes(): void {
    if (!this.sedeSearchTerm.trim()) {
      this.sedesFiltradas = [...this.categoriaAuxiliarList];
    } else {
      this.sedesFiltradas = this.categoriaAuxiliarList.filter(sede =>
        sede.descripcion.toLowerCase().includes(this.sedeSearchTerm.toLowerCase())
      );
    }
  }

  selectSede(sede: CategoriaAuxiliar): void {
    this.sedeSearchTerm = sede.descripcion;
    this.selectedCategoriaAuxiliar = sede.categoriaAuxiliarId;
    this.showSedeDropdown = false;
    this.highlightedSedeIndex = -1;
    console.log('Sede seleccionada:', sede.descripcion, 'ID:', sede.categoriaAuxiliarId);
    this.onCategoriaAuxiliarChange();
  }

  onSedeBlur(): void {
    // Usar setTimeout para permitir que el click en el dropdown se procese primero
    setTimeout(() => {
      this.showSedeDropdown = false;
      this.highlightedSedeIndex = -1;
      
      // Si no hay selección válida, limpiar
      if (this.sedeSearchTerm && !this.categoriaAuxiliarList.find(s => s.descripcion === this.sedeSearchTerm)) {
        this.sedeSearchTerm = '';
        this.selectedCategoriaAuxiliar = '';
        this.onCategoriaAuxiliarChange();
      }
    }, 150);
  }

  onSedeKeydown(event: KeyboardEvent): void {
    if (!this.showSedeDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedSedeIndex = Math.min(this.highlightedSedeIndex + 1, this.sedesFiltradas.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedSedeIndex = Math.max(this.highlightedSedeIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedSedeIndex >= 0 && this.highlightedSedeIndex < this.sedesFiltradas.length) {
          this.selectSede(this.sedesFiltradas[this.highlightedSedeIndex]);
        }
        break;
      case 'Escape':
        this.showSedeDropdown = false;
        this.highlightedSedeIndex = -1;
        break;
    }
  }

  // Métodos para autocomplete de Área
  onAreaSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.areaSearchTerm = target.value;
    this.filterAreas();
    this.showAreaDropdown = true;
    this.highlightedAreaIndex = -1;
  }

  filterAreas(): void {
    if (!this.areaSearchTerm.trim()) {
      this.areasFiltradas = [...this.rhAreaList];
    } else {
      this.areasFiltradas = this.rhAreaList.filter(area =>
        area.descripcion.toLowerCase().includes(this.areaSearchTerm.toLowerCase())
      );
    }
  }

  selectArea(area: RhArea): void {
    this.areaSearchTerm = area.descripcion;
    this.selectedRhArea = area.areaId;
    this.showAreaDropdown = false;
    this.highlightedAreaIndex = -1;
    console.log('Área seleccionada:', area.descripcion, 'ID:', area.areaId);
    this.onRhAreaChange();
  }

  onAreaBlur(): void {
    // Usar setTimeout para permitir que el click en el dropdown se procese primero
    setTimeout(() => {
      this.showAreaDropdown = false;
      this.highlightedAreaIndex = -1;
      
      // Si no hay selección válida, limpiar
      if (this.areaSearchTerm && !this.rhAreaList.find(a => a.descripcion === this.areaSearchTerm)) {
        this.areaSearchTerm = '';
        this.selectedRhArea = '';
        this.onRhAreaChange();
      }
    }, 150);
  }

  onAreaKeydown(event: KeyboardEvent): void {
    if (!this.showAreaDropdown) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedAreaIndex = Math.min(this.highlightedAreaIndex + 1, this.areasFiltradas.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedAreaIndex = Math.max(this.highlightedAreaIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedAreaIndex >= 0 && this.highlightedAreaIndex < this.areasFiltradas.length) {
          this.selectArea(this.areasFiltradas[this.highlightedAreaIndex]);
        }
        break;
      case 'Escape':
        this.showAreaDropdown = false;
        this.highlightedAreaIndex = -1;
        break;
    }
  }
}