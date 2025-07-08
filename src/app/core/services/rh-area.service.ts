import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface RhArea {
  areaId: string;
  descripcion: string;
  companiaId: string;
}

@Injectable({
  providedIn: 'root'
})
export class RhAreaService {
  private apiUrl = `${environment.apiScire}`;

  constructor(private http: HttpClient) { }

  getAreas(): Observable<RhArea[]> {
    return this.http.get<RhArea[]>(`${this.apiUrl}api/RhArea`);
  }
} 