// src/app/core/services/time-interval.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  PaginatedResponse,
  TimeIntervalDetailDto,
  AttTimeIntervalCreateDto,
  AttTimeIntervalUpdateDto,
  AttTimeIntervalDto
} from '../models/att-time-interval-responde.model';


@Injectable({
  providedIn: 'root'
})
export class TimeIntervalService {

  // URL base de la API, construida desde el archivo de environment
  private apiUrl = `${environment.apiUrlPro}api/TimeIntervals`;


  constructor(private http: HttpClient) { }

  /**
   * Obtiene una lista paginada de horarios para una compañía específica.
   * @param companyId El ID de la compañía para filtrar los horarios.
   * @param page El número de página a solicitar.
   * @param pageSize El tamaño de la página.
   * @returns Un Observable con la respuesta paginada.
   */
  getTimeIntervals(companyId: string, page: number, pageSize: number): Observable<PaginatedResponse<TimeIntervalDetailDto>> {
    const params = new HttpParams()
      .set('companyId', companyId)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<PaginatedResponse<TimeIntervalDetailDto>>(this.apiUrl, { params });
  }

  /**
   * Obtiene un horario específico por su ID.
   * @param id El ID del horario a recuperar.
   * @returns Un Observable con los datos del horario.
   */
  getTimeIntervalById(id: number): Observable<AttTimeIntervalDto> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<AttTimeIntervalDto>(url);
  }

  /**
   * Crea un nuevo horario.
   * @param data El DTO con los datos para crear el horario.
   * @returns Un Observable con el horario recién creado.
   */
  createTimeInterval(data: AttTimeIntervalCreateDto): Observable<AttTimeIntervalCreateDto> {
    return this.http.post<AttTimeIntervalCreateDto>(this.apiUrl, data);
  }

  /**
   * Actualiza un horario existente.
   * @param id El ID del horario a actualizar.
   * @param data El DTO con los datos actualizados.
   * @returns Un Observable vacío (la API devuelve 204 No Content).
   */
  updateTimeInterval(id: number, data: AttTimeIntervalUpdateDto): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<void>(url, data);
  }

  /**
   * Elimina un horario.
   * @param id El ID del horario a eliminar.
   * @returns Un Observable vacío (la API devuelve 204 No Content).
   */
  deleteTimeInterval(id: number): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url);
  }
}