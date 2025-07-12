export interface IClockTransaction {
    id: number;
    emp_code: string;
    punch_time: string;
    punch_state: string;
    verify_type: number;
    work_code: string;
    terminal_sn: string;
    terminal_alias: string;
    area_alias: string;
    longitude: number | null;
    latitude: number | null;
    gps_location: string | null;
    mobile: string | null;
    source: number;
    purpose: number;
    crc: string;
    is_attendance: boolean | null;
    reserved: string | null;
    upload_time: string;
    sync_status: string | null;
    sync_time: string | null;
    is_mask: number;
    temperature: string;
    emp: number;
    terminal: number;
    // Nuevo campo para indicar si llegó a tiempo ("a_tiempo", "tarde", "sin_horario")
    llegoATiempo?: 'a_tiempo' | 'tarde' | 'sin_horario';
}

export interface IClockTransactionResponse {
    count: number;
    next: string | null;
    previous: string | null;
    msg: string;
    code: number;
    data: IClockTransaction[];
}

export interface IClockTransactionParams {
    emp_code?: string;
    page_size?: number;
    page?: number;
    start_time?: string;
} 