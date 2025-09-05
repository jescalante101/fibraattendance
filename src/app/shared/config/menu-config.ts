// Configuración compartida del menú del sidebar
// Este archivo centraliza la configuración para evitar duplicación entre sidebar.component.ts y permission-manager.component.ts

export interface SubMenuItem {
  label: string;
  link: string | null;
  permission?: string;
}

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  submenu: SubMenuItem[];
  permission?: string;
}

export interface MenuSection {
  key: string;
  label: string;
  items: MenuItem[];
  permission?: string;
}

/**
 * CONFIGURACIÓN COMPLETA DEL MENÚ
 * Esta configuración es utilizada por:
 * - sidebar.component.ts: Para renderizar el menú
 * - permission-manager.component.ts: Para extraer permisos
 */
export const MENU_SECTIONS: MenuSection[] = [
  // 👥 SECCIÓN CONFIGURACIÓN
  {
    key: 'configuracion',
    label: 'Configuración',
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
          { label: 'Lista Blanca Personal', link: '/panel/personal/organizacion/personnel-whitelist', permission: 'personal.personnel_whitelist.view' },
          { label: 'Feriados', link: '/panel/personal/organizacion/holidays', permission: 'personal.holidays.view' }
        ]
      },
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
      }
    ]
  },
  
  // 👥 SECCIÓN PERSONAL
  {
    key: 'empleado',
    label: 'Personal',
    items: [
      {
        key: 'empleado',
        label: 'Personal',
        icon: 'id-card',
        permission: 'personal.empleado.view',
        submenu: [
          { label: 'Personal', link: '/panel/personal/empleado/empleado', permission: 'personal.empleado.list' },
          { label: 'Personal con Turnos', link: '/panel/personal/empleado/asignar-horario', permission: 'personal.empleado.horarios' },
          { label: 'Solicitud de Traslado', link: '/panel/personal/empleado/traslado', permission: 'personal.empleado.tranfers' }
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
        key: 'compensatory-days',
        label: 'Días Compensatorios',
        icon: 'calendar-days',
        permission: 'asistencia.compensatory_days.view',
        submenu: [
          { label: 'Gestión de Días Compensatorios', link: '/panel/asistencia/compensatory-day', permission: 'asistencia.compensatory_days.manage' }
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
          { label: 'Reporte Asistencia', link: '/panel/asistencia/marcaciones/reportes-excel/matrix', permission: 'asistencia.reportes.matrix' },
          { label: 'Reporte Horas Extras', link: '/panel/asistencia/reportes/horas-extras', permission: 'asistencia.reportes.horas_extras' },
          { label: 'Reporte Personal Turnos', link: '/panel/asistencia/reportes/personal-turnos', permission: 'asistencia.reportes.personal_turnos' }
        ]
      }
    ]
  },
  
  // 🔧 SECCIÓN DEV TOOLS (Solo para desarrolladores)
  {
    key: 'dev-tools',
    label: 'Dev Tools',
    items: [
      {
        key: 'dev-tools',
        label: 'Herramientas Dev',
        icon: 'code',
        permission: 'system.dev.tools',
        submenu: [
          { label: 'Permission Manager', link: '/panel/dev/permission-manager', permission: 'system.dev.permission_manager' },
          { label: 'Prueba Test', link: '/panel/dev/permission-test', permission: 'system.dev.permission_test' }
        ]
      }
    ]
  }
];

/**
 * Función utilitaria para obtener todas las secciones del menú
 */
export function getMenuSections(): MenuSection[] {
  return MENU_SECTIONS;
}

/**
 * Función utilitaria para obtener una sección específica
 */
export function getMenuSection(sectionKey: string): MenuSection | undefined {
  return MENU_SECTIONS.find(section => section.key === sectionKey);
}

/**
 * Función utilitaria para obtener un item específico de menú
 */
export function getMenuItem(sectionKey: string, itemKey: string): MenuItem | undefined {
  const section = getMenuSection(sectionKey);
  return section?.items.find(item => item.key === itemKey);
}