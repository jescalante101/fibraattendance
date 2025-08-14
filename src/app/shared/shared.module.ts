import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalAlertaComponent } from '../shared/modal-alerta/modal-alerta.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { ModalConfirmComponent } from './modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from './modal-loading/modal-loading.component';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FioriPaginatorComponent } from './fiori-paginator/fiori-paginator.component';
import { LucideAngularModule } from 'lucide-angular';
import { GenericFilterComponent } from './generic-filter/generic-filter.component';
import { ColumnManagerComponent } from './column-manager/column-manager.component';

@NgModule({
  declarations: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent,
    FioriPaginatorComponent,
    GenericFilterComponent,
    ColumnManagerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatAutocompleteModule,
    LucideAngularModule
  ],
  exports: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent,
    MatCardModule,
    MatAutocompleteModule,
    FioriPaginatorComponent,
    GenericFilterComponent,
    ColumnManagerComponent
  ]
})
export class SharedModule { }
