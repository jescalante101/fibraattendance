


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