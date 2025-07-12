import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  @Output() formSubmit = new EventEmitter<SedeAreaCosto>();
  form: FormGroup;
  sedes: CategoriaAuxiliar[] = [];
  areas: RhArea[] = [];
  costCenters: CostCenter[] = [];
  loading = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService,
    private costCenterService: CostCenterService,
    public dialogRef?: MatDialogRef<AddNewSacComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: SedeAreaCosto
  ) {
    this.form = this.fb.group({
      siteId: ['', Validators.required],
      siteName: [{ value: '', disabled: true }, Validators.required],
      areaId: ['', Validators.required],
      areaName: [{ value: '', disabled: true }, Validators.required],
      costCenterId: ['', Validators.required],
      costCenterName: [{ value: '', disabled: true }, Validators.required],
      observation: [''],
      creationDate: [new Date().toISOString().substring(0, 16), Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadSelects();
    if (this.dataToEdit || this.data) {
      const model = this.dataToEdit || this.data;
      this.isEdit = true;
      this.form.patchValue({
        ...model,
        creationDate: model?.creationDate?.substring(0, 16)
      });
    }
    this.form.get('siteId')?.valueChanges.subscribe(id => {
      const sede = this.sedes.find(s => s.categoriaAuxiliarId === id);
      this.form.get('siteName')?.setValue(sede?.descripcion || '');
    });
    this.form.get('areaId')?.valueChanges.subscribe(id => {
      const area = this.areas.find(a => a.areaId === id);
      this.form.get('areaName')?.setValue(area?.descripcion || '');
    });
    this.form.get('costCenterId')?.valueChanges.subscribe(id => {
      const cc = this.costCenters.find(c => c.ccostoId === id);
      this.form.get('costCenterName')?.setValue(cc?.descripcion || '');
    });
  }

  loadSelects() {
    this.loading = true;
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe(sedes => {
      this.sedes = sedes;
    });
    this.rhAreaService.getAreas().subscribe(areas => {
      this.areas = areas;
    });
    this.costCenterService.getAll().subscribe(ccs => {
      this.costCenters = ccs;
      this.loading = false;
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();

    // Buscar los nombres según los IDs seleccionados
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === value.siteId);
    const area = this.areas.find(a => a.areaId === value.areaId);
    const cc = this.costCenters.find(c => c.ccostoId === value.costCenterId);

    const result: SedeAreaCosto = {
      ...value,
      siteName: sede?.descripcion || '',
      areaName: area?.descripcion || '',
      costCenterName: cc?.descripcion || '',
      createdBy: 'Admin',
      active: 'Y',
    };
    this.formSubmit.emit(result);
    if (this.dialogRef) this.dialogRef.close(result);
  }

  onCancel() {
    if (this.dialogRef) this.dialogRef.close();
  }
}
