import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get the auth token from the service
    const authToken = this.authService.getToken();
    
    // Clone the request and add the authorization header if token exists
    let authReq = request;
    
    if (authToken) {
      authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${authToken}`)
      });
    }

    // Add Content-Type for non-GET requests if not already set
    if (request.method !== 'GET' && !request.headers.has('Content-Type')) {
      authReq = authReq.clone({
        headers: authReq.headers.set('Content-Type', 'application/json')
      });
    }

    // Handle the request and catch 401 errors
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token expired or invalid - logout user
          console.warn('Token expired or invalid, redirecting to login');
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
}