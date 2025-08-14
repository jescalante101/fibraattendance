import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SedeAreaCostoService } from 'src/app/core/services/sede-area-costo.service';
import { SedeAreaCosto } from 'src/app/models/site-area-ccost.model';
import { MatDialog } from '@angular/material/dialog';
import { AddNewSacComponent } from './add-new-sac/add-new-sac.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalService } from 'src/app/shared/modal/modal.service';

interface GroupedSite {
  siteName: string;
  siteId: string;
  relations: SedeAreaCosto[];
  relationCount: number;
}

export type DisplayItem = (GroupedSite & { isGroup: true }) | (SedeAreaCosto & { isGroup: false });

@Component({
  selector: 'app-sede-area-costo',
  templateUrl: './sede-area-costo.component.html',
  styleUrl: './sede-area-costo.component.css'
})
export class SedeAreaCostoComponent implements OnInit {
  searchTerm = '';
  sites: SedeAreaCosto[] = [];
  groupedSites: GroupedSite[] = [];
  displayItems: DisplayItem[] = [];
  expandedSites = new Set<string>();
  loading = false;
  error = '';
  lastUpdate: string = new Date().toLocaleString('es-ES');

  constructor(
    private sedeAreaCostoService: SedeAreaCostoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private modalService: ModalService
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
        this.applySearchFilter();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los sitios';
        this.sites = [];
        this.applySearchFilter();
        this.loading = false;
      }
    });
  }

  applySearchFilter() {
    const term = this.searchTerm.trim().toLowerCase();
    const allGroups = this.createGroupedSites(this.sites);

    if (!term) {
      this.groupedSites = allGroups;
      this.expandedSites.clear();
    } else {
      this.groupedSites = allGroups.filter(group => {
        const groupNameMatch = group.siteName.toLowerCase().includes(term);
        const relationMatch = group.relations.some(relation =>
          relation.areaName.toLowerCase().includes(term) ||
          relation.costCenterName.toLowerCase().includes(term) ||
          relation.createdBy.toLowerCase().includes(term)
        );
        return groupNameMatch || relationMatch;
      });

      this.expandedSites.clear();
      this.groupedSites.forEach(group => this.expandedSites.add(group.siteName));
    }

    this.updateDisplayItems();
  }

  createGroupedSites(sites: SedeAreaCosto[]): GroupedSite[] {
    const groups = new Map<string, { siteId: string, relations: SedeAreaCosto[] }>();
    sites.forEach(site => {
      if (!groups.has(site.siteName)) {
        groups.set(site.siteName, { siteId: site.siteId, relations: [] });
      }
      groups.get(site.siteName)!.relations.push(site);
    });

    return Array.from(groups.entries()).map(([siteName, data]) => ({
      siteName,
      siteId: data.siteId,
      relations: data.relations,
      relationCount: data.relations.length
    }));
  }

  updateDisplayItems() {
    this.displayItems = [];
    this.groupedSites.forEach(group => {
      this.displayItems.push({ ...group, isGroup: true });
      if (this.expandedSites.has(group.siteName)) {
        group.relations.forEach(relation => {
          this.displayItems.push({ ...relation, isGroup: false });
        });
      }
    });
  }

  toggleGroup(siteName: string) {
    if (this.expandedSites.has(siteName)) {
      this.expandedSites.delete(siteName);
    } else {
      this.expandedSites.add(siteName);
    }
    this.updateDisplayItems();
  }

  isGroupExpanded(siteName: string): boolean {
    return this.expandedSites.has(siteName);
  }

  onSearchChange() {
    this.applySearchFilter();
  }

  onAddNew() {
    this.modalService.open({
      title: 'Registrar Nueva Relación',
      componentType: AddNewSacComponent,
      componentData: null,
      width: '700px'
    }).then((result: SedeAreaCosto[] | null) => {
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
    this.modalService.open({
      title: 'Editar Relación',
      componentType: AddNewSacComponent,
      componentData: site,
      width: '700px'
    }).then((result: SedeAreaCosto | null) => {
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
        mensaje: `¿Estás seguro de que deseas ${site.active === 'Y' ? 'desactivar' : 'activar'} el registro de la sede ${site.siteName} 
 y área${site.areaName}?`,
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
        mensaje: `¿Estás seguro de que deseas eliminar el registro de la sede ${site.siteName} 
 y área${site.areaName}?`,
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

 

  trackByItem(index: number, item: DisplayItem): string {
    return item.isGroup ? item.siteId : `${item.siteId}-${item.areaId}-${item.costCenterId}`;
  }

  getActiveCount(): number {
    return this.sites.filter(site => site.active === 'Y').length;
  }

  getInactiveCount(): number {
    return this.sites.filter(site => site.active !== 'Y').length;
  }

  getActiveCountForSite(siteName: string): number {
    return this.sites.filter(site => site.siteName === siteName && site.active === 'Y').length;
  }
}