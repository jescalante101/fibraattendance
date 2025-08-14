import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SedeCcosto, SedeCcostoInsert, SedeCcostoUpdate } from '../models/sede-ccosto.model';

@Injectable({
  providedIn: 'root'
})
export class SedeCcostoService {
  private apiUrl = environment.apiUrlPro;
  private resource = this.apiUrl + 'api/SiteCostCenter';

  constructor(private http: HttpClient) { }

  getAll(): Observable<SedeCcosto[]> {
    return this.http.get<SedeCcosto[]>(this.resource);
  }

  create(sedeCcosto: SedeCcostoInsert): Observable<SedeCcosto> {
    return this.http.post<SedeCcosto>(this.resource, sedeCcosto);
  }

  update(siteId: string, costCenterId: string, sedeCcosto: SedeCcostoUpdate): Observable<SedeCcosto> {
    return this.http.put<SedeCcosto>(`${this.resource}/${siteId}/${costCenterId}`, sedeCcosto);
  }

  delete(siteId: string, costCenterId: string): Observable<void> {
    return this.http.delete<void>(`${this.resource}/${siteId}/${costCenterId}`);
  }

  getById(siteId: string, costCenterId: string): Observable<SedeCcosto> {
    return this.http.get<SedeCcosto>(`${this.resource}/${siteId}/${costCenterId}`);
  }
  
}
