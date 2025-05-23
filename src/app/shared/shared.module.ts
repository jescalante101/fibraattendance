import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalAlertaComponent } from '../shared/modal-alerta/modal-alerta.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ModalConfirmComponent } from './modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from './modal-loading/modal-loading.component';
import { MatCardModule } from '@angular/material/card';

@NgModule({
  declarations: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent,
    
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule
  ],
  exports: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent,
    MatCardModule
  ]
})
export class SharedModule { }
