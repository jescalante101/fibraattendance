import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { 
  CompensatoryDay, 
  CreateCompensatoryDay, 
  UpdateCompensatoryDay, 
  CompensatoryDayFilterParams,
  PaginatedList 
} from '../models/compensatory-day.model';

@Injectable({
  providedIn: 'root'
})
export class CompensatoryDayService {
  private apiUrl = `${environment.apiUrlPro}api/CompensatoryDay`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene una lista paginada de días compensatorios con filtros opcionales
   * @param params Parámetros de filtro y paginación
   * @returns Observable con la lista paginada de días compensatorios
   */
  getCompensatoryDays(params?: CompensatoryDayFilterParams): Observable<PaginatedList<CompensatoryDay>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        const value = (params as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.append(key, value.toString());
        }
      });
    }
    
    return this.http.get<PaginatedList<CompensatoryDay>>(this.apiUrl, { params: httpParams });
  }

  /**
   * Obtiene un día compensatorio por su ID
   * @param id ID del día compensatorio
   * @returns Observable con el día compensatorio
   */
  getCompensatoryDayById(id: number): Observable<CompensatoryDay> {
    return this.http.get<CompensatoryDay>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo día compensatorio
   * @param data Datos para crear el día compensatorio
   * @returns Observable con el día compensatorio creado
   */
  createCompensatoryDay(data: CreateCompensatoryDay): Observable<CompensatoryDay> {
    return this.http.post<CompensatoryDay>(this.apiUrl, data);
  }

  /**
   * Crea un registro masivo de dias compensatorios para varios empleados
   * @param data Datos para crear el día compensatorio
   * @returns Observable con el día compensatorio creado
   */
  createCompensatoryDayBulk(data: CreateCompensatoryDay[]): Observable<CompensatoryDay[]> {
    return this.http.post<CompensatoryDay[]>(`${this.apiUrl}/bulk`, data);
  }

  /**
   * Actualiza un día compensatorio existente
   * @param id ID del día compensatorio a actualizar
   * @param data Datos para actualizar
   * @returns Observable void
   */
  updateCompensatoryDay(id: number, data: UpdateCompensatoryDay): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Elimina un día compensatorio
   * @param id ID del día compensatorio a eliminar
   * @returns Observable void
   */
  deleteCompensatoryDay(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Aprueba un día compensatorio
   * @param id ID del día compensatorio a aprobar
   * @param approvedBy Usuario que aprueba
   * @returns Observable void
   */
  approveCompensatoryDay(id: number, approvedBy: string): Observable<void> {
    const data = { status: 'A', approvedBy };
    return this.http.put<void>(`${this.apiUrl}/${id}/approve`, data);
  }

  /**
   * Rechaza un día compensatorio
   * @param id ID del día compensatorio a rechazar
   * @param rejectedBy Usuario que rechaza
   * @param remarks Comentarios del rechazo
   * @returns Observable void
   */
  rejectCompensatoryDay(id: number, rejectedBy: string, remarks?: string): Observable<void> {
    const data = { status: 'R', rejectedBy, remarks };
    return this.http.put<void>(`${this.apiUrl}/${id}/reject`, data);
  }
}