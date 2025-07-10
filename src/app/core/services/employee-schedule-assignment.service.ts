import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../models/api-response.model';

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
} 