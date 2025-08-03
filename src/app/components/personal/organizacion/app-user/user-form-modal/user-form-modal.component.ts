import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface UserData {
  userId?: number;
  userName: string;
}

export interface UserFormResult {
  action: 'save' | 'cancel';
  data?: UserData;
}

@Component({
  selector: 'app-user-form-modal',
  templateUrl: './user-form-modal.component.html',
  styleUrls: ['./user-form-modal.component.css']
})
export class UserFormModalComponent implements OnInit {
  userForm: FormGroup;
  loading: boolean = false;
  userData: UserData | null = null;
  isEditMode: boolean = false;
  modalRef: any; // Referencia al modal padre
  data: any; // Datos pasados desde el modal service

  constructor(
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      userName: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Recuperar datos del modal service
    if (this.data) {
      this.userData = this.data.userData || null;
      this.isEditMode = this.data.isEditMode || false;
      
      // Si es modo edición, cargar los datos en el formulario
      if (this.userData && this.isEditMode) {
        this.userForm.patchValue({
          userName: this.userData.userName
        });
      }
    }
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      this.loading = true;
      
      const formData: UserData = {
        userName: this.userForm.value.userName
      };

      if (this.isEditMode && this.userData) {
        formData.userId = this.userData.userId;
      }

      // Simular delay de guardar
      setTimeout(() => {
        this.loading = false;
        // Cerrar modal con los datos
        if (this.modalRef) {
          this.modalRef.closeModalFromChild({
            action: 'save',
            data: formData
          });
        }
      }, 500);
    }
  }

  onCancel(): void {
    // Cerrar modal sin datos
    if (this.modalRef) {
      this.modalRef.closeModalFromChild({
        action: 'cancel'
      });
    }
  }

  // Método para enfocar el input (usado desde el componente padre)
  focusUserNameInput(): void {
    setTimeout(() => {
      const input = document.getElementById('userName') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }
}