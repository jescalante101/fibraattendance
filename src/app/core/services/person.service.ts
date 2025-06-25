import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonService {
  private apiUrl = `${environment.apiUrl}`;

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

  getPersonalActivo():Observable<any>{
    return this.http.get<any[]>(`${this.apiUrl}Scire/api/scire/personal`,);
  }

}
