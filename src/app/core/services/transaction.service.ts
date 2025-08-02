import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { Observable } from "rxjs";
import { Datum, TransactionComplete, TransactionFilter, TransactionResponse } from "../models/transaction-response.model";
import { TransactionResumenResponse } from "../models/transaction-resume-response.model";

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private readonly apiUrl = `${environment.apiUrlPro}api/IclockTransaction/`;
   // private readonly baseUrl = `${this.apiUrl}api/iclockTransaction/smart`;

    constructor(private http: HttpClient) {}
    //get transactions by empCode with pagination and date range
    getTransactions(params: TransactionFilter): Observable<TransactionResponse<Datum>> {
        // return this url   'http://localhost:5025/api/IclockTransaction/paginado?fechaInicio=2025-07-01&fechaFin=2025-07-05&empleadoFilter=76095492&pageNumber=1&pageSize=2'
        let httpParams = new HttpParams();
        if (params.startDate) httpParams = httpParams.set('fechaInicio', params.startDate);
        if (params.endDate) httpParams = httpParams.set('fechaFin', params.endDate);
        if (params.empCode) httpParams = httpParams.set('empleadoFilter', params.empCode);
        if (params.page) httpParams = httpParams.set('pageNumber', params.page.toString());
        if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
        return this.http.get<TransactionResponse<Datum>>(`${this.apiUrl}paginado`, { params: httpParams });
    }

    //get complete transaction by empCode and date
   getCompleteTransaction(params: TransactionFilter): Observable<TransactionResponse<TransactionComplete>> {
        let httpParams = new HttpParams();
        if (params.startDate) httpParams = httpParams.set('fechaInicio', params.startDate);
        if (params.endDate) httpParams = httpParams.set('fechaFin', params.endDate);
        if (params.empCode) httpParams = httpParams.set('empleadoFilter', params.empCode);
        if (params.page) httpParams = httpParams.set('pageNumber', params.page.toString());
        if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
        
        return this.http.get<TransactionResponse<TransactionComplete>>(
            `${this.apiUrl}analisis/paginado`, 
            { params: httpParams }  // 🔥 ¡Esto faltaba!
        );    
    }

    // sin paginacion
    getCompleteTransactionNoPagination(params: TransactionFilter): Observable<TransactionResponse<TransactionComplete>> {
        let httpParams = new HttpParams();
        if (params.startDate) httpParams = httpParams.set('fechaInicio', params.startDate);
        if (params.endDate) httpParams = httpParams.set('fechaFin', params.endDate);
        if (params.empCode) httpParams = httpParams.set('empleadoFilter', params.empCode);
        
        return this.http.get<TransactionResponse<TransactionComplete>>(
            `${this.apiUrl}analisis`, 
            { params: httpParams }
        );
    }

    // resumen
    getTransactionResumen(empCode: string, startDate: string, endDate: string): Observable<TransactionResumenResponse> {
        let httpParams = new HttpParams()
            .set('empleadoFilter', empCode)
            .set('fechaInicio', startDate)
            .set('fechaFin', endDate);
        return this.http.get<TransactionResumenResponse>(`${this.apiUrl}resumen`, { params: httpParams });
    }
    
}
