import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SedeCcostoService } from 'src/app/core/services/sede-ccosto.service';
import { SedeCcosto } from 'src/app/core/models/sede-ccosto.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { CostCenterService, CostCenter } from 'src/app/core/services/cost-center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';

@Component({
  selector: 'app-sede-ccosto',
  templateUrl: './sede-ccosto.component.html',
  styleUrls: ['./sede-ccosto.component.css']
})
export class SedeCcostoComponent implements OnInit {
  form: FormGroup;
  sedeCcostoList: SedeCcosto[] = [];
  sedes: CategoriaAuxiliar[] = [];
  ccostos: CostCenter[] = [];
  editing = false;
  selected?: SedeCcosto;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private sedeCcostoService: SedeCcostoService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private costCenterService: CostCenterService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      siteId: ['', Validators.required],
      costCenterId: ['', Validators.required],
      observation: [''],
      creationDate: [{ value: new Date().toISOString().substring(0, 16), disabled: true }, Validators.required],
    });
  }

  ngOnInit() {
    this.loadSedeCcosto();
    this.loadSedes();
    this.loadCostCenters();
  }

  loadSedeCcosto() {
    this.loading = true;
    this.error = '';
    this.sedeCcostoService.getAll().subscribe({
      next: (data) => {
        this.sedeCcostoList = data;
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 404 || err.status === 400) {
          this.sedeCcostoList = [];
          this.loading = false;
          this.error = '';
          return;
        } else {
          this.error = 'Error al cargar los datos';
          this.sedeCcostoList = [];
          this.loading = false;
        }
      }
    });
  }

  loadSedes() {
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe(sedes => {
      this.sedes = sedes;
    });
  }

  loadCostCenters() {
    this.costCenterService.getAll().subscribe(ccs => {
      this.ccostos = ccs;
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === value.siteId);
    const ccosto = this.ccostos.find(c => c.ccostoId === value.costCenterId);
    const model: SedeCcosto = {
      siteId: value.siteId,
      siteName: sede?.descripcion || '',
      costCenterId: value.costCenterId,
      costCenterName: ccosto?.descripcion || '',
      observation: value.observation,
      createdBy: 'Admin',
      creationDate: value.creationDate || new Date().toISOString(),
      active: 'Y',
    };
    if (this.editing && this.selected) {
      this.sedeCcostoService.update(this.selected.siteId, this.selected.costCenterId, model).subscribe({
        next: () => {
          this.snackBar.open('Registro actualizado', 'Cerrar', { duration: 3000 });
          this.loadSedeCcosto();
          this.cancelEdit();
        },
        error: () => this.snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 })
      });
    } else {
      this.sedeCcostoService.create(model).subscribe({
        next: () => {
          this.snackBar.open('Registro creado', 'Cerrar', { duration: 3000 });
          this.loadSedeCcosto();
          this.form.reset({ creationDate: new Date().toISOString().substring(0, 16) });
        },
        error: () => this.snackBar.open('Error al crear', 'Cerrar', { duration: 3000 })
      });
    }
  }

  onEdit(item: SedeCcosto) {
    this.editing = true;
    this.selected = item;
    this.form.patchValue({
      siteId: item.siteId,
      costCenterId: item.costCenterId,
      observation: item.observation,
      creationDate: item.creationDate?.substring(0, 16)
    });
  }

  cancelEdit() {
    this.editing = false;
    this.selected = undefined;
    this.form.reset({ creationDate: new Date().toISOString().substring(0, 16) });
  }

  onDelete(item: SedeCcosto) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: {
        tipo: 'warning',
        titulo: 'Confirmar eliminación',
        mensaje: `¿Estás seguro de que deseas eliminar la relación de la sede ${item.siteName} con el centro de costo ${item.costCenterName}?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.sedeCcostoService.delete(item.siteId, item.costCenterId).subscribe({
          next: () => {
            this.snackBar.open('Registro eliminado', 'Cerrar', { 
              duration: 3000,
              panelClass: 'snackbar-success',
              horizontalPosition: 'end',
              verticalPosition: 'top'
            });
            this.loadSedeCcosto();
          },
          error: () => this.snackBar.open('Error al eliminar', 'Cerrar', { 
            duration: 3000,
            panelClass: 'snackbar-error',
            horizontalPosition: 'end',
            verticalPosition: 'top'
          })
        });
      }
    });
  }

  onToggleActive(item: SedeCcosto) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: {
        tipo: 'warning',
        titulo: item.active === 'Y' ? 'Confirmar desactivación' : 'Confirmar activación',
        mensaje: `¿Estás seguro de que deseas ${item.active === 'Y' ? 'desactivar' : 'activar'} la relación de la sede ${item.siteName} con el centro de costo ${item.costCenterName}?`,
        confirmacion: true,
        textoConfirmar: item.active === 'Y' ? 'Desactivar' : 'Activar'
      }
    });
    const updated = { ...item, active: item.active === 'Y' ? 'N' : 'Y' };
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.sedeCcostoService.update(item.siteId, item.costCenterId, updated).subscribe({
          next: () => {
            this.snackBar.open(
              item.active === 'Y' ? 'Registro desactivado' : 'Registro activado',
              'Cerrar',
              { 
                duration: 3000,
                panelClass: 'snackbar-success',
                horizontalPosition: 'end',
                verticalPosition: 'top'
              }
            );
            this.loadSedeCcosto();
          },
          error: () => this.snackBar.open('Error al actualizar el estado', 'Cerrar', { 
            duration: 3000,
            panelClass: 'snackbar-error',
            horizontalPosition: 'end',
            verticalPosition: 'top'
          })
        });
      }
    });
  }
}
