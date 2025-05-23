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
}
