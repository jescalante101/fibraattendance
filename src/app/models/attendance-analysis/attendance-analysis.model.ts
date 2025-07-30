


export interface AttendanceAnalysis {
    nroDoc: string;
    employeeId: string;
    fullNameEmployee: string;
    areaDescription: string;
    locationName: string;
    areaId: string;
    locationId: string;
    fecha: string;
    shiftName: string;
    intervalAlias: string;
    tipoMarcacion: string;
    horaEsperada: string;
    horaMarcacionReal: string;
    diferenciaMinutos: number;
    minutosTardanza: number;
    minutosAdelanto: number;
    estadoMarcacion: string;
    origenMarcacion: string;
    informacionAdicional: string;
    razonManual: string | null;
    validacionRango: string;
    esTardanza: boolean;
    esFalta: boolean;
    esPuntual: boolean;
    esMarcacionManual: boolean;
    diaSemana: number;
    nombreDia: string;
    fechaFormateada: string;
}

export interface ParamsReport {
    fechaInicio: Date;
    fechaFin:    Date;
    employeeId:  string;
    areaId:      string;
    locationId:  string;
    pageNumber:  number;
    pageSize:    number;
}


export interface ReportResponse {
    data:            Datum[];
    totalRecords:    number;
    pageNumber:      number;
    pageSize:        number;
    totalPages:      number;
    hasNextPage:     boolean;
    hasPreviousPage: boolean;
}

export interface Datum {
    nroDoc:               string;
    employeeId:           string;
    fullNameEmployee:     string;
    areaDescription:      string;
    locationName:         string;
    areaId:               string;
    locationId:           string;
    fecha:                Date;
    shiftName:            string;
    intervalAlias:        string;
    tipoMarcacion:        string;
    tipoHorario:          string;
    exceptionRemarks:     null;
    tipoPermiso:          null;
    diasInfo:             null;
    horaEsperada:         string;
    horaMarcacionReal:    string;
    diferenciaMinutos:    number;
    minutosTardanza:      number;
    minutosAdelanto:      number;
    estadoMarcacion:      string;
    origenMarcacion:      string;
    informacionAdicional: string;
    razonManual:          null;
    validacionRango:      string;
}
