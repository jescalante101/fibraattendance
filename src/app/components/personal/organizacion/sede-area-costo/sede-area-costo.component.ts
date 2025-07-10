// sede-area-costo.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Site {
  siteId: string;
  areaId: string;
  observation: string;
  siteName: string;
  areaName: string;
  createdBy: string;
  creationDate: string;
  costCenterId: string;
  costCenterName: string;
  active: string;
}

@Component({
  selector: 'app-sede-area-costo',
  templateUrl: './sede-area-costo.component.html',
  styleUrl: './sede-area-costo.component.css'
})
export class SedeAreaCostoComponent implements OnInit {
  searchTerm = '';
  sites: Site[] = [];
  filteredSites: Site[] = [];

  ngOnInit() {
    this.loadSites();
  }

  loadSites() {
    // Datos de ejemplo - reemplaza con tu servicio
    this.sites = [
      {
        siteId: "000000000000003",
        areaId: "009",
        observation: "Admin prueba",
        siteName: "SEDE CHILCA 02",
        areaName: "RASCHEL",
        createdBy: "admin",
        creationDate: "2025-07-09T15:44:06.883",
        costCenterId: "000000000000053",
        costCenterName: "Chilca 2 Raschell",
        active: "Y"
      },
      {
        siteId: "000000000000004",
        areaId: "010",
        observation: "Sitio principal",
        siteName: "SEDE LIMA 01",
        areaName: "PRODUCCIÓN",
        createdBy: "supervisor",
        creationDate: "2025-07-08T10:30:00.000",
        costCenterId: "000000000000054",
        costCenterName: "Lima Producción",
        active: "Y"
      },
      {
        siteId: "000000000000005",
        areaId: "011",
        observation: "En mantenimiento",
        siteName: "SEDE AREQUIPA 01",
        areaName: "ALMACÉN",
        createdBy: "admin",
        creationDate: "2025-07-07T14:15:00.000",
        costCenterId: "000000000000055",
        costCenterName: "Arequipa Almacén",
        active: "N"
      }
    ];
    
    this.filteredSites = [...this.sites];
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
    console.log('Añadir nuevo sitio');
    // Implementa la navegación o apertura de modal
  }

  onEdit(site: Site) {
    console.log('Editar sitio:', site);
    // Implementa la navegación o apertura de modal de edición
  }

  onView(site: Site) {
    console.log('Ver sitio:', site);
    // Implementa la navegación o apertura de modal de vista
  }

  onDelete(site: Site) {
    console.log('Eliminar sitio:', site);
    // Implementa la confirmación y eliminación
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

  trackBySiteId(index: number, site: Site): string {
    return site.siteId;
  }
}