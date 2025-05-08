// src/app/components/produccion/orden-produccion/orden-produccion.component.ts
import { Component, OnInit } from '@angular/core';
import { DataService } from '../../../../services/data.service';

@Component({
  selector: 'app-orden-produccion',
  templateUrl: './orden-produccion.component.html',
  styleUrls: ['./orden-produccion.component.css']
})
export class OrdenProduccionComponent implements OnInit {
  // Cabecera estática (se renderiza con tabla-nivel)
  cabecera = [
    {
      col1: 'N° Orden de trabajo',
      col2: 'Cliente',
      col3: 'N° Pedido',
      col4: 'Fecha de entrega',
      col5: 'Código Producto',
      col6: 'Nombre Producto',
      col7: 'Progreso',
      styleCol1: { 'padding-left': '1rem', 'font-weight': '600' },
      expandido: false,
      subitems: []
    }
  ];

  ordenesTrabajo: any[] = [];

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.getOrdenesTrabajoDummy()
      .subscribe(data => {
        this.ordenesTrabajo = data;
        this.addExpandFlag(this.ordenesTrabajo);
      }, err => console.error(err));
  }

  private addExpandFlag(items: any[]) {
    items.forEach(item => {
      item.expandido = false;
      if (item.subitems?.length) {
        this.addExpandFlag(item.subitems);
      }
    });
  }
}
