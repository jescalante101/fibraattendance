import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { IClockTransactionParams, IClockTransactionParams2, IClockTransactionResponse, IClockTransactionResponse2 } from "../models/iclock-transaction.model";
import { ApiResponse } from "../models/api-response.model";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private readonly apiUrl = `${environment.apiUrl}`;
    private readonly baseUrl = `${this.apiUrl}api/iclockTransaction/smart`;

    constructor(private http: HttpClient) {}

    getTransactions(params: IClockTransactionParams2 = {page: 1, pageSize: 20}): Observable<ApiResponse<IClockTransactionResponse2>> {
        let httpParams = new HttpParams();
        httpParams = httpParams.set('page', params.page?.toString() || '1');
        httpParams = httpParams.set('pageSize', params.pageSize?.toString() || '20');
        if(params.empCode) httpParams = httpParams.set('empCode', params.empCode);
        if(params.personalId) httpParams= httpParams.set('personalId',params.personalId)
        if(params.startDate) httpParams = httpParams.set('startDate', params.startDate);
        if(params.endDate) httpParams = httpParams.set('endDate', params.endDate);
        httpParams.set("forceSync",true);
        return this.http.get<ApiResponse<IClockTransactionResponse2>>(`${this.baseUrl}`, { params: httpParams });
    }
    
}
