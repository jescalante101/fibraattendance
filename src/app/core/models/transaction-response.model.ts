export interface TransactionResponse {
    data:            Datum[];
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

// filter interface for transactions
export interface TransactionFilter {
    empCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}