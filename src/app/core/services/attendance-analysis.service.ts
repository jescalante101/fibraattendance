import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { ApiData, ApiResponse } from '../models/api-response.model';
import { AttendanceAnalysis } from 'src/app/models/attendance-analysis/attendance-analysis.model';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AttendanceAnalysisService {
  private readonly apiUrl = environment.apiUrl;
  private readonly apiUrlAttendanceAnalysis = `${this.apiUrl}api/AttendanceAnalysis`;

  constructor(private http: HttpClient) { }
  
  getAttendanceAnalysis(params: {
    fechaInicio?: string;
    fechaFin?: string;
    filter?: string;
    areaId?: string;
    locationId?: string;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponse<AttendanceAnalysis>> {
    let httpParams = new HttpParams();
    if (params.fechaInicio) httpParams = httpParams.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin) httpParams = httpParams.set('fechaFin', params.fechaFin);
    if (params.filter) httpParams = httpParams.set('filter', params.filter);
    if (params.areaId) httpParams = httpParams.set('areaId', params.areaId);
    if (params.locationId) httpParams = httpParams.set('locationId', params.locationId);
    httpParams = httpParams.set('page', (params.page ?? 1).toString());
    httpParams = httpParams.set('pageSize', (params.pageSize ?? 20).toString());

    return this.http.get<ApiResponse<AttendanceAnalysis>>(
      this.apiUrlAttendanceAnalysis,
      { params: httpParams }
    );
  }

}
