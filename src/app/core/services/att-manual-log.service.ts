import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';
// Suponiendo que ApiResponse está definido en algún lugar del proyecto
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AttManualLogService {
  private apiUrl = `${environment.apiUrlPro}`;

  constructor(private http: HttpClient) { }

  // GET: Obtener marcaciones manuales por empleado con paginación
  getManualLogs(employeeId: string, page: number=1, pageSize: number=10): Observable<ApiResponse<AttManualLog[]>> {
    return this.http.get<ApiResponse<AttManualLog[]>>(
      `${this.apiUrl}api/attmanuallog?employeeId=${employeeId}&page=${page}&pageSize=${pageSize}`
    );
  }

  // POST: Crear una nueva marcación manual
  createManualLog(log: AttManualLog[]): Observable<ApiResponse<AttManualLog>> {
    return this.http.post<ApiResponse<AttManualLog>>(
      `${this.apiUrl}api/attmanuallog`,
      log
    );
  }

  // PUT: Actualizar una marcación manual existente
  updateManualLog(id: number, log: AttManualLog): Observable<ApiResponse<AttManualLog>> {
    return this.http.put<ApiResponse<AttManualLog>>(
      `${this.apiUrl}api/attmanuallog/${id}`,
      log
    );
  }

  // DELETE: Eliminar una marcación manual
  deleteManualLog(id: number): Observable<ApiResponse<AttManualLog>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}api/attmanuallog/${id}`
    );
  }

  // GET: Obtener una marcación manual por ID
  getManualLogById(id: number): Observable<ApiResponse<AttManualLog>> {
    return this.http.get<ApiResponse<AttManualLog>>(
      `${this.apiUrl}api/attmanuallog/${id}`
    );
  }
  
}
