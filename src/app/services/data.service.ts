// src/app/services/data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  private urlActivo         = 'assets/dummy-activo.json';
  private urlInactivo       = 'assets/dummy-inactivo.json';
  private urlFormActivo     = 'assets/dummy-form-activo.json';
  private urlFormInactivo   = 'assets/dummy-form-inactivo.json';
  private ordenesTrabajo    = 'assets/dummy-ordenes-trabajo.json';

  constructor(private http: HttpClient) { }

  getDatosActivos(): Observable<any[]> {
    return this.http.get<any[]>(this.urlActivo);
  }

  getDatosInactivos(): Observable<any[]> {
    return this.http.get<any[]>(this.urlInactivo);
  }

  getFormActivos(): Observable<any> {
    return this.http.get<any>(this.urlFormActivo);
  }

  getFormInactivos(): Observable<any> {
    return this.http.get<any>(this.urlFormInactivo);
  }
  getOrdenesTrabajoDummy(): Observable<any[]> {
    return this.http.get<any[]>(this.ordenesTrabajo);
  }
}
