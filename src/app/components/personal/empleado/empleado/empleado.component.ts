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
    private route: ActivatedRoute
  )
     { }
  mostrarBotonAsignar = false;

  employees: Employee[] = [];
  loading = true;
  skeletonArray = Array(10); // 10 filas de skeleton

  allSelected = false;
  totalCount = 0;
  pageNumber = 1;
  pageSize = 15;
  filtro = '';

  categoriaAuxiliarList: CategoriaAuxiliar[] = [];
  selectedCategoriaAuxiliar: string = '';

  rhAreaList: RhArea[] = [];
  selectedRhArea: string = '';

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.mostrarBotonAsignar = params['modoAsignar'] === 'true' || params['modoAsignar'] === true;
     
    });
    this.getEmployees();
    this.getCategoriasAuxiliar();
    this.getRhAreas();

  }

  getEmployees() {
    this.loading = true;
    this.personalService.getPersonalActivo(this.pageNumber, this.pageSize, this.filtro,this.selectedCategoriaAuxiliar,this.selectedRhArea)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: res => {
          console.log(res);
          if (res.exito && res.data) {
            this.employees = res.data.items.map(emp => ({ ...emp, selected: false }));
            this.totalCount = res.data.totalCount;
            this.pageNumber = res.data.pageNumber;
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
    this.pageNumber = 1;
    this.getEmployees();
  }

  toggleAllEmployees() {
    this.employees.forEach(emp => emp.selected = this.allSelected);
  }

  changePage(nuevaPagina: number) {
    if (nuevaPagina > 0 && (nuevaPagina - 1) * this.pageSize < this.totalCount) {
      this.pageNumber = nuevaPagina;
      this.getEmployees();
    }
  }



  onCategoriaAuxiliarChange() {
    this.pageNumber = 1;
    this.getEmployees();
  }


  onRhAreaChange() {
    this.pageNumber = 1;
    this.getEmployees();
  }

  abrirAsignarTurnoMasivo() {
    this.dialog.open(AsignarTurnoMasivoComponent, {
      width: '95vw',
      height: '90vh',
      maxWidth: '95vw',
      maxHeight: '90vh', // o el ancho que prefieras
    });
  }

  
}