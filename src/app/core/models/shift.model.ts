// src/app/features/shifts/models/shift.model.ts

/**
 * Representa el desglose de horas calculado para un día específico dentro de un turno.
 */
export interface ShiftDayDto {
  dayIndex: number;
  timeIntervalAlias: string;
  inTime: string;      // Ej: "08:00"
  outTime: string;     // Ej: "17:00"
  workHours: string;   // Ej: "8h 0m"
  breakHours: string;  // Ej: "1h 0m"
  overtimeHours: string; // Ej: "0h 0m"
  totalDuration: string; // Ej: "9h 0m"
}

/**
 * Representa la información principal de un turno y su horario diario detallado.
 */
export interface ShiftListDto {
  id: number;
  alias: string;
  shiftCycle: number;
  cycleUnit: number;
  autoShift: boolean;
  horario: ShiftDayDto[]; // Array con el desglose de cada día
}

/**
 * Representa la estructura completa de la respuesta paginada de la API.
 */
export interface PaginatedShiftsResponse {
  data: ShiftListDto[];
  totalRecords: number;
}