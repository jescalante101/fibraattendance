import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface UserSiteData {
  userSiteId?: number | string;
  userId: number;
  siteId: string;
  observation?: string;
  createdAt?: string;
  active?: string;
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface UserSiteFormResult {
  action: 'save' | 'cancel';
  data?: UserSiteData | UserSiteData[];
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

  // Multiselect functionality for Sede
  selectedSedes: Sede[] = [];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      userId: ['', [Validators.required]],
      siteId: ['', this.selectedSedesValidator.bind(this)],
      usuarioFilter: [''],
      sedeFilter: [''],
      createdAt: [{ value: '', disabled: true }],
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

        // En modo edición, cargar fecha actual como fecha de modificación
        const now = new Date();
        const currentDateTime = now.toISOString().slice(0, 16);
        
        this.form.patchValue({
          userId: this.userSiteData.userId,
          siteId: this.userSiteData.siteId,
          usuarioFilter: selectedUsuario?.userName || '',
          sedeFilter: selectedSede?.descripcion || '',
          createdAt: currentDateTime, // Fecha actual para modificación
          observation: this.userSiteData.observation || ''
        });
        
        // Si hay sede seleccionada en modo edición, agregarla a selectedSedes
        if (selectedSede) {
          this.selectedSedes = [selectedSede];
        }
      } else {
        // Modo nuevo: establecer fecha actual como fecha de creación
        const now = new Date();
        const currentDateTime = now.toISOString().slice(0, 16);
        this.form.patchValue({
          createdAt: currentDateTime
        });
      }
    }
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading = true;
      
      // Crear array de UserSiteData para cada sede seleccionada
      const userSiteDataArray: UserSiteData[] = this.selectedSedes.map(sede => ({
        userId: this.form.value.userId,
        siteId: sede.categoriaAuxiliarId,
        observation: this.form.value.observation,
        createdAt: this.form.value.createdAt || new Date().toISOString(),
        
        active: 'Y'
      }));

 
      // Simular delay de guardar
      setTimeout(() => {
        this.loading = false;
        // Cerrar modal con el array de datos
        if (this.modalRef) {
          this.modalRef.closeModalFromChild({
            action: 'save',
            data: userSiteDataArray  // Ahora retorna UserSiteData[]
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

  // Multiselect methods for Sede
  isSedeSelected(sede: Sede): boolean {
    return this.selectedSedes.some(s => s.categoriaAuxiliarId === sede.categoriaAuxiliarId);
  }

  toggleSedeSelection(sede: Sede, event: any): void {
    if (event.target.checked) {
      if (!this.isSedeSelected(sede)) {
        this.selectedSedes.push(sede);
        console.log('Sede added to selection:', sede.descripcion);
      }
    } else {
      this.selectedSedes = this.selectedSedes.filter(s => s.categoriaAuxiliarId !== sede.categoriaAuxiliarId);
      console.log('Sede removed from selection:', sede.descripcion);
    }
    console.log('Current selected sedes:', this.selectedSedes.map(s => s.descripcion));
    // Trigger validation update and mark as touched
    this.form.get('siteId')?.markAsTouched();
    this.form.get('siteId')?.updateValueAndValidity();
  }

  // Método para toggle cuando se hace click en el item (no en el checkbox)
  toggleSedeSelectionFromClick(sede: Sede): void {
    const isCurrentlySelected = this.isSedeSelected(sede);
    
    if (isCurrentlySelected) {
      // Si está seleccionado, lo removemos
      this.selectedSedes = this.selectedSedes.filter(s => s.categoriaAuxiliarId !== sede.categoriaAuxiliarId);
      console.log('Sede removed from click:', sede.descripcion);
    } else {
      // Si no está seleccionado, lo agregamos
      this.selectedSedes.push(sede);
      console.log('Sede added from click:', sede.descripcion);
    }
    
    console.log('Current selected sedes:', this.selectedSedes.map(s => s.descripcion));
    // Trigger validation update and mark as touched
    this.form.get('siteId')?.markAsTouched();
    this.form.get('siteId')?.updateValueAndValidity();
  }

  removeSedeSelection(sede: Sede): void {
    this.selectedSedes = this.selectedSedes.filter(s => s.categoriaAuxiliarId !== sede.categoriaAuxiliarId);
    console.log('Sede removed via tag button:', sede.descripcion);
    // Trigger validation update and mark as touched
    this.form.get('siteId')?.markAsTouched();
    this.form.get('siteId')?.updateValueAndValidity();
  }

  // Custom validator for selected sedes
  selectedSedesValidator(control: any) {
    if (this.selectedSedes && this.selectedSedes.length > 0) {
      return null; // Valid
    }
    return { sedeRequired: true }; // Invalid
  }

  // TrackBy functions
  trackByUserId(index: number, usuario: Usuario): number {
    return usuario.userId;
  }

  trackBySedeId(index: number, sede: Sede): string {
    return sede.categoriaAuxiliarId;
  }
}