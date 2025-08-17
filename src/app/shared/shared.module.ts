import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LucideAngularModule } from 'lucide-angular';
import { FlatpickrModule } from 'angularx-flatpickr';

import { ModalAlertaComponent } from '../shared/modal-alerta/modal-alerta.component';
import { ModalConfirmComponent } from './modal-confirm/modal-confirm.component';
import { ModalLoadingComponent } from './modal-loading/modal-loading.component';
import { FioriPaginatorComponent } from './fiori-paginator/fiori-paginator.component';
import { GenericFilterComponent } from './generic-filter/generic-filter.component';
import { ColumnManagerComponent } from './column-manager/column-manager.component';
import { DateRangePickerComponent } from './components/date-range-picker/date-range-picker.component';

@NgModule({
  declarations: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent,
    FioriPaginatorComponent,
    GenericFilterComponent,
    ColumnManagerComponent,
    DateRangePickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatAutocompleteModule,
    LucideAngularModule,
    FlatpickrModule.forRoot()
  ],
  exports: [
    ModalAlertaComponent,
    ModalConfirmComponent,
    ModalLoadingComponent,
    MatCardModule,
    MatAutocompleteModule,
    FioriPaginatorComponent,
    GenericFilterComponent,
    ColumnManagerComponent,
    DateRangePickerComponent
  ]
})
export class SharedModule { }
