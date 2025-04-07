


import { Component } from '@angular/core';

@Component({
  selector: 'app-orden-produccion',
  templateUrl: './orden-produccion.component.html',
  styleUrls: ['./orden-produccion.component.css']
})
export class OrdenProduccionComponent {
  search: string = "";
  isModalOpenResumen = false;
  isModalOpenOpciones: boolean = false;
  isModalOpenAgregar = false;
  registros: number | null = null;

  // Define el estado de orden para cada columna
  sortOrder: { [key in OrdenKey]: boolean } = {
    fecha: false,
    numero: false,
    numeroMadre: false,
    cliente: false,
    fichaTecnica: false,
    presentacion: false,
    codigo: false,
    descripcion: false,
    unidad: false,
    cantidad: false,
    despachado: false,
    pesoTotal: false,
    status: false,
  };

  // Lista de órdenes
  ordenes = [
    {
      fecha: '25/04/05',
      numero: '1000018612',
      numeroMadre: '',
      cliente: 'AJEPPER S.A.',
      fichaTecnica: '14698',
      presentacion: 'Bobina',
      codigo: 'PTN-ETIQ03041',
      descripcion: '55628 ETIQ. BIO AMAYU VITAMINA A SHOT 60ML',
      unidad: 'MLL',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018609',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'MP-PPET000987',
      descripcion: 'PET G CRISTAL 345 mm x 40 um SHRINK FILM // WENZHOU MAOYUAN (RETANA)',
      unidad: 'KG',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018607',
      numeroMadre: '1',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'PTN-ETIQ02044',
      descripcion: '20000081 - FUNDA BIODEFENSA VAINILLA FRANCESA LIGHT - V3',
      unidad: 'MLL',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018601',
      numeroMadre: '0',
      cliente: 'PIL ANDINA SA',
      fichaTecnica: '16002',
      presentacion: 'Bobina',
      codigo: 'PTE-ETIQ001115',
      descripcion: 'ETIQ. PILFRUIT SABOR MANZANA 2L',
      unidad: 'KG',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018606',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'MP-PPET000986',
      descripcion: 'PET G CRISTAL 550 mm x 40 um SHRINK FILM // WENZHOU MAOYUAN (RETANA)',
      unidad: 'KG',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018604',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'PTN-ETIQ02049',
      descripcion: '20000079 - FUNDA BIODEFENSA VAINILLA 100 ML-V3',
      unidad: 'MLL',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018611',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'MP-PPET000986',
      descripcion: 'PET G CRISTAL 550 mm x 40 um SHRINK FILM // WENZHOU MAOYUAN (RETANA)',
      unidad: 'KG',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018608',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'PTN-ETIQ02048',
      descripcion: '20000082 - FUNDA BIODEFENSA FRESA/FRAMBUESA LIGHT - V3',
      unidad: 'MLL',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018610',
      numeroMadre: '',
      cliente: 'LAIVE S A',
      fichaTecnica: '14771',
      presentacion: 'Bobina',
      codigo: 'PTN-ETIQ03035',
      descripcion: '20001632 FUNDA LECHE LIGHT SL 390G',
      unidad: 'MLL',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'LIBERADO'
    },
    {
      fecha: '25/04/04',
      numero: '1000018605',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'PTN-ETIQ02047',
      descripcion: '20000467 - FUNDA BIODEFENSA KIDS TUTTI FRUTTI 100 ML-V3',
      unidad: 'MLL',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/04',
      numero: '1000018602',
      numeroMadre: '',
      cliente: 'PIL ANDINA SA',
      fichaTecnica: '16003',
      presentacion: 'Bobina',
      codigo: 'PTE-ETIQ001114',
      descripcion: 'ETIQ. PILFRUIT SABOR DURAZNO 2L',
      unidad: 'KG',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'LIBERADO'
    },
    {
      fecha: '25/04/04',
      numero: '1000018603',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'PTN-ETIQ02045',
      descripcion: '20000077 - FUNDA BIODEFENSA FRESA 100 ML - V3',
      unidad: 'MLL',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/03',
      numero: '1000018597',
      numeroMadre: '',
      cliente: 'LECHE GLORIA S.A',
      fichaTecnica: '16267',
      presentacion: '',
      codigo: 'PTN-ETIQ003832',
      descripcion: '3515548 ETIQ PETG LECH FERMTT YOFRESH 970G FB.',
      unidad: 'KG',
      cantidad: 0,
      despachado: 'PENDIENTE',
      pesoTotal: '-845.00',
      status: 'LIBERADO'
    },
    {
      fecha: '25/04/03',
      numero: '1000018592',
      numeroMadre: '',
      cliente: 'AJEPPER S.A.',
      fichaTecnica: '16249',
      presentacion: 'Bobina',
      codigo: 'PTN-ETIQ003822',
      descripcion: '56696 ETIQ. CAMSUR DILYTE BLUEBERRY 10 IONES 650ML',
      unidad: 'MLL',
      cantidad: 5,
      despachado: 'PENDIENTE',
      pesoTotal: '',
      status: 'PENDIENTE'
    },
    {
      fecha: '25/04/03',
      numero: '1000018593',
      numeroMadre: '',
      cliente: '',
      fichaTecnica: '',
      presentacion: '',
      codigo: 'MP-PPET000985',
      descripcion: 'PET G CRISTAL 570 mm x 45 um SHRINK FILM // WENZHOU...',
      unidad: 'KG',
      cantidad: 20,
      despachado: 'PENDIENTE',
      pesoTotal: '3937.00',
      status: 'PENDIENTE'
    }
  ];


sortTable(column: OrdenKey) {
  // Alternamos el estado de orden
  this.sortOrder[column] = !this.sortOrder[column];

  this.ordenes.sort((a, b) => {
    // Extraemos los valores de la columna
    let valueA = a[column];
    let valueB = b[column];

    // Tratamos las celdas vacías
    const handleEmptyValues = (value: any, ascending: boolean) => {
      if (value === null || value === undefined || value === '') {
        return ascending ? Infinity : -Infinity; // Si es ascendente, ponemos Infinity, sino -Infinity
      }
      return value;
    };

    // Aplicamos la función para manejar celdas vacías
    valueA = handleEmptyValues(valueA, this.sortOrder[column]);
    valueB = handleEmptyValues(valueB, this.sortOrder[column]);

    // Convertimos a número si es posible (y si no es una cadena de texto que representa una fecha)
    const toNumber = (value: any) => {
      if (typeof value === 'string' && !isNaN(value as any)) {
        return Number(value);
      }
      return value;
    };

    // Convertimos a número los valores A y B si es posible
    let numericValueA = toNumber(valueA);
    let numericValueB = toNumber(valueB);

    // Si estamos ordenando por fecha, manejamos la conversión de fecha a milisegundos (timestamp)
    if (column === 'fecha') {
      if (typeof valueA === 'string' && valueA.trim() !== '') {
        numericValueA = new Date(valueA.split('/').reverse().join('-')).getTime();
      }
      if (typeof valueB === 'string' && valueB.trim() !== '') {
        numericValueB = new Date(valueB.split('/').reverse().join('-')).getTime();
      }
    }

    // Orden ascendente o descendente según el estado de sortOrder
    if (this.sortOrder[column]) {
      // Orden ascendente: Comparamos como números o cadenas
      if (typeof numericValueA === 'string' && typeof numericValueB === 'string') {
        return numericValueA.localeCompare(numericValueB); // Para cadenas, usamos lexicografía
      }
      return numericValueA - numericValueB; // Para números, restamos para ordenar ascendente
    } else {
      // Orden descendente: Comparamos como números o cadenas
      if (typeof numericValueA === 'string' && typeof numericValueB === 'string') {
        return numericValueB.localeCompare(numericValueA); // Para cadenas, usamos lexicografía inversa
      }
      return numericValueB - numericValueA; // Para números, restamos para ordenar descendente
    }
  });
}


  
  
  
  
  
  
  
  
  
  
  

  openModalResumen() {
    this.isModalOpenResumen = true;
  }

  closeModalResumen() {
    this.isModalOpenResumen = false;
  }

  openModalAgregar() {
    this.isModalOpenAgregar = true;
  }

  closeModalAgregar() {
    this.isModalOpenAgregar = false;
  }

  selectedOrdenIndex: number | null = null;

  toggleModalOpciones(index: number) {
    if (this.selectedOrdenIndex === index) {
      this.selectedOrdenIndex = null; // cerrar si ya está abierto
    } else {
      this.selectedOrdenIndex = index; // abrir este
    }
  }
}

type Orden = {
  fecha: string;
  numero: string;
  numeroMadre: string;
  cliente: string;
  fichaTecnica: string;
  presentacion: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  despachado: string;
  pesoTotal: string;
  status: string;
};

type OrdenKey = keyof Orden;
