import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserSite } from 'src/app/models/user-site.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppUserSiteService {

  private apiUrl = environment.apiUrlPro;
  private resource = this.apiUrl + 'api/AppUserSite';

  constructor(private http: HttpClient) { }

  // para la gestion de usaurio hay que usar el siguiente modelo UserSite 
  getAll(): Observable<UserSite[]> {
    return this.http.get<UserSite[]>(this.resource);
  }
  // get by userId and siteId 
  getById(userId: number, siteId: string): Observable<UserSite> {
    return this.http.get<UserSite>(`${this.resource}/${userId}/${siteId}`);
  }

  create(userSite: UserSite): Observable<UserSite> {
    return this.http.post<UserSite>(this.resource, userSite);
  }
  // update by userId and siteId
  update(userId: number, siteId: string, userSite: UserSite): Observable<UserSite> {
    return this.http.put<UserSite>(`${this.resource}/${userId}/${siteId}`, userSite);
  }

  delete(userId: number, siteId: string): Observable<void> {
    return this.http.delete<void>(`${this.resource}/${userId}/${siteId}`);
  }
}
