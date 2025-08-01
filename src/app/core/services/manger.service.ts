import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { CompaniResponse } from "../models/compania-reponse.model";
import { PlanillaResponse } from "../models/planilla-response.model";
import { PeriodoResponse } from "../models/periodo-response.model";

@Injectable({
  providedIn: 'root'
})
export class MangerService {

    private apiUrl = environment.apiScire;
    private resource = this.apiUrl + 'api/Companium';

    constructor(private http: HttpClient) { }
    
    getAll(): Observable<CompaniResponse[]> {
        return this.http.get<CompaniResponse[]>(this.resource);
    }

    getById(companiaId: string): Observable<CompaniResponse> {
        return this.http.get<CompaniResponse>(`${this.resource}/${companiaId}`);
    }

    /// planillas
    getPlanillasByCompaniaId(companiaId: string): Observable<PlanillaResponse[]> {
        return this.http.get<PlanillaResponse[]>(`${this.apiUrl}api/planilla/ByCompania/${companiaId}`);
    }
    getPlanillaById(planillaId: string): Observable<PlanillaResponse> {
        return this.http.get<PlanillaResponse>(`${this.apiUrl}api/planilla/${planillaId}`);
    }

    // periodos by companiaId,planillaId,ano
    getPeriodosByCompaniaPlanillaAno(companiaId: string, planillaId: string, ano: string): Observable<PeriodoResponse[]> {
        return this.http.get<PeriodoResponse[]>(`${this.apiUrl}api/periodo/filtrar?CompaniaId=${companiaId}&planillaId=${planillaId}&anio=${ano}`);
    }


}