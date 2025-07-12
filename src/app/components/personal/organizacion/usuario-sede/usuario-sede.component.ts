import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppUserSiteService } from 'src/app/core/services/app-user-site.service';
import { UserSite } from 'src/app/models/user-site.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { AppUserService, User } from 'src/app/core/services/app-user.services';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-usuario-sede',
  templateUrl: './usuario-sede.component.html',
  styleUrls: ['./usuario-sede.component.css']
})
export class UsuarioSedeComponent implements OnInit {
  form: FormGroup;
  userSites: UserSite[] = [];
  editing: boolean = false;
  selectedUserSite?: UserSite;
  loading = false;
  sedes: CategoriaAuxiliar[] = [];
  usuarios: User[] = [];

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
      observation: [''],
      creationDate: [{ value: new Date().toISOString().substring(0, 16), disabled: true }, Validators.required],
    });
  }

  ngOnInit() {
    this.loadUserSites();
    this.loadSedes();
    this.loadUsuarios();
    this.form.get('userId')?.valueChanges.subscribe(id => {
      const user = this.usuarios.find(u => u.userId == id);
      if (user) {
        this.form.patchValue({ userName: user.userName }, { emitEvent: false });
      }
    });
    this.form.get('siteId')?.valueChanges.subscribe(id => {
      const sede = this.sedes.find(s => s.categoriaAuxiliarId === id);
      if (sede) {
        this.form.patchValue({ siteName: sede.descripcion }, { emitEvent: false });
      }
    });
  }

  loadUserSites() {
    this.loading = true;
    this.userSiteService.getAll().subscribe({
      next: (data) => {
        this.userSites = data;
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
    this.form.patchValue({
      userId: userSite.userId,
      siteId: userSite.siteId,
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
}
