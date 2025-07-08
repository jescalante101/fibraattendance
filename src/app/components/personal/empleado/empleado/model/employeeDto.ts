export interface Employee {
  personalId: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  fechaNacimiento: string; // Consider using Date type if you'll be manipulating dates
  direccion: string;
  nroDoc: string;
  telefono: string;
  referencia: string;
  categoriaAuxiliarDescripcion: string;
  categoriaAuxiliar2Descripcion: string;
  areaDescripcion: string;
  
  selected?: boolean;
}


