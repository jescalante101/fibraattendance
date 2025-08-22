import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { PaginatedShiftsResponse } from "../models/shift.model";

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

export interface ShiftRegister {
    alias:       string;
    cycleUnit:   number;
    shiftCycle:  number;
    workWeekend: boolean;
    weekendType: number;
    workDayOff:  boolean;
    dayOffType:  number;
    autoShift:   boolean;
    createdBy:   string;
    createdAt:   string;
    active:      string;
    detalles:    Detalle[];
}

export interface ShiftRegisterUpdate {
    alias:       string;
    cycleUnit:   number;
    shiftCycle:  number;
    workWeekend: boolean;
    weekendType: number;
    workDayOff:  boolean;
    dayOffType:  number;
    autoShift:   boolean;
    updatedBy:   string;
    updatedAt:   string;
    active:      string;
    detalles:    Detalle[];
}

export interface Detalle {
    timeIntervalId: number;
    dayIndex:       number;
}


export interface ShiftAssignment {
    id:               number;
    alias:            string;
    shiftCycle:       number;
    cycleUnit:        number;
    autoShift:        boolean;
    workDayOff:       boolean;
    weekendType:      number;
    assignmentId:     number;
    employeeId:       string;
    assignmentPeriod: AssignmentPeriod;
    horario:          HorarioShift[];
}

export interface AssignmentPeriod {
    startDate: Date;
    endDate:   Date;
}

export interface HorarioShift {
    dayIndex:                number;
    dayName:                 string;
    dayDate:                 Date;
    alias:                   string;
    inTime:                  string;
    workTimeDuration:        number;
    outTime:                 string;
    hasException:            boolean;
    exceptionId:             number | null;
    exceptionDate:           Date | null;
    originalTimeIntervalId:  number;
    exceptionTimeIntervalId: number | null;
}


export interface ShiftsResponse {
  data: Shift[];
  totalRecords: number;
}

export interface ScheduleExceptionRegister {
    employeeId:     string;
    assignmentId:   number;
    exceptionDate:  Date;
    dayIndex:       number;
    timeIntervalId: number;
    exceptionType:  number;
    startDate:      Date;
    remarks:        string;
    createdBy:      string;
}

@Injectable({
    providedIn: 'root'
})
export class ShiftsService{
    private apiUrl = `${environment.apiUrlPro}`;

    constructor(private http: HttpClient){}
    
    /**
     * Obtiene la lista de turnos con paginación
     * @param page - Número de página (base 1)
     * @param pageSize - Tamaño de la página
     * @returns Observable con la lista de turnos y el total de registros
     */

    getShifts(page: number, pageSize: number): Observable<PaginatedShiftsResponse> {
        return this.http.get<PaginatedShiftsResponse>(`${this.apiUrl}api/Shift/shifts?page=${page}&pageSize=${pageSize}`);
    }

    getShiftById(id:number):Observable<Shift>{
      return this.http.get<Shift>(`${this.apiUrl}api/Shift/shiftPorId/${id}`)
    }

    // get shiftbyAssignedid and shiftId
    getShiftByAssignedIdAndShiftId(assignedId: number, shiftId: number): Observable<ShiftAssignment> {
        return this.http.get<ShiftAssignment>(`${this.apiUrl}api/Shift/shiftPeriodComplete/${shiftId}?assignmentId=${assignedId}`);
    }

    //get shift by assignedId weekly
    getShiftByAssignedIdWeekly(assignedId: number,shiftId:number): Observable<ShiftAssignment[]> {
        return this.http.get<ShiftAssignment[]>(`${this.apiUrl}api/Shift/shiftWeekCurrent/${shiftId}?assignmentId=${assignedId}`);
    }



    /****
     * Registra un nuevo turno
     * @param shift - Objeto Shift a registrar
     */
    registerShift(shift: ShiftRegister): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}api/Shift/nuevoShift`, shift);
    }
    /**
     * Actualiza un turno existente
     * @param shift - Objeto Shift a actualizar
     * @param id 
     * @returns 
     */
    updateShift(shift: ShiftRegisterUpdate, id: number): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}api/Shift/actualizarShift/${id}`,  shift );
    }
    /**
     * Delete un turno por ID
     * @param id - ID del turno a eliminar
     * @returns 
     */
    deleteShift(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}api/Shift/eliminarShift/${id}`);
    }

    // registra excepción de horario
    registerShiftException(schedule:ScheduleExceptionRegister): Observable<any> {
        return this.http.post(`${this.apiUrl}api/EmployeeScheduleException`, schedule);
    }

    //remover Exeption
    removerExeption(idExeption:number):Observable<any>{
        return this.http.delete(`${this.apiUrl}api/EmployeeScheduleException/${idExeption}`)
    }

}

