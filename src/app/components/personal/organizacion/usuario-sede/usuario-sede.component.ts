import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppUserSiteService } from 'src/app/core/services/app-user-site.service';
import { UserSite } from 'src/app/models/user-site.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { AppUserService, User } from 'src/app/core/services/app-user.services';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map, startWith } from 'rxjs';

@Component({
  selector: 'app-usuario-sede',
  templateUrl: './usuario-sede.component.html',
  styleUrls: ['./usuario-sede.component.css']
})
export class UsuarioSedeComponent implements OnInit {
  form: FormGroup;
  userSites: UserSite[] = [];
  filteredUserSites: UserSite[] = [];
  editing: boolean = false;
  selectedUserSite?: UserSite;
  loading = false;
  sedes: CategoriaAuxiliar[] = [];
  usuarios: User[] = [];
  searchTerm = '';

  // Filtered observables for autocomplete
  filteredUsuarios!: Observable<User[]>;
  filteredSedes!: Observable<CategoriaAuxiliar[]>;

  constructor(
    private fb: FormBuilder,
    private userSiteService: AppUserSiteService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private appUserService: AppUserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      userId: ['', Validators.required],
      siteId: ['', Validators.required],
      usuarioFilter: [''],
      sedeFilter: [''],
      observation: [''],
      creationDate: [{ value: new Date().toISOString().substring(0, 16), disabled: true }, Validators.required],
    });
  }

  ngOnInit() {
    this.loadUserSites();
    this.loadSedes();
    this.loadUsuarios();
    
    // Setup autocomplete after data is loaded
    setTimeout(() => {
      this.setupAutocomplete();
    }, 100);
  }

  loadUserSites() {
    this.loading = true;
    this.userSiteService.getAll().subscribe({
      next: (data) => {
        this.userSites = data;
        this.filteredUserSites = [...this.userSites];
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

  onSubmit() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const user = this.usuarios.find(u => u.userId == value.userId);
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === value.siteId);
    const userSite: UserSite = {
      userId: value.userId,
      userName: user?.userName || '',
      siteId: value.siteId,
      siteName: sede?.descripcion || '',
      observation: value.observation,
      createdBy: 'Admin',
      creationDate: value.creationDate || new Date().toISOString(),
      active: 'Y',
    };
    if (this.editing && this.selectedUserSite) {
      this.userSiteService.update(this.selectedUserSite.userId, this.selectedUserSite.siteId, userSite).subscribe({
        next: () => {
          this.snackBar.open('Registro actualizado', 'Cerrar', { duration: 3000 });
          this.loadUserSites();
          this.cancelEdit();
        },
        error: () => this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 })
      });
    } else {
      this.userSiteService.create(userSite).subscribe({
        next: () => {
          this.snackBar.open('Registro creado', 'Cerrar', { duration: 3000 });
          this.loadUserSites();
          this.form.reset({ creationDate: new Date().toISOString().substring(0, 16) });
        },
        error: () => this.snackBar.open('Error al crear', 'Cerrar', { duration: 3000 })
      });
    }
  }

  onEdit(userSite: UserSite) {
    this.editing = true;
    this.selectedUserSite = userSite;
    
    // Find the objects for autocomplete
    const usuario = this.usuarios.find(u => u.userId === userSite.userId);
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === userSite.siteId);
    
    this.form.patchValue({
      userId: userSite.userId,
      siteId: userSite.siteId,
      usuarioFilter: usuario,
      sedeFilter: sede,
      observation: userSite.observation,
      creationDate: userSite.creationDate?.substring(0, 16)
    });
  }

  cancelEdit() {
    this.editing = false;
    this.selectedUserSite = undefined;
    this.form.reset({ creationDate: new Date().toISOString().substring(0, 16) });
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
    const updated = { ...userSite, active: userSite.active === 'Y' ? 'N' : 'Y' };
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.userSiteService.update(userSite.userId, userSite.siteId, updated).subscribe({
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

  // Setup autocomplete filtering
  private setupAutocomplete(): void {
    this.filteredUsuarios = this.form.get('usuarioFilter')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterUsuarios(value || ''))
    );

    this.filteredSedes = this.form.get('sedeFilter')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterSedes(value || ''))
    );
  }

  private _filterUsuarios(value: string | User): User[] {
    if (typeof value === 'object') return this.usuarios;
    const filterValue = value.toLowerCase();
    return this.usuarios.filter(usuario => usuario.userName.toLowerCase().includes(filterValue));
  }

  private _filterSedes(value: string | CategoriaAuxiliar): CategoriaAuxiliar[] {
    if (typeof value === 'object') return this.sedes;
    const filterValue = value.toLowerCase();
    return this.sedes.filter(sede => sede.descripcion.toLowerCase().includes(filterValue));
  }

  // Selection handlers for autocomplete
  onUsuarioSelected(usuario: User): void {
    if (usuario && usuario.userId) {
      this.form.patchValue({
        userId: usuario.userId,
        usuarioFilter: usuario
      });
     
    }
  }

  onSedeSelected(sede: CategoriaAuxiliar): void {
    if (sede && sede.categoriaAuxiliarId) {
      this.form.patchValue({
        siteId: sede.categoriaAuxiliarId
      });
    }
  }

  // Display functions for autocomplete
  displayUsuarioFunction = (usuario: User): string => {
    return usuario && usuario.userName ? usuario.userName : '';
  }

  displaySedeFunction = (sede: CategoriaAuxiliar): string => {
    return sede && sede.descripcion ? sede.descripcion : '';
  }

  // Focus handlers to open autocomplete panels automatically
  onUsuarioFieldFocus(autocomplete: any): void {
    if (this.usuarios.length > 0) {
      //this.form.get('usuarioFilter')?.setValue('');
      setTimeout(() => {
        if (autocomplete && autocomplete.openPanel) {
          autocomplete.openPanel();
        }
      }, 100);
    }
  }

  onSedeFieldFocus(autocomplete: any): void {
    if (this.sedes.length > 0) {
      //this.form.get('sedeFilter')?.setValue('');
      setTimeout(() => {
        if (autocomplete && autocomplete.openPanel) {
          autocomplete.openPanel();
        }
      }, 100);
    }
  }

  // Search functionality for table
  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredUserSites = [...this.userSites];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUserSites = this.userSites.filter(us => 
      us.userName.toLowerCase().includes(term) ||
      us.siteName.toLowerCase().includes(term) ||
      us.observation?.toLowerCase().includes(term)
    );
  }

  // Helper methods for statistics
  getActiveCount(): number {
    return this.userSites.filter(us => us.active === 'Y').length;
  }

  getInactiveCount(): number {
    return this.userSites.filter(us => us.active !== 'Y').length;
  }
}
