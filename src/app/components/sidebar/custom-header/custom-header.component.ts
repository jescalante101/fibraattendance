import { AfterViewInit, Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-custom-header',
  templateUrl: './custom-header.component.html',
  styleUrls: ['./custom-header.component.css']
})
export class CustomHeaderComponent implements AfterViewInit {

  @Output() collapsedChange = new EventEmitter<boolean>();
 @Output() sectionSelected = new EventEmitter<string>(); // 👈 Cambiar nombre aquí
// <--- Nuevo output

  activeItem: string | null = 'personal';
  isCollapsed = false;
  showUserMenu = false;

  ngAfterViewInit(): void {
    // Puedes eliminar esta línea si no usas lógica aquí
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  selectItem(itemName: string) {
  this.activeItem = itemName;
  this.sectionSelected.emit(itemName); // 👈 Emitir con nombre correcto
}
}
