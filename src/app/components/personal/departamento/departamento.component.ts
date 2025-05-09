import { Component, OnInit } from '@angular/core';


interface Departamentos {
  Codigo: string;
  Nombre: string;
  DepartamentoSuperior: string;
  Empresa: string;
  CantidadEmp: string;
  seleccionado?: boolean;
}

@Component({
  selector: 'app-departamento',
  templateUrl: './departamento.component.html',
  styleUrls: ['./departamento.component.css']
})
export class DepartamentoComponent implements OnInit {

  datosorignales:Departamentos[]=[
    {
      Codigo:"1",
      Nombre:"FIBRAFIL",
      DepartamentoSuperior:"-",
      Empresa:"FIBRAFIL",
      CantidadEmp:"772"
    },
    {
      Codigo:"FP02",
      Nombre:"FIBRAFIL",
      DepartamentoSuperior:"-",
      Empresa:"FIBRAFIL",
      CantidadEmp:"772"
    },
    
  ];

  datosFiltrados: Departamentos[] = [];
 elementosSeleccionados: string[] = [];



  ngOnInit() {
     this.datosFiltrados = [...this.datosorignales]; 
  }

  actualizarSeleccionados(): void {
    this.actualizarSeleccionadosLista();
  }

  actualizarSeleccionadosLista(): void {
    this.elementosSeleccionados = this.datosFiltrados
      .filter(item => item.seleccionado)
      .map(item => item.CantidadEmp);
  }

}
