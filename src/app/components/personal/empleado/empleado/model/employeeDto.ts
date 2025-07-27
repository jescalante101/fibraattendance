export interface Employee {
  personalId: string;
  nroDoc?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  companiaId?: string;
  sexoId?: string;
  fechaNacimiento?: string; // ISO string format: "2024-01-15T00:00:00.000Z"
  direccion?: string;
  areaId?: string;
  telefono?: string;
  email?: string;
  areaDescripcion?: string;
  ccostoId?: string;
  ccostoDescripcion?: string;
  categoriaAuxiliarId?: string;
  categoriaAuxiliarDescripcion?: string;
  planillaId?: string;
  categoriaAuxiliar2Id?: string;
  categoriaAuxiliar2Descripcion?: string;
  fechaIngreso: string; // ISO string format: "2024-01-15T00:00:00.000Z"
  fechaCese: string;
  
  selected?: boolean;
}


