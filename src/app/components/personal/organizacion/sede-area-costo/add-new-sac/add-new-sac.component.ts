import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, OnChanges, Optional } from '@angular/core';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, map, startWith } from 'rxjs';
import { SedeAreaCosto } from 'src/app/models/site-area-ccost.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { CostCenterService, CostCenter } from 'src/app/core/services/cost-center.service';

@Component({
  selector: 'app-add-new-sac',
  templateUrl: './add-new-sac.component.html',
  styleUrls: ['./add-new-sac.component.css']
})
export class AddNewSacComponent implements OnInit {
  @Input() dataToEdit?: SedeAreaCosto;
  @Input() componentData?: any;
  @Output() formSubmit = new EventEmitter<SedeAreaCosto>();
  
  // Properties for generic modal support
  modalRef?: any;
  
  form: FormGroup;
  sedes: CategoriaAuxiliar[] = [];
  areas: RhArea[] = [];
  costCenters: CostCenter[] = [];
  loading = false;
  isEdit = false;

  // Filtered observables for autocomplete
  filteredSedes!: Observable<CategoriaAuxiliar[]>;
  filteredAreas!: Observable<RhArea[]>;
  filteredCostCenters!: Observable<CostCenter[]>;

  constructor(
    private fb: FormBuilder,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private costCenterService: CostCenterService,
    @Optional() public dialogRef: MatDialogRef<AddNewSacComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      siteId: ['', Validators.required],
      siteName: [''],
      areaId: ['', Validators.required],
      areaName: [''],
      costCenterId: ['', Validators.required],
      costCenterName: [''],
      sedeFilter: [''],
      areaFilter: [''],
      costCenterFilter: [''],
      observation: [''],
      creationDate: [new Date().toISOString().substring(0, 16), Validators.required],
    });
  }

  ngOnInit(): void {
    console.log('AddNewSacComponent ngOnInit called');
    console.log('componentData fds:', this.componentData);
    console.log('matDialogData:', this.data);
    console.log('dataToEdit:', this.dataToEdit);

    console.log('ID:', this.componentData);
    
    this.loadSelects();
    this.initializeForm();
    
    // Setup autocomplete after data is loaded
     setTimeout(() => {
      this.setupAutocomplete();
    }, 100); 
  }

  /* ngOnChanges(changes: SimpleChanges): void {
    console.log('==== AddNewSacComponent ngOnChanges called ====');
    console.log('Changes:', changes);
    console.log('Current componentData:', this.componentData);
    console.log('Current dataToEdit:', this.dataToEdit);
    console.log('Current matDialogData:', this.matDialogData);
    console.log('ID2:', this.componentData);
    
    if (changes['componentData']) {
      console.log('componentData changed from:', changes['componentData'].previousValue);
      console.log('componentData changed to:', changes['componentData'].currentValue);

      this.initializeForm();
      
      // Re-setup autocomplete after data changes
       setTimeout(() => {
        this.setupAutocomplete();
      }, 100); 
    }
  } */

  private initializeForm(): void {
    console.log('==== initializeForm called ====');
    
    // Support for both MatDialog and generic modal component
    const modelData = this.dataToEdit || this.componentData || this.data;
    console.log('Model data resolved to:', modelData);
    
    // Better detection: check if we have actual edit data (not just empty object or null)
    const hasEditData = modelData && 
                       typeof modelData === 'object' && 
                       Object.keys(modelData).length > 0 &&
                       (modelData.siteId || modelData.areaId || modelData.costCenterId);
    
    console.log('Has edit data:', hasEditData);
    console.log('ModelData keys:', modelData ? Object.keys(modelData) : 'null');
    
    if (hasEditData) {
      this.isEdit = true;
      console.log('Setting edit mode with data:', modelData);
      
      const formData = {
        ...modelData,
        creationDate: modelData?.creationDate?.substring(0, 16)
      };
      console.log('Form data to patch:', formData);
      
      this.form.patchValue(formData);
      
      // Initialize autocomplete filter fields for edit mode
      this.setAutocompleteValues(modelData);
      
      console.log('Form after patch:', this.form.getRawValue());
    } else {
      this.isEdit = false;
      console.log('No model data, setting to create mode');
      
      // Set default date for new records
      const currentDateTime = new Date().toISOString().substring(0, 16);
      this.form.patchValue({
        creationDate: currentDateTime
      });
      console.log('Set default date for new record:', currentDateTime);
    }
  }

  private setAutocompleteValues(data: SedeAreaCosto): void {
    // Set sede filter value
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === data.siteId);
    if (sede) {
      this.form.patchValue({ sedeFilter: sede });
    }
    
    // Set area filter value
    const area = this.areas.find(a => a.areaId === data.areaId);
    if (area) {
      this.form.patchValue({ areaFilter: area });
    }
    
    // Set cost center filter value
    const costCenter = this.costCenters.find(cc => cc.ccostoId === data.costCenterId);
    if (costCenter) {
      this.form.patchValue({ costCenterFilter: costCenter });
    }
  }

  private setupAutocomplete(): void {
    // Setup filtered observables for autocomplete
    this.filteredSedes = this.form.get('sedeFilter')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterSedes(value || ''))
    );

    this.filteredAreas = this.form.get('areaFilter')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterAreas(value || ''))
    );

    this.filteredCostCenters = this.form.get('costCenterFilter')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCostCenters(value || ''))
    );
  }

  private _filterSedes(value: string | CategoriaAuxiliar): CategoriaAuxiliar[] {
    if (typeof value === 'object') return this.sedes;
    const filterValue = value.toLowerCase();
    return this.sedes.filter(sede => sede.descripcion.toLowerCase().includes(filterValue));
  }

  private _filterAreas(value: string | RhArea): RhArea[] {
    if (typeof value === 'object') return this.areas;
    const filterValue = value.toLowerCase();
    return this.areas.filter(area => area.descripcion.toLowerCase().includes(filterValue));
  }

  private _filterCostCenters(value: string | CostCenter): CostCenter[] {
    if (typeof value === 'object') return this.costCenters;
    const filterValue = value.toLowerCase();
    return this.costCenters.filter(cc => cc.descripcion.toLowerCase().includes(filterValue));
  }

  loadSelects() {
    this.loading = true;
    console.log('Loading selects...');
    
    let loadedCount = 0;
    const totalToLoad = 3;
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalToLoad) {
        this.loading = false;
        console.log('All data loaded, setting autocomplete values for edit mode');
        
        // If we're in edit mode and have data, set the autocomplete values now
        const modelData = this.dataToEdit || this.componentData || this.data;
        if (modelData && this.isEdit) {
          this.setAutocompleteValues(modelData);
        }
      }
    };
    
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe({
      next: (sedes) => {
        this.sedes = sedes;
        console.log('Sedes loaded:', sedes);
        checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading sedes:', error);
        checkAllLoaded();
      }
    });
    
    this.rhAreaService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
        console.log('Areas loaded:', areas);
        checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading areas:', error);
        checkAllLoaded();
      }
    });
    
    this.costCenterService.getAll().subscribe({
      next: (ccs) => {
        this.costCenters = ccs;
        console.log('Cost centers loaded:', ccs);
        checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading cost centers:', error);
        checkAllLoaded();
      }
    });
  }

  // Selection handlers for autocomplete
  onSedeSelected(sede: CategoriaAuxiliar): void {
    if (sede && sede.categoriaAuxiliarId) {
      this.form.patchValue({
        siteId: sede.categoriaAuxiliarId,
        siteName: sede.descripcion
      });
      console.log('Sede selected:', sede);
    }
  }

  onAreaSelected(area: RhArea): void {
    if (area && area.areaId) {
      this.form.patchValue({
        areaId: area.areaId,
        areaName: area.descripcion
      });
      console.log('Area selected:', area);
    }
  }

  onCostCenterSelected(cc: CostCenter): void {
    if (cc && cc.ccostoId) {
      this.form.patchValue({
        costCenterId: cc.ccostoId,
        costCenterName: cc.descripcion
      });
      console.log('Cost center selected:', cc);
    }
  }

  // Display functions for autocomplete
  displaySedeFunction = (sede: CategoriaAuxiliar): string => {
    return sede && sede.descripcion ? sede.descripcion : '';
  }

  displayAreaFunction = (area: RhArea): string => {
    return area && area.descripcion ? area.descripcion : '';
  }

  displayCostCenterFunction = (cc: CostCenter): string => {
    return cc && cc.descripcion ? cc.descripcion : '';
  }

  // Focus handlers to open autocomplete panels automatically in create mode
  onSedeFieldFocus(autocomplete: any): void {
    if (!this.isEdit && this.sedes.length > 0) {
      // Trigger the autocomplete filter to show all options
      //this.form.get('sedeFilter')?.setValue('');
      setTimeout(() => {
        if (autocomplete && autocomplete.openPanel) {
          autocomplete.openPanel();
        }
      }, 100);
    }
  }

  onAreaFieldFocus(autocomplete: any): void {
    if (!this.isEdit && this.areas.length > 0) {
      // Trigger the autocomplete filter to show all options
      //this.form.get('areaFilter')?.setValue('');
      setTimeout(() => {
        if (autocomplete && autocomplete.openPanel) {
          autocomplete.openPanel();
        }
      }, 100);
    }
  }

  onCostCenterFieldFocus(autocomplete: any): void {
    if (!this.isEdit && this.costCenters.length > 0) {
      // Trigger the autocomplete filter to show all options
      //this.form.get('costCenterFilter')?.setValue('');
      setTimeout(() => {
        if (autocomplete && autocomplete.openPanel) {
          autocomplete.openPanel();
        }
      }, 100);
    }
  }

  onSubmit() {
    console.log('Submit called, form valid:', this.form.valid);
    console.log('Form value:', this.form.getRawValue());
    
    if (this.form.invalid) return;
    const value = this.form.getRawValue();

    const result: SedeAreaCosto = {
      siteId: value.siteId,
      siteName: value.siteName,
      areaId: value.areaId,
      areaName: value.areaName,
      costCenterId: value.costCenterId,
      costCenterName: value.costCenterName,
      observation: value.observation,
      creationDate: value.creationDate,
      createdBy: 'Admin',
      active: 'Y',
    };
    
    console.log('Result:', result);
    this.formSubmit.emit(result);
    
    if (this.dialogRef) {
      this.dialogRef.close(result);
    } else if (this.modalRef) {
      this.modalRef.closeModalFromChild(result);
    }
  }

  onCancel() {
    console.log('Cancel called');
    if (this.dialogRef) {
      this.dialogRef.close();
    } else if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    }
  }
}
