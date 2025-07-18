
export interface EmployeeScheduleHours {
  id: number;
  nroDoc: string;
  fullNameEmployee: string;
  alias: string;
  areaId: string;
  areaName: string;
  horarios: EmployeeHours[];
}

export interface EmployeeHours{
    nameHora: string;
    inTime: string;
    outTime: string;
} 