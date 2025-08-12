import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Permission {
  permissionId: number;
  permissionKey: string;
  permissionName: string;
  description: string;
}

export interface UserPermission {
  permissionId: number;
  permissionKey: string;
  permissionName: string;
  description: string;
}

export interface AssignPermissionRequest {
  userId: number;
  permissionIds: number[];
}

export interface RemovePermissionRequest {
  userId: number;
  permissionIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {

  private apiUrl = environment.apiUrlPro;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los permisos disponibles en el sistema
   */
  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}api/permission`);
  }

  /**
   * Obtiene los permisos asignados a un usuario específico
   */
  getUserPermissions(userId: number): Observable<UserPermission[]> {
    return this.http.get<UserPermission[]>(`${this.apiUrl}api/users/${userId}/permissions`);
  }

  /**
   * Asigna un permiso específico a un usuario
   */
  assignPermission(userId: number, permissionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}api/users/${userId}/permissions/${permissionId}`, {});
  }

  /**
   * Quita un permiso específico de un usuario
   */
  removePermission(userId: number, permissionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}api/users/${userId}/permissions/${permissionId}`);
  }

  /**
   * Actualiza los permisos de un usuario (maneja diferencias para agregar/quitar)
   */
  updateUserPermissions(userId: number, permissionIds: number[]): Observable<any> {
    return new Observable(observer => {
      // Primero obtenemos los permisos actuales del usuario
      this.getUserPermissions(userId).subscribe({
        next: (currentPermissions) => {
          const currentPermissionIds = currentPermissions.map(p => p.permissionId);
          
          // Permisos a agregar (están en la nueva lista pero no en la actual)
          const toAdd = permissionIds.filter(id => !currentPermissionIds.includes(id));
          
          // Permisos a quitar (están en la actual pero no en la nueva lista)
          const toRemove = currentPermissionIds.filter(id => !permissionIds.includes(id));
          
          // Crear observables para agregar y quitar permisos
          const addObservables = toAdd.map(permissionId => 
            this.assignPermission(userId, permissionId)
          );
          
          const removeObservables = toRemove.map(permissionId => 
            this.removePermission(userId, permissionId)
          );
          
          // Ejecutar todas las operaciones
          const allOperations = [...addObservables, ...removeObservables];
          
          if (allOperations.length === 0) {
            // No hay cambios
            observer.next({ message: 'No changes needed' });
            observer.complete();
            return;
          }
          
          // Usar forkJoin para ejecutar todas las operaciones en paralelo
          import('rxjs').then(({ forkJoin }) => {
            forkJoin(allOperations).subscribe({
              next: (results) => {
                observer.next({ 
                  message: 'Permissions updated successfully',
                  added: toAdd.length,
                  removed: toRemove.length
                });
                observer.complete();
              },
              error: (error) => {
                observer.error(error);
              }
            });
          });
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Obtiene los permisos agrupados por módulo para mejor organización en la UI
   * Extrae el módulo del permissionKey (ej: "personal.organizacion.view" -> "Personal")
   */
  getPermissionsGroupedByModule(): Observable<{[key: string]: Permission[]}> {
    return new Observable(observer => {
      this.getAllPermissions().subscribe({
        next: (permissions) => {
          const groupedPermissions: {[key: string]: Permission[]} = {};
          
          permissions.forEach(permission => {
            // Extraer el módulo del permissionKey (primera parte antes del primer punto)
            const moduleName = this.extractModuleFromKey(permission.permissionKey);
            
            if (!groupedPermissions[moduleName]) {
              groupedPermissions[moduleName] = [];
            }
            groupedPermissions[moduleName].push(permission);
          });

          observer.next(groupedPermissions);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Extrae el nombre del módulo del permissionKey y lo capitaliza
   * Ej: "personal.organizacion.view" -> "Personal"
   */
  private extractModuleFromKey(permissionKey: string): string {
    const parts = permissionKey.split('.');
    if (parts.length > 0) {
      // Capitalizar la primera letra
      const moduleName = parts[0];
      return moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    }
    return 'General';
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   */
  userHasPermission(userId: number, permissionKey: string): Observable<boolean> {
    return new Observable(observer => {
      this.getUserPermissions(userId).subscribe({
        next: (userPermissions) => {
          const hasPermission = userPermissions.some(up => 
            up.permissionKey === permissionKey
          );
          observer.next(hasPermission);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }
}