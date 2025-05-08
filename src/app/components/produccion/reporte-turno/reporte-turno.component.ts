import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-reporte-turno',
  templateUrl: './reporte-turno.component.html',
  styleUrls: ['./reporte-turno.component.css']
})
export class ReporteTurnoComponent implements OnInit, OnDestroy {
  // Filtros y estado de la UI
  busquedaGeneral = '';
  modalAbierto = false;

  vistaSeleccionada = 'Production Report activo';
  dropdownAbierto = false;
  busquedaVista = '';
  vistas = ['Production Report activo', 'Production Report inactivo'];

  // Array único que alimenta la tabla según la vista seleccionada
  datos: any[] = [];
  private subs = new Subscription();

  // Modelo para nuevo registro
  nuevoRegistro: any = {
    item: '',
    propietario: '',
    fechaCreacion: new Date().toISOString().split('T')[0],
    numTelar: '',
    supervisor: '',
    eficiencia: '',
    roturaUrdido: '',
    roturaTrama: '',
    metrosProducidos: ''
  };

  constructor(private dataSvc: DataService) {}

  ngOnInit(): void {
    this.cargarDatos(); // carga inicial desde dummy JSON según vista por defecto
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // Al cambiar de vista, recarga el JSON correspondiente
  seleccionarVista(vista: string): void {
    this.vistaSeleccionada = vista;
    this.dropdownAbierto = false;
    this.cargarDatos();
  }

  // Lógica central para obtener datos activos o inactivos
  private cargarDatos(): void {
    // limpiar subscripciones previas
    this.subs.unsubscribe();
    this.subs = new Subscription();

    if (this.vistaSeleccionada === 'Production Report activo') {
      this.subs.add(
        this.dataSvc.getDatosActivos()
          .subscribe(arr => this.datos = arr)
      );
    } else {
      this.subs.add(
        this.dataSvc.getDatosInactivos()
          .subscribe(arr => this.datos = arr)
      );
    }
  }

  // Getter para aplicar filtro de búsqueda general
  get datosFiltrados(): any[] {
    return this.datos.filter(d =>
      Object.values(d).some(valor =>
        (valor ?? '').toString().toLowerCase()
          .includes(this.busquedaGeneral.toLowerCase())
      )
    );
  }

  // Filtrado de opciones de vista
  vistasFiltradas(): string[] {
    return this.vistas.filter(v =>
      v.toLowerCase().includes(this.busquedaVista.toLowerCase())
    );
  }

  // Métodos de UI
  toggleDropdown(): void { this.dropdownAbierto = !this.dropdownAbierto; }
  abrirModal(): void { this.modalAbierto = true; }
  cerrarModal(): void {
    this.modalAbierto = false;
    this.reiniciarFormulario();
  }

  guardarRegistro(): void {
    if (this.vistaSeleccionada === 'Production Report activo') {
      this.datos.push({
        ...this.nuevoRegistro,
        fechaCreacion: new Date().toISOString().split('T')[0]
      });
    }
    this.cerrarModal();
  }

  reiniciarFormulario(): void {
    this.nuevoRegistro = {
      item: '',
      propietario: '',
      fechaCreacion: new Date().toISOString().split('T')[0],
      numTelar: '',
      supervisor: '',
      eficiencia: '',
      roturaUrdido: '',
      roturaTrama: '',
      metrosProducidos: ''
    };
  }
}
