// Interfaz para la respuesta paginada
export interface PaginatedList<T> {
  items: T[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Interfaz principal para un día compensatorio
export interface CompensatoryDay {
  id: number;
  employeeId: string;
  assignmentId: number;
  holidayWorkedDate: string; // formato YYYY-MM-DD
  compensatoryDayOffDate: string; // formato YYYY-MM-DD
  status: string; // 'P' (Pendiente), 'A' (Aprobado), 'R' (Rechazado), etc.
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  companyId?: string;
  employeeFullName?: string; // Nombre completo del empleado
  employeeArea?: string;     // Descripción del área del empleado
  employeeLocation?: string; // Nombre de la sede del empleado
}

// Interfaz para crear un nuevo registro
export interface CreateCompensatoryDay {
  employeeId: string;
  assignmentId: number;
  holidayWorkedDate: string; // formato YYYY-MM-DD
  compensatoryDayOffDate: string; // formato YYYY-MM-DD
  remarks?: string;
  companyId?: string;
}

// Interfaz para actualizar un registro
export interface UpdateCompensatoryDay {
  compensatoryDayOffDate: string; // formato YYYY-MM-DD
  status: string;
  remarks?: string;
}

// Interfaz para los parámetros de filtro
export interface CompensatoryDayFilterParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  companyId?: string;
}

// Enum para los estados de días compensatorios
export enum CompensatoryDayStatus {
  PENDING = 'P',
  APPROVED = 'A',
  REJECTED = 'R'
}