import { Component,ViewEncapsulation } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-modal-loading',
  templateUrl: './modal-loading.component.html',
  styleUrls: ['./modal-loading.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class ModalLoadingComponent {
  constructor(public dialogRef: MatDialogRef<ModalLoadingComponent>) {}
}
