export interface AttendanceMatrixPivotResponse {
    success: boolean;
    message: string;
    employees: EmployeePivotData[];
    dateRange: string[];
    summary: AttendanceSummary;
    generatedAt: string;
    executionTime: string;
    //
    totalRecords: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
}

export interface EmployeePivotData {
    personalId: string;
    nroDoc: string;
    colaborador: string;
    sede: string;
    area: string;
    cargo: string;
    centroCosto: string;
    ccCodigo: string;
    compania: string;
    fechaIngreso: string;
    dailyData: { [key: string]: DailyAttendanceData };
    totalHoras: number;
    horasExtras: number;
}

export interface DailyAttendanceData {
    diaSemana: string;
    tipoDia: string;
    turnoNombre: string;
    entradaProgramada: string;
    salidaProgramada: string;
    marcacionesDelDia: string;
    origenMarcaciones: string;
    tipoPermiso: string;
    entradaReal: string;
    salidaReal: string;
}

export interface AttendanceSummary {
    totalEmployees: number;
    totalWorkingDays: number;
    totalAbsences: number;
    totalPermissions: number;
    totalHours: number;
    totalOvertimeHours: number;
}