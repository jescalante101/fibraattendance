import { Component } from '@angular/core';
import {FormBuilder, FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-data-maestro',
  templateUrl: './data-maestro.component.html',
  styleUrls: ['./data-maestro.component.css'],
})
export class DataMaestroComponent {
  protected value = '';  // Utiliza una propiedad simple
  readonly hideRequiredControl = new FormControl(false);

  protected onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;  // Asigna el valor directamente
  }


  

}
