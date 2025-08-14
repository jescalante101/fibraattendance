import { Injectable } from '@angular/core';

export interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastCounter = 0;

  constructor() {
    // Asegurar que existe el contenedor de toasts
    this.ensureToastContainer();
  }

  /**
   * Mostrar un toast de éxito
   */
  success(title: string, message: string, duration: number = 5000): void {
    this.showToast('success', title, message, duration);
  }

  /**
   * Mostrar un toast de error
   */
  error(title: string, message: string, duration: number = 7000): void {
    this.showToast('error', title, message, duration);
  }

  /**
   * Mostrar un toast de advertencia
   */
  warning(title: string, message: string, duration: number = 6000): void {
    this.showToast('warning', title, message, duration);
  }

  /**
   * Mostrar un toast de información
   */
  info(title: string, message: string, duration: number = 5000): void {
    this.showToast('info', title, message, duration);
  }

  /**
   * Método principal para mostrar toasts
   */
  private showToast(type: ToastConfig['type'], title: string, message: string, duration: number = 5000): void {
    const toastId = `toast-${++this.toastCounter}`;
    const toast: ToastConfig = { id: toastId, type, title, message, duration };

    // Crear el elemento toast
    const toastElement = this.createToastElement(toast);
    const container = document.getElementById('toast-container');

    if (container) {
      container.appendChild(toastElement);

      // Mostrar con animación
      setTimeout(() => {
        toastElement.classList.add('translate-x-0');
        toastElement.classList.remove('translate-x-full');
      }, 100);

      // Auto-remove después del duration
      setTimeout(() => {
        this.removeToast(toastId);
      }, duration);
    }
  }

  /**
   * Crear el elemento HTML del toast
   */
  private createToastElement(toast: ToastConfig): HTMLElement {
    const toastDiv = document.createElement('div');
    toastDiv.id = toast.id;
    toastDiv.className = `flex items-center w-full max-w-xs p-4 mb-4 text-fiori-text bg-fiori-surface rounded-lg shadow-fioriHover transform translate-x-full transition-transform duration-300 ease-in-out border border-fiori-border`;

    // Configurar colores según el tipo
    const typeClasses = {
      success: 'text-fiori-success',
      error: 'text-fiori-error',
      warning: 'text-fiori-warning',
      info: 'text-fiori-info'
    };

    const iconSvgs = {
      success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
      error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
      warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>`,
      info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`
    };

    toastDiv.innerHTML = `
      <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 ${typeClasses[toast.type]} rounded-lg">
        ${iconSvgs[toast.type]}
      </div>
      <div class="ml-3 text-sm font-normal">
        <div class="font-semibold">${toast.title}</div>
        <div class="text-fiori-subtext">${toast.message}</div>
      </div>
      <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-fiori-subtext hover:text-fiori-text rounded-lg focus:ring-2 focus:ring-fiori-primary p-1.5 hover:bg-fiori-hover inline-flex h-8 w-8" onclick="document.getElementById('${toast.id}')?.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    return toastDiv;
  }

  /**
   * Remover un toast con animación
   */
  private removeToast(toastId: string): void {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }

  /**
   * Asegurar que existe el contenedor global de toasts
   */
  private ensureToastContainer(): void {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-5 right-5 z-50';
      document.body.appendChild(container);
    }
  }

  /**
   * Limpiar todos los toasts
   */
  clearAll(): void {
    const container = document.getElementById('toast-container');
    if (container) {
      container.innerHTML = '';
    }
  }
}