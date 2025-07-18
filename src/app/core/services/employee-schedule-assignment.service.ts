import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { EmployeeScheduleHours } from 'src/app/models/employee-schedule/employee-schedule-hours.model';

export interface EmployeeScheduleAssignment {
  assignmentId: number;
  employeeId: string;
  nroDoc: string;
  fullNameEmployee: string | null;
  scheduleName: string | null;
  scheduleId: number;
  startDate: string;
  endDate: string;
  remarks: string;
  createdAt: string;
  createdWeek: number;
  areaId: number;
  areaName: string;
  locationId: number;
  locationName: string;

}

export interface EmployeeScheduleAssignmentInsert {
  employeeId: string;
  scheduleId: number;
  startDate: string;
  endDate: string;
  remarks: string;
  createdAt: string;
  crearteBY: string;
  fullName: string;
  shiftDescription: string;
  nroDoc: string;
  areaId: string;
  areaDescription: string;
  locationId: string;
  locationName: string;
}

export interface EmployeeHorario {
  id: number;
  fullNameEmployee: string;
  alias: string;
  inTime: string;
  outTime: string;
}


@Injectable({
  providedIn: 'root'
})
export class EmployeeScheduleAssignmentService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  getEmployeeScheduleAssignments(page = 1, pageSize = 15, filter = '',startDate = '',endDate = ''): Observable<ApiResponse<EmployeeScheduleAssignment>> {
    const params = new HttpParams()
      .set('pageNumber', page)
      .set('pageSize', pageSize)
      .set('searchText', filter)
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get<ApiResponse<EmployeeScheduleAssignment>>(`${this.apiUrl}api/employee-schedule-assignment/search`, { params });
  }

  insertEmployeeScheduleAssignment(body: EmployeeScheduleAssignmentInsert[]): Observable<ApiResponse<EmployeeScheduleAssignment>> {
    return this.http.post<ApiResponse<EmployeeScheduleAssignment>>(
      `${this.apiUrl}api/employee-schedule-assignment/insert`,
      body
    );
  }

  // get employee schedule assignment by employee document
  getEmployeeScheduleAssignmentByEmployeeDocument(employeeDocument: string): Observable<ApiResponse<EmployeeScheduleAssignment>> {
    return this.http.get<ApiResponse<EmployeeScheduleAssignment>>(`${this.apiUrl}api/employee-schedule-assignment/get-by-nrodoc/${employeeDocument}`);
  }

  // Obtener horarios del empleado por nro de documento
  getHorariosByNroDocumento(nroDoc: string): Observable<EmployeeHorario[]> {
    return this.http.get<EmployeeHorario[]>(
      `${this.apiUrl}api/employee-schedule-assignment/get-horaio-by-doc/${nroDoc}`
    );
  }


  getEmployeeScheduleHours(
    nroDoc: string,
    fullName: string,
    pageNumber: number=1,
    pageSize: number=15,
    areaId: string,
  ): Observable<ApiResponse<EmployeeScheduleHours>> {
    const params = new HttpParams()
    .set('nroDoc', nroDoc)
    .set('fullName', fullName)
    .set('pageNumber', pageNumber)
    .set('pageSize', pageSize)
    .set('areaId', areaId);

    return this.http.get<ApiResponse<EmployeeScheduleHours>>(
      `${this.apiUrl}api/employee-schedule-assignment/get-assignment-with-shift`,
      { params }
    );
  }


} 