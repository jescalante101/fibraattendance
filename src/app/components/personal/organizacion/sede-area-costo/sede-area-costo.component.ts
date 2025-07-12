// sede-area-costo.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SedeAreaCostoService } from 'src/app/core/services/sede-area-costo.service';
import { SedeAreaCosto } from 'src/app/models/site-area-ccost.model';
import { MatDialog } from '@angular/material/dialog';
import { AddNewSacComponent } from './add-new-sac/add-new-sac.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';


@Component({
  selector: 'app-sede-area-costo',
  templateUrl: './sede-area-costo.component.html',
  styleUrl: './sede-area-costo.component.css'
})
export class SedeAreaCostoComponent implements OnInit {
  searchTerm = '';
  sites: SedeAreaCosto[] = [];
  filteredSites: SedeAreaCosto[] = [];
  loading = false;
  error = '';

  constructor(
    private sedeAreaCostoService: SedeAreaCostoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadSites();
  }

  loadSites() {
    this.loading = true;
    this.error = '';
    this.sedeAreaCostoService.getAll().subscribe({
      next: (data) => {
        this.sites = data;
        this.filteredSites = [...this.sites];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los sitios';
        this.sites = [];
        this.filteredSites = [];
        this.loading = false;
      }
    });
  }

  onSearchChange() {
    if (!this.searchTerm.trim()) {
      this.filteredSites = [...this.sites];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredSites = this.sites.filter(site => 
      site.siteName.toLowerCase().includes(term) ||
      site.areaName.toLowerCase().includes(term) ||
      site.costCenterName.toLowerCase().includes(term) ||
      site.createdBy.toLowerCase().includes(term)
    );
  }

  onAddNew() {
    const dialogRef = this.dialog.open(AddNewSacComponent, {
      width: '500px',
      data: null
    });
    dialogRef.afterClosed().subscribe((result: SedeAreaCosto | undefined) => {
      if (result) {
        this.sedeAreaCostoService.create(result).subscribe({
          next: () => {
            this.loadSites();
            this.snackBar.open('Registro creado exitosamente', 'Cerrar', 
              { 
                duration: 3000 ,
                verticalPosition: 'top',
                horizontalPosition: 'end',
                panelClass: ['snackbar-success']
              }
            );
          },
          error: () => {
            this.snackBar.open(
              'Error al crear el registro', 
              'Cerrar', 
              { 
                duration: 3000 ,
                verticalPosition: 'top',
                horizontalPosition: 'end',
                panelClass: ['snackbar-error']
              }
            );
          }
        });
      }
    });
  }

  onEdit(site: SedeAreaCosto) {
    const dialogRef = this.dialog.open(AddNewSacComponent, {
      width: '500px',
      data: site
    });
    dialogRef.afterClosed().subscribe((result: SedeAreaCosto | undefined) => {
      if (result) {
        this.sedeAreaCostoService.update(site.siteId, site.areaId, result).subscribe({
          next: (data) => {
            console.log('registro actualizado exitosamente', data);
            this.loadSites();
            this.snackBar.open(
              'Registro actualizado exitosamente', 
              'Cerrar', 
              { 
                duration: 3000 ,
                verticalPosition: 'top',
                horizontalPosition: 'end',
                panelClass: ['snackbar-success']
              }
            );
          },
          error: (error) => {
            console.log('error al actualizar el registro', error);
            this.snackBar.open(
              'Error al actualizar el registro', 
              'Cerrar', 
              {
                 duration: 3000 ,
                 verticalPosition: 'top',
                 horizontalPosition: 'end',
                 panelClass: ['snackbar-error']
              }
            );
          }
        });
      }
    });
  }


  onDisable(site: SedeAreaCosto) {
    console.log('Ver sitio:', site);
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: {
        tipo: 'warning',
        titulo: 'Confirmar desactivación',
        mensaje: `¿Estás seguro de que deseas ${site.active === 'Y' ? 'desactivar' : 'activar'} el registro de la sede ${site.siteName} \n y área${site.areaName}?`,
        confirmacion: true,
        textoConfirmar: 'Desactivar'
      }
    });
    var siteCopy = { ...site };
    siteCopy.active = siteCopy.active === 'Y' ? 'N' : 'Y';
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.sedeAreaCostoService.update(site.siteId, site.areaId, siteCopy).subscribe({
          next: () => {
            this.loadSites();
            this.snackBar.open(
              'Registro desactivado exitosamente',
              'Cerrar',
              {
                duration: 3000,
                verticalPosition: 'top',
                horizontalPosition: 'end',
                panelClass: ['snackbar-success']
              }
            );
          }
        });
      }
    });
  }

  onDelete(site: SedeAreaCosto) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      data: {
        tipo: 'danger',
        titulo: 'Confirmar eliminación',
        mensaje: `¿Estás seguro de que deseas eliminar el registro de la sede ${site.siteName} \n y área${site.areaName}?`,
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.sedeAreaCostoService.delete(site.siteId, site.areaId).subscribe({
          next: () => {
            this.loadSites();
            this.snackBar.open(
              'Registro eliminado exitosamente',
              'Cerrar',
              {
                duration: 3000,
                verticalPosition: 'top',
                horizontalPosition: 'end',
                panelClass: ['snackbar-success']
              }
            );
          },
          error: () => {
            this.snackBar.open(
              'Error al eliminar el registro',
              'Cerrar',
              {
                duration: 3000,
                verticalPosition: 'top',
                horizontalPosition: 'end',
                panelClass: ['snackbar-error']
              }
            );
          }
        });
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackBySiteId(index: number, site: SedeAreaCosto): string {
    return site.siteId;
  }
}