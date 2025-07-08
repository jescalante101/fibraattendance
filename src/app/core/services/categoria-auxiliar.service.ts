import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface CategoriaAuxiliar {
  categoriaAuxiliarId: string;
  descripcion: string;
  companiaId: string;
  codigoAuxiliar: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriaAuxiliarService {
  private apiUrl = `${environment.apiScire}`;

  constructor(private http: HttpClient) { }

  getCategoriasAuxiliar(): Observable<CategoriaAuxiliar[]> {
    return this.http.get<CategoriaAuxiliar[]>(`${this.apiUrl}api/CategoriaAuxiliar`);
  }
} 