import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { IClockTransactionResponse, IClockTransactionParams } from "../models/iclock-transaction.model";

@Injectable({
    providedIn: 'root'
})
export class IClockTransactionService {
    private readonly baseUrl = '/iclock/api/transactions/';
    private readonly username = 'fibrafil';
    private readonly password = 'F1br423';

    constructor(private http: HttpClient) {}

    /**
     * Obtiene las transacciones de marcaciones con autenticación básica
     * @param params Parámetros de consulta (emp_code, page_size, page, start_time)
     * @returns Observable con la respuesta de transacciones
     */
    getTransactions(params: IClockTransactionParams = {}): Observable<IClockTransactionResponse> {
        // Crear headers con autenticación básica
        const headers = new HttpHeaders({
            'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`),
            'Content-Type': 'application/json'
        });

        // Construir parámetros de consulta
        let httpParams = new HttpParams();
        
        if (params.emp_code) {
            httpParams = httpParams.set('emp_code', params.emp_code);
        }
        if (params.page_size) {
            httpParams = httpParams.set('page_size', params.page_size.toString());
        }
        if (params.page) {
            httpParams = httpParams.set('page', params.page.toString());
        }
        if (params.start_time) {
            httpParams = httpParams.set('start_time', params.start_time);
        }

        return this.http.get<IClockTransactionResponse>(this.baseUrl, {
            headers: headers,
            params: httpParams
        });
    }

    /**
     * Obtiene transacciones por código de empleado
     * @param empCode Código del empleado
     * @param pageSize Tamaño de página (opcional)
     * @param page Número de página (opcional)
     * @param startTime Fecha de inicio (opcional)
     * @returns Observable con la respuesta de transacciones
     */
    getTransactionsByEmployee(
        empCode: string, 
        pageSize: number = 10, 
        page: number = 1, 
        startTime: string='2025-07-01'
    ): Observable<IClockTransactionResponse> {
        const params: IClockTransactionParams = {
            emp_code: empCode,
            page_size: pageSize,
            page: page,
            start_time: startTime
        };

        if (startTime) {
            params.start_time = startTime;
        }

        return this.getTransactions(params);
    }
}
