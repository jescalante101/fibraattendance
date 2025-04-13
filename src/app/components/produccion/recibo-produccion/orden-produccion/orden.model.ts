export interface Submaterial {
    nombre: string;
  }
  
  export interface ProductoSemiElaborado {
    nombre: string;
    submateriales: Submaterial[];
  }
  
  export interface OrdenProduccion {
    numero: string;
    cliente: string;
    pedido: string;
    fechaEntrega: string;
    materiales: string[];
    productos: ProductoSemiElaborado[];
    otrasAcciones?: string[];
  }
  