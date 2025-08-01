import { Component, OnInit } from '@angular/core';
import { AppUserService, User } from 'src/app/core/services/app-user.services';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';

// Interfaz para tipos de Toast
interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

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
  private toastCounter = 0;

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
      error: (error) => {
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
        this.showToast('error', 'Error al cargar', 'No se pudieron cargar los usuarios. Verifica tu conexión.');
        console.error('Error loading users:', error);
      }
    });
  }

  submit() {
    if (this.userForm.invalid) return;
    
    this.loading = true;
    const userName = this.userForm.value.userName;
    
    if (this.editingUser) {
      // Editar usuario
      const updatedUser: User = { ...this.editingUser, userName };
      this.appUserService.updateUser(updatedUser).subscribe({
        next: _ => {
          this.showToast('success', 'Usuario actualizado', `El usuario "${userName}" ha sido actualizado correctamente.`);
          this.editingUser = null;
          this.userForm.reset();
          this.loadUsers();
        },
        error: (error) => {
          this.loading = false;
          this.showToast('error', 'Error al actualizar', 'No se pudo actualizar el usuario. Inténtalo de nuevo.');
          console.error('Error updating user:', error);
        }
      });
    } else {
      // Agregar usuario
      this.appUserService.addUser(userName).subscribe({
        next: _ => {
          this.showToast('success', 'Usuario creado', `El usuario "${userName}" ha sido registrado exitosamente.`);
          this.userForm.reset();
          this.loadUsers();
        },
        error: (error) => {
          this.loading = false;
          this.showToast('error', 'Error al crear', 'No se pudo crear el usuario. Verifica los datos e inténtalo de nuevo.');
          console.error('Error creating user:', error);
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
          next: _ => {
            this.showToast('success', 'Usuario eliminado', `El usuario "${user.userName}" ha sido eliminado correctamente.`);
            this.loadUsers();
          },
          error: (error) => {
            this.showToast('error', 'Error al eliminar', 'No se pudo eliminar el usuario. Inténtalo de nuevo.');
            console.error('Error deleting user:', error);
          }
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

  // TrackBy function para mejorar rendimiento
  trackByUserId(index: number, user: User): number {
    return user.userId;
  }

  // Método para mostrar Toast notifications
  private showToast(type: ToastConfig['type'], title: string, message: string, duration: number = 5000) {
    const toastId = `toast-${++this.toastCounter}`;
    const toast: ToastConfig = { id: toastId, type, title, message, duration };
    
    // Crear el elemento toast
    const toastElement = this.createToastElement(toast);
    const container = document.getElementById('toast-container');
    
    if (container) {
      container.appendChild(toastElement);
      
      // Mostrar con animación
      setTimeout(() => {
        toastElement.classList.add('translate-x-0');
        toastElement.classList.remove('translate-x-full');
      }, 100);
      
      // Auto-remove después del duration
      setTimeout(() => {
        this.removeToast(toastId);
      }, duration);
    }
  }

  private createToastElement(toast: ToastConfig): HTMLElement {
    const toastDiv = document.createElement('div');
    toastDiv.id = toast.id;
    toastDiv.className = `flex items-center w-full max-w-xs p-4 mb-4 text-fiori-text bg-fiori-surface rounded-lg shadow-fioriHover transform translate-x-full transition-transform duration-300 ease-in-out border border-fiori-border`;
    
    // Configurar colores según el tipo
    const typeClasses = {
      success: 'text-fiori-success',
      error: 'text-fiori-error',
      warning: 'text-fiori-warning',
      info: 'text-fiori-info'
    };
    
    const iconNames = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info'
    };
    
    toastDiv.innerHTML = `
      <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 ${typeClasses[toast.type]} rounded-lg">
        <lucide-icon name="${iconNames[toast.type]}" class="w-5 h-5"></lucide-icon>
      </div>
      <div class="ml-3 text-sm font-normal">
        <div class="font-semibold">${toast.title}</div>
        <div class="text-fiori-subtext">${toast.message}</div>
      </div>
      <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-fiori-subtext hover:text-fiori-text rounded-lg focus:ring-2 focus:ring-fiori-primary p-1.5 hover:bg-fiori-hover inline-flex h-8 w-8" onclick="document.getElementById('${toast.id}')?.remove()">
        <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
      </button>
    `;
    
    return toastDiv;
  }

  private removeToast(toastId: string) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }

  // Método para enfocar el input del formulario
  focusUserNameInput() {
    const input = document.getElementById('userName') as HTMLInputElement;
    if (input) {
      input.focus();
    }
  }
}
