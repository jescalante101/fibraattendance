import { Component, Inject, ViewEncapsulation} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-modal-alerta',
  templateUrl: './modal-alerta.component.html',
  styleUrls: ['./modal-alerta.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ModalAlertaComponent {
  constructor(
    private dialogRef: MatDialogRef<ModalAlertaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mensaje?: string; field?: string }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
