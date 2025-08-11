import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  permissions: string[];
  loginTime: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  permissions: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly AUTH_TOKEN_KEY = 'fibra_auth_token';
  private readonly USER_DATA_KEY = 'fibra_user_data';

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    permissions: []
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    // Initialize auth state from localStorage on service creation
    this.initializeAuthState();
  }

  /**
   * URL base de la API desde environment
   */
  private get apiUrl(): string {
    return environment.apiUrlPro || 'http://192.168.10.67:8090';
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    const token = localStorage.getItem(this.AUTH_TOKEN_KEY);
    const userData = localStorage.getItem(this.USER_DATA_KEY);

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.authStateSubject.next({
          isAuthenticated: true,
          user,
          token,
          permissions: user.permissions || []
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.clearAuthData();
      }
    }
  }

  /**
   * Perform login with backend API
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${this.apiUrl}api/AppUser/login`;

    return this.http.post<LoginResponse>(url, credentials).pipe(
      tap((response: LoginResponse) => {
        // Decode JWT to extract user info
        const decodedToken = this.decodeJWT(response.token);

        const user: User = {
          id: parseInt(decodedToken.nameid || '0'),
          username: decodedToken.unique_name || '',
          email: decodedToken.email || '',
          name: decodedToken.unique_name || '', // Can be improved with actual name from JWT
          permissions: response.permissions,
          loginTime: new Date().toISOString()
        };

        // Store authentication data
        this.setAuthData(response.token, user);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Set authentication data after successful login
   */
  setAuthData(token: string, user: User): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(user));

    this.authStateSubject.next({
      isAuthenticated: true,
      user,
      token,
      permissions: user.permissions
    });
  }

  /**
   * Clear all authentication data and redirect to login
   */
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  /**
   * Clear authentication data from storage and state
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);

    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      token: null,
      permissions: []
    });
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Get current auth token
   */
  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const permissions = this.authStateSubject.value.permissions;
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.authStateSubject.value.permissions;
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Get all user permissions
   */
  getPermissions(): string[] {
    return this.authStateSubject.value.permissions;
  }

  /**
   * Get authentication headers for HTTP requests
   */
  getAuthHeaders(): { [key: string]: string } {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Refresh token (placeholder for actual implementation)
   */
  refreshToken(): Observable<boolean> {
    // TODO: Implement actual token refresh logic
    return new BehaviorSubject(true).asObservable();
  }

  /**
   * Validate if current session is still valid
   */
  validateSession(): boolean {
    const user = this.getCurrentUser();
    const token = this.getToken();

    if (!user || !token) {
      return false;
    }

    // Check if token is expired
    try {
      const decodedToken = this.decodeJWT(token);
      const currentTime = Math.floor(Date.now() / 1000);

      if (decodedToken.exp && decodedToken.exp < currentTime) {
        console.warn('Token expired');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  /**
   * Decode JWT token to extract payload
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Error de conexión';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Credenciales incorrectas';
          break;
        case 403:
          errorMessage = 'No tienes permisos para acceder';
          break;
        case 404:
          errorMessage = 'Servicio no encontrado';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = `Error del servidor: ${error.status}`;
          break;
      }
    }

    console.error('Auth error:', error);
    return throwError(() => new Error(errorMessage));
  };
}