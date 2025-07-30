import { Component, OnInit } from '@angular/core';
import { AppUserService, User } from 'src/app/core/services/app-user.services';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';

@Component({
  selector: 'app-app-user',
  templateUrl: './app-user.component.html',
  styleUrls: ['./app-user.component.css']
})
export class AppUserComponent implements OnInit {
  userForm!: FormGroup;
  users: User[] = [];
  filteredUsers: User[] = [];
  editingUser: User | null = null;
  loading = false;
  searchTerm = '';

  constructor(
    private appUserService: AppUserService, 
    private fb: FormBuilder,
    private dialog: MatDialog // <--- agrega esto
  ) { }

  ngOnInit() {
    this.userForm = this.fb.group({
      userName: ['', Validators.required]
    });
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.appUserService.getAllUsers().subscribe({
      next: users => {
        this.users = users;
        this.filteredUsers = [...this.users];
        this.loading = false;
      },
      error: _ => {
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
      }
    });
  }

  submit() {
    if (this.userForm.invalid) return;
    const userName = this.userForm.value.userName;
    if (this.editingUser) {
      // Editar usuario
      const updatedUser: User = { ...this.editingUser, userName };
      this.appUserService.updateUser(updatedUser).subscribe({
        next: _ => {
          this.editingUser = null;
          this.userForm.reset();
          this.loadUsers();
        }
      });
    } else {
      // Agregar usuario
      this.appUserService.addUser(userName).subscribe({
        next: _ => {
          this.userForm.reset();
          this.loadUsers();
        }
      });
    }
  }

  editUser(user: User) {
    this.editingUser = user;
    this.userForm.patchValue({ userName: user.userName });
  }

  deleteUser(user: User) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '350px',
      data: {
        tipo: 'danger',
        titulo: 'Eliminar usuario',
        mensaje: `¿Seguro que deseas eliminar el usuario "${user.userName}"?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.appUserService.deleteUser(user.userId).subscribe({
          next: _ => this.loadUsers()
        });
      }
    });
  }

  cancelEdit() {
    this.editingUser = null;
    this.userForm.reset();
  }

  // Search functionality for table
  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.userName.toLowerCase().includes(term)
    );
  }

  // Helper methods for statistics
  getActiveCount(): number {
    return this.users.length; // Assuming all users are active for now
  }
}
