export interface ReportFiltersHE {
  startDate: string;      // Formato: "2025-07-21"
  endDate: string;        // Formato: "2025-08-15"
  companyId: string;      // ID de la compañía (obligatorio)
  employeeIds?: string;   // IDs separados por coma: "123,456,789" (opcional)
  areaId?: string;        // ID del área (opcional)
  sedeId?: string;        // ID de la sede (opcional)
}

export interface AsistenciaDiaReporteDto {
  horaEntrada: string;      // "07:30" o "FALTA"
  horaSalida: string;       // "18:45" o "FALTA"
  horasNormales: number;    // 8.5
  horasExtras1: number;     // 2.5 (H.E 25%)
  horasExtras2: number;     // 1.0 (H.E 35%)
  estado: string;           // "PRESENTE", "FALTA", "VACACIONES"
}

export interface ReporteAsistenciaSemanalDto {
  nro_Doc: string;
  colaborador: string;
  area: string;
  sede: string;
  cargo: string;
  fechaIngreso?: string;    // Formato: "2023-01-15"
  asistenciaPorDia: { [fecha: string]: AsistenciaDiaReporteDto };
  totalHorasNormales: number;
  totalHorasExtras1: number;
  totalHorasExtras2: number;
}

export interface ExtraHoursReportResult {
  success: boolean;
  message: string;
  data: ReporteAsistenciaSemanalDto[];
}

export interface SummaryResponse {
  success: boolean;
  data: {
    totalEmpleados: number;
    totalHorasNormales: number;
    totalHorasExtras25: number;
    totalHorasExtras35: number;
    fechaGeneracion: string;
    periodoReporte: {
      fechaInicio: string;
      fechaFin: string;
      totalDias: number;
    };
  };
}

// Interfaces para filtros auxiliares
export interface CompanyOption {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface AreaOption {
  id: string;
  descripcion: string;
  companyId: string;
}

export interface SedeOption {
  id: string;
  descripcion: string;
  companyId: string;
}

// Interface para procesamiento en UI
export interface ProcessedEmployeeData {
  nroDoc: string;
  nombre: string;
  area: string;
  sede: string;
  cargo: string;
  fechaIngreso?: string;
  days: { [fecha: string]: ProcessedDayData };
  totales: {
    horasNormales: number;
    horasExtras1: number;
    horasExtras2: number;
  };
}

export interface ProcessedDayData {
  entrada: string;
  salida: string;
  horasNormales: number;
  horasExtras1: number;
  horasExtras2: number;
  estado: string;
  cssClass: string;
}