export interface PeriodoResponse {
    periodoId:   string;
    descripcion: string;
    planillaId:  string;
    mesId:       string;
    semanaId:    string;
    semanaEnMes: number;
    fechaIni:    Date;
    fechaFin:    Date;
    tipoCambio:  number;
    estadoId:    string;
    companiaId:  string;
}
