import { Component, OnInit } from '@angular/core';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'admin';
  sidebarCollapsed = false;
  // Ya no necesitamos activeItem

  ngOnInit(): void {
    // Inicializar Flowbite cuando la aplicación carga
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        initFlowbite();
      }, 100);
    }
  }

  onSidebarToggled(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  // Ya no necesitamos manejar selección de sección
}
