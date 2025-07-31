import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy
} from '@angular/core';
import { initFlowbite } from 'flowbite';
import { Router } from '@angular/router';

export interface SubMenuItem {
  label: string;
  link: string | null;
}

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  submenu: SubMenuItem[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Input() isCollapsed: boolean = false;
  // Ya no necesitamos activeItem porque mostramos todas las secciones

  openMenus: { [level: number]: string | null } = {};
  activePopovers: { [key: string]: boolean } = {};

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Inicializar Flowbite para componentes como popovers y collapses
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        initFlowbite();
        // Forzar reinicialización de popovers después de un tiempo
        setTimeout(() => {
          initFlowbite();
        }, 500);
      }, 100);
    }
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
    
    // Cerrar todos los menús abiertos cuando se colapsa
    if (this.isCollapsed) {
      this.openMenus = {};
    }
    
    // Reinicializar Flowbite después del cambio de estado
    this.reinitializeFlowbite();
  }

  // Ya no necesitamos dispositivoMenu - solo Personal y Asistencia según HEADER.MD

  // Menú de Asistencia según especificación HEADER.MD
  asistenciaMenu: MenuItem[] = [
    {
      key: 'horarioturno',
      label: 'Horario-Turno',
      icon: 'clock',
      submenu: [
        { label: 'Descanso', link: '/panel/asistencia/descansos' },
        { label: 'Horario', link: '/panel/asistencia/horarios' },
        { label: 'Turno', link: '/panel/asistencia/turno' },
      ],
    },
    {
      key: 'aprobaciones',
      label: 'Aprobaciones',
      icon: 'check-square',
      submenu: [
        { label: 'Marcaciones Manuales', link: '/panel/asistencia/aprobaciones/marcacion-manual' },
      ],
    },
    {
      key: 'marcaciones',
      label: 'Marcaciones',
      icon: 'file-text',
      submenu: [
        { label: 'Análisis de Marcaciones', link: '/panel/asistencia/marcaciones/analisis' },
        { label: 'Reporte Marcaciones', link: '/panel/asistencia/marcaciones/reporte-asistencia-excel' },
        { label: 'Reporte Marcación Mensual', link: 'panel/asistencia/marcaciones/reportes-excel/asistencia-mensual' },
        { label: 'Reporte Ccosto', link: 'panel/asistencia/marcaciones/reportes-excel/centro-costos' },
        { label: 'Reporte Detalle', link: 'panel/asistencia/marcaciones/reportes-excel/marcaciones-detalle' },
      ],
    },
  ];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  toggleMenu(level: number, menuName: string): void {
    // Solo permitir toggle si no está colapsado
    if (!this.isCollapsed) {
      this.openMenus[level] = this.openMenus[level] === menuName ? null : menuName;
      Object.keys(this.openMenus).forEach((key) => {
        const k = +key;
        if (k > level) this.openMenus[k] = null;
      });
    }
  }

  isOpen(level: number, menuName: string): boolean {
    return this.openMenus[level] === menuName;
  }

  /**
   * Verifica si un menú está activo basado en la ruta actual
   * @param menuKey - Clave del menú a verificar
   * @returns true si el menú está activo
   */
  isMenuActive(menuKey: string): boolean {
    const currentUrl = this.router.url;
    
    // Para la sección personal
    switch (menuKey) {
      case 'organizacion':
        return currentUrl.includes('/panel/personal/organizacion');
      case 'empleado':
        return currentUrl.includes('/panel/personal/empleado');
      default:
        break;
    }
    
    // Para la sección asistencia
    const menuItem = this.asistenciaMenu.find(item => item.key === menuKey);
    if (menuItem) {
      return menuItem.submenu.some(sub => 
        sub.link && currentUrl.includes(sub.link)
      );
    }
    
    return false;
  }

  /**
   * Reinicializa Flowbite después de cambios en el DOM
   */
  private reinitializeFlowbite(): void {
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        initFlowbite();
      }
    }, 300);
  }

  /**
   * Muestra un popover manualmente
   */
  showPopover(key: string): void {
    if (this.isCollapsed) {
      const popoverElement = document.getElementById(key + '-popover');
      if (popoverElement) {
        popoverElement.classList.remove('invisible', 'opacity-0');
        popoverElement.classList.add('visible', 'opacity-100');
        this.activePopovers[key] = true;
      }
    }
  }

  /**
   * Oculta un popover manualmente
   */
  hidePopover(key: string): void {
    const popoverElement = document.getElementById(key + '-popover');
    if (popoverElement) {
      popoverElement.classList.remove('visible', 'opacity-100');
      popoverElement.classList.add('invisible', 'opacity-0');
      this.activePopovers[key] = false;
    }
  }

  /**
   * Verifica si una ruta específica está activa
   * @param route - Ruta a verificar
   * @returns true si la ruta está activa
   */
  isRouteActive(route: string): boolean {
    // Remover la barra inicial si existe para comparación consistente
    const normalizedRoute = route.startsWith('/') ? route.substring(1) : route;
    const currentUrl = this.router.url.startsWith('/') ? this.router.url.substring(1) : this.router.url;
    
    // Verificar si la URL actual coincide exactamente o contiene la ruta
    return currentUrl === normalizedRoute || currentUrl.includes(normalizedRoute);
  }
}