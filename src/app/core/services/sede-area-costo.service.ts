import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { SedeAreaCosto } from 'src/app/models/site-area-ccost.model';



@Injectable({
  providedIn: 'root'
})
export class SedeAreaCostoService {
  private apiUrl = environment.apiUrlPro;
  private resource = this.apiUrl + 'api/SiteAreaCostCenter';

  constructor(private http: HttpClient) {}

  // Listar todos
  getAll() {
    return this.http.get<SedeAreaCosto[]>(this.resource);
  }

  // Obtener por siteId y areaId
  getById(siteId: string, areaId: string) {
    return this.http.get<any>(`${this.resource}/${siteId}/${areaId}`);
  }

  // Crear nuevo
  create(data: any) {
    return this.http.post<any>(this.resource, data);
  }
 

  // Actualizar
  update(siteId: string, areaId: string, data: SedeAreaCosto) {
    return this.http.put<any>(`${this.resource}/${siteId}/${areaId}`, data);
  }

  // Eliminar
  delete(siteId: string, areaId: string) {
    return this.http.delete<any>(`${this.resource}/${siteId}/${areaId}`);
  }
}