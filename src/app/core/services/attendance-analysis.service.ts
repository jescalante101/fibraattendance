import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { ApiData, ApiResponse } from '../models/api-response.model';
import { AttendanceAnalysis, ParamsReport, ReportResponse } from 'src/app/models/attendance-analysis/attendance-analysis.model';
import { HttpParams } from '@angular/common/http';
import { AsistenciaResponse, ParametrosConsulta } from '../models/attendance-resport.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceAnalysisService {
  private readonly apiUrl = environment.apiUrlPro;
  private readonly apiUrlAttendanceAnalysis = `${this.apiUrl}api/AttendanceAnalysis`;
  ///api/AttendanceAnalysis/detailed/paginated
  //api/AttendanceAnalysis/detailed/paginated

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

  getAttendanceAnalysisV2(params: ParamsReport): Observable<ReportResponse> {
    return this.http.post<ReportResponse>(`${this.apiUrlAttendanceAnalysis}/detailed/paginated`, params);
  }

 
  getAttendanceAnalysisReport(
    params: {
      fechaInicio?: string;
      fechaFin?: string;
      filter?: string;
      areaId?: string;
      locationId?: string;
      page?: number;
      pageSize?: number;
    }
  ): Observable<AsistenciaResponse> {
    let httpParams = new HttpParams();
    
    if (params.fechaInicio) httpParams = httpParams.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin) httpParams = httpParams.set('fechaFin', params.fechaFin);
    if (params.filter) httpParams = httpParams.set('filter', params.filter);
    if (params.areaId) httpParams = httpParams.set('areaId', params.areaId);
    if (params.locationId) httpParams = httpParams.set('locationId', params.locationId);
    httpParams = httpParams.set('page', (params.page ?? 1).toString());
    httpParams = httpParams.set('pageSize', (params.pageSize ?? 20).toString());

    return this.http.get<AsistenciaResponse>(this.apiUrlAttendanceAnalysis, { params: httpParams });
  }

  // Método alternativo usando la interfaz ParametrosConsulta (más limpio)
  getAttendanceAnalysisReportV2(params: ParametrosConsulta): Observable<AsistenciaResponse> {
    let httpParams = new HttpParams();
    
    if (params.fechaInicio) httpParams = httpParams.set('fechaInicio', params.fechaInicio);
    if (params.fechaFin) httpParams = httpParams.set('fechaFin', params.fechaFin);
    if (params.empleado) httpParams = httpParams.set('filter', params.empleado);
    if (params.area) httpParams = httpParams.set('areaId', params.area);
    if (params.sede) httpParams = httpParams.set('locationId', params.sede);
    httpParams = httpParams.set('page', (params.pageNumber ?? 1).toString());
    httpParams = httpParams.set('pageSize', (params.pageSize ?? 20).toString());

    return this.http.get<AsistenciaResponse>(this.apiUrlAttendanceAnalysis, { params: httpParams });
  }

  // Método helper para construir parámetros HTTP de forma más limpia
  private buildHttpParams(params: ParametrosConsulta): HttpParams {
    let httpParams = new HttpParams();
    
    const paramMap: Record<string, string | undefined> = {
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin,
      filter: params.empleado,
      areaId: params.area,
      locationId: params.sede,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.pageNumber?.toString() ?? '1',
      pageSize: params.pageSize?.toString() ?? '20'
    };

    Object.entries(paramMap).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value);
      }
    });

    return httpParams;
  }

  // Método final recomendado (más limpio)
  getAttendanceReport(params: ParametrosConsulta): Observable<AsistenciaResponse> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get<AsistenciaResponse>(this.apiUrlAttendanceAnalysis, { params: httpParams });
  }


  // Método para exportar el reporte de asistencia
  exportAttendanceReport(params: ParametrosConsulta): Observable<Blob> {
    const httpParams = this.buildHttpParams(params);
    return this.http.get(`${this.apiUrlAttendanceAnalysis}/export/excel`, { params: httpParams, responseType: 'blob' });
  }





}
