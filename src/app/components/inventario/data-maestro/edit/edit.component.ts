import { Component,ChangeDetectorRef  } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Router} from '@angular/router'

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})
export class EditComponent {
  loading2 = false;

  articulo: string = 'Artículo de prueba';
  articulo2: string =  '';
  n_extranjero : string = '';
  public value = '';
  articleGroups = ['Grupo Artículo 1', 'Grupo Artículo 2'];
  selectedGroup: string | null = null;

  articleGroups2 = ['Trabajo', 'Viajes'];
  selectedGroup2: string | null = null;

  articleGroups3 = ['Si', 'No'];
  selectedGroup3: string | null = null;

  articleGroups4 = ['Si', 'No'];
  selectedGroup4: string | null = null;
  articleGroups5 = ['Si', 'No'];
  selectedGroup5 : string | null = null;

  articleGroups6 = ['-Ningun Fabricante-'];
  selectedGroup6 : string | null = null;



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


  onGrupoArticulo(): void {
    const url = `${window.location.origin}/panel/inventario/data-maestra/grupo-articulo`;
    window.open(url, '_blank');
  }
  


  






  selectedLabel = '';

setAction(action: 'ver'|'nuevo'|'volver') {
  const mapping = { ver: 'Agregar y ver', nuevo: 'Agregar y nuevo', volver: 'Agregar y volver' };
  this.selectedLabel = mapping[action];
  // aquí tu lógica
}
}
