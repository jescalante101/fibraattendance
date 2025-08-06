export interface ReportMatrixResponse {
    success: boolean;
    message: string;
    totalRecords: number;
    data: ReportMatrixResponseData[];
    generatedAt: string;
    executionTime: string;
    
    // Paginación
    currentPage?: number;
    pageSize?: number;
    totalPages?: number;
    totalEmployees?: number;
    
    // Totales globales (calculados en backend)
    globalTotalHours?: number;
    globalOvertimeHours?: number;
}


export interface ReportMatrixResponseData {
    personalId: string;
    nroDoc: string;
    colaborador: string;
    sede: string;
    sedeCodigo: string;
    area: string;
    cargo: string;
    centroCosto: string;
    ccCodigo: string;
    compania: string;
    fechaIngreso: string;
    fecha: string;
    diaSemanaEs: string;
    turnoNombre: string;
    tipoHorario: string;
    tipoDia: string;
    entradaProgramada: string;
    salidaProgramada: string;
    marcacionesEsperadas: number;
    breaksConfigurados: string;
    tipoPermiso: string;
    marcacionesDelDia: string;
    marcacionesManuales: string;
    razonesManuales: string;
    origenMarcaciones: string;
}
