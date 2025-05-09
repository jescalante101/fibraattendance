import { Component, OnInit } from '@angular/core';

interface Marcaciones{
  IdEmpleado:string,
  Nombre:string,
  Departamento:string,
  Fecha:string,
  Hora:string,
  EstadoMarcacion:string,
  ConMascarilla:boolean,
  Temperatura:string,
  Area:string,
  NSerie:string,
  NombreDispositivo:string,
  CargarHora:string,
  Seleccionado?:boolean
}

@Component({
  selector: 'app-marcaciones',
  templateUrl: './marcaciones.component.html',
  styleUrls: ['./marcaciones.component.css']
})
export class MarcacionesComponent implements OnInit {

  datosOriginales:Marcaciones[]=[
    {
      IdEmpleado:"41034848",
      Nombre:"xd",
      Departamento:"Fibraprint",
      Fecha:"2025-05-09",
      Hora:"17:12:28",
      EstadoMarcacion:"-",
      ConMascarilla:false,
      Temperatura:"Desconocido",
      Area:"CHIL-2",
      NSerie:"AEH2201960021",
      NombreDispositivo:"CH2-ING",
      CargarHora:"2025-05-09 17:12:25"
    },
     {
      IdEmpleado:"41034848",
      Nombre:"xd",
      Departamento:"Fibraprint",
      Fecha:"2025-05-09",
      Hora:"17:12:28",
      EstadoMarcacion:"-",
      ConMascarilla:false,
      Temperatura:"Desconocido",
      Area:"CHIL-2",
      NSerie:"AEH2201960021",
      NombreDispositivo:"CH2-ING",
      CargarHora:"2025-05-09 17:12:25"
    },
     {
      IdEmpleado:"41034848",
      Nombre:"xd",
      Departamento:"Fibraprint",
      Fecha:"2025-05-09",
      Hora:"17:12:28",
      EstadoMarcacion:"-",
      ConMascarilla:false,
      Temperatura:"Desconocido",
      Area:"CHIL-2",
      NSerie:"AEH2201960021",
      NombreDispositivo:"CH2-ING",
      CargarHora:"2025-05-09 17:12:25"
    }
  ];

  datosFiltrados: Marcaciones[] = [];
 elementosSeleccionados: string[] = [];

  ngOnInit() {
    this.datosFiltrados = [...this.datosOriginales]; 
  }

  actualizarSeleccionados(): void {
    this.actualizarSeleccionadosLista();
  }

  actualizarSeleccionadosLista(): void {
    this.elementosSeleccionados = this.datosFiltrados
      .filter(item => item.Seleccionado)
      .map(item => item.IdEmpleado);
  }

}
