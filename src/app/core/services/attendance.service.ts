import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrlPro}`+ 'api/';

  constructor(private http: HttpClient) { }


   getDescansos(page:number=1,pageSize:number=10):Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}AttBreakTime/lstDescansos?page=${page}&pageSize=${pageSize}`);
  }

  getDescansoByID(id:number):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}AttBreakTime/descansoPorId/${id}`,);
  }

  saveDescanso(descanso:any):Observable<any>{
    return this.http.post<any>(`${this.apiUrl}AttBreakTime/nuevoDescanso`,descanso);
  }

  updateDescanso(descanso:any):Observable<any>{
    return this.http.put<any>(`${this.apiUrl}AttBreakTime/actualizarDescanso`,descanso);
  }
  deleteDescanso(id:number):Observable<any>{
    return this.http.delete<any>(`${this.apiUrl}AttBreakTime/eliminarDescanso/${id}`,);
  }

  getHorarios(page:number=1,pageSize:number=15):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}AttTimeInterval/lstHoraiosMap?page=${page}&pageSize=${pageSize}`,);
  }

  saveHorario(horario:any):Observable<any>{
    return this.http.post<any>(`${this.apiUrl}AttTimeInterval/nuevoHorario`,horario);
  }

  updateHorario(horario:any):Observable<any>{
    return this.http.put<any>(`${this.apiUrl}AttTimeInterval/actualizarHorario/`,horario);
  }
  deleteHorario(id:number):Observable<any>{
    return this.http.delete<any>(`${this.apiUrl}AttTimeInterval/eliminarHorario/${id}`,);
  }

  getHorarioByID(id:number):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}AttTimeInterval/horarioPorId/${id}`,);
  }
  
  getTurnos(page:number=1,pageSize:number=15):Observable<any>{
    return this.http.get<any>(`${this.apiUrl}AttTimeInterval/lstShifts?page=${page}&pageSize=${pageSize}`,);
  }

 
  //Asignacion de horarios
  getEmployeeScheduleAssignmentDTO(){
    
  }

}