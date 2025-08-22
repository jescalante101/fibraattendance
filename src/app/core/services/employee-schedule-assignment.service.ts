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
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string | null;

  //compania_id,ccost_id and ccost_description
  companiaId: string | null;
  ccostId: string | null;
  ccostDescription: string | null;
}
export interface EmployeeScheduleAssignmentInsert {
  assignmentId:     number;
  employeeId:       string;
  shiftId:          number;
  startDate:        String;
  endDate:          String;
  remarks:          string;
  createdAt:        string;
  createdBy:        string;
  fullNameEmployee: string;
  shiftDescription: string;
  nroDoc:           string;
  areaId:           string;
  areaDescription:  string;
  locationId:       string;
  locationName:     string;
  companiaId:       string;
  ccostId:          string;
  ccostDescription: string;

}

export interface EmployeeScheduleAssignmentUpdate {
  assignmentId: number;
  employeeId: string;
  nroDoc: string;
  fullNameEmployee: string | null;
  scheduleName: string | null;
  scheduleId: number;
  startDate: string;
  endDate: string;
  remarks: string;
  createdWeek: number;
  areaId: number;
  areaName: string;
  locationId: number;
  locationName: string;
  updatedBy: string | null;
  updatedAt: string | null;
  companiaId: string | null;
  ccostId: string | null;
  ccostDescription: string | null;
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
  private apiUrl = `${environment.apiUrlPro}`;

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

  //update employee schedule assignment
  updateEmployeeScheduleAssignment( body: EmployeeScheduleAssignmentUpdate[]): Observable<ApiResponse<EmployeeScheduleAssignment>> {
    return this.http.put<ApiResponse<EmployeeScheduleAssignment>>(
      `${this.apiUrl}api/employee-schedule-assignment/update/`,
      body
    );
  }

  // get employee schedule by id
  getEmployeeScheduleById(id:number):Observable<ApiResponse<EmployeeScheduleAssignment>>{
    return this.http.get<ApiResponse<EmployeeScheduleAssignment>>(`${this.apiUrl}api/employee-schedule-assignment/get-by-id/${id}`)
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

  /**
   * Obtener el id de los empleados por rango de fechas
   * /api/employee-schedule-assignment/idsPorRangoDeFechas?startDate=2025-08-11&endDate=2025-08-17
   * @param startDate 
   * @param endDate 
   * @returns  ["1234567890","0987654321"]
   */
  getEmployeeIdsByDateRange(startDate: string, endDate: string): Observable<string[]> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<string[]>(
      `${this.apiUrl}api/employee-schedule-assignment/idsPorRangoDeFechas`,
      { params }
    );
  }

  /**
   * Eliminar asignación de horario por id
   * @param id 
   * @returns  Observable<ApiResponse<EmployeeScheduleAssignment>>
   */
  deleteEmployeeScheduleAssignment(id: number): Observable<ApiResponse<EmployeeScheduleAssignment>> {
    return this.http.delete<ApiResponse<EmployeeScheduleAssignment>>(
      `${this.apiUrl}api/employee-schedule-assignment/delete/${id}`
    );
  }




  





} 