import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }


   getDescansos(page:number=1,pageSize:number=10):Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}Attendance/lstDescansos?page=${page}&pageSize=${pageSize}`);
  }

  getDescansoByID(id:number):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}Attendance/descansoPorId/${id}`,);
  }

  saveDescanso(descanso:any):Observable<any>{
    return this.http.post<any>(`${this.apiUrl}Attendance/nuevoDescanso`,descanso);
  }

  updateDescanso(descanso:any):Observable<any>{
    return this.http.put<any>(`${this.apiUrl}Attendance/actualizarDescanso`,descanso);
  }
  deleteDescanso(id:number):Observable<any>{
    return this.http.delete<any>(`${this.apiUrl}Attendance/eliminarDescanso/${id}`,);
  }

  getHorarios(page:number=1,pageSize:number=15):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}Attendance/lstHoraiosMap?page=${page}&pageSize=${pageSize}`,);
  }

  saveHorario(horario:any):Observable<any>{
    return this.http.post<any>(`${this.apiUrl}Attendance/nuevoHorario`,horario);
  }

  updateHorario(horario:any):Observable<any>{
    return this.http.put<any>(`${this.apiUrl}Attendance/actualizarHorario/`,horario);
  }
  deleteHorario(id:number):Observable<any>{
    return this.http.delete<any>(`${this.apiUrl}Attendance/eliminarHorario/${id}`,);
  }

  getHorarioByID(id:number):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}Attendance/horarioPorId/${id}`,);
  }
  
  getTurnos(page:number=1,pageSize:number=15):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}Attendance/lstShifts?page=${page}&pageSize=${pageSize}`,);
  }

 


}