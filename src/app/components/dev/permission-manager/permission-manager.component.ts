import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ToastService } from 'src/app/shared/services/toast.service';
import { PermissionsService, Permission, PermissionRegister } from 'src/app/core/services/permissions.service';
import { AuthService } from 'src/app/core/services/auth.service';
// Importamos la configuración del sidebar para extraer permisos
import { MenuSection } from '../../sidebar/sidebar.component';

interface PermissionComparison {
  key: string;
  name: string;
  description: string;
  existsInDB: boolean;
  location: string; // Ubicación en el sidebar (ej: "Asistencia > Reportes")
}

@Component({
  selector: 'app-permission-manager',
  templateUrl: './permission-manager.component.html',
  styleUrls: ['./permission-manager.component.css']
})
export class PermissionManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos principales
  permissionComparisons: PermissionComparison[] = [];
  dbPermissions: Permission[] = [];
  sidebarPermissions: PermissionComparison[] = [];

  // Estados UI
  loading = true;
  registering = false;
  
  // Estadísticas
  stats = {
    total: 0,
    existing: 0,
    missing: 0
  };

  constructor(
    private permissionsService: PermissionsService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.loading = true;

    forkJoin({
      dbPermissions: this.permissionsService.getAllPermissions(),
      sidebarPermissions: this.extractPermissionsFromSidebar()
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ dbPermissions, sidebarPermissions }) => {
        this.dbPermissions = dbPermissions;
        this.sidebarPermissions = sidebarPermissions;
        this.comparePermissions();
        this.calculateStats();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.toastService.error('Error', 'Error al cargar permisos');
        this.loading = false;
      }
    });
  }

  /**
   * Extrae todos los permisos del sidebar configurado
   */
  private extractPermissionsFromSidebar(): Promise<PermissionComparison[]> {
    return new Promise((resolve) => {
      const permissions: PermissionComparison[] = [];
      
      // Aquí definimos la misma estructura que en sidebar.component.ts
      const menuSections: MenuSection[] = [
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
        {
          key: 'asistencia',
          label: 'Asistencia',
          items: [
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
                { label: 'Permission Manager', link: '/panel/dev/permission-manager', permission: 'system.dev.permission_manager' }
              ]
            }
          ]
        }
      ];

      // Extraer todos los permisos del sidebar
      menuSections.forEach(section => {
        section.items.forEach(item => {
          // Agregar permiso del item principal si existe
          if (item.permission) {
            permissions.push({
              key: item.permission,
              name: `${section.label} - ${item.label}`,
              description: `Acceso a la sección ${item.label} en ${section.label}`,
              existsInDB: false,
              location: `${section.label} > ${item.label}`
            });
          }

          // Agregar permisos de submenu
          item.submenu.forEach(sub => {
            if (sub.permission) {
              permissions.push({
                key: sub.permission,
                name: `${section.label} - ${item.label} - ${sub.label}`,
                description: `Acceso a ${sub.label} en la sección ${item.label}`,
                existsInDB: false,
                location: `${section.label} > ${item.label} > ${sub.label}`
              });
            }
          });
        });
      });

      // Remover duplicados por key y excluir permisos de dev (no deben estar en BD)
      const uniquePermissions = permissions
        .filter((permission, index, self) => 
          index === self.findIndex(p => p.key === permission.key)
        )
        .filter(permission => 
          !permission.key.startsWith('system.dev.')
        );

      resolve(uniquePermissions);
    });
  }

  /**
   * Compara permisos del sidebar con los de la base de datos
   */
  private comparePermissions(): void {
    this.permissionComparisons = this.sidebarPermissions.map(sidebarPerm => ({
      ...sidebarPerm,
      existsInDB: this.dbPermissions.some(dbPerm => dbPerm.permissionKey === sidebarPerm.key)
    }));
  }

  /**
   * Calcula estadísticas
   */
  private calculateStats(): void {
    this.stats.total = this.permissionComparisons.length;
    this.stats.existing = this.permissionComparisons.filter(p => p.existsInDB).length;
    this.stats.missing = this.stats.total - this.stats.existing;
  }

  /**
   * Obtiene solo los permisos faltantes
   */
  get missingPermissions(): PermissionComparison[] {
    return this.permissionComparisons.filter(p => !p.existsInDB);
  }

  /**
   * Registra un permiso individual
   */
  async registerPermission(permission: PermissionComparison): Promise<void> {
    const permissionData: PermissionRegister = {
      permissionKey: permission.key,
      permissionName: permission.name,
      description: permission.description
    };

    try {
      await this.permissionsService.registerPermission(permissionData).toPromise();
      permission.existsInDB = true;
      this.calculateStats();
      this.toastService.success('Éxito', `Permiso "${permission.name}" registrado correctamente`);
    } catch (error) {
      console.error('Error registering permission:', error);
      this.toastService.error('Error', `Error al registrar permiso: ${permission.name}`);
    }
  }

  /**
   * Registra todos los permisos faltantes
   */
  async registerAllMissingPermissions(): Promise<void> {
    const missing = this.missingPermissions;
    
    if (missing.length === 0) {
      this.toastService.info('Información', 'No hay permisos faltantes para registrar');
      return;
    }

    this.registering = true;
    let registered = 0;
    let failed = 0;

    for (const permission of missing) {
      try {
        await this.registerPermission(permission);
        registered++;
      } catch (error) {
        failed++;
      }
    }

    this.registering = false;
    
    if (registered > 0) {
      this.toastService.success('Éxito', `Se registraron ${registered} permisos correctamente`);
    }
    
    if (failed > 0) {
      this.toastService.warning('Advertencia', `Fallaron ${failed} registros de permisos`);
    }
  }

  /**
   * Recarga todos los datos
   */
  refresh(): void {
    this.loadData();
  }

  /**
   * TrackBy function para optimizar el rendering de la lista
   */
  trackByPermissionKey(index: number, permission: PermissionComparison): string {
    return permission.key;
  }
}