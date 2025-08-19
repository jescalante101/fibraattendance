import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { Observable } from "rxjs";
import { UpdateAppUser, CreateAppUser } from "../models/app-user.model";

// Interfaces para tipar la respuesta
export interface Area {
  areaId: string;
  areaName: string;
}

export interface CostCenter {
  costCenterId: string;
  costCenterName: string;
}

export interface SedeArea {
  siteId: string;
  siteName: string;
  areas: Area[];
  costCenters: CostCenter[];
}

// User
export interface User {
  userId: number;
  userName: string;
  email: string;
  firstName: string;
  password: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppUserService {
  private apiUrl = `${environment.apiUrlPro}`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene las sedes y áreas asociadas a un usuario
   * @param userId - ID del usuario
   * @returns Observable con la lista de sedes y sus áreas
   */
  getSedesAreas(userId: number): Observable<SedeArea[]> {
    return this.http.get<SedeArea[]>(`${this.apiUrl}api/AppUser/${userId}/sedes-areas`);
  }
  // getUserById
  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}api/AppUser/${userId}`);
  }

  /**
   * Obtiene todos los usuarios
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}api/AppUser`);
  }

  /**
   * Agrega un nuevo usuario
   */
  addUser(user: CreateAppUser): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}api/AppUser`, user);
  }

  /**
   * Actualiza un usuario existente
   */
  updateUser(user: UpdateAppUser, userId: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}api/AppUser/${userId}`, user);
  }

  /**
   * Elimina un usuario por ID
   */
  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}api/AppUser/${userId}`);
  }
}
