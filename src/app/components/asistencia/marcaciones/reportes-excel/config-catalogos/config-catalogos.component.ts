import { Component, OnInit } from '@angular/core';

interface CatalogConfig {
  codigoSap: string;
  areaDescripcion: string;
  conceptoCodigo?: string;
  conceptoDescripcion?: string;
  sede: string;
}

@Component({
  selector: 'app-config-catalogos',
  templateUrl: './config-catalogos.component.html',
  styleUrls: ['./config-catalogos.component.css']
})
export class ConfigCatalogosComponent implements OnInit {
  
  catalogos: CatalogConfig[] = [];
  loading = false;
  
  // Filtros
  filterText = '';
  selectedArea = '';
  selectedSede = '';
  
  // Datos únicos para filtros
  areas: string[] = [];
  sedes: string[] = [];

  constructor() { }

  ngOnInit(): void {
    this.loadMockData();
    this.generateFilterOptions();
  }

  private loadMockData(): void {
    this.catalogos = [
      {
        codigoSap: 'CH-MFT',
        areaDescripcion: 'MALLA FRUTERA TEJIDA',
        conceptoCodigo: 'VA',
        conceptoDescripcion: 'Vacaciones',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-MOL',
        areaDescripcion: 'MOLINO',
        conceptoCodigo: 'DM',
        conceptoDescripcion: 'Descanso Médico',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-PLANA',
        areaDescripcion: 'EXTRUSORA PLANA',
        conceptoCodigo: 'SUB',
        conceptoDescripcion: 'Subsidio',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-TEX',
        areaDescripcion: 'TEXTIL',
        conceptoCodigo: 'VA',
        conceptoDescripcion: 'Vacaciones',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-ADM',
        areaDescripcion: 'ADMINISTRACIÓN',
        conceptoCodigo: 'DM',
        conceptoDescripcion: 'Descanso Médico',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-LOG',
        areaDescripcion: 'LOGÍSTICA',
        conceptoCodigo: 'SUB',
        conceptoDescripcion: 'Subsidio',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-MAN',
        areaDescripcion: 'MANTENIMIENTO',
        conceptoCodigo: 'VA',
        conceptoDescripcion: 'Vacaciones',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-CAL',
        areaDescripcion: 'CONTROL DE CALIDAD',
        conceptoCodigo: 'DM',
        conceptoDescripcion: 'Descanso Médico',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-VEN',
        areaDescripcion: 'VENTAS',
        conceptoCodigo: 'SUB',
        conceptoDescripcion: 'Subsidio',
        sede: 'SEDE CHILCA 01'
      },
      {
        codigoSap: 'CH-RHH',
        areaDescripcion: 'RECURSOS HUMANOS',
        conceptoCodigo: 'VA',
        conceptoDescripcion: 'Vacaciones',
        sede: 'SEDE CHILCA 01'
      }
    ];
  }

  private generateFilterOptions(): void {
    this.areas = [...new Set(this.catalogos.map(c => c.areaDescripcion))].sort();
    this.sedes = [...new Set(this.catalogos.map(c => c.sede))].sort();
  }

  get filteredCatalogos(): CatalogConfig[] {
    return this.catalogos.filter(catalogo => {
      const matchesText = !this.filterText || 
        catalogo.codigoSap.toLowerCase().includes(this.filterText.toLowerCase()) ||
        catalogo.areaDescripcion.toLowerCase().includes(this.filterText.toLowerCase()) ||
        (catalogo.conceptoDescripcion && catalogo.conceptoDescripcion.toLowerCase().includes(this.filterText.toLowerCase()));
      
      const matchesArea = !this.selectedArea || catalogo.areaDescripcion === this.selectedArea;
      const matchesSede = !this.selectedSede || catalogo.sede === this.selectedSede;
      
      return matchesText && matchesArea && matchesSede;
    });
  }

  clearFilters(): void {
    this.filterText = '';
    this.selectedArea = '';
    this.selectedSede = '';
  }

  exportToExcel(): void {
    console.log('Exportando catálogos a Excel...');
    // Implementar exportación
  }

  addNewCatalog(): void {
    console.log('Agregar nuevo catálogo...');
    // Implementar modal para agregar
  }

  editCatalog(catalogo: CatalogConfig): void {
    console.log('Editar catálogo:', catalogo);
    // Implementar edición
  }

  deleteCatalog(catalogo: CatalogConfig): void {
    console.log('Eliminar catálogo:', catalogo);
    // Implementar eliminación
  }

  trackByCatalogo(index: number, item: CatalogConfig): any {
    return item.codigoSap;
  }
}