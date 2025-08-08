export interface MarkingsReportData {
  success: boolean;
  message: string;
  generatedAt: string;
  executionTime: string;
  content: MarkingsReportContent;
}

export interface MarkingsReportContent {
  title: string;
  fechaInicio: string;
  fechaFin: string;
  headers: string[];
  weekGroups: WeekGroup[];
  employees: MarkingsEmployee[];
  summary: MarkingsSummary;
}

export interface WeekGroup {
  weekNumber: number;
  dates: string[];
  dayNames: string[];
  dayNumbers: string[];
}

export interface MarkingsEmployee {
  itemNumber: number;
  personalId: string;
  nroDoc: string;
  colaborador: string;
  area: string;
  cargo: string;
  fechaIngreso: string;
  planilla: string;
  weekData: MarkingsWeekData[];
}

export interface MarkingsWeekData {
  weekNumber: number;
  turno: string;
  dayValues: MarkingsDayValue[];
}

export interface MarkingsDayValue {
  date: string;
  value: string; // "2", "4", "F", "VA", etc.
  displayValue: string;
  type: string; // "markings", "absence", "empty"
  markingsCount?: number; // Número de marcaciones cuando es tipo "markings"
  rawMarkings: string; // String original de marcaciones para debug
  specificPermissionType: string; // Tipo específico de permiso de BD: "VACACIONES", "DESCANSO MEDICO", etc.
}

export interface MarkingsSummary {
  totalEmployees: number;
  totalWorkingDays: number;
  totalAbsences: number;
  totalPermissions: number;
  averageMarkingsPerDay: number;
  conceptCounts: { [key: string]: number }; // "VA": 5, "F": 10, etc.
  markingsDistribution: { [key: number]: number }; // 2: 50, 4: 30 (cantidad de días con X marcaciones)
}