import { Component } from '@angular/core';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    standalone: false,

})

export class SidebarComponent {
  // Guarda qué menú está abierto en cada nivel
  openMenus: { [level: number]: string | null } = {};

  toggleMenu(level: number, menuName: string): void {
    if (this.openMenus[level] === menuName) {
      this.openMenus[level] = null; // Cierra el menú si ya está abierto
    } else {
      this.openMenus[level] = menuName; // Abre el nuevo menú
    }

    // Cierra todos los submenús por debajo de este nivel
    Object.keys(this.openMenus).forEach((key) => {
      const keyNum = +key;
      if (keyNum > level) {
        this.openMenus[keyNum] = null;
      }
    });
  }

  isOpen(level: number, menuName: string): boolean {
    return this.openMenus[level] === menuName;
  }
}
