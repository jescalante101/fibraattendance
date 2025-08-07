import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { ReportMatrixParams } from "../../models/report/report-matrix-params.model";
import { Observable } from "rxjs";
import { ReportMatrixResponse } from "../../models/report/report-matrix-response.model";
import { AttendanceMatrixPivotResponse } from "../../models/report/report-pivot-reponse.model";


@Injectable({
    providedIn: 'root'
})
export class AttendanceMatrixReportService {

    private apiUrl = environment.apiUrlPro;
    private reportUrl = this.apiUrl + 'api/AttendanceMatrix/';

    constructor(private http: HttpClient) { }

    getAttendanceMatrixReport(params: ReportMatrixParams): Observable<ReportMatrixResponse> {
        return this.http.post<ReportMatrixResponse>(`${this.reportUrl}matrix`, params);
    }

    // download excel file , first report
    downloadAttendanceMatrixReport(params: ReportMatrixParams): Observable<Blob> {
        return this.http.post(`${this.reportUrl}export`, params, { responseType: 'blob' });
    }
    //download cost-center report , second report
    downloadCostCenterReport(params: ReportMatrixParams): Observable<Blob> {
        return this.http.post(`${this.reportUrl}export-cost-center`, params, { responseType: 'blob' });
    }

    //download export-markings report , third report
    downloadExportMarkingsReport(params: ReportMatrixParams): Observable<Blob> {
        return this.http.post(`${this.reportUrl}export-markings`, params, { responseType: 'blob' });
    }
    // download export-weekly-attendance  report, fourth  report
    downloadExportWeeklyAttendanceReport(params: ReportMatrixParams): Observable<Blob> {
        return this.http.post(`${this.reportUrl}export-weekly-attendance`, params, { responseType: 'blob' });
    }


    



    // pivot data 
    getAttendanceMatrixPivotReport(params: ReportMatrixParams): Observable<AttendanceMatrixPivotResponse> {
        return this.http.post<AttendanceMatrixPivotResponse>(`${this.reportUrl}pivot`, params);
    }

    

    
}

