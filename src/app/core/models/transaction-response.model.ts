export interface TransactionResponse<T> {
    data:            T[];
    totalRecords:    number;
    currentPage:     number;
    pageSize:        number;
    totalPages:      number;
    hasPreviousPage: boolean;
    hasNextPage:     boolean;
}

export interface Datum {
    nroDoc:            string;
    nombres:           string;
    apellidoPaterno:   string;
    apellidoMaterno:   string;
    nombreCompleto:    string;
    areaDescripcion:   string;
    ccostoDescripcion: string;
    turnoAlias:        string;
    terminalAlias:     string;
    punchTime:         Date;
    horarioAlias:      string;
    inTime:            string;
    outTime:           string;
    diaSemana:         number;
    diaSemanaTexto:    string;
}


export interface TransactionComplete {
    nro_Doc:               string;
    nombres:               string;
    apellido_Paterno:      string;
    apellido_Materno:      string;
    areaDescripcion:       string;
    ccostoDescripcion:     string;
    turnoAlias:            string;
    horarioAlias:          string;
    fechaMarcacion:        Date;
    horarioEntrada:        string;
    horarioSalida:         string;
    horaEntrada:           string;
    horaSalida:            string;
    terminalEntrada:       string;
    terminalSalida:        string;
    totalMarcacionesDia:   number;
    marcacionesEsperadas:  number;
    contadorEntradas:      number;
    contadorSalidas:       number;
    contadorBreaks:        number;
    estadoEntrada:         string;
    estadoDia:             string;
    estadoMarcaciones:     string;
    minutosTardanza:       number;
    minutosSalidaTemprana: number;
    minutosTrabajados:     number;
    diaSemana:             number;
    detalleMarcaciones:    string;
    nombreCompleto:        string;
    diaSemanaTexto:        string;
    horasTrabajadas:       number;
    esPuntual:             boolean;
    tieneTardanza:         boolean;
    tieneSalidaTemprana:   boolean;
    asistenciaCompleta:    boolean;
    marcacionesCompletas:  boolean;
}





// filter interface for transactions
export interface TransactionFilter {
    empCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}