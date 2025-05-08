import { Component,ChangeDetectorRef  } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Router} from '@angular/router'
@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css']
})
export class IndexComponent {
  public value = '';
  loading = false;
  constructor(
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}
  public onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
  }

  public scrollToSection(event: MatTabChangeEvent): void {
    const sectionIds = [
      'generalSection',
      'generalSection',
      'comprasSection',
      'ventasSection',
      'inventarioSection',
      'planificacionSection',
      'produccionSection',
      'propiedadesSection',
      'comentariosSection',
      'anexosSection'
    ];
  
    const sectionId = sectionIds[event.index];
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }


  selectedOption = 'ver'; // Valor por defecto

  onSelectionChange(value: string) {
    switch (value) {
      case 'ver':
        // Lógica para "Agregar y ver"
        break;
      case 'nuevo':
        // Lógica para "Agregar y nuevo"
        break;
      case 'volver':
        // Lógica para "Agregar y volver"
        break;
    }
  }

  onCancel() {
    // tu lógica al pulsar “Cancelar”
    console.log('Cancelado');
    // por ejemplo, limpiar formulario, retroceder ruta, etc.
  }

  selectedLabel = '';

setAction(action: 'ver'|'nuevo'|'volver') {
  const mapping = { ver: 'Agregar y ver', nuevo: 'Agregar y nuevo', volver: 'Agregar y volver' };
  this.selectedLabel = mapping[action];
  // aquí tu lógica
}

onEdit(): void {
  this.loading = true;       // 1) activa el overlay
  this.cd.detectChanges();   // 2) fuerza que Angular pinte el spinner
  // 3) ahora navega, pero con un pequeño delay para que el spinner se vea
  setTimeout(() => {
    this.router.navigate(['/panel/inventario/data-maestra/edit']);
  }, 3000);

}
  
}
