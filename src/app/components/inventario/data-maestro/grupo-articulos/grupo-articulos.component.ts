import { Component,ChangeDetectorRef  } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Router} from '@angular/router'
@Component({
  selector: 'app-grupo-articulos',
  templateUrl: './grupo-articulos.component.html',
  styleUrls: ['./grupo-articulos.component.css']
})
export class GrupoArticulosComponent {
  loading2 = false;
  n_grupo_articulo : string = '';
  n_grupo_unidad : string = '';
  pedido_multiple : string = '';
  cantidad_pedido_minima :  string = '';
  tiempo_entrega : string = '';
  tolerancia_dias : string = '';
  articulo: string = 'Artículo de prueba';
  n_extranjero : string = '';
  public value = '';
  articleGroups = ['Grupo Artículo 1', 'Grupo Artículo 2'];
  selectedGroup: string | null = null;

  articleGroups2 = [''];
  selectedGroup2: string | null = null;

  articleGroups3 = ['Si', 'No'];
  selectedGroup3: string | null = null;

  articleGroups4 = ['Si', 'No'];
  selectedGroup4: string | null = null;
  articleGroups5 = ['Si', 'No'];
  selectedGroup5 : string | null = null;

  articleGroups6 = ['Estándar', 'FIFO'];
  selectedGroup6 : string | null = null;
  // para los radios
  metodoPlanificacion = 'NINGUNO';
  metodoAprovisionamiento = 'COMPRAR';
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
      'contabilidadSection',
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



  defineNewGroup() {
    // lógica para crear un nuevo grupo
    console.log('Definir nuevo grupo…');
  }

  onCancel():void {
    this.loading2 = true;       // 1) activa el overlay
    this.cd.detectChanges();   // 2) fuerza que Angular pinte el spinner
    setTimeout(() => {
      this.router.navigate(['/panel/inventario/data-maestra/index']);
    }, 3000);

  }


  






  selectedLabel = '';

setAction(action: 'ver'|'nuevo'|'volver') {
  const mapping = { ver: 'Agregar y ver', nuevo: 'Agregar y nuevo', volver: 'Agregar y volver' };
  this.selectedLabel = mapping[action];
  // aquí tu lógica
}

isCollapsed = false;
toggleSection() {
  this.isCollapsed = !this.isCollapsed;
  // aquí podrías ocultar/show la sección si quisieras…
}


}
