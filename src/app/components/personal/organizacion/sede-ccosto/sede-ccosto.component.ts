import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SedeCcostoService } from 'src/app/core/services/sede-ccosto.service';
import { SedeCcosto, SedeCcostoInsert, SedeCcostoUpdate } from 'src/app/core/models/sede-ccosto.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { CostCenterService, CostCenter } from 'src/app/core/services/cost-center.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { HeaderConfigService } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { SedeCcostoFormModalComponent, SedeCcostoFormResult, SedeCcostoData } from './sede-ccosto-form-modal/sede-ccosto-form-modal.component';
import { AuthService } from '../../../../core/services/auth.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces for tree data
interface GroupedSite {
  siteName: string;
  siteId: string;
  relations: SedeCcosto[];
  relationCount: number;
}

export type DisplayItem = (GroupedSite & { isGroup: true }) | (SedeCcosto & { isGroup: false });

@Component({
  selector: 'app-sede-ccosto',
  templateUrl: './sede-ccosto.component.html',
  styleUrls: ['./sede-ccosto.component.css']
})
export class SedeCcostoComponent implements OnInit,OnDestroy {
  form: FormGroup;
  sedeCcostoList: SedeCcosto[] = [];
  sedeCcostoListFiltrada: SedeCcosto[] = [];
  sedes: CategoriaAuxiliar[] = [];
  ccostos: CostCenter[] = [];
  editing = false;
  selected?: SedeCcosto;
  loading = false;
  error = '';
  filtroTexto = '';

  // Tree data properties
  groupedSites: GroupedSite[] = [];
  displayItems: DisplayItem[] = [];
  expandedSites = new Set<string>();

  // Dropdown states for Flowbite components
  showSedeDropdown = false;
  showCcostoDropdown = false;

  // Filtered arrays for autocomplete
  filteredSedes: CategoriaAuxiliar[] = [];
  filteredCcostos: CostCenter[] = [];

  //header config
  headerConfig: any;

  //destroy subject for unsubscribing
  private destroy$ = new Subject<void>();

  //
  userLogin:string='';

  constructor(
    private fb: FormBuilder,
    private sedeCcostoService: SedeCcostoService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private costCenterService: CostCenterService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private headerConfigService: HeaderConfigService,
    private modalService: ModalService,
    private AuthService: AuthService
  ) {
    this.form = this.fb.group({
      siteId: ['', Validators.required],
      costCenterId: ['', Validators.required],
      sedeFilter: [''],
      ccostoFilter: [''],
      observation: [''],
      creationDate: [{ value: new Date().toISOString().substring(0, 16), disabled: true }, Validators.required],
    });
  }

  ngOnInit() {

    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        console.log('Header config cambió:', config);
        this.headerConfig = config;
        // Recargar sedes y centros de costo cuando cambie la configuración
       this.loadSedeCcosto();
    this.loadSedes();
    this.loadCostCenters();

      });    

    this.getUserCurrent();
  }

  exportToExcel() {
    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    this.styleExcelSheet(worksheet);

    const workbook = { Sheets: { 'SedeCcosto': worksheet }, SheetNames: ['SedeCcosto'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'reporte_sede_ccosto');
  }

  private getGridDataForExport(): any[] {
    return this.sedeCcostoList.map(item => ({
      'Sede': item.siteName,
      'Centro de Costo': item.costCenterName,
      'Observación': item.observation,
      'Estado': item.active === 'Y' ? 'Activo' : 'Inactivo',
      'Creado por': item.createdBy,
      'Fecha de Creación': new Date(item.createdAt).toLocaleDateString('es-ES')
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
      { wch: 30 }, // Centro de Costo
      { wch: 30 }, // Observación
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
    const head = [['Sede', 'Centro de Costo', 'Observación', 'Estado', 'Creado por', 'Fecha de Creación']];
    const body = dataToExport.map(row => [
      row.Sede,
      row['Centro de Costo'],
      row.Observación,
      row.Estado,
      row['Creado por'],
      row['Fecha de Creación']
    ]);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Reporte de Sede - C. Costo', 14, 22);

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

    doc.save('reporte_sede_ccosto_' + new Date().getTime() + '.pdf');
    this.toastService.success('Éxito', 'El reporte ha sido exportado a PDF.');
  }

  private getUserCurrent(){
    const user= this.AuthService.getCurrentUser();
    if(user){
      this.userLogin=user.username;
    }
  }


  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
  }

  loadSedeCcosto() {
    this.loading = true;
    this.error = '';
    this.sedeCcostoService.getAll().subscribe({
      next: (data) => {
        this.sedeCcostoList = data;
        this.sedeCcostoListFiltrada = [...data];
        this.applySearchFilter();
        this.loading = false;
      },
      error: (err) => {
        if (err.status === 404 || err.status === 400) {
          this.sedeCcostoList = [];
          this.sedeCcostoListFiltrada = [];
          this.applySearchFilter();
          this.loading = false;
          this.error = '';
          return;
        } else {
          this.error = 'Error al cargar los datos';
          this.sedeCcostoList = [];
          this.sedeCcostoListFiltrada = [];
          this.applySearchFilter();
          this.loading = false;
        }
      }
    });
  }

  loadSedes() {
    this.categoriaAuxiliarService.getCategoriasAuxiliar().subscribe(sedes => {
      this.sedes = sedes;
      this.filteredSedes = [...this.sedes];
    });
  }

  loadCostCenters() {

    const companiaId = this.headerConfig?.selectedEmpresa?.companiaId?.toString() || '';

    this.costCenterService.getAll(companiaId).subscribe(ccs => {
      this.ccostos = ccs;
      this.filteredCcostos = [...this.ccostos];
    });
  }

  

  onEdit(item: SedeCcosto) {
    this.modalService.open({
      title: 'Editar Relación',
      componentType: SedeCcostoFormModalComponent,
      componentData: {
        sedeCcostoData: {
          sedeCcostoId: item.siteId + '-' + item.costCenterId,
          siteId: item.siteId,
          costCenterId: item.costCenterId,
          observation: item.observation,
          createdAt: item.createdAt,
          createdBy: item.createdBy,
          updateDate: item.updateDate,
          updatedBy: item.updatedBy,
          active: item.active
        },
        isEditMode: true,
        sedes: this.sedes,
        ccostos: this.ccostos
      },
      width: '550px',
      height: '700px'
    }).then((result: SedeCcostoFormResult | null) => {
      if (result && result.action === 'save' && result.data) {
        this.updateSedeCcosto(result.data, item);
      }
    });
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
            this.toastService.success('Registro eliminado', `La relación de ${item.siteName} - ${item.costCenterName} fue eliminada`);
            this.loadSedeCcosto();
          },
          error: () => this.toastService.error('Error al eliminar', 'No se pudo eliminar la relación sede-ccosto')
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
            this.toastService.success(
              item.active === 'Y' ? 'Registro desactivado' : 'Registro activado',
              `El estado de ${item.siteName} - ${item.costCenterName} fue ${item.active === 'Y' ? 'desactivado' : 'activado'}`
            );
            this.loadSedeCcosto();
          },
          error: () => this.toastService.error('Error al actualizar', 'No se pudo cambiar el estado de la relación')
        });
      }
    });
  }

  // Flowbite autocomplete methods
  onSedeFilterChange(event: any): void {
    const value = event.target.value.toLowerCase();
    if (!value.trim()) {
      this.filteredSedes = [...this.sedes];
    } else {
      this.filteredSedes = this.sedes.filter(sede => 
        sede.descripcion.toLowerCase().includes(value)
      );
    }
  }

  onCcostoFilterChange(event: any): void {
    const value = event.target.value.toLowerCase();
    if (!value.trim()) {
      this.filteredCcostos = [...this.ccostos];
    } else {
      this.filteredCcostos = this.ccostos.filter(ccosto => 
        ccosto.descripcion.toLowerCase().includes(value)
      );
    }
  }

  onSedeSelected(sede: CategoriaAuxiliar): void {
    this.form.patchValue({ 
      siteId: sede.categoriaAuxiliarId,
      sedeFilter: sede.descripcion
    });
    this.showSedeDropdown = false;
  }

  onCcostoSelected(ccosto: CostCenter): void {
    this.form.patchValue({ 
      costCenterId: ccosto.ccostoId,
      ccostoFilter: ccosto.descripcion
    });
    this.showCcostoDropdown = false;
  }

  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 150);
  }

  onCcostoBlur(): void {
    setTimeout(() => {
      this.showCcostoDropdown = false;
    }, 150);
  }

  // Helper methods for statistics
  getActiveCount(): number {
    return this.sedeCcostoList.filter(item => item.active === 'Y').length;
  }

  getInactiveCount(): number {
    return this.sedeCcostoList.filter(item => item.active !== 'Y').length;
  }

  // Abrir modal para nueva relación
  openNewSedeCcostoModal() {
    this.modalService.open({
      title: 'Nueva Relación',
      componentType: SedeCcostoFormModalComponent,
      componentData: {
        sedeCcostoData: null,
        isEditMode: false,
        sedes: this.sedes,
        ccostos: this.ccostos
      },
      width: '550px',
      height: '700px'
    }).then((result: SedeCcostoFormResult | null) => {
      if (result && result.action === 'save' && result.data) {
        this.createSedeCcosto(result.data);
      }
    });
  }

  // Crear relación sede-ccosto
  private createSedeCcosto(sedeCcostoData: SedeCcostoData) {
    this.loading = true;
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === sedeCcostoData.siteId);
    const ccosto = this.ccostos.find(c => c.ccostoId === sedeCcostoData.costCenterId);
    
    const sedeCcosto: SedeCcostoInsert = {

      siteId: sedeCcostoData.siteId,
      siteName: sede?.descripcion || '',
      costCenterId: sedeCcostoData.costCenterId,
      costCenterName: ccosto?.descripcion || '',
      observation: sedeCcostoData.observation || '',
      createdBy: this.userLogin,
      createdAt: sedeCcostoData.creationDate || new Date().toISOString(),
      active: 'Y',
    };

    this.sedeCcostoService.create(sedeCcosto).subscribe({
      next: () => {
        this.toastService.success('Relación creada', 'La relación sede-ccosto se creó correctamente');
        this.loadSedeCcosto();
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Error al crear', 'No se pudo crear la relación sede-ccosto');
      }
    });
  }

  // Actualizar relación sede-ccosto
  private updateSedeCcosto(sedeCcostoData: SedeCcostoData, originalItem: SedeCcosto) {
    this.loading = true;
    const sede = this.sedes.find(s => s.categoriaAuxiliarId === sedeCcostoData.siteId);
    const ccosto = this.ccostos.find(c => c.ccostoId === sedeCcostoData.costCenterId);
    
    const sedeCcosto: SedeCcostoUpdate = {
      siteName: sede?.descripcion || '',
      costCenterName: ccosto?.descripcion || '',
      observation: sedeCcostoData.observation || '',
      updatedBy: this.userLogin,
      updateDate: new Date().toISOString(),
      active: sedeCcostoData.active || 'Y',
    };

    this.sedeCcostoService.update(originalItem.siteId, originalItem.costCenterId, sedeCcosto).subscribe({
      next: () => {
        this.toastService.success('Relación actualizada', 'La relación sede-ccosto se actualizó correctamente');
        this.loadSedeCcosto();
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Error al actualizar', 'No se pudo actualizar la relación sede-ccosto');
      }
    });
  }

  // TrackBy functions for performance
  trackBySedeId(index: number, sede: CategoriaAuxiliar): string {
    return sede.categoriaAuxiliarId;
  }

  trackByCcostoId(index: number, ccosto: CostCenter): string {
    return ccosto.ccostoId;
  }

  trackBySedeCcostoId(index: number, item: SedeCcosto): string {
    return `${item.siteId}-${item.costCenterId}`;
  }

  // Métodos para filtrado local y agrupación
  filtrarDatos(): void {
    this.applySearchFilter();
  }

  applySearchFilter() {
    const term = this.filtroTexto.trim().toLowerCase();
    const allGroups = this.createGroupedSites(this.sedeCcostoList);

    if (!term) {
      this.groupedSites = allGroups;
      this.expandedSites.clear();
    } else {
      this.groupedSites = allGroups.filter(group => {
        const groupNameMatch = group.siteName.toLowerCase().includes(term);
        const relationMatch = group.relations.some(relation =>
          relation.costCenterName.toLowerCase().includes(term) ||
          relation.siteId.toLowerCase().includes(term) ||
          relation.costCenterId.toLowerCase().includes(term) ||
          (relation.observation && relation.observation.toLowerCase().includes(term))
        );
        return groupNameMatch || relationMatch;
      });

      // Auto-expand groups when searching
      this.expandedSites.clear();
      this.groupedSites.forEach(group => this.expandedSites.add(group.siteName));
    }

    this.updateDisplayItems();
  }

  createGroupedSites(sites: SedeCcosto[]): GroupedSite[] {
    const groups = new Map<string, { siteId: string, relations: SedeCcosto[] }>();
    
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

  getActiveCountForSite(siteName: string): number {
    return this.sedeCcostoList.filter(site => site.siteName === siteName && site.active === 'Y').length;
  }

  trackByItem(index: number, item: DisplayItem): string {
    return item.isGroup ? item.siteId : item.siteId + '-' + item.costCenterId;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  limpiarFiltro(): void {
    this.filtroTexto = '';
    this.applySearchFilter();
  }
}
