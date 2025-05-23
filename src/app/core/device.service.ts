import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }
  getDevicesByPage(pageNumber: number): Observable<any[]> {
    // Realiza la petición GET a la API, pasando los parámetros en la opción 'params'
    return this.http.get<any[]>(`${this.apiUrl}Device/listDevice_db`);
  }

 getTransactionsByPage(pageNumber: number): Observable<HttpResponse<any[]>> {
    const params = new HttpParams()
      .set('page', pageNumber.toString());
    return this.http.get<any[]>(`${this.apiUrl}Device/marcaciones_db`, { params, observe: 'response' });
  }

  verifyConnectionDevice(idDevice:number,ipAddress:string):Observable<any>{
   return this.http.put<any>(`${this.apiUrl}Device/verifyConnection`,{"ipAddress":ipAddress,"port":idDevice});
  }


  loadTransactionDevice(ipAddress:string,port:number,idDevice:number):Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}terminal/list_records_transaction_today`,{params:{"IpAddress":ipAddress,"port":port,"idDevice":idDevice}});
  }

  loadLasttransaction(ipAddress:string,port:number,idDevice:number):Observable<any[]>{
    return this.http.get<any[]>(`${this.apiUrl}terminal/list_new_records_transaction_today`,{params:{"IpAddress":ipAddress,"port":port,"idDevice":idDevice}});
  }




}
