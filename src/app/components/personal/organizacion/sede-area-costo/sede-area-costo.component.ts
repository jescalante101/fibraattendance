import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SedeAreaCostoService } from 'src/app/core/services/sede-area-costo.service';
import { SedeAreaCosto } from 'src/app/models/site-area-ccost.model';
import { MatDialog } from '@angular/material/dialog';
import { AddNewSacComponent } from './add-new-sac/add-new-sac.component';
import { ToastService } from 'src/app/shared/services/toast.service';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    private toastService: ToastService,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.loadSites();
  }

  exportToExcel() {
    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    this.styleExcelSheet(worksheet);

    const workbook = { Sheets: { 'SedeAreaCosto': worksheet }, SheetNames: ['SedeAreaCosto'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'reporte_sede_area_costo');
  }

  private getGridDataForExport(): any[] {
    return this.sites.map(site => ({
      'Sede': site.siteName,
      'Área': site.areaName,
      'Centro de Costo': site.costCenterName,
      'Estado': site.active === 'Y' ? 'Activo' : 'Inactivo',
      'Creado por': site.createdBy,
      'Fecha de Creación': new Date(site.createdAt).toLocaleDateString('es-ES')
    }));
  }

  private styleExcelSheet(worksheet: XLSX.WorkSheet) {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0A6ED1" } }, // Fiori Primary
      alignment: { horizontal: "center", vertical: "center" }
    };

    const columnWidths = [
      { wch: 25 }, // Sede
      { wch: 25 }, // Área
      { wch: 30 }, // Centro de Costo
      { wch: 15 }, // Estado
      { wch: 20 }, // Creado por
      { wch: 20 }  // Fecha de Creación
    ];
    worksheet['!cols'] = columnWidths;

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:F1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (worksheet[address]) {
        worksheet[address].s = headerStyle;
      }
    }
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + '.xlsx');
    this.toastService.success('Éxito', 'El reporte ha sido exportado a Excel.');
  }

  exportToPdf() {
    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const doc = new jsPDF();
    const head = [['Sede', 'Área', 'Centro de Costo', 'Estado', 'Creado por', 'Fecha de Creación']];
    const body = dataToExport.map(row => [
      row.Sede,
      row.Área,
      row['Centro de Costo'],
      row.Estado,
      row['Creado por'],
      row['Fecha de Creación']
    ]);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Reporte de Sede - Área - C. Costo', 14, 22);

    autoTable(doc, {
      head: head,
      body: body,
      styles: {
        halign: 'center',
        fontSize: 8
      },
      headStyles: {
        fillColor: [10, 110, 209] // fiori-primary
      },
      startY: 30
    });

    doc.save('reporte_sede_area_costo_' + new Date().getTime() + '.pdf');
    this.toastService.success('Éxito', 'El reporte ha sido exportado a PDF.');
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
            this.toastService.success('Registro creado', 'La relación sede-área-costo se creó correctamente');
          },
          error: () => {
            this.toastService.error('Error al crear', 'No se pudo crear la relación sede-área-costo');
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
            this.toastService.success('Registro actualizado', 'La relación sede-área-costo se actualizó correctamente');
          },
          error: (error) => {
            console.log('error al actualizar el registro', error);
            this.toastService.error('Error al actualizar', 'No se pudo actualizar la relación sede-área-costo');
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
            this.toastService.success(
              site.active === 'Y' ? 'Registro desactivado' : 'Registro activado',
              `El estado de ${site.siteName} - ${site.areaName} fue ${site.active === 'Y' ? 'desactivado' : 'activado'}`
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
            this.toastService.success('Registro eliminado', `La relación de ${site.siteName} - ${site.areaName} fue eliminada`);
          },
          error: () => {
            this.toastService.error('Error al eliminar', 'No se pudo eliminar la relación sede-área-costo');
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