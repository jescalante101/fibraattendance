import { Component, Inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ModalConfirmData {
  tipo: 'success' | 'error' | 'info' | 'danger';
  titulo?: string;
  mensaje: string;
  confirmacion?: boolean; // true para mostrar botones aceptar/cancelar
  textoConfirmar?: string; // texto del botón de confirmación
}

@Component({
  selector: 'app-modal-confirm',
  templateUrl: './modal-confirm.component.html',
  styleUrls: ['./modal-confirm.component.css']
})
export class ModalConfirmComponent {
  constructor(
    public dialogRef: MatDialogRef<ModalConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalConfirmData
  ) {}

  getDefaultTitle(): string {
    switch (this.data.tipo) {
      case 'success': return '¡Éxito!';
      case 'error': return 'Error';
      case 'info': return 'Información';
      case 'danger': return 'Advertencia';
      default: return 'Mensaje';
    }
  }

  getButtonColor(): string {
    switch (this.data.tipo) {
      case 'danger': return 'warn';
      case 'error': return 'warn';
      case 'success': return 'primary';
      default: return 'primary';
    }
  }

  /**
   * Get Lucide Icon name based on modal type
   */
  getIconName(): string {
    switch (this.data.tipo) {
      case 'success': return 'check-circle';
      case 'error': return 'x-circle';
      case 'info': return 'info';
      case 'danger': return 'alert-triangle';
      default: return 'help-circle';
    }
  }


  /**
   * Get icon background class based on modal type
   */
  getIconBgClass(): string {
    switch (this.data.tipo) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      case 'danger': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  }

  /**
   * Get header class for styling
   */
  getHeaderClass(): string {
    // Return empty string for now, can add header-specific styling later
    return '';
  }

  /**
   * Get button class for styling based on type
   */
  getButtonClass(): string {
    switch (this.data.tipo) {
      case 'success': 
        return 'bg-green-500 hover:bg-green-600 focus:ring-green-500';
      case 'error': 
        return 'bg-red-500 hover:bg-red-600 focus:ring-red-500';
      case 'info': 
        return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';
      case 'danger': 
        return 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500';
      default: 
        return 'bg-fiori-primary hover:bg-fiori-secondary focus:ring-fiori-primary';
    }
  }
}
