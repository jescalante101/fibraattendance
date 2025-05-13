import { Component, OnInit } from '@angular/core';
import { DeviceService } from '../../../core/device.service';
import { HttpResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-marcaciones',
  templateUrl: './marcaciones.component.html',
  styleUrls: ['./marcaciones.component.css']
})
export class MarcacionesComponent implements OnInit {
  datosOriginales: any[] = [];
  elementosSeleccionados: string[] = [];
  paginaActual: number = 1;
  totalPaginas: number = 1;
  paginasVisibles: number[] = [];
  pageSize: number = 20;
  mostrarPuntosInicio: boolean = false;
  mostrarPuntosFinal: boolean = false;
  isLoading=false;
  errorMessage: string = '';

  constructor(private deviceService: DeviceService,private dialog: MatDialog) { }

  ngOnInit(): void {
    this.cargarMarcaciones();
  }

  cargarMarcaciones(): void {
    this.isLoading=true;

    const dialogRef=this.dialog.open(ModalLoadingComponent)

    this.deviceService.getTransactionsByPage(this.paginaActual)
      .subscribe({
        next: (response: HttpResponse<any[]>) => {
          this.datosOriginales = response.body || [];
          console.log(this.datosOriginales);
          const paginationHeader = response.headers.get('x-pagination');
          console.log(response);

          if (paginationHeader) {
            const paginationData = JSON.parse(paginationHeader);
            this.totalPaginas = paginationData.TotalPages;
            console.log("Total de Paginas"+this.totalPaginas);
            this.generarPaginasVisibles();
          }
          this.isLoading=false
        },
        error: (error) => {
          this.errorMessage='Error al cargar las marcaciones'
          console.error('Error al cargar las marcaciones', error);
        }
      });
    dialogRef.close()
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas && pagina !== this.paginaActual) {
      this.paginaActual = pagina;
      this.cargarMarcaciones();
    }
  }

  generarPaginasVisibles(): void {
    this.paginasVisibles = [];
    const rango = 2;
    for (let i = Math.max(1, this.paginaActual - rango); i <= Math.min(this.totalPaginas, this.paginaActual + rango); i++) {
      this.paginasVisibles.push(i);
    }

    this.mostrarPuntosInicio = this.totalPaginas > 5 && this.paginaActual > rango + 1;
    this.mostrarPuntosFinal = this.totalPaginas > 5 && this.paginaActual < this.totalPaginas - rango;

    if (this.mostrarPuntosInicio && !this.paginasVisibles.includes(1)) {
      this.paginasVisibles.unshift(1);
      if (this.paginasVisibles[1] !== 2) this.paginasVisibles.splice(1, 0, -1); // Usamos -1 para representar '...'
    } else if (!this.paginasVisibles.includes(1) && this.totalPaginas > 0) {
      this.paginasVisibles.unshift(1);
    }

    if (this.mostrarPuntosFinal && !this.paginasVisibles.includes(this.totalPaginas)) {
      this.paginasVisibles.push(this.totalPaginas);
      if (this.paginasVisibles[this.paginasVisibles.length - 2] !== this.totalPaginas - 1) this.paginasVisibles.splice(this.paginasVisibles.length - 1, 0, -1); // Usamos -1 para representar '...'
    } else if (!this.paginasVisibles.includes(this.totalPaginas) && this.totalPaginas > 0) {
      this.paginasVisibles.push(this.totalPaginas);
    }

    // Filtramos los -1 para que no aparezcan como números en la iteración del template
    this.paginasVisibles = this.paginasVisibles.filter(p => p > 0);
  }

  actualizarSeleccionados(): void {
    this.elementosSeleccionados = this.datosOriginales
      .filter((item) => item.Seleccionado)
      .map((item) => item.IdEmpleado);
  }
}
