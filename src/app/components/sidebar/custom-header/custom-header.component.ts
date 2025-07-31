import { Component, EventEmitter, Output, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { initFlowbite } from 'flowbite';

interface NavigationItem {
  key: string;
  label: string;
  route: string;
  icon: string;
}

interface UserMenuOption {
  action: string;
  label: string;
  icon: string;
  separator?: boolean;
}

@Component({
  selector: 'app-custom-header',
  templateUrl: './custom-header.component.html',
  styleUrls: ['./custom-header.component.css']
})
export class CustomHeaderComponent implements OnInit, OnDestroy {
  
  @Output() collapsedChange = new EventEmitter<boolean>();
  // Ya no necesitamos sectionSelected
  @Output() userMenuAction = new EventEmitter<string>();

  // Estados del componente
  isCollapsed: boolean = false;
  showUserMenu: boolean = false;

  // Estados para los dropdowns
  selectedEmpresa: string = '';
  selectedSede: string = '';
  selectedPeriodo: string = '';

  // Datos del usuario (estos deberían venir de un servicio)
  userName: string = 'Manager';
  userRole: string = 'Administrador';
  userInitial: string = 'M';

  // Ya no necesitamos navigationItems

  // Opciones del menú de usuario
  userMenuOptions: UserMenuOption[] = [
    {
      action: 'recent-activities',
      label: 'Actividades recientes',
      icon: 'fa-solid fa-clock-rotate-left'
    },
    {
      action: 'frequently-used',
      label: 'Utilizado con frecuencia',
      icon: 'fa-solid fa-clipboard-check'
    },
    {
      action: 'search-apps',
      label: 'Buscar aplicaciones',
      icon: 'fa-solid fa-magnifying-glass'
    },
    {
      action: 'settings',
      label: 'Configuración',
      icon: 'fa-solid fa-gear',
      separator: true
    },
    {
      action: 'support',
      label: 'Comunicarse con soporte',
      icon: 'fa-solid fa-envelope'
    },
    {
      action: 'about',
      label: 'Acerca de',
      icon: 'fa-solid fa-circle-info'
    },
    {
      action: 'logout',
      label: 'Cerrar sesión',
      icon: 'fa-solid fa-power-off',
      separator: true
    }
  ];

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Inicializar el componente
    this.initializeUserData();
    
    // Inicializar Flowbite para dropdowns
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        initFlowbite();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Maneja el evento de clic fuera del menú de usuario
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const userMenuButton = target.closest('[aria-haspopup="true"]');
    const userMenuDropdown = target.closest('[role="menu"]');
    
    if (!userMenuButton && !userMenuDropdown && this.showUserMenu) {
      this.closeUserMenu();
    }
  }

  /**
   * Maneja el evento de tecla Escape para cerrar el menú
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showUserMenu) {
      this.closeUserMenu();
    }
  }

  /**
   * Inicializa los datos del usuario
   */
  private initializeUserData(): void {
    // Aquí deberías obtener los datos del usuario desde un servicio
    // Por ejemplo: this.userService.getCurrentUser().subscribe(user => { ... });
    this.userInitial = this.userName.charAt(0).toUpperCase();
  }

  /**
   * Alterna la visibilidad del menú de usuario
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Cierra el menú de usuario
   */
  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  /**
   * Alterna el estado del sidebar
   */
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  // Ya no necesitamos selectItem

  /**
   * Maneja las acciones del menú de usuario
   */
  handleUserMenuAction(action: string): void {
    this.closeUserMenu();
    
    switch (action) {
      case 'logout':
        this.handleLogout();
        break;
      case 'settings':
        this.handleSettings();
        break;
      case 'support':
        this.handleSupport();
        break;
      case 'about':
        this.handleAbout();
        break;
      default:
        // Emitir la acción para que el componente padre la maneje
        this.userMenuAction.emit(action);
        break;
    }
  }

  /**
   * Maneja el cierre de sesión
   */
  private handleLogout(): void {
    // Aquí implementarías la lógica de cierre de sesión
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      this.userMenuAction.emit('logout');
    }
  }

  /**
   * Maneja la configuración
   */
  private handleSettings(): void {
    this.userMenuAction.emit('settings');
  }

  /**
   * Maneja el soporte
   */
  private handleSupport(): void {
    this.userMenuAction.emit('support');
  }

  /**
   * Maneja la información "Acerca de"
   */
  private handleAbout(): void {
    this.userMenuAction.emit('about');
  }

  // Ya no necesitamos currentNavigationItem

  /**
   * Verifica si el sidebar está colapsado
   */
  get sidebarCollapsed(): boolean {
    return this.isCollapsed;
  }

  /**
   * Selecciona una empresa
   */
  selectEmpresa(empresa: string): void {
    this.selectedEmpresa = empresa;
    // Reinicializar Flowbite después del cambio
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        initFlowbite();
      }
    }, 100);
  }

  /**
   * Selecciona una sede
   */
  selectSede(sede: string): void {
    this.selectedSede = sede;
    // Reinicializar Flowbite después del cambio
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        initFlowbite();
      }
    }, 100);
  }

  /**
   * Selecciona un periodo
   */
  selectPeriodo(periodo: string): void {
    this.selectedPeriodo = periodo;
    // Reinicializar Flowbite después del cambio
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        initFlowbite();
      }
    }, 100);
  }
}