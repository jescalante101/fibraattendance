import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface UserSiteData {
  userSiteId?: number | string;
  userId: number;
  siteId: string;
  observation?: string;
  creationDate?: string;
  active?: string;
}

export interface UserSiteFormResult {
  action: 'save' | 'cancel';
  data?: UserSiteData;
}

export interface Usuario {
  userId: number;
  userName: string;
}

export interface Sede {
  categoriaAuxiliarId: string;
  descripcion: string;
}

@Component({
  selector: 'app-user-site-form-modal',
  templateUrl: './user-site-form-modal.component.html',
  styleUrls: ['./user-site-form-modal.component.css']
})
export class UserSiteFormModalComponent implements OnInit {
  form: FormGroup;
  loading: boolean = false;
  userSiteData: UserSiteData | null = null;
  isEditMode: boolean = false;
  modalRef: any; // Referencia al modal padre
  data: any; // Datos pasados desde el modal service

  // Datos para autocomplete
  usuarios: Usuario[] = [];
  sedes: Sede[] = [];
  filteredUsuarios: Usuario[] = [];
  filteredSedes: Sede[] = [];

  // Control de dropdowns
  showUsuarioDropdown: boolean = false;
  showSedeDropdown: boolean = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      userId: ['', [Validators.required]],
      siteId: ['', [Validators.required]],
      usuarioFilter: [''],
      sedeFilter: [''],
      creationDate: [{ value: '', disabled: true }],
      observation: ['']
    });
  }

  ngOnInit(): void {
    // Recuperar datos del modal service
    if (this.data) {
      this.userSiteData = this.data.userSiteData || null;
      this.isEditMode = this.data.isEditMode || false;
      this.usuarios = this.data.usuarios || [];
      this.sedes = this.data.sedes || [];
      
      // Inicializar listas filtradas
      this.filteredUsuarios = [...this.usuarios];
      this.filteredSedes = [...this.sedes];

      // Si es modo edición, cargar los datos en el formulario
      if (this.userSiteData && this.isEditMode) {
        const selectedUsuario = this.usuarios.find(u => u.userId === this.userSiteData!.userId);
        const selectedSede = this.sedes.find(s => s.categoriaAuxiliarId === this.userSiteData!.siteId);

        this.form.patchValue({
          userId: this.userSiteData.userId,
          siteId: this.userSiteData.siteId,
          usuarioFilter: selectedUsuario?.userName || '',
          sedeFilter: selectedSede?.descripcion || '',
          creationDate: this.userSiteData.creationDate || '',
          observation: this.userSiteData.observation || ''
        });
      } else {
        // Modo nuevo: establecer fecha actual
        const now = new Date();
        const currentDateTime = now.toISOString().slice(0, 16);
        this.form.patchValue({
          creationDate: currentDateTime
        });
      }
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading = true;
      
      const formData: UserSiteData = {
        userId: this.form.value.userId,
        siteId: this.form.value.siteId,
        observation: this.form.value.observation,
        creationDate: this.form.value.creationDate
      };

      if (this.isEditMode && this.userSiteData) {
        formData.userSiteId = this.userSiteData.userSiteId;
        formData.active = this.userSiteData.active;
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

  // Métodos para autocomplete de usuarios
  onUsuarioFilterChange(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredUsuarios = this.usuarios.filter(usuario =>
      usuario.userName.toLowerCase().includes(searchTerm)
    );
    this.showUsuarioDropdown = true;
  }

  onUsuarioSelected(usuario: Usuario): void {
    this.form.patchValue({
      userId: usuario.userId,
      usuarioFilter: usuario.userName
    });
    this.showUsuarioDropdown = false;
  }

  onUsuarioBlur(): void {
    setTimeout(() => {
      this.showUsuarioDropdown = false;
    }, 200);
  }

  // Métodos para autocomplete de sedes
  onSedeFilterChange(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredSedes = this.sedes.filter(sede =>
      sede.descripcion.toLowerCase().includes(searchTerm)
    );
    this.showSedeDropdown = true;
  }

  onSedeSelected(sede: Sede): void {
    this.form.patchValue({
      siteId: sede.categoriaAuxiliarId,
      sedeFilter: sede.descripcion
    });
    this.showSedeDropdown = false;
  }

  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }

  // TrackBy functions
  trackByUserId(index: number, usuario: Usuario): number {
    return usuario.userId;
  }

  trackBySedeId(index: number, sede: Sede): string {
    return sede.categoriaAuxiliarId;
  }
}