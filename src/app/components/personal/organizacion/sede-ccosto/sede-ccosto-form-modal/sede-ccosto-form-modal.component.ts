import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface SedeCcostoData {
  sedeCcostoId?: number | string;
  siteId: string;
  costCenterId: string;
  observation?: string;
  creationDate?: string;
  active?: string;
}

export interface SedeCcostoFormResult {
  action: 'save' | 'cancel';
  data?: SedeCcostoData;
}

export interface Sede {
  categoriaAuxiliarId: string;
  descripcion: string;
}

export interface CostCenter {
  ccostoId: string;
  descripcion: string;
}

@Component({
  selector: 'app-sede-ccosto-form-modal',
  templateUrl: './sede-ccosto-form-modal.component.html',
  styleUrls: ['./sede-ccosto-form-modal.component.css']
})
export class SedeCcostoFormModalComponent implements OnInit {
  form: FormGroup;
  loading: boolean = false;
  sedeCcostoData: SedeCcostoData | null = null;
  isEditMode: boolean = false;
  modalRef: any; // Referencia al modal padre
  data: any; // Datos pasados desde el modal service

  // Datos para autocomplete
  sedes: Sede[] = [];
  ccostos: CostCenter[] = [];
  filteredSedes: Sede[] = [];
  filteredCcostos: CostCenter[] = [];

  // Control de dropdowns
  showSedeDropdown: boolean = false;
  showCcostoDropdown: boolean = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      siteId: ['', [Validators.required]],
      costCenterId: ['', [Validators.required]],
      sedeFilter: [''],
      ccostoFilter: [''],
      creationDate: [{ value: '', disabled: true }],
      observation: ['']
    });
  }

  ngOnInit(): void {
    // Recuperar datos del modal service
    if (this.data) {
      this.sedeCcostoData = this.data.sedeCcostoData || null;
      this.isEditMode = this.data.isEditMode || false;
      this.sedes = this.data.sedes || [];
      this.ccostos = this.data.ccostos || [];
      
      // Inicializar listas filtradas
      this.filteredSedes = [...this.sedes];
      this.filteredCcostos = [...this.ccostos];

      // Si es modo edición, cargar los datos en el formulario
      if (this.sedeCcostoData && this.isEditMode) {
        const selectedSede = this.sedes.find(s => s.categoriaAuxiliarId === this.sedeCcostoData!.siteId);
        const selectedCcosto = this.ccostos.find(c => c.ccostoId === this.sedeCcostoData!.costCenterId);

        this.form.patchValue({
          siteId: this.sedeCcostoData.siteId,
          costCenterId: this.sedeCcostoData.costCenterId,
          sedeFilter: selectedSede?.descripcion || '',
          ccostoFilter: selectedCcosto?.descripcion || '',
          creationDate: this.sedeCcostoData.creationDate || '',
          observation: this.sedeCcostoData.observation || ''
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
      
      const formData: SedeCcostoData = {
        siteId: this.form.value.siteId,
        costCenterId: this.form.value.costCenterId,
        observation: this.form.value.observation,
        creationDate: this.form.value.creationDate
      };

      if (this.isEditMode && this.sedeCcostoData) {
        formData.sedeCcostoId = this.sedeCcostoData.sedeCcostoId;
        formData.active = this.sedeCcostoData.active;
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

  // Métodos para autocomplete de centros de costo
  onCcostoFilterChange(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredCcostos = this.ccostos.filter(ccosto =>
      ccosto.descripcion.toLowerCase().includes(searchTerm)
    );
    this.showCcostoDropdown = true;
  }

  onCcostoSelected(ccosto: CostCenter): void {
    this.form.patchValue({
      costCenterId: ccosto.ccostoId,
      ccostoFilter: ccosto.descripcion
    });
    this.showCcostoDropdown = false;
  }

  onCcostoBlur(): void {
    setTimeout(() => {
      this.showCcostoDropdown = false;
    }, 200);
  }

  // TrackBy functions
  trackBySedeId(index: number, sede: Sede): string {
    return sede.categoriaAuxiliarId;
  }

  trackByCcostoId(index: number, ccosto: CostCenter): string {
    return ccosto.ccostoId;
  }
}