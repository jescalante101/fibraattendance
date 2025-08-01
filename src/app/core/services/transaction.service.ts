import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { IClockTransactionParams, IClockTransactionParams2, IClockTransactionResponse, IClockTransactionResponse2 } from "../models/iclock-transaction.model";
import { ApiResponse } from "../models/api-response.model";
import { Observable } from "rxjs";
import { TransactionFilter, TransactionResponse } from "../models/transaction-response.model";

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private readonly apiUrl = `${environment.apiUrlPro}api/IclockTransaction/`;
   // private readonly baseUrl = `${this.apiUrl}api/iclockTransaction/smart`;

    constructor(private http: HttpClient) {}
    //get transactions by empCode with pagination and date range
    getTransactions(params: TransactionFilter): Observable<TransactionResponse> {
        // return this url   'http://localhost:5025/api/IclockTransaction/paginado?fechaInicio=2025-07-01&fechaFin=2025-07-05&empleadoFilter=76095492&pageNumber=1&pageSize=2'
        let httpParams = new HttpParams();
        if (params.startDate) httpParams = httpParams.set('fechaInicio', params.startDate);
        if (params.endDate) httpParams = httpParams.set('fechaFin', params.endDate);
        if (params.empCode) httpParams = httpParams.set('empleadoFilter', params.empCode);
        if (params.page) httpParams = httpParams.set('pageNumber', params.page.toString());
        if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
        return this.http.get<TransactionResponse>(`${this.apiUrl}paginado`, { params: httpParams });
    }
 

    
}
