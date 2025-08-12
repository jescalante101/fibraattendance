import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { PermissionsService, Permission, UserPermission } from 'src/app/core/services/permissions.service';
import { User } from 'src/app/core/services/app-user.services';

export interface PermissionModule {
  moduleName: string;
  permissions: PermissionWithStatus[];
  allSelected: boolean;
  someSelected: boolean;
  isExpanded: boolean;
  hasChanges: boolean;
}

export interface PermissionWithStatus extends Permission {
  isSelected: boolean;
  isUpdating: boolean;
}

export interface UserPermissionsResult {
  action: 'close';
}

@Component({
  selector: 'app-user-permissions-modal',
  templateUrl: './user-permissions-modal.component.html',
  styleUrls: ['./user-permissions-modal.component.css']
})
export class UserPermissionsModalComponent implements OnInit, OnDestroy {
  modalRef: any; // Referencia al modal padre
  data: any; // Datos pasados desde el modal service
  
  user: User | null = null;
  loading = false;
  saving = false;
  searchTerm = '';
  
  permissionModules: PermissionModule[] = [];
  filteredModules: PermissionModule[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private permissionsService: PermissionsService
  ) {}

  ngOnInit(): void {
    if (this.data?.user) {
      this.user = this.data.user;
      this.loadPermissions();
    } else {
      console.error('❌ No user data provided to permissions modal');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPermissions(): void {
    if (!this.user) return;
    
    this.loading = true;
    console.log(`🚀 Cargando permisos para usuario: ${this.user.userName} (ID: ${this.user.userId})`);
    
    // Primero probar solo getAllPermissions para debug
    console.log('🔍 Probando getAllPermissions...');
    this.permissionsService.getAllPermissions().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (allPermissions) => {
        console.log('✅ getAllPermissions response:', allPermissions);
        console.log(`📊 Total permisos encontrados: ${allPermissions.length}`);
        
        // Ahora cargar permisos del usuario
        console.log('🔍 Probando getUserPermissions...');
        this.permissionsService.getUserPermissions(this.user!.userId).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (userPermissions) => {
            console.log('✅ getUserPermissions response:', userPermissions);
            console.log(`👤 Permisos del usuario: ${userPermissions.length}`);
            
            // Procesar con getPermissionsGroupedByModule
            console.log('🔍 Procesando con getPermissionsGroupedByModule...');
            this.permissionsService.getPermissionsGroupedByModule().pipe(
              takeUntil(this.destroy$)
            ).subscribe({
              next: (groupedPermissions) => {
                console.log('✅ getPermissionsGroupedByModule response:', groupedPermissions);
                this.setupPermissionModules(groupedPermissions, userPermissions);
                this.loading = false;
              },
              error: (error) => {
                console.error('❌ Error in getPermissionsGroupedByModule:', error);
                this.loading = false;
              }
            });
          },
          error: (error) => {
            console.error('❌ Error in getUserPermissions:', error);
            console.log('ℹ️ Continuando con permisos vacíos...');
            
            // Continuar con permisos de usuario vacíos
            this.permissionsService.getPermissionsGroupedByModule().pipe(
              takeUntil(this.destroy$)
            ).subscribe({
              next: (groupedPermissions) => {
                console.log('✅ getPermissionsGroupedByModule response (sin permisos usuario):', groupedPermissions);
                this.setupPermissionModules(groupedPermissions, []);
                this.loading = false;
              },
              error: (error) => {
                console.error('❌ Error in getPermissionsGroupedByModule:', error);
                this.loading = false;
              }
            });
          }
        });
      },
      error: (error) => {
        console.error('❌ Error in getAllPermissions:', error);
        this.loading = false;
      }
    });
  }

  private setupPermissionModules(groupedPermissions: {[key: string]: Permission[]}, userPermissions: UserPermission[]): void {
    console.log('🔧 Setting up permission modules...');
    console.log('📊 Grouped permissions:', groupedPermissions);
    console.log('👤 User permissions:', userPermissions);
    
    // Verificar si hay permisos del sistema
    const totalSystemPermissions = Object.keys(groupedPermissions).length;
    console.log(`📋 Total módulos encontrados: ${totalSystemPermissions}`);
    
    if (totalSystemPermissions === 0) {
      console.warn('⚠️ No se encontraron permisos del sistema');
      this.permissionModules = [];
      this.applySearch();
      return;
    }

    // Obtener IDs de permisos que ya tiene el usuario (puede estar vacío)
    const userPermissionIds = userPermissions.map(up => up.permissionId);
    console.log(`✅ Usuario tiene ${userPermissionIds.length} permisos asignados:`, userPermissionIds);

    // Crear estructura de módulos con estado de selección
    this.permissionModules = Object.keys(groupedPermissions).map(moduleName => {
      const permissions: PermissionWithStatus[] = groupedPermissions[moduleName]
        .map(permission => ({
          ...permission,
          isSelected: userPermissionIds.includes(permission.permissionId),
          isUpdating: false
        }));

      const selectedCount = permissions.filter(p => p.isSelected).length;
      
      console.log(`📁 Módulo "${moduleName}": ${selectedCount}/${permissions.length} permisos seleccionados`);
      
      return {
        moduleName,
        permissions,
        allSelected: selectedCount === permissions.length && permissions.length > 0,
        someSelected: selectedCount > 0 && selectedCount < permissions.length,
        isExpanded: true, // Expandir todos los módulos por defecto
        hasChanges: false
      };
    }).filter(module => module.permissions.length > 0); // Solo módulos con permisos

    console.log(`🎯 Módulos finales configurados: ${this.permissionModules.length}`);
    this.applySearch();
  }

  onSearchChange(): void {
    this.applySearch();
  }

  private applySearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredModules = [...this.permissionModules];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredModules = this.permissionModules.map(module => ({
      ...module,
      permissions: module.permissions.filter(permission =>
        permission.permissionName.toLowerCase().includes(term) ||
        permission.description.toLowerCase().includes(term)
      )
    })).filter(module => module.permissions.length > 0);
  }

  toggleModuleExpansion(module: PermissionModule): void {
    module.isExpanded = !module.isExpanded;
  }

  onModuleToggle(module: PermissionModule, event: Event): void {
    event.stopPropagation(); // Prevenir expansión/colapso del módulo
    
    const newState = !module.allSelected;
    module.hasChanges = true;
    
    // Actualizar todas las permissions del módulo con operaciones individuales
    const operations = module.permissions.map(permission => {
      if (permission.isSelected !== newState) {
        permission.isUpdating = true;
        return this.togglePermissionImmediately(permission, newState);
      }
      return Promise.resolve();
    });
    
    Promise.all(operations).then(() => {
      module.hasChanges = false;
      this.updateModuleStates(module);
    });
  }

  onPermissionToggle(module: PermissionModule, permission: PermissionWithStatus): void {
    if (permission.isUpdating) return; // Prevenir clicks múltiples
    
    const newState = !permission.isSelected;
    permission.isUpdating = true;
    
    this.togglePermissionImmediately(permission, newState).then(() => {
      this.updateModuleStates(module);
    });
  }

  private async togglePermissionImmediately(permission: PermissionWithStatus, newState: boolean): Promise<void> {
    if (!this.user) return;
    
    try {
      if (newState) {
        // Agregar permiso
        await this.permissionsService.assignPermission(this.user.userId, permission.permissionId).toPromise();
      } else {
        // Quitar permiso
        await this.permissionsService.removePermission(this.user.userId, permission.permissionId).toPromise();
      }
      
      // Actualizar estado solo si la operación fue exitosa
      permission.isSelected = newState;
      
    } catch (error) {
      console.error('Error updating permission:', error);
      // Aquí podrías mostrar un toast de error
    } finally {
      permission.isUpdating = false;
    }
  }

  private updateModuleStates(module: PermissionModule): void {
    const selectedCount = module.permissions.filter(p => p.isSelected).length;
    module.allSelected = selectedCount === module.permissions.length && module.permissions.length > 0;
    module.someSelected = selectedCount > 0 && selectedCount < module.permissions.length;
  }

  getSelectedPermissionIds(): number[] {
    return this.permissionModules
      .flatMap(module => module.permissions)
      .filter(permission => permission.isSelected)
      .map(permission => permission.permissionId);
  }

  getSelectedCount(): number {
    return this.getSelectedPermissionIds().length;
  }

  getTotalPermissions(): number {
    return this.permissionModules.reduce((total, module) => total + module.permissions.length, 0);
  }

  getModuleSelectedCount(module: PermissionModule): number {
    return module.permissions.filter(p => p.isSelected).length;
  }

  getModuleTotalCount(module: PermissionModule): number {
    return module.permissions.length;
  }

  onClose(): void {
    if (this.modalRef) {
      this.modalRef.closeModalFromChild({
        action: 'close'
      });
    }
  }
}