import { Component, EventEmitter, Output, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { initFlowbite } from 'flowbite';
import { MangerService } from '../../../core/services/manger.service';
import { CompaniResponse } from '../../../core/models/compania-reponse.model';
import { PlanillaResponse } from '../../../core/models/planilla-response.model';
import { PeriodoResponse } from '../../../core/models/periodo-response.model';
import { HeaderConfigService } from '../../../core/services/header-config.service';
import { takeUntil } from 'rxjs/operators';

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
  selectedEmpresa: CompaniResponse | null = null;
  selectedPlanilla: PlanillaResponse | null = null;
  selectedAno: string = '';
  selectedPeriodo: PeriodoResponse | null = null;

  // Listas de datos
  empresas: CompaniResponse[] = [];
  planillas: PlanillaResponse[] = [];
  anos: string[] = [];
  periodos: PeriodoResponse[] = [];

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

  constructor(
    private mangerService: MangerService,
    private headerConfigService: HeaderConfigService
  ) {}

  ngOnInit(): void {
    // Inicializar el componente
    this.initializeUserData();
    this.generateAnos();
    this.loadSavedConfig();
    this.loadEmpresas();
    
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
   * Genera la lista de años (6 años: actual + 2 anteriores + 3 siguientes)
   */
  private generateAnos(): void {
    const currentYear = new Date().getFullYear();
    this.anos = [];
    
    // Generar 6 años: 2 anteriores, actual, 3 siguientes
    for (let i = -5; i <= 0; i++) {
      this.anos.push((currentYear + i).toString());
    }
    this.anos.reverse();
    // Seleccionar el año actual por defecto (se sobrescribirá si hay configuración guardada)
    this.selectedAno = currentYear.toString();
  }

  /**
   * Carga la configuración guardada desde localStorage
   */
  private loadSavedConfig(): void {
    const savedConfig = this.headerConfigService.loadHeaderConfig();
    if (savedConfig) {
      // Cargar año guardado si existe
      if (savedConfig.selectedAno && this.anos.includes(savedConfig.selectedAno)) {
        this.selectedAno = savedConfig.selectedAno;
      }
      
      // Las otras configuraciones se cargarán después de que se carguen los datos desde el API
    }
  }

  /**
   * Carga la lista de empresas
   */
  private loadEmpresas(): void {
    this.mangerService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (empresas) => {
          this.empresas = empresas;
          
          // Intentar cargar empresa guardada
          const savedConfig = this.headerConfigService.loadHeaderConfig();
          let empresaToSelect: CompaniResponse | null = null;
          
          if (savedConfig && savedConfig.selectedEmpresa) {
            // Buscar la empresa guardada en la lista actual
            empresaToSelect = empresas.find(e => e.companiaId === savedConfig.selectedEmpresa!.companiaId) || null;
          }
          
          // Si no hay empresa guardada o no se encuentra, usar la por defecto
          if (!empresaToSelect) {
            empresaToSelect = empresas.find(e => e.companiaId === '01') || null;
          }
          
          if (empresaToSelect) {
            this.selectEmpresa(empresaToSelect, true); // true para indicar que es carga inicial
          }
        },
        error: (error) => {
          console.error('Error al cargar empresas:', error);
        }
      });
  }

  /**
   * Carga las planillas para una empresa
   */
  private loadPlanillas(companiaId: string, isInitialLoad: boolean = false): void {
    this.mangerService.getPlanillasByCompaniaId(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (planillas) => {
          this.planillas = planillas;
          
          let planillaToSelect: PlanillaResponse | null = null;
          
          if (isInitialLoad) {
            // Intentar cargar planilla guardada
            const savedConfig = this.headerConfigService.loadHeaderConfig();
            if (savedConfig && savedConfig.selectedPlanilla) {
              planillaToSelect = planillas.find(p => p.planillaId === savedConfig.selectedPlanilla!.planillaId) || null;
            }
          }
          
          // Si no hay planilla guardada o no se encuentra, usar la primera
          if (!planillaToSelect && planillas.length > 0) {
            planillaToSelect = planillas[0];
          }
          
          if (planillaToSelect) {
            this.selectedPlanilla = planillaToSelect;
            this.headerConfigService.saveSelectedPlanilla(planillaToSelect);
            // Cargar periodos para la planilla seleccionada
            this.loadPeriodos(isInitialLoad);
          }
        },
        error: (error) => {
          console.error('Error al cargar planillas:', error);
        }
      });
  }

  /**
   * Carga los periodos para empresa, planilla y año seleccionados
   */
  private loadPeriodos(isInitialLoad: boolean = false): void {
    if (!this.selectedEmpresa || !this.selectedPlanilla || !this.selectedAno) {
      return;
    }

    this.mangerService.getPeriodosByCompaniaPlanillaAno(
      this.selectedEmpresa.companiaId,
      this.selectedPlanilla.planillaId,
      this.selectedAno
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (periodos) => {
        this.periodos = periodos;
        
        let periodoToSelect: PeriodoResponse | null = null;
        
        if (isInitialLoad) {
          // Intentar cargar periodo guardado
          const savedConfig = this.headerConfigService.loadHeaderConfig();
          if (savedConfig && savedConfig.selectedPeriodo) {
            periodoToSelect = periodos.find(p => p.periodoId === savedConfig.selectedPeriodo!.periodoId) || null;
          }
        }
        
        // Si no hay periodo guardado o no se encuentra, buscar el periodo del mes actual
        if (!periodoToSelect && periodos.length > 0) {
          const currentMonth = new Date().getMonth();
          const selectedYear = parseInt(this.selectedAno);
          
          // Buscar periodo donde fechaIni coincida con el mes actual y el año seleccionado
          periodoToSelect = periodos.find(p => {
            // Convertir fechaIni a Date si viene como string
            const fechaIni = p.fechaIni instanceof Date ? p.fechaIni : new Date(p.fechaIni);
            return fechaIni.getMonth() === currentMonth && fechaIni.getFullYear() === selectedYear ;
          }) || periodos[0];
          
          // Si no encuentra coincidencia, usar el primer periodo
          if (!periodoToSelect) {
            periodoToSelect = periodos[0];
          }
          
          console.log('Buscando periodo:', { currentMonth, selectedYear, encontrado: periodoToSelect?.periodoId });
        }
        
        if (periodoToSelect) {
          this.selectedPeriodo = periodoToSelect;
          this.headerConfigService.saveSelectedPeriodo(periodoToSelect);
        }
      },
      error: (error) => {
        console.error('Error al cargar periodos:', error);
      }
    });
  }

  /**
   * Selecciona una empresa
   */
  selectEmpresa(empresa: CompaniResponse, isInitialLoad: boolean = false): void {
    this.selectedEmpresa = empresa;
    this.selectedPlanilla = null;
    this.selectedPeriodo = null;
    this.planillas = [];
    this.periodos = [];
    
    // Guardar empresa seleccionada
    this.headerConfigService.saveSelectedEmpresa(empresa);
    
    // Cargar planillas para la empresa seleccionada
    this.loadPlanillas(empresa.companiaId, isInitialLoad);
    
    // Reinicializar Flowbite después del cambio
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        initFlowbite();
      }
    }, 100);
  }

  /**
   * Selecciona una planilla
   */
  selectPlanilla(planilla: PlanillaResponse): void {
    this.selectedPlanilla = planilla;
    this.selectedPeriodo = null;
    this.periodos = [];
    
    // Guardar planilla seleccionada
    this.headerConfigService.saveSelectedPlanilla(planilla);
    
    // Cargar periodos para la planilla seleccionada
    this.loadPeriodos();
    
    // Reinicializar Flowbite después del cambio
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        initFlowbite();
      }
    }, 100);
  }

  /**
   * Selecciona un año
   */
  selectAno(ano: string): void {
    this.selectedAno = ano;
    this.selectedPeriodo = null;
    this.periodos = [];
    
    // Guardar año seleccionado
    this.headerConfigService.saveSelectedAno(ano);
    
    // Cargar periodos para el año seleccionado
    this.loadPeriodos();
    
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
  selectPeriodo(periodo: PeriodoResponse): void {
    this.selectedPeriodo = periodo;
    
    // Guardar periodo seleccionado
    this.headerConfigService.saveSelectedPeriodo(periodo);
    
    // Reinicializar Flowbite después del cambio
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        initFlowbite();
      }
    }, 100);
  }
}