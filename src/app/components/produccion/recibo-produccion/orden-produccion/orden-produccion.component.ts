import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-orden-produccion',
  templateUrl: './orden-produccion.component.html',
  styleUrls: ['./orden-produccion.component.css']
})
export class OrdenProduccionComponent implements OnInit {
  cabecera = [
    {
      col1: 'N° Orden de trabajo',
      col2: 'Cliente',
      col3: 'N° Pedido',
      col4: 'Fecha de entrega',
      col5: 'Progreso',
      styleCol1: { 'padding-left': '1rem' },
      expandido: false,
      subitems: []
    }
  ];

  ordenesTrabajo: any[] = [];

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    // <-- aquí simulas tu JSON del backend
    this.ordenesTrabajo = [
      {
        col1: 'OT 001',
        col2: 'CBC PERUANA S.A.C.',
        col3: 'P-001',
        col4: '28/04/2025',
        porcentaje: 10,
        estado: 'progreso',
        styleRow: { backgroundColor: '#eaf6ff' },
        styleCol1: { color: 'blue' },
        styleCol2: {},
        styleCol3: {},
        styleCol4: {},
        subitems: [
          {
            col1: 'Material 1',
            styleRow: { backgroundColor: '#f3fcff' },
            styleCol1: {},
            styleCol2: {},
            styleCol3: {},
            styleCol4: {},
            subitems: [
              {
                col1: 'Semi-elaborado 1',
                styleRow: { backgroundColor: '#eef9fe' },
                styleCol1: {},
                styleCol2: {},
                styleCol3: {},
                styleCol4: {},
                subitems: [
                  {
                    col1: 'Submaterial 1',
                    styleRow: { backgroundColor: '#fffaf0' },
                    styleCol1: {},
                    styleCol2: {},
                    styleCol3: {},
                    styleCol4: {},
                    subitems: []
                  },
                  {
                    col1: 'Submaterial 2',
                    styleRow: { backgroundColor: '#fffaf0' },
                    styleCol1: {},
                    styleCol2: {},
                    styleCol3: {},
                    styleCol4: {},
                    subitems: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        col1: 'OT 001',
        col2: 'CBC PERUANA S.A.C.',
        col3: 'P-001',
        col4: '28/04/2025',
        porcentaje: 50,
        estado: 'progreso',
        styleRow: { backgroundColor: '#eaf6ff' },
        styleCol1: { color: 'blue' },
        styleCol2: {},
        styleCol3: {},
        styleCol4: {},
        subitems: [
          {
            col1: 'Material 1',
            styleRow: { backgroundColor: '#f3fcff' },
            styleCol1: {'color':'#5e2129','font-size':600},
            styleCol2: {},
            styleCol3: {},
            styleCol4: {},
            subitems: [
              {
                col1: 'Semi-elaborado 1',
                styleRow: { backgroundColor: '#eef9fe' },
                styleCol1: {},
                styleCol2: {},
                styleCol3: {},
                styleCol4: {},
                subitems: [
                  {
                    col1: 'Submaterial 1',
                    styleRow: { backgroundColor: '#fffaf0' },
                    styleCol1: {},
                    styleCol2: {},
                    styleCol3: {},
                    styleCol4: {},
                    subitems: []
                  },
                  {
                    col1: 'Submaterial 2',
                    styleRow: { backgroundColor: '#fffaf0' },
                    styleCol1: {},
                    styleCol2: {},
                    styleCol3: {},
                    styleCol4: {},
                    subitems: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        col1: 'OT 001',
        col2: 'CBC PERUANA S.A.C.',
        col3: 'P-001',
        col4: '28/04/2025',
        porcentaje: 100,
        estado: 'progreso',
        styleRow: { backgroundColor: '#eaf6ff' },
        styleCol1: { color: 'blue' },
        styleCol2: {},
        styleCol3: {},
        styleCol4: {},
        subitems: [
          {
            col1: 'Material 1',
            styleRow: { backgroundColor: '#f3fcff' },
            styleCol1: {},
            styleCol2: {},
            styleCol3: {},
            styleCol4: {},
            subitems: [
              {
                col1: 'Semi-elaborado 1',
                styleRow: { backgroundColor: '#eef9fe' },
                styleCol1: {},
                styleCol2: {},
                styleCol3: {},
                styleCol4: {},
                subitems: [
                  {
                    col1: 'Submaterial 1',
                    styleRow: { backgroundColor: '#fffaf0' },
                    styleCol1: {},
                    styleCol2: {},
                    styleCol3: {},
                    styleCol4: {},
                    subitems: []
                  },
                  {
                    col1: 'Submaterial 2',
                    styleRow: { backgroundColor: '#fffaf0' },
                    styleCol1: {},
                    styleCol2: {},
                    styleCol3: {},
                    styleCol4: {},
                    subitems: []
                  }
                ]
              }
            ]
          }
        ]
      },
      // puedes agregar más madres aquí
    ];
  }
}
