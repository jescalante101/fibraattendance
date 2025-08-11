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
import { AuthService } from 'src/app/core/services/auth.service';

export interface SubMenuItem {
  label: string;
  link: string | null;
  permission?: string; // Para futura implementación de permisos
}

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  submenu: SubMenuItem[];
  permission?: string; // Para futura implementación de permisos
}

export interface MenuSection {
  key: string;
  label: string;
  items: MenuItem[];
  permission?: string; // Para futura implementación de permisos
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

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Inicializar Flowbite para componentes como popovers y collapses
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        initFlowbite();
        //; Forzar reinicialización de popovers después de un tiempo
        setTimeout(() => {
          initFlowbite();
        }, 500)
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

  // 📋 CONFIGURACIÓN COMPLETA DEL MENÚ
  // Todo el menú ahora se maneja desde TypeScript para facilitar el manejo de permisos
  
  menuSections: MenuSection[] = [
    // 👥 SECCIÓN PERSONAL
    {
      key: 'personal',
      label: 'Personal',
      items: [
        {
          key: 'organizacion',
          label: 'Definiciones',
          icon: 'building',
          permission: 'personal.organizacion.view',
          submenu: [
            { label: 'Usuario', link: '/panel/personal/organizacion/app-user', permission: 'personal.usuarios.view' },
            { label: 'Usuario-Sede', link: '/panel/personal/organizacion/usuario-sede', permission: 'personal.usuario_sede.view' },
            { label: 'Sede-Área-Centro de Costo', link: '/panel/personal/organizacion/sede-area-costo', permission: 'personal.sede_area_costo.view' },
            { label: 'Sede-Centro de Costo', link: '/panel/personal/organizacion/sede-ccosto', permission: 'personal.sede_ccosto.view' },
            { label: 'Feriados', link: '/panel/personal/organizacion/holidays', permission: 'personal.holidays.view' }
          ]
        },
        {
          key: 'empleado',
          label: 'Empleados',
          icon: 'id-card',
          permission: 'personal.empleado.view',
          submenu: [
            { label: 'Empleados', link: '/panel/personal/empleado/empleado', permission: 'personal.empleado.list' },
            { label: 'Empleados con Turnos', link: '/panel/personal/empleado/asignar-horario', permission: 'personal.empleado.horarios' }
          ]
        }
      ]
    },
    
    // ⏰ SECCIÓN ASISTENCIA  
    {
      key: 'asistencia',
      label: 'Asistencia',
      items: [
        {
          key: 'horarioturno',
          label: 'Horario-Turno',
          icon: 'clock',
          permission: 'asistencia.horarios.view',
          submenu: [
            { label: 'Descanso', link: '/panel/asistencia/descansos', permission: 'asistencia.descansos.view' },
            { label: 'Horario', link: '/panel/asistencia/horarios', permission: 'asistencia.horarios.manage' },
            { label: 'Turno', link: '/panel/asistencia/turno', permission: 'asistencia.turnos.manage' }
          ]
        },
        {
          key: 'aprobaciones',
          label: 'Aprobaciones',
          icon: 'check-square',
          permission: 'asistencia.aprobaciones.view',
          submenu: [
            { label: 'Marcaciones Manuales', link: '/panel/asistencia/aprobaciones/marcacion-manual', permission: 'asistencia.marcaciones_manuales.approve' }
          ]
        },
        {
          key: 'marcaciones',
          label: 'Marcaciones',
          icon: 'file-text',
          permission: 'asistencia.marcaciones.view',
          submenu: [
            { label: 'Análisis de Marcaciones', link: '/panel/asistencia/marcaciones/analisis', permission: 'asistencia.marcaciones.analyze' }
          ]
        },
        {
          key: 'reportes',
          label: 'Reportes',
          icon: 'file-spreadsheet',
          permission: 'asistencia.reportes.view',
          submenu: [
            { label: 'Reporte Marcaciones', link: '/panel/asistencia/marcaciones/reporte-asistencia-excel', permission: 'asistencia.reportes.marcaciones' },
            { label: 'Reporte Marcación Mensual', link: '/panel/asistencia/marcaciones/reportes-excel/asistencia-mensual', permission: 'asistencia.reportes.mensual' },
            { label: 'Reporte Centro Costo', link: '/panel/asistencia/marcaciones/reportes-excel/centro-costos', permission: 'asistencia.reportes.centro_costos' },
            { label: 'Reporte Marcación Detalle', link: '/panel/asistencia/marcaciones/reportes-excel/marcaciones-detalle', permission: 'asistencia.reportes.detalle' },
            { label: 'Reporte Asistencia', link: '/panel/asistencia/marcaciones/reportes-excel/matrix', permission: 'asistencia.reportes.matrix' }
          ]
        }
      ]
    }
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
    
    // Buscar en todas las secciones del menú
    for (const section of this.menuSections) {
      const menuItem = section.items.find(item => item.key === menuKey);
      if (menuItem) {
        return menuItem.submenu.some(sub => 
          sub.link && currentUrl.includes(sub.link)
        );
      }
    }
    
    return false;
  }

  /**
   * Obtiene la sección del menú por clave
   * @param sectionKey - Clave de la sección
   * @returns MenuSection o undefined
   */
  getMenuSection(sectionKey: string): MenuSection | undefined {
    return this.menuSections.find(section => section.key === sectionKey);
  }

  /**
   * Obtiene un item del menú por clave de sección y clave de item
   * @param sectionKey - Clave de la sección
   * @param itemKey - Clave del item
   * @returns MenuItem o undefined
   */
  getMenuItem(sectionKey: string, itemKey: string): MenuItem | undefined {
    const section = this.getMenuSection(sectionKey);
    return section?.items.find(item => item.key === itemKey);
  }

  /**
   * Verifica si el usuario tiene permisos para ver un elemento del menú
   * @param permission - Permiso a verificar
   * @returns true si tiene permiso
   */
  hasPermission(permission?: string): boolean {
    if (!permission) return true;
    
    // Integrar con AuthService.hasPermission()
    return this.authService.hasPermission(permission);
  }

  /**
   * Obtiene los items de menú filtrados por permisos
   * @param sectionKey - Clave de la sección
   * @returns Array de MenuItem filtrados
   */
  getFilteredMenuItems(sectionKey: string): MenuItem[] {
    const section = this.getMenuSection(sectionKey);
    if (!section) return [];
    
    return section.items.filter(item => {
      // Verificar si el item tiene permiso
      if (!this.hasPermission(item.permission)) return false;
      
      // Verificar si al menos un subitem tiene permiso
      const hasVisibleSubitems = item.submenu.some(sub => this.hasPermission(sub.permission));
      return hasVisibleSubitems;
    });
  }

  /**
   * Obtiene los submenu items filtrados por permisos
   * @param menuItem - Item del menú
   * @returns Array de SubMenuItem filtrados
   */
  getFilteredSubMenuItems(menuItem: MenuItem): SubMenuItem[] {
    return menuItem.submenu.filter(sub => this.hasPermission(sub.permission));
  }

  /**
   * Verifica si una sección completa debe mostrarse (tiene al menos un item visible)
   * @param sectionKey - Clave de la sección
   * @returns true si la sección debe mostrarse
   */
  shouldShowSection(sectionKey: string): boolean {
    const section = this.getMenuSection(sectionKey);
    if (!section) return false;
    
    // Verificar si la sección tiene permiso
    if (!this.hasPermission(section.permission)) return false;
    
    // Verificar si hay al menos un item visible en la sección
    return this.getFilteredMenuItems(sectionKey).length > 0;
  }

  /**
   * Obtiene el total de permisos del usuario
   */
  get totalUserPermissions(): number {
    return this.authService.getPermissions().length;
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

  /**
   * TrackBy function for menu sections to improve *ngFor performance
   * @param index - Índice del elemento
   * @param section - Sección del menú
   * @returns Identificador único para el trackBy
   */
  trackBySection = (index: number, section: MenuSection): string => {
    return section.key;
  }

  /**
   * TrackBy function for menu items to improve *ngFor performance
   * @param index - Índice del elemento
   * @param item - Item del menú
   * @returns Identificador único para el trackBy
   */
  trackByMenuItem = (index: number, item: MenuItem): string => {
    return item.key;
  }

  /**
   * TrackBy function for submenu items to improve *ngFor performance
   * @param index - Índice del elemento
   * @param sub - Sub-item del menú
   * @returns Identificador único para el trackBy
   */
  trackBySubMenuItem = (index: number, sub: SubMenuItem): string => {
    return sub.link || sub.label;
  }
}