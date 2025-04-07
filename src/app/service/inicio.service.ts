import { Injectable } from '@angular/core';
import { global } from './global'
import { Observable } from 'rxjs';
import { HttpClient,HttpHeaders }  from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class InicioService {

  public url; 
  constructor(
    private _http:HttpClient,
  ) { 
    this.url = global.url;
  }

  Listar_Valores_Factura(data:any,token:any):Observable<any>{
    let headers = new HttpHeaders({'Content-Type':'application/json','Authorization':token});
    return this._http.post(this.url + 'registro_cliente_admin',data,{headers:headers});
  }
}
