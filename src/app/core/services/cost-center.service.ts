import { Injectable } from '@angular/core'; 
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

// return this model
/*{
    "ccostoId": "000000000000000",
    "descripcion": "---",
    "estadoId": "01",
    "dpto": "  ",
    "prov": "  ",
    "dist": "  ",
    "codigoAuxiliar": "",
    "ccostoIdParent": "000000000000000",
    "companiaId": "01"
  },*/

  export interface CostCenter {
    ccostoId: string;
    descripcion: string;
    estadoId: string;
    dpto: string;
    prov: string;
    dist: string;
    codigoAuxiliar: string;
    ccostoIdParent: string;
    companiaId: string;
  }

@Injectable({
  providedIn: 'root'
})
export class CostCenterService {

    private apiUrl = environment.apiScire;
    private resource = this.apiUrl + 'api/Ccosto';
    constructor(private http: HttpClient) {}

    getAll(): Observable<CostCenter[]> {
        return this.http.get<CostCenter[]>(this.resource);
    }

    getById(id: string): Observable<CostCenter> {
        return this.http.get<CostCenter>(`${this.resource}/${id}`);
    }
    
    
    
}







