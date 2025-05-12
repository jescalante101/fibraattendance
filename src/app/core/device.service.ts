import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IclockTerminalModel } from './models/iclock-terminal.model';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  private apiUrl = `${environment.apiUrl}/device`;

  constructor(private http: HttpClient) { }

  getDevicesByPage(pageNumber: number): Observable<IclockTerminalModel[]> {
    // Crea un objeto HttpParams para agregar el parámetro 'page' a la URL
    const params = new HttpParams().set('page', pageNumber.toString());

    // Realiza la petición GET a la API, pasando los parámetros en la opción 'params'
    return this.http.get<IclockTerminalModel[]>(this.apiUrl+"?page="+pageNumber.toString());
  }



}
