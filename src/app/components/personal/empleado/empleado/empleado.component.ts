import { HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { PersonService } from 'src/app/core/services/person.service';
import { Employee } from './model/employeeDto';
import { finalize } from 'rxjs';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { ActivatedRoute } from '@angular/router';
import { AsignarTurnoMasivoComponent } from '../asignar-turno-masivo/asignar-turno-masivo.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IClockTransactionService } from 'src/app/core/services/iclock-transaction.service';
import { IClockTransactionResponse } from 'src/app/core/models/iclock-transaction.model';
import { IclockTransactionComponent } from '../iclock-transaction/iclock-transaction.component';

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrls: ['./empleado.component.css']
})
export class EmpleadoComponent implements OnInit {

  constructor(
    private personalService: PersonService, 
    private dialog: MatDialog, 
    private categoriaAuxiliarService: CategoriaAuxiliarService, 
    private rhAreaService: RhAreaService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
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

  // Exponer Math para usar en el template
  Math = Math;

  displayedColumns: string[] = [];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.mostrarBotonAsignar = params['modoAsignar'] === 'true' || params['modoAsignar'] === true;
    });
    this.setDisplayedColumns();
    this.getEmployees();
    this.getCategoriasAuxiliar();
    this.getRhAreas();
  }

  setDisplayedColumns() {
    this.displayedColumns = this.mostrarBotonAsignar
      ? ['select', 'nroDoc', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'categoriaAuxiliarDescripcion', 'areaDescripcion', 'asignar']
      : ['personalId', 'nroDoc', 'apellidoPaterno', 'apellidoMaterno', 'nombres', 'categoriaAuxiliarDescripcion', 'areaDescripcion', 'acciones'];
  }

  getEmployees() {
    this.loading = true;
    this.personalService.getPersonalActivo(this.page, this.pageSize, this.filtro,this.selectedCategoriaAuxiliar,this.selectedRhArea)
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
      },
      error: (err) => {
        this.categoriaAuxiliarList = [];
      }
    });
  }

  getRhAreas() {
    this.rhAreaService.getAreas().subscribe({
      next: (data) => {
        this.rhAreaList = data;
      },
      error: (err) => {
        this.rhAreaList = [];
      }
    });
  }

  buscarEmpleado() {
    this.page = 1;
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
    this.page = 1;
    this.getEmployees();
  }

  onRhAreaChange() {
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
  
    this.dialog.open(IclockTransactionComponent, {
      width: '70vw',
      height: '90vh',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { empCode, empleado }
    });
  }
  
}