import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ScheduleResponseDto } from '../models/schedule.model'; // Adjust the import path as needed

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {

  // Base URL for the schedule assignment endpoint
  private apiUrl = `${environment.apiUrlPro}api/employee-schedule-assignment`;

  constructor(private http: HttpClient) { }

  /**
   * Fetches the current week's schedule for a specific employee.
   * @param employeeId The ID of the employee.
   * @returns An Observable of the employee's weekly schedule.
   */
  getCurrentWeekSchedule(employeeId: string): Observable<ScheduleResponseDto> {
    const url = `${this.apiUrl}/employee/${employeeId}/current-week-schedule`;
    return this.http.get<ScheduleResponseDto>(url);
  }

  /**
   * Fetches the schedule for a specific employee within a given date range.
   * @param employeeId The ID of the employee.
   * @param startDate The start date of the range.
   * @param endDate The end date of the range.
   * @returns An Observable of the employee's schedule for the specified range.
   */
  getScheduleByDateRange(employeeId: string, startDate: Date, endDate: Date): Observable<ScheduleResponseDto> {
    const url = `${this.apiUrl}/employee/${employeeId}/date-range-schedule`;

    // Format dates to 'yyyy-MM-dd' to match the API's expected format
    const formatToIsoDate = (date: Date) => date.toISOString().split('T')[0];

    const params = new HttpParams()
      .set('startDate', formatToIsoDate(startDate))
      .set('endDate', formatToIsoDate(endDate));

    return this.http.get<ScheduleResponseDto>(url, { params });
  }
}