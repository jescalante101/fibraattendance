import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';

@Injectable({
  providedIn: 'root'
})
export class PersonService {
  private apiUrl = `${environment.apiUrl}`;
  private apiUrlScire = `${environment.apiScire}`;

  constructor(private http: HttpClient) { }

  getListCompany():Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}Personal/listCompany`,);
  }
  getListDepartment():Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}Personal/listDepartment`,);
  }
  getPositions():Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}Personal/listPositions`,);
  }

  getListAreas():Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}Personal/listAreas`,);
  }

  /* empleados service */

  getEmpleados(page: number = 1, pageSize: number = 15):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}Personal/organizacion/listarempleados?page=${page}&pageSize=${pageSize}`,);
  }
  getCeses():Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}Personal/organizacion/listarCeses`,);
  }



getPersonalActivo(page = 1, pageSize = 15, filter = '',categoriaAuxiliarId = '',rhAreaId = '',ccosto=''): Observable<ApiResponse<Employee>> {
  const params = new HttpParams()
    .set('page', page)
    .set('pageSize', pageSize)
    .set('searchText', filter)
    .set('ccostoId',ccosto)
    .set('sede',categoriaAuxiliarId)
    .set('areaId', rhAreaId);
  return this.http.get<ApiResponse<Employee>>(`${this.apiUrlScire}api/Personal/search`, { params });
}

  

}
