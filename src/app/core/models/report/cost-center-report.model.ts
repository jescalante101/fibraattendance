export interface CostCenterReportData {
  success: boolean;
  message: string;
  generatedAt: string;
  executionTime: string;
  content: CostCenterReportContent;
}

export interface CostCenterReportContent {
  title: string;
  fechaInicio: string;
  fechaFin: string;
  headers: string[];
  weekGroups: WeekGroup[];
  employees: CostCenterEmployee[];
  summary: CostCenterSummary;
}

export interface WeekGroup {
  weekNumber: number;
  dates: string[];
  dayNames: string[];
  dayNumbers: string[];
}

export interface CostCenterEmployee {
  itemNumber: number;
  personalId: string;
  nroDoc: string;
  colaborador: string;
  area: string;
  cargo: string;
  fechaIngreso: string;
  planilla: string;
  weekData: CostCenterWeekData[];
}

export interface CostCenterWeekData {
  weekNumber: number;
  turno: string;
  dayValues: CostCenterDayValue[];
}

export interface CostCenterDayValue {
  date: string;
  value: string; // CC Código, "F" (Falta), "VA" (Vacaciones), etc.
  displayValue: string;
  type: string; // "work", "absence", "empty"
  specificPermissionType: string; // Tipo específico de permiso de BD: "VACACIONES", "DESCANSO MEDICO", etc.
}

export interface CostCenterSummary {
  totalEmployees: number;
  totalWorkingDays: number;
  totalAbsences: number;
  totalPermissions: number;
  conceptCounts: { [key: string]: number }; // "VA": 5, "F": 10, etc.
}