// Interfaz para el resultado paginado genérico
export interface PagedResultDtoPersonnelWhitelist<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

// Interfaz para los parámetros de filtro y paginación que se envían a la API
export interface PaginationFilterPersonnelWhitelist {
  pageNumber?: number;
  pageSize?: number;
  filterText?: string | null;
  sortBy?: 'employeeName' | 'employeeId' | 'createdAt' | null;
  isAscending?: boolean;
}

// Interfaz para mostrar los datos de un empleado en la whitelist
export interface PersonnelWhitelistDto {
  id: number;
  employeeId: string;
  employeeName: string;
  remarks: string | null;
  createdBy: string;
  createdAt: string; // Es un string porque viene como JSON (ISO 8601 date)
  updatedBy: string;
  updatedAt: string; // Es un string porque viene como JSON (ISO 8601 date)
}

// Interfaz para enviar los datos al crear o editar un empleado
export interface PersonnelWhitelistCreateEditDto {
  employeeId: string;
  employeeName: string;
  remarks?: string | null;
  position?: string | null;
}
