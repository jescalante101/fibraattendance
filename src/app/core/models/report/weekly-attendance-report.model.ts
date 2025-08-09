export interface WeeklyAttendanceReportData {
  success: boolean;
  message: string;
  generatedAt: string;
  executionTime: string;
  content: WeeklyAttendanceReportContent;
}

export interface WeeklyAttendanceReportContent {
  title: string;
  fechaInicio: string;
  fechaFin: string;
  headers: string[];
  weekGroups: WeekGroup[];
  employees: WeeklyAttendanceEmployee[];
  summary: WeeklyAttendanceSummary;
}

export interface WeekGroup {
  weekNumber: number;
  dates: string[];
  dayNames: string[];
  dayNumbers: string[];
}

export interface WeeklyAttendanceEmployee {
  itemNumber: number;
  personalId: string;
  nroDoc: string;
  colaborador: string;
  area: string;
  centroCosto: string;
  cargo: string;
  fechaIngreso: string;
  planilla: string;
  weekData: WeeklyAttendanceWeekData[];
  globalTotals: WeeklyAttendanceGlobalTotals;
}

export interface WeeklyAttendanceWeekData {
  weekNumber: number;
  turno: string;
  dayData: WeeklyAttendanceDayData[];
  weekTotals: WeeklyAttendanceWeekTotals;
}

export interface WeeklyAttendanceDayData {
  date: string;
  dayName: string;
  entradaReal: string;
  salidaReal: string;
  horasTrabjadas: number;
  type: 'work' | 'absence' | 'permission' | 'holiday' | 'empty'; // Agregado 'holiday'
  tipoPermiso: string;
  estadoColor: 'success' | 'danger' | 'warning' | 'primary' | 'secondary'; // Tipado estricto
}

export interface WeeklyAttendanceWeekTotals {
  horasTrabajadas: number;
  horasExtras: number;
}

export interface WeeklyAttendanceGlobalTotals {
  totalHoras: number;
  totalExtras: number;
}

export interface WeeklyAttendanceSummary {
  totalEmployees: number;
  totalWorkingDays: number;
  totalAbsences: number;
  totalPermissions: number;
  totalHorasGlobales: number;
  totalHorasExtrasGlobales: number;
  averageHoursPerEmployee: number;
  averageOvertimePerEmployee: number;
  conceptCounts: { [key: string]: number }; // "VA": 5, "F": 10, etc.
  weekSummaries: WeeklyAttendanceWeekSummary[];
}

export interface WeeklyAttendanceWeekSummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalHorasSemana: number;
  totalExtrasSemana: number;
  empleadosConDatos: number;
}