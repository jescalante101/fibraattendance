import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SedeCcostoService } from 'src/app/core/services/sede-ccosto.service';
import { SedeCcosto, SedeCcostoInsert, SedeCcostoUpdate } from 'src/app/core/models/sede-ccosto.model';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { CostCenterService, CostCenter } from 'src/app/core/services/cost-center.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { HeaderConfigService } from 'src/app/core/services/header-config.service';
import { Subject, takeUntil } from 'rxjs';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { SedeCcostoFormModalComponent, SedeCcostoFormResult, SedeCcostoData } from './sede-ccosto-form-modal/sede-ccosto-form-modal.component';
import { AuthService } from '../../../../core/services/auth.service';

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
    private snackBar: MatSnackBar,
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
        this.snackBar.open('Relación creada exitosamente', 'Cerrar', { duration: 3000 });
        this.loadSedeCcosto();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al crear la relación', 'Cerrar', { duration: 3000 });
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
        this.snackBar.open('Relación actualizada exitosamente', 'Cerrar', { duration: 3000 });
        this.loadSedeCcosto();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Error al actualizar la relación', 'Cerrar', { duration: 3000 });
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
