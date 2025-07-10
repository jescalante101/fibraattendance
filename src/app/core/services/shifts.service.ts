import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

// Interfaces para tipar la respuesta del endpoint de turnos
export interface Horario {
  dayIndex: number;
  alias: string;
  inTime: string;
  workTimeDuration: number;
}

export interface Shift {
  id: number;
  alias: string;
  shiftCycle: number;
  cycleUnit: number;
  autoShift: boolean;
  workDayOff: boolean;
  weekendType: number;
  horario: Horario[];
}

export interface ShiftsResponse {
  data: Shift[];
  totalRecords: number;
}

@Injectable({
    providedIn: 'root'
})
export class ShiftsService{
    private apiUrl = `${environment.apiUrl}`;

    constructor(private http: HttpClient){}
    
    /**
     * Obtiene la lista de turnos con paginación
     * @param page - Número de página (base 1)
     * @param pageSize - Tamaño de la página
     * @returns Observable con la lista de turnos y el total de registros
     */
    getShifts(page: number, pageSize: number): Observable<ShiftsResponse> {
        return this.http.get<ShiftsResponse>(`${this.apiUrl}api/Shift/lstShifts?page=${page}&pageSize=${pageSize}`);
    }
}