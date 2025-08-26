import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';

// Services
import { EmployeeScheduleAssignmentService, EmployeeScheduleAssignment } from 'src/app/core/services/employee-schedule-assignment.service';
import { PersonService, EmployeesWithoutShift } from 'src/app/core/services/person.service';
import { RhAreaService, RhArea } from 'src/app/core/services/rh-area.service';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from 'src/app/core/services/categoria-auxiliar.service';
import { HeaderConfigService } from 'src/app/core/services/header-config.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { Employee } from 'src/app/components/personal/empleado/empleado/model/employeeDto';

// Extender Employee para incluir campos calculados
interface EmployeeWithFormatted extends Employee {
  fullNameFormatted?: string;
}

// Shared Components
import { DateRange } from 'src/app/shared/components/date-range-picker/date-range-picker.component';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';

// Export libraries
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

@Component({
  selector: 'app-reporte-personal-turnos',
  templateUrl: './reporte-personal-turnos.component.html',
  styleUrls: ['./reporte-personal-turnos.component.css']
})
export class ReportePersonalTurnosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // ============================================================================
  // DATOS PRINCIPALES
  // ============================================================================
  
  personalConTurno: EmployeeScheduleAssignment[] = [];
  personalSinTurno: EmployeeWithFormatted[] = [];
  
  // ============================================================================
  // FILTROS Y CONTROLES
  // ============================================================================
  
  // Date Range Control (solo afecta personal CON turno)
  dateRangeControl = new FormControl<DateRange | null>(null, Validators.required);
  
  // Autocompletes
  allSedes: CategoriaAuxiliar[] = [];
  filteredSedes: CategoriaAuxiliar[] = [];
  selectedSede: CategoriaAuxiliar | null = null;
  sedeFilterTerm = '';
  showSedeDropdown = false;
  
  allAreas: RhArea[] = [];
  filteredAreas: RhArea[] = [];
  selectedArea: RhArea | null = null;
  areaFilterTerm = '';
  showAreaDropdown = false;
  
  // ============================================================================
  // PAGINACIÓN INDEPENDIENTE
  // ============================================================================
  
  // Personal CON turno
  pageConTurno = 1;
  pageSizeConTurno = 50;
  totalConTurno = 0;
  
  // Personal SIN turno
  pageSinTurno = 1;
  pageSizeSinTurno = 50;
  totalSinTurno = 0;
  
  // ============================================================================
  // AG-GRID CONFIGURACIÓN
  // ============================================================================
  
  @ViewChild('gridConTurno', { static: false }) gridConTurno!: AgGridAngular;
  @ViewChild('gridSinTurno', { static: false }) gridSinTurno!: AgGridAngular;
  
  gridOptionsConTurno: GridOptions = createFioriGridOptions();
  gridOptionsSinTurno: GridOptions = createFioriGridOptions();
  
  columnsConTurno: ColDef[] = [];
  columnsSinTurno: ColDef[] = [];
  
  // ============================================================================
  // ESTADOS DE UI
  // ============================================================================
  
  loading = false;
  loadingConTurno = false;
  loadingSinTurno = false;
  isExporting = false;
  
  constructor(
    private employeeScheduleService: EmployeeScheduleAssignmentService,
    private personService: PersonService,
    private rhAreaService: RhAreaService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private headerConfigService: HeaderConfigService,
    private toastService: ToastService
  ) {
    this.setupGridColumns();
    this.initializeDateRange();
  }
  
  ngOnInit(): void {
    this.loadAutocompleteData();
    this.loadData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ============================================================================
  // CONFIGURACIÓN INICIAL
  // ============================================================================
  
  private initializeDateRange(): void {
    // Configurar fechas por defecto (semana actual)
    const today = new Date();
    
    // Obtener el lunes de la semana actual
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo, retroceder 6 días
    currentWeekStart.setDate(today.getDate() - daysFromMonday);
    
    // Obtener el domingo de la semana actual
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    
    const defaultDateRange: DateRange = {
      start: currentWeekStart.toISOString().split('T')[0],
      end: currentWeekEnd.toISOString().split('T')[0]
    };
    
    this.dateRangeControl.setValue(defaultDateRange);
  }
  
  private setupGridColumns(): void {
    // Columnas para Personal CON Turno
    this.columnsConTurno = [
      {
        headerName: 'ID Personal',
        field: 'employeeId',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center">
            <div class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
              #${params.value}
            </div>
          </div>`;
        }
      },
      {
        headerName: 'Empleado',
        field: 'fullNameEmployee',
        minWidth: 250,
        maxWidth: 300,
        cellRenderer: (params: any) => {
          return `<div class="font-medium text-fiori-text">${params.value || '-'}</div>`;
        }
      },
      {
        headerName: 'Turno/Horario',
        field: 'scheduleName',
        minWidth: 150,
        maxWidth: 200,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center">
            <div class="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span class="font-medium text-blue-700">${params.value || 'Sin nombre'}</span>
          </div>`;
        }
      },
      {
        headerName: 'Fecha Inicio',
        field: 'startDate',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          if (!params.value) return '-';
          const date = new Date(params.value);
          return `<div class="text-sm text-fiori-text">
            ${date.toLocaleDateString('es-ES')}
          </div>`;
        }
      },
      {
        headerName: 'Fecha Fin',
        field: 'endDate',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          if (!params.value) return '<span class="text-fiori-info font-medium">Indefinido</span>';
          const date = new Date(params.value);
          return `<div class="text-sm text-fiori-text">
            ${date.toLocaleDateString('es-ES')}
          </div>`;
        }
      },
      {
        headerName: 'Sede',
        field: 'locationName',
        minWidth: 120,
        maxWidth: 180,
        cellRenderer: (params: any) => {
          return `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`;
        }
      },
      {
        headerName: 'Área',
        field: 'areaName',
        minWidth: 150,
        maxWidth: 200,
        cellRenderer: (params: any) => {
          return `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`;
        }
      }
    ];
    
    // Columnas para Personal SIN Turno
    this.columnsSinTurno = [
      {
        headerName: 'ID Personal',
        field: 'personalId',
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center">
            <div class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
              #${params.value}
            </div>
          </div>`;
        }
      },
      {
        headerName: 'Empleado',
        field: 'fullNameFormatted',
        minWidth: 250,
        maxWidth: 300,
        cellRenderer: (params: any) => {
          return `<div class="font-medium text-fiori-text">${params.value}</div>`;
        }
      },
      {
        headerName: 'Sede',
        field: 'categoriaAuxiliarDescripcion',
        minWidth: 120,
        maxWidth: 180,
        cellRenderer: (params: any) => {
          return `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`;
        }
      },
      {
        headerName: 'Área',
        field: 'areaDescripcion',
        minWidth: 150,
        maxWidth: 200,
        cellRenderer: (params: any) => {
          return `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`;
        }
      },
      {
        headerName: 'Centro de Costo',
        field: 'ccostoDescripcion',
        minWidth: 160,
        maxWidth: 220,
        cellRenderer: (params: any) => {
          return `<div class="text-sm text-fiori-text">${params.value || '-'}</div>`;
        }
      }
    ];
  }
  
  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  
  private loadAutocompleteData(): void {
    const headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    const companyId = headerConfig?.selectedEmpresa?.companiaId || '';
    
    if (!companyId) {
      this.toastService.warning('Configuración', 'No hay empresa seleccionada');
      return;
    }
    
    // Cargar sedes y áreas en paralelo
    forkJoin({
      sedes: this.categoriaAuxiliarService.getCategoriasAuxiliar(),
      areas: this.rhAreaService.getAreas(companyId)
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ sedes, areas }) => {
        this.allSedes = sedes || [];
        this.filteredSedes = [...this.allSedes];
        
        this.allAreas = areas || [];
        this.filteredAreas = [...this.allAreas];
      },
      error: (error) => {
        console.error('Error loading autocomplete data:', error);
        this.toastService.error('Error', 'Error al cargar datos de filtros');
      }
    });
  }
  
  loadData(): void {
    this.loading = true;
    this.loadPersonalConTurno();
  }
  
  private loadPersonalConTurno(): void {
    this.loadingConTurno = true;
    
    const dateRange = this.dateRangeControl.value;
    const startDate = dateRange?.start || '';
    const endDate = dateRange?.end || '';
    
    // Preparar filtros adicionales
    const locationIds = this.selectedSede ? [this.selectedSede.categoriaAuxiliarId] : [];
    
    this.employeeScheduleService.getEmployeeScheduleAssignments(
      this.pageConTurno,
      this.pageSizeConTurno,
      '', // filter general
      startDate,
      endDate,
      locationIds,
      this.selectedArea?.areaId || '',
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.loadingConTurno = false;
        
        if (response.exito && response.data) {
          this.personalConTurno = response.data.items || [];
          this.totalConTurno = response.data.totalCount || 0;
          
          // Ahora cargar personal SIN turno (excluyendo los que ya tienen)
          this.loadPersonalSinTurno();
        } else {
          this.personalConTurno = [];
          this.totalConTurno = 0;
        //  this.loadPersonalSinTurno();
        }
      },
      error: (error) => {
        this.loadingConTurno = false;
        this.loading = false;
        console.error('Error loading personal con turno:', error);
        this.toastService.error('Error', 'Error al cargar personal con turno');
        this.personalConTurno = [];
        this.totalConTurno = 0;
      }
    });
  }
  
  private loadPersonalSinTurno(): void {
    this.loadingSinTurno = true;
    
    // Mapear IDs de empleados que YA tienen turno
    const empleadosConTurnoIds = this.personalConTurno.map(emp => emp.employeeId);
    
    const headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    const companyId = headerConfig?.selectedEmpresa?.companiaId || '';
    
    const params: EmployeesWithoutShift = {
      searchText: '',
      page: this.pageSinTurno,
      pagesize: this.pageSizeSinTurno,
      areaId: this.selectedArea?.areaId || null,
      ccostoId: null,
      sede: this.selectedSede?.categoriaAuxiliarId || null,
      periodoId: headerConfig?.selectedPeriodo?.periodoId || null,
      planillaId: headerConfig?.selectedPlanilla?.planillaId || null,
      companiaId: companyId,
      personalIds: empleadosConTurnoIds // ← EXCLUIR estos IDs
    };
    
    // 🐛 DEBUG: Verificar parámetros enviados
    console.log('🔍 DEBUG - loadPersonalSinTurno:');
    console.log('- empleadosConTurnoIds:', empleadosConTurnoIds);
    console.log('- empleadosConTurnoIds.length:', empleadosConTurnoIds.length);
    console.log('- companyId:', companyId);
    console.log('- selectedArea:', this.selectedArea);
    console.log('- selectedSede:', this.selectedSede);
    console.log('- params completos:', params);
    
    this.personService.getPersonalWithoutShift(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingSinTurno = false;
          this.loading = false;
          
          // 🐛 DEBUG: Verificar respuesta del servicio
          console.log('📥 DEBUG - Respuesta getPersonalWithoutShift:');
          console.log('- response.exito:', response.exito);
          console.log('- response.mensaje:', response.mensaje);
          console.log('- response.data?.items?.length:', response.data?.items?.length);
          console.log('- response.data?.totalCount:', response.data?.totalCount);
          console.log('- response completa:', response);
          
          if (response.exito && response.data) {
            this.personalSinTurno = (response.data.items || []).map((emp: Employee): EmployeeWithFormatted => ({
              ...emp,
              fullNameFormatted: this.getEmployeeFullName(emp)
            }));
            this.totalSinTurno = response.data.totalCount || 0;
          } else {
            this.personalSinTurno = [];
            this.totalSinTurno = 0;
          }
        },
        error: (error) => {
          this.loadingSinTurno = false;
          this.loading = false;
          
          // 🐛 DEBUG: Error en el servicio
          console.log('❌ DEBUG - Error getPersonalWithoutShift:');
          console.log('- error completo:', error);
          console.log('- error.status:', error.status);
          console.log('- error.message:', error.message);
          
          console.error('Error loading personal sin turno:', error);
          this.toastService.error('Error', 'Error al cargar personal sin turno');
          this.personalSinTurno = [];
          this.totalSinTurno = 0;
        }
      });
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  onDateRangeSelected(dateRange: DateRange): void {
    console.log('📅 Date range selected:', dateRange);
    // El FormControl ya está actualizado automáticamente
  }
  
  onSearch(): void {
    if (!this.dateRangeControl.valid) {
      this.toastService.warning('Validación', 'Por favor selecciona un rango de fechas válido');
      return;
    }
    
    // Reset paginación y recargar
    this.pageConTurno = 1;
    this.pageSinTurno = 1;
    this.loadData();
  }
  
  onClearFilters(): void {
    // Limpiar filtros
    this.selectedArea = null;
    this.selectedSede = null;
    this.areaFilterTerm = '';
    this.sedeFilterTerm = '';
    this.filteredAreas = [...this.allAreas];
    this.filteredSedes = [...this.allSedes];
    
    // Restablecer fechas por defecto
    this.initializeDateRange();
    
    // Reset paginación y recargar
    this.pageConTurno = 1;
    this.pageSinTurno = 1;
    this.loadData();
  }
  
  // ============================================================================
  // AUTOCOMPLETE HANDLERS - SEDE
  // ============================================================================
  
  getSedeFilterText(): string {
    return this.selectedSede ? this.selectedSede.descripcion : this.sedeFilterTerm;
  }
  
  onSedeFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.sedeFilterTerm = value;
    this.filteredSedes = this.allSedes.filter(sede => 
      sede.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    
    if (value !== this.selectedSede?.descripcion) {
      this.selectedSede = null;
    }
  }
  
  onSedeFocus(): void {
    if (this.filteredSedes.length === 0) {
      this.filteredSedes = [...this.allSedes];
    }
    this.showSedeDropdown = this.filteredSedes.length > 0;
  }
  
  onSedeSelected(sede: CategoriaAuxiliar | null): void {
    this.selectedSede = sede;
    this.sedeFilterTerm = sede ? sede.descripcion : '';
    this.showSedeDropdown = false;
  }
  
  onSedeBlur(): void {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 200);
  }
  
  trackBySedeId(index: number, sede: CategoriaAuxiliar): string {
    return sede.categoriaAuxiliarId;
  }
  
  // ============================================================================
  // AUTOCOMPLETE HANDLERS - ÁREA
  // ============================================================================
  
  getAreaFilterText(): string {
    return this.selectedArea ? this.selectedArea.descripcion : this.areaFilterTerm;
  }
  
  onAreaFilterChange(event: any): void {
    const value = event.target?.value || '';
    this.areaFilterTerm = value;
    this.filteredAreas = this.allAreas.filter(area => 
      area.descripcion.toLowerCase().includes(value.toLowerCase())
    );
    
    if (value !== this.selectedArea?.descripcion) {
      this.selectedArea = null;
    }
  }
  
  onAreaFocus(): void {
    if (this.filteredAreas.length === 0) {
      this.filteredAreas = [...this.allAreas];
    }
    this.showAreaDropdown = this.filteredAreas.length > 0;
  }
  
  onAreaSelected(area: RhArea | null): void {
    this.selectedArea = area;
    this.areaFilterTerm = area ? area.descripcion : '';
    this.showAreaDropdown = false;
  }
  
  onAreaBlur(): void {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 200);
  }
  
  trackByAreaId(index: number, area: RhArea): string {
    return area.areaId;
  }
  
  // ============================================================================
  // PAGINACIÓN
  // ============================================================================
  
  onPageChangeConTurno(event: PaginatorEvent): void {
    this.pageConTurno = event.pageNumber;
    this.pageSizeConTurno = event.pageSize;
    this.loadPersonalConTurno();
  }
  
  onPageChangeSinTurno(event: PaginatorEvent): void {
    this.pageSinTurno = event.pageNumber;
    this.pageSizeSinTurno = event.pageSize;
    this.loadPersonalSinTurno();
  }
  
  // ============================================================================
  // EXPORTACIÓN
  // ============================================================================
  
  exportToExcel(): void {
    this.isExporting = true;
    
    try {
      const workbook = XLSX.utils.book_new();
      
      // Hoja 1: Personal CON Turno
      const dataConTurno = this.personalConTurno.map(emp => ({
        'ID Personal': emp.employeeId,
        'Nombre Completo': emp.fullNameEmployee || '',
        'Turno/Horario': emp.scheduleName || 'Sin nombre',
        'Fecha Inicio': emp.startDate ? new Date(emp.startDate).toLocaleDateString('es-ES') : '',
        'Fecha Fin': emp.endDate ? new Date(emp.endDate).toLocaleDateString('es-ES') : 'Indefinido',
        'Área': emp.areaName || '',
        'Sede': emp.locationName || ''
      }));
      
      const wsConTurno = XLSX.utils.json_to_sheet(dataConTurno);
      XLSX.utils.book_append_sheet(workbook, wsConTurno, 'Personal Con Turno');
      
      // Hoja 2: Personal SIN Turno
      const dataSinTurno = this.personalSinTurno.map(emp => ({
        'ID Personal': emp.personalId,
        'Nombre Completo': emp.fullNameFormatted || '',
        'Sede': emp.categoriaAuxiliarDescripcion || '',
        'Área': emp.areaDescripcion || '',
        'Centro de Costo': emp.ccostoDescripcion || ''
      }));
      
      const wsSinTurno = XLSX.utils.json_to_sheet(dataSinTurno);
      XLSX.utils.book_append_sheet(workbook, wsSinTurno, 'Personal Sin Turno');
      
      // Generar archivo
      const fileName = `Reporte_Personal_Turnos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      this.toastService.success('Éxito', 'Reporte exportado correctamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      this.toastService.error('Error', 'Error al exportar a Excel');
    } finally {
      this.isExporting = false;
    }
  }
  
  exportToPDF(): void {
    this.isExporting = true;
    
    try {
      const doc = new jsPDF('landscape');
      
      // Título principal
      doc.setFontSize(16);
      doc.text('REPORTE: CONTROL DE ASIGNACIÓN DE TURNOS', 15, 15);
      
      // Información de filtros
      const dateRange = this.dateRangeControl.value;
      const filterInfo = `Período: ${dateRange?.start || 'N/A'} - ${dateRange?.end || 'N/A'}`;
      doc.setFontSize(10);
      doc.text(filterInfo, 15, 25);
      
      // Tabla 1: Personal CON Turno
      doc.setFontSize(14);
      doc.text(`Personal CON Turno (${this.personalConTurno.length})`, 15, 40);
      
      const dataConTurno = this.personalConTurno.map(emp => [
        emp.employeeId,
        emp.fullNameEmployee || '',
        emp.scheduleName || 'Sin nombre',
        emp.startDate ? new Date(emp.startDate).toLocaleDateString('es-ES') : '',
        emp.endDate ? new Date(emp.endDate).toLocaleDateString('es-ES') : 'Indefinido',
        emp.areaName || ''
      ]);
      
      autoTable(doc, {
        startY: 45,
        head: [['ID Personal', 'Nombre Completo', 'Turno/Horario', 'Fecha Inicio', 'Fecha Fin', 'Área']],
        body: dataConTurno,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] }
      });
      
      // Tabla 2: Personal SIN Turno
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.text(`Personal SIN Turno (${this.personalSinTurno.length})`, 15, finalY);
      
      const dataSinTurno = this.personalSinTurno.map(emp => [
        emp.personalId,
        emp.fullNameFormatted || '',
        emp.categoriaAuxiliarDescripcion || '',
        emp.areaDescripcion || '',
        emp.ccostoDescripcion || ''
      ]);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['ID Personal', 'Nombre Completo', 'Sede', 'Área', 'Centro de Costo']],
        body: dataSinTurno,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [239, 68, 68] }
      });
      
      // Guardar archivo
      const fileName = `Reporte_Personal_Turnos_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      this.toastService.success('Éxito', 'Reporte PDF generado correctamente');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.toastService.error('Error', 'Error al generar PDF');
    } finally {
      this.isExporting = false;
    }
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  getEmployeeFullName(employee: Employee): string {
    if (!employee) return '';
    
    const nombres = employee.nombres || '';
    const apellidoPaterno = employee.apellidoPaterno || '';
    const apellidoMaterno = employee.apellidoMaterno || '';
    
    return `${apellidoPaterno} ${apellidoMaterno}, ${nombres}`.trim();
  }
  
  // ============================================================================
  // AG-GRID EVENTS
  // ============================================================================
  
  onGridReadyConTurno(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }
  
  onGridReadySinTurno(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }
}