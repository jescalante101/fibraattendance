import {
  Component,
  Output,
  EventEmitter,
  Input,
} from '@angular/core';

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
export class SidebarComponent {
  @Output() collapsedChange = new EventEmitter<boolean>();
 @Input() isCollapsed: boolean = false;
@Input() activeItem: string = 'personal';// ← viene del componente padre

  
  openMenus: { [level: number]: string | null } = {};

  dispositivoMenu: MenuItem[] = [
    {
      key: 'dispositivo',
      label: 'Dispositivo',
      icon: 'fa-mobile-retro',
      submenu: [
        { label: 'Dispositivos', link: '/panel/dispositivo' },
        { label: 'Comandos de Dispositivo', link: null },
      ],
    },
    {
      key: 'mensaje',
      label: 'Mensajes',
      icon: 'fa-comment',
      submenu: [
        { label: 'Público', link: null },
        { label: 'Privado', link: null },
      ],
    },
    {
      key: 'menudato',
      label: 'Datos',
      icon: 'fa-database',
      submenu: [
        { label: 'Incidencias', link: null },
        { label: 'Plantilla Biométrica', link: null },
        { label: 'Foto Biométrica', link: null },
        { label: 'Marcaciones', link: '/panel/dispositivo/marcaciones' },
      ],
    },
    {
      key: 'eventos',
      label: 'Eventos',
      icon: 'fa-clock-rotate-left',
      submenu: [
        { label: 'Evento de Operación', link: null },
        { label: 'Evento de Errores', link: null },
        { label: 'Cargar Registros', link: null },
      ],
    },
    {
      key: 'apmovil',
      label: 'Aplicación móvil',
      icon: 'fa-mobile',
      submenu: [
        { label: 'Límite GPS del empleado', link: null },
        { label: 'Límite GPS de Departamento', link: null },
        { label: 'Cuentas', link: null },
        { label: 'Aviso', link: null },
        { label: 'Notificación', link: null },
        { label: 'Operación de registros', link: null },
      ],
    },
    {
      key: 'devicesetting',
      label: 'Configuraciones',
      icon: 'fa-gear',
      submenu: [
        { label: 'Configuración', link: null },
      ],
    },
  ];

  asistenciaMenu: MenuItem[] = [
    {
      key: 'regla',
      label: 'Regla',
      icon: 'fa-registered',
      submenu: [
        { label: 'Regla General', link: './panel/asistencia' },
        { label: 'Regla del Departamento', link: null },
      ],
    },
    {
      key: 'horarioturno',
      label: 'Horario y Turno',
      icon: 'fa-clock',
      submenu: [
        { label: 'Descanso', link: '/panel/asistencia/descansos' },
        { label: 'Horario', link: '/panel/asistencia/horarios' },
        { label: 'Turno', link: '/panel/asistencia/turno' },
      ],
    },
    {
      key: 'calendario',
      label: 'Calendario',
      icon: 'fa-calendar-days',
      submenu: [
        { label: 'Por Departamento', link: null },
        { label: 'Por Empleado', link: null },
        { label: 'Calendario Temporal', link: null },
        { label: 'Ver Calendario', link: null },
      ],
    },
    {
      key: 'maprobaciones',
      label: 'Aprobaciones',
      icon: 'fa-check-to-slot',
      submenu: [
        { label: 'Marcación Manual', link: null },
        { label: 'Permiso Papeleta', link: null },
        { label: 'Horas Extras', link: null },
        { label: 'Entrenamiento', link: null },
        { label: 'Ajuste de Calendario', link: null },
      ],
    },
    {
      key: 'menufestivo',
      label: 'Festivo',
      icon: 'fa-file-circle-plus',
      submenu: [
        { label: 'Festivo', link: null },
      ],
    },
    {
      key: 'menumarcaciones',
      label: 'Reporte Marcaciones',
      icon: 'fa-file-pdf',
      submenu: [
        { label: 'Marcación', link: null },
        { label: 'Cartilla de Tiempo', link: null },
        { label: 'Primero & Último', link: null },
        { label: 'Primera Entrada Última Entrada', link: null },
      ],
    },
    {
      key: 'menucalculo',
      label: 'Cálculo',
      icon: 'fa-calculator',
      submenu: [
        { label: 'Cálculo', link: null },
      ],
    },
    {
      key: 'repocalendario',
      label: 'Reporte Calendario',
      icon: 'fa-file-pdf',
      submenu: [
        { label: 'Registros del Calendario', link: null },
        { label: 'Asistencia Diaria', link: null },
        { label: 'Asistencia Total', link: null },
        { label: 'Excepciones', link: null },
        { label: 'Tardanza', link: null },
        { label: 'Salidas Temporales', link: null },
        { label: 'Horas Extras', link: null },
        { label: 'Ausencias', link: null },
        { label: 'Marcaciones Múltiples', link: null },
        { label: 'Descanso Múltiple', link: null },
      ],
    },
    {
      key: 'reportresumen',
      label: 'Reporte Resumen',
      icon: 'fa-file-pdf',
      submenu: [
        { label: 'Empleado', link: null },
        { label: 'Permisos', link: null },
        { label: 'Departamentos', link: null },
      ],
    },
    {
      key: 'settingasistencia',
      label: 'Configuraciones',
      icon: 'fa-gear',
      submenu: [
        { label: 'Tipo de Permiso Papeleta', link: null },
        { label: 'Tipo de Entrenamiento', link: null },
        { label: 'Configuración Reporte', link: null },
      ],
    },
  ];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  toggleMenu(level: number, menuName: string): void {
    this.openMenus[level] = this.openMenus[level] === menuName ? null : menuName;
    Object.keys(this.openMenus).forEach((key) => {
      const k = +key;
      if (k > level) this.openMenus[k] = null;
    });
  }

  isOpen(level: number, menuName: string): boolean {
    return this.openMenus[level] === menuName;
  }
}
