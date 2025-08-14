import { Component, OnInit } from '@angular/core';
import { AppUserSiteService } from 'src/app/core/services/app-user-site.service';
import { UserSite, UserSiteUpdate } from 'src/app/models/user-site.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { AppUserService, User } from 'src/app/core/services/app-user.services';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { UserSiteFormModalComponent, UserSiteFormResult, UserSiteData, Usuario, Sede } from './user-site-form-modal/user-site-form-modal.component';
import { AuthService } from 'src/app/core/services/auth.service';
// Removed AG-Grid imports - using Flowbite + Tailwind instead

// Interface for grouped user data
export interface UserSiteGroup {
  user: User;
  userSites: UserSite[];
  expanded: boolean;
}

@Component({
  selector: 'app-usuario-sede',
  templateUrl: './usuario-sede.component.html',
  styleUrls: ['./usuario-sede.component.css'],
})
export class UsuarioSedeComponent implements OnInit {
  userSites: UserSite[] = [];
  filteredUserSites: UserSite[] = [];
  loading = false;
  sedes: CategoriaAuxiliar[] = [];
  usuarios: User[] = [];
  searchTerm = '';

  // usuario logueado
  userId: number = 0;
  userName: string = '';

  // Flowbite Accordion Configuration
  userSiteGroups: UserSiteGroup[] = [];
  expandedGroups: { [userId: number]: boolean } = {};


  constructor(
    private userSiteService: AppUserSiteService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private appUserService: AppUserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private modalService: ModalService,
    private authService: AuthService,

  ) {}

  ngOnInit() {
    this.loadUserSites();
    this.loadSedes();
    this.loadUsuarios();
    this.getUserId();
  }
  // obtener el usuario logueado
  getUserId() {
    const user= this.authService.getCurrentUser()
    if (user) {
      this.userId = user.id;
      this.userName = user.username;
    }
  }


  loadUserSites() {
    this.loading = true;
    this.userSiteService.getAll().subscribe({
      next: (userSites: UserSite[]) => {
        this.userSites = userSites;
        this.filteredUserSites = [...userSites];
        this.groupUserSitesByUser(userSites);
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar los registros', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  loadSedes() {
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe(sedes => {
      this.sedes = sedes;
    });
  }

  loadUsuarios() {
    this.appUserService.getAllUsers().subscribe(users => {
      this.usuarios = users;
    });
  }

  // Abrir modal para nueva asignación
  openNewUserSiteModal() {
    this.modalService.open({
      title: 'Nueva Asignación',
      componentType: UserSiteFormModalComponent,
      componentData: {
        userSiteData: null,
        isEditMode: false,
        usuarios: this.usuarios,
        sedes: this.sedes
      },
      width: '550px',
      height: '700px'
    }).then((result: UserSiteFormResult | null) => {
      if (result && result.action === 'save' && result.data) {
        this.createUserSiteArray(Array.isArray(result.data) ? result.data : [result.data]);
      }
    });
  }

  // Crear múltiples asignaciones usuario-sede
  private createUserSiteArray(userSiteDataArray: UserSiteData[]) {
    this.loading = true;
    
    if (!Array.isArray(userSiteDataArray) || userSiteDataArray.length === 0) {
      this.snackBar.open('No hay datos para procesar', 'Cerrar', { duration: 3000 });
      this.loading = false;
      return;
    }

    // Crear array de UserSite para enviar al backend
    const userSitesToCreate: UserSite[] = userSiteDataArray.map(userSiteData => {
      const user = this.usuarios.find(u => u.userId === userSiteData.userId);
      const sede = this.sedes.find(s => s.categoriaAuxiliarId === userSiteData.siteId);
      
      return {
        userId: userSiteData.userId,
        userName: user?.userName || '',
        siteId: userSiteData.siteId,
        siteName: sede?.descripcion || '',
        observation: userSiteData.observation || '',
        createdBy: this.userName,
        createdAt: userSiteData.createdAt || new Date().toISOString(),
        active: 'Y',
      };
    });

    // Usar el método createBlock para crear todas las asignaciones en una sola petición
    this.userSiteService.createBlock(userSitesToCreate).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(
          `${userSitesToCreate.length} asignación(es) creada(s) exitosamente`, 
          'Cerrar', 
          { duration: 3000 }
        );
        this.loadUserSites();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al crear las asignaciones', 'Cerrar', { duration: 3000 });
      }
    });
  }

  

  // Actualizar asignación usuario-sede
  private updateUserSite(userSiteData: UserSiteData) {
    console.log("a un paso",userSiteData);
    if (!userSiteData.userId || !userSiteData.siteId) return;

    
    this.loading = true;
    const user = this.usuarios.find(u => u.userId === userSiteData.userId);
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === userSiteData.siteId);
    
    const userSite: UserSiteUpdate = {
      userId: userSiteData.userId,
      siteId: userSiteData.siteId,
      observation: userSiteData.observation || '',
      userName: user?.userName || '',
      updatedBy: this.userName,
      updatedAt: userSiteData.updatedAt || new Date().toISOString(),  
      active: userSiteData.active || 'Y' 
    };

    // Use the original userSite IDs for update
    const originalUserSite = this.userSites.find(us => us.userId === userSiteData.userId && us.siteId === userSiteData.siteId);
    if (originalUserSite) {
      this.userSiteService.update(originalUserSite.userId, originalUserSite.siteId, userSite).subscribe({
        next: () => {
          this.snackBar.open('Asignación actualizada exitosamente', 'Cerrar', { duration: 3000 });
          this.loadUserSites();
        },
        error: () => {
          this.loading = false;
          this.snackBar.open('Error al actualizar la asignación', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  onEdit(userSite: UserSite) {
    this.modalService.open({
      title: 'Editar Asignación',
      componentType: UserSiteFormModalComponent,
      componentData: {
        userSiteData: {
          userSiteId: userSite.userId + '-' + userSite.siteId, // Composite ID
          userId: userSite.userId,
          siteId: userSite.siteId,
          observation: userSite.observation,
          createdAt: userSite.createdAt,

          active: userSite.active
        },
        isEditMode: true,
        usuarios: this.usuarios,
        sedes: this.sedes
      },
      width: '550px',
      height: '700px'
    }).then((result: UserSiteFormResult | null) => {
      if (result && result.action === 'save' && result.data) {
        // Ensure result.data is a single UserSiteData object before updating
        console.log("Listo para editar",result.data);

        if (Array.isArray(result.data)) {
          this.updateUserSite(result.data[0]); // Take first item if array
        } else {
          this.updateUserSite(result.data);
        }
      }
    });
  }

  onDelete(userSite: UserSite) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: {
        tipo: 'warning',
        titulo: 'Confirmar eliminación',
        mensaje: `¿Estás seguro de que deseas eliminar el registro de ${userSite.userName} en ${userSite.siteName}?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.userSiteService.delete(userSite.userId, userSite.siteId).subscribe({
          next: () => {
            this.snackBar.open('Registro eliminado', 'Cerrar', { duration: 3000 });
            this.loadUserSites();
          },
          error: () => this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 })
        });
      }
    });
  }

  onToggleActive(userSite: UserSite) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: {
        tipo: 'warning',
        titulo: userSite.active === 'Y' ? 'Confirmar desactivación' : 'Confirmar activación',
        mensaje: `¿Estás seguro de que deseas ${userSite.active === 'Y' ? 'desactivar' : 'activar'} el registro de ${userSite.userName} en ${userSite.siteName}?`,
        confirmacion: true,
        textoConfirmar: userSite.active === 'Y' ? 'Desactivar' : 'Activar'
      }
    });
    // Add updatedBy and updatedAt
    const userSiteUpdate: UserSiteUpdate = {
      ...userSite,
      active: userSite.active === 'Y' ? 'N' : 'Y',
      updatedBy: this.userName, // Replace with actual user ID
      updatedAt: new Date().toISOString()
    };
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.userSiteService.update(userSite.userId, userSite.siteId, userSiteUpdate).subscribe({
          next: () => {
            this.snackBar.open(
              userSite.active === 'Y' ? 'Registro desactivado' : 'Registro activado',
              'Cerrar',
              { duration: 3000 }
            );
            this.loadUserSites();
          },
          error: () => this.snackBar.open('Error al actualizar el estado', 'Cerrar', { duration: 3000 })
        });
      }
    });
  }

  // TrackBy functions for performance

  trackByUserSiteId(index: number, userSite: UserSite): string {
    return `${userSite.userId}-${userSite.siteId}`;
  }

  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredUserSites = [...this.userSites];
      this.groupUserSitesByUser(this.userSites);
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUserSites = this.userSites.filter(us => 
      us.userName.toLowerCase().includes(term) ||
      us.siteName.toLowerCase().includes(term) ||
      us.observation?.toLowerCase().includes(term)
    );
    this.groupUserSitesByUser(this.filteredUserSites);
  }

  // Helper methods for statistics
  getActiveCount(): number {
    return this.userSites.filter(us => us.active === 'Y').length;
  }

  getInactiveCount(): number {
    return this.userSites.filter(us => us.active !== 'Y').length;
  }

  // ===================== Removed AG-Grid Configuration =====================

  // Group user sites by user for accordion display
  groupUserSitesByUser(userSites: UserSite[]) {
    const userGroups: { [userId: number]: UserSite[] } = {};
    
    userSites.forEach(userSite => {
      if (!userGroups[userSite.userId]) {
        userGroups[userSite.userId] = [];
      }
      userGroups[userSite.userId].push(userSite);
    });

    this.userSiteGroups = Object.keys(userGroups).map(userIdStr => {
      const userId = Number(userIdStr);
      const userSites = userGroups[userId];
      const user = this.usuarios.find(u => u.userId === userId);
      
      return {
        user: user || { userId, userName: userSites[0]?.userName || 'Usuario Desconocido' } as User,
        userSites: userSites,
        expanded: this.expandedGroups[userId] || false
      };
    });
  }

  // Toggle accordion expansion
  toggleGroup(userId: number) {
    this.expandedGroups[userId] = !this.expandedGroups[userId];
    const group = this.userSiteGroups.find(g => g.user.userId === userId);
    if (group) {
      group.expanded = this.expandedGroups[userId];
    }
  }

  // Check if group is expanded
  isGroupExpanded(userId: number): boolean {
    return this.expandedGroups[userId] || false;
  }

  // Get active count for specific user
  getActiveCountForUser(userSites: UserSite[]): number {
    return userSites.filter(us => us.active === 'Y').length;
  }

  // TrackBy functions for performance
  trackByUserId(index: number, group: UserSiteGroup): number {
    return group.user.userId;
  }


}
