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
    return this.http.get<any[]>(`${this.apiUrl}Personal/listDepartment`,);
  }

}
