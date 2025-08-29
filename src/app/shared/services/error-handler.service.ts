import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from './toast.service';

export interface ErrorInfo {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  shouldLog: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  constructor(private toastService: ToastService) {}

  /**
   * Maneja y muestra errores HTTP de forma centralizada
   * @param error - Error HTTP recibido
   * @param context - Contexto opcional para logging (ej: 'CrearDiaCompensatorio')
   * @param customMessages - Mensajes personalizados por código de error
   */
  handleHttpError(
    error: any, 
    context?: string,
    customMessages?: { [key: number]: string }
  ): void {
    const errorInfo = this.parseHttpError(error, customMessages);
    
    // Log para debugging si es necesario
    if (errorInfo.shouldLog) {
      console.error(`🚨 [${context || 'HTTP_ERROR'}]`, {
        status: error.status,
        url: error.url,
        message: errorInfo.message,
        fullError: error
      });
    }
    
    // Mostrar toast al usuario
    this.showErrorToast(errorInfo);
  }

  /**
   * Maneja errores generales (no HTTP)
   * @param error - Error genérico
   * @param context - Contexto para logging
   * @param userMessage - Mensaje personalizado para el usuario
   */
  handleGenericError(
    error: any, 
    context?: string, 
    userMessage?: string
  ): void {
    console.error(`🚨 [${context || 'GENERIC_ERROR'}]`, error);
    
    const message = userMessage || 'Ha ocurrido un error inesperado';
    this.toastService.error('Error', message);
  }

  /**
   * Parsea el error HTTP y extrae información relevante
   */
  private parseHttpError(error: any, customMessages?: { [key: number]: string }): ErrorInfo {
    const status = error.status || 0;
    
    // Si hay un mensaje personalizado para este código de error
    if (customMessages && customMessages[status]) {
      return {
        title: this.getErrorTitle(status),
        message: customMessages[status],
        type: 'error',
        shouldLog: status >= 500
      };
    }

    // Extraer mensaje del servidor
    let serverMessage = this.extractServerMessage(error);
    
    switch (status) {
      case 400:
        return {
          title: 'Datos Inválidos',
          message: serverMessage || 'Los datos enviados no son válidos',
          type: 'error',
          shouldLog: false
        };

      case 401:
        return {
          title: 'No Autorizado',
          message: serverMessage || 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',
          type: 'warning',
          shouldLog: false
        };

      case 403:
        return {
          title: 'Acceso Denegado',
          message: serverMessage || 'No tienes permisos para realizar esta acción',
          type: 'warning',
          shouldLog: false
        };

      case 404:
        return {
          title: 'No Encontrado',
          message: serverMessage || 'El recurso solicitado no fue encontrado',
          type: 'warning',
          shouldLog: false
        };

      case 409:
        return {
          title: 'Conflicto',
          message: serverMessage || 'Ya existe un registro similar',
          type: 'warning',
          shouldLog: false
        };

      case 422:
        return {
          title: 'Error de Validación',
          message: serverMessage || 'Los datos no cumplen con las validaciones requeridas',
          type: 'error',
          shouldLog: false
        };

      case 429:
        return {
          title: 'Demasiadas Solicitudes',
          message: 'Has realizado demasiadas solicitudes. Intenta más tarde',
          type: 'warning',
          shouldLog: false
        };

      case 500:
      case 502:
      case 503:
        return {
          title: 'Error del Servidor',
          message: 'Error interno del servidor. Por favor intenta más tarde',
          type: 'error',
          shouldLog: true
        };

      case 0:
        return {
          title: 'Error de Conexión',
          message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet',
          type: 'error',
          shouldLog: true
        };

      default:
        return {
          title: 'Error',
          message: serverMessage || 'Ha ocurrido un error inesperado',
          type: 'error',
          shouldLog: true
        };
    }
  }

  /**
   * Extrae el mensaje del servidor desde diferentes estructuras posibles
   */
  private extractServerMessage(error: any): string | null {
    // Orden de prioridad para extraer el mensaje
    if (error.error) {
      // Caso 1: error.error es string directo (tu caso)
      if (typeof error.error === 'string') {
        return error.error;
      }
      
      // Caso 2: error.error es objeto con mensaje
      if (typeof error.error === 'object') {
        if (error.error.message) {
          return error.error.message;
        }
        if (error.error.detail) {
          return error.error.detail;
        }
        if (error.error.title) {
          return error.error.title;
        }
      }
    }
    
    // Caso 3: mensaje en el nivel superior
    if (error.message && !error.message.startsWith('Http failure response')) {
      return error.message;
    }
    
    return null;
  }

  /**
   * Genera título apropiado basado en el código de estado
   */
  private getErrorTitle(status: number): string {
    const titles: { [key: number]: string } = {
      400: 'Datos Inválidos',
      401: 'No Autorizado', 
      403: 'Acceso Denegado',
      404: 'No Encontrado',
      409: 'Conflicto',
      422: 'Error de Validación',
      429: 'Demasiadas Solicitudes',
      500: 'Error del Servidor',
      502: 'Error del Servidor',
      503: 'Servicio No Disponible'
    };
    
    return titles[status] || 'Error';
  }

  /**
   * Muestra el toast apropiado según el tipo de error
   */
  private showErrorToast(errorInfo: ErrorInfo): void {
    switch (errorInfo.type) {
      case 'error':
        this.toastService.error(errorInfo.title, errorInfo.message);
        break;
      case 'warning':
        this.toastService.warning(errorInfo.title, errorInfo.message);
        break;
      case 'info':
        this.toastService.info(errorInfo.title, errorInfo.message);
        break;
    }
  }

  /**
   * Métodos de conveniencia para casos comunes
   */

  handleSaveError(error: any, entityName: string = 'registro'): void {
    this.handleHttpError(error, `Save${entityName}`, {
      400: `Error al guardar el ${entityName}. Verifica los datos ingresados`,
      409: `Ya existe un ${entityName} similar`
    });
  }

  handleDeleteError(error: any, entityName: string = 'registro'): void {
    this.handleHttpError(error, `Delete${entityName}`, {
      400: `No se puede eliminar el ${entityName}`,
      409: `El ${entityName} está siendo usado por otros registros`
    });
  }

  handleLoadError(error: any, entityName: string = 'datos'): void {
    this.handleHttpError(error, `Load${entityName}`, {
      404: `No se encontraron ${entityName}`
    });
  }
}