import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalAlertaComponent } from '../shared/modal-alerta/modal-alerta.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ModalConfirmComponent } from './modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from './modal-loading/modal-loading.component';

@NgModule({
  declarations: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule
  ],
  exports: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent
  ]
})
export class SharedModule { }
