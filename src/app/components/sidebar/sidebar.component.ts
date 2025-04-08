import { Component } from '@angular/core';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    standalone: false,

})

export class SidebarComponent {
  openMenu: string | null = null;  // Para los menús principales
  subMenu1: string | null = null;  // Para el primer submenú
  subMenu2: string | null = null;  // Para el segundo submenú
  subMenu3: string | null = null;  // Para el tercer submenú
  subMenu4: string | null = null;  // Para el cuarto submenú
  subMenu5: string | null = null;  // Para el quinto submenú
  subMenu6: string | null = null;  // Para el sexto submenú

  toggleMenu(menu: string): void {
    // Si el menú principal ya está abierto, lo cierra, si no, lo abre
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  toggleSubMenu(subMenu: string): void {
    // Cierra todos los submenús antes de abrir el seleccionado
    if (subMenu === 'subMenu1') {
      this.subMenu1 = this.subMenu1 === 'subMenu1' ? null : 'subMenu1';
      this.subMenu2 = null; this.subMenu3 = null; this.subMenu4 = null; this.subMenu5 = null; this.subMenu6 = null;
    }
    if (subMenu === 'subMenu2') {
      this.subMenu2 = this.subMenu2 === 'subMenu2' ? null : 'subMenu2';
      this.subMenu1 = null; this.subMenu3 = null; this.subMenu4 = null; this.subMenu5 = null; this.subMenu6 = null;
    }
    if (subMenu === 'subMenu3') {
      this.subMenu3 = this.subMenu3 === 'subMenu3' ? null : 'subMenu3';
      this.subMenu1 = null; this.subMenu2 = null; this.subMenu4 = null; this.subMenu5 = null; this.subMenu6 = null;
    }
    if (subMenu === 'subMenu4') {
      this.subMenu4 = this.subMenu4 === 'subMenu4' ? null : 'subMenu4';
      this.subMenu1 = null; this.subMenu2 = null; this.subMenu3 = null; this.subMenu5 = null; this.subMenu6 = null;
    }
    if (subMenu === 'subMenu5') {
      this.subMenu5 = this.subMenu5 === 'subMenu5' ? null : 'subMenu5';
      this.subMenu1 = null; this.subMenu2 = null; this.subMenu3 = null; this.subMenu4 = null; this.subMenu6 = null;
    }
    if (subMenu === 'subMenu6') {
      this.subMenu6 = this.subMenu6 === 'subMenu6' ? null : 'subMenu6';
      this.subMenu1 = null; this.subMenu2 = null; this.subMenu3 = null; this.subMenu4 = null; this.subMenu5 = null;
    }
  }
}
