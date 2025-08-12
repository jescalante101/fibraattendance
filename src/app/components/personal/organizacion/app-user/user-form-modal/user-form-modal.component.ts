import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface UserData {
  userId?: number;
  userName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
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
  showPassword: boolean = false;
  
  // Variables para generación de contraseñas
  generatingPassword: boolean = false;
  isPasswordGenerated: boolean = false;
  passwordCopied: boolean = false;
  passwordStrength: number = 0;

  constructor(
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]]
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
          userName: this.userData.userName,
          email: this.userData.email,
          password: '', // No cargar la contraseña por seguridad
          firstName: this.userData.firstName,
          lastName: this.userData.lastName
        });
        
        // En modo edición, la contraseña no es obligatoria
        this.userForm.get('password')?.setValidators([Validators.minLength(8)]);
        this.userForm.get('password')?.updateValueAndValidity();
      }
    }
    
    // Suscribirse a cambios en el campo de contraseña para calcular fortaleza
    this.userForm.get('password')?.valueChanges.subscribe(value => {
      this.isPasswordGenerated = false; // Reset si el usuario modifica manualmente
      this.calculatePasswordStrength(value || '');
    });
  }

  onSubmit(): void {
    console.log('onSubmit llamado');
    console.log('Form valid:', this.userForm.valid);
    console.log('Form values:', this.userForm.value);
    
    if (this.userForm.valid) {
      this.loading = true;
      
      const formData: UserData = {
        userName: this.userForm.value.userName,
        email: this.userForm.value.email,
        password: this.userForm.value.password,
        firstName: this.userForm.value.firstName,
        lastName: this.userForm.value.lastName,
        isActive: true // Valor por defecto, manejado por el backend
      };

      if (this.isEditMode && this.userData) {
        formData.userId = this.userData.userId;
      }

      console.log('FormData preparado:', formData);
      console.log('modalRef existe:', !!this.modalRef);

      // Cerrar modal con los datos inmediatamente


      // Simular delay de guardar
      setTimeout(() => {
        this.loading = false;
        if (this.modalRef) {
          console.log('Cerrando modal inmediatamente con datos:', {
            action: 'save',
            data: formData
          });
          this.modalRef.closeModalFromChild({
            action: 'save',
            data: formData
          });
        } else {
          console.error('modalRef no está disponible');
        }
      }, 500);
    } else {
      console.log('Form inválido. Errores:', this.getFormErrors());
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

  // Alternar visibilidad de contraseña
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Generar contraseña segura automáticamente
  generatePassword(): void {
    this.generatingPassword = true;
    
    // Simular delay para UX
    setTimeout(() => {
      const password = this.createSecurePassword();
      this.userForm.patchValue({ password });
      this.isPasswordGenerated = true;
      this.generatingPassword = false;
      this.showPassword = true; // Mostrar la contraseña generada
      this.calculatePasswordStrength(password);
    }, 500);
  }

  // Crear contraseña segura
  private createSecurePassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Garantizar al menos un carácter de cada tipo
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(symbols);
    
    // Completar hasta 12 caracteres
    for (let i = 4; i < 12; i++) {
      password += this.getRandomChar(allChars);
    }
    
    // Mezclar la contraseña
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Obtener carácter aleatorio
  private getRandomChar(chars: string): string {
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Copiar contraseña al portapapeles
  async copyPasswordToClipboard(): Promise<void> {
    const password = this.userForm.get('password')?.value;
    if (!password) return;
    
    try {
      await navigator.clipboard.writeText(password);
      this.passwordCopied = true;
      
      // Resetear el estado después de 2 segundos
      setTimeout(() => {
        this.passwordCopied = false;
      }, 2000);
    } catch (err) {
      console.error('Error al copiar contraseña:', err);
    }
  }

  // Calcular fortaleza de contraseña
  private calculatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = 0;
      return;
    }
    
    let score = 0;
    
    // Longitud
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 20;
    
    // Complejidad
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    
    this.passwordStrength = Math.min(score, 100);
  }

  // Obtener clases CSS del input de contraseña
  get passwordInputClasses(): string {
    const baseClasses = 'w-full px-4 py-3 pl-10 pr-20 border border-fiori-border rounded-lg bg-fiori-surface text-fiori-text focus:ring-2 focus:ring-fiori-primary focus:border-fiori-primary transition-all';
    
    if (this.isPasswordGenerated) {
      return baseClasses + ' border-green-300 bg-green-50';
    }
    
    return baseClasses;
  }

  // Obtener texto de fortaleza
  getPasswordStrengthText(strength: number): string {
    if (strength < 40) return 'Débil';
    if (strength < 70) return 'Media';
    if (strength < 90) return 'Fuerte';
    return 'Muy Fuerte';
  }

  // Obtener color del texto de fortaleza
  getPasswordStrengthColor(strength: number): string {
    if (strength < 40) return 'text-red-600';
    if (strength < 70) return 'text-orange-600';
    if (strength < 90) return 'text-blue-600';
    return 'text-green-600';
  }

  // Obtener color de la barra de fortaleza
  getPasswordStrengthBarColor(strength: number): string {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-orange-500';
    if (strength < 90) return 'bg-blue-500';
    return 'bg-green-500';
  }

  // Método auxiliar para obtener errores del formulario
  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }
}