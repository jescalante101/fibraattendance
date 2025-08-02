export interface TransactionResumenResponse {
    resumen:    Resumen;
    periodo:    Periodo;
    empleado:   string;
    generadoEn: Date;
}

export interface Periodo {
    fechaInicio: Date;
    fechaFin:    Date;
}

export interface Resumen {
    totalDias:               number;
    diasPuntuales:           number;
    diasConTardanza:         number;
    diasSinEntrada:          number;
    diasSinSalida:           number;
    diasAsistenciaCompleta:  number;
    promedioMinutosTardanza: number;
    promedioHorasTrabajadas: number;
    porcentajePuntualidad:   number;
}
