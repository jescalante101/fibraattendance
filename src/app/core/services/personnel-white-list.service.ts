import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  PagedResultDtoPersonnelWhitelist, 
  PaginationFilterPersonnelWhitelist, 
  PersonnelWhitelistDto, 
  PersonnelWhitelistCreateEditDto 
} from '../models/personnel-white-list.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonnelWhitelistService {
  // URL corregida para la API
  private readonly apiUrl = `${environment.apiUrlPro}api/PersonnelWhitelist`; 

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la lista paginada de personal en la whitelist.
   * @param filter - Objeto con los parámetros de paginación, filtro y ordenamiento.
   */
  getWhitelists(filter: PaginationFilterPersonnelWhitelist): Observable<PagedResultDtoPersonnelWhitelist<PersonnelWhitelistDto>> {
    let params = new HttpParams();
    
    if (filter.pageNumber) params = params.set('pageNumber', filter.pageNumber.toString());
    if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    if (filter.filterText) params = params.set('filterText', filter.filterText);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.isAscending !== undefined) params = params.set('isAscending', filter.isAscending);

    return this.http.get<PagedResultDtoPersonnelWhitelist<PersonnelWhitelistDto>>(this.apiUrl, { params });
  }

  /**
   * Obtiene un registro por su ID.
   * @param id - El ID del registro a obtener.
   */
  getWhitelistById(id: number): Observable<PersonnelWhitelistDto> {
    return this.http.get<PersonnelWhitelistDto>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo registro en la whitelist.
   * @param dto - Los datos del nuevo registro.
   */
  createWhitelist(dto: PersonnelWhitelistCreateEditDto): Observable<PersonnelWhitelistDto> {
    return this.http.post<PersonnelWhitelistDto>(this.apiUrl, dto);
  }

  /**
   * Actualiza un registro existente.
   * @param id - El ID del registro a actualizar.
   * @param dto - Los nuevos datos para el registro.
   */
  updateWhitelist(id: number, dto: PersonnelWhitelistCreateEditDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Elimina un registro de la whitelist.
   * @param id - El ID del registro a eliminar.
   */
  deleteWhitelist(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea múltiples registros de forma masiva.
   * @param dtos - Un array con los datos de los nuevos registros.
   */
  createBulkWhitelist(dtos: PersonnelWhitelistCreateEditDto[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/bulk`, dtos);
  }
}
