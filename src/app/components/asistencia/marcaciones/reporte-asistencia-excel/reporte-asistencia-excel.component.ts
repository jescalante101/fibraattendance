import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';
import { AgGridAngular } from 'ag-grid-angular';
import { GridOptions, ColDef } from 'ag-grid-community';
import { CategoriaAuxiliarService, CategoriaAuxiliar } from '../../../../core/services/categoria-auxiliar.service';
import { RhAreaService, RhArea } from '../../../../core/services/rh-area.service';
import { AG_GRID_LOCALE_ES } from 'src/app/ag-grid-locale.es';
import { DateRange } from '../../../../shared/components/date-range-picker/date-range-picker.component';
import { ExtraHoursReportService } from 'src/app/core/services/report/extra-hours-report.service';
import { ExtraHoursReportResult, ReporteAsistenciaSemanalDto, ReportFiltersHE } from 'src/app/core/models/report/extra-hours-report.model';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reporte-asistencia-excel',
  templateUrl: './reporte-asistencia-excel.component.html',
})
export class ReporteAsistenciaExcelComponent implements OnInit, OnDestroy {
  
  filterForm!: FormGroup;
  loading = false;
  
  // AG-Grid
  @ViewChild('agGrid') agGrid!: AgGridAngular;
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  gridOptions: GridOptions = {
  ...createFioriGridOptions(),
  };

  private headerConfig: HeaderConfig | null = null;
  private destroy$ = new Subject<void>();

  // Datos maestros para filtros
  areas: RhArea[] = [];
  sedes: CategoriaAuxiliar[] = [];
  filteredAreas: RhArea[] = [];
  filteredSedes: CategoriaAuxiliar[] = [];

  // Estados de dropdowns
  showAreaDropdown = false;
  showSedeDropdown = false;

  constructor(
    private fb: FormBuilder,
    private extraHoursService: ExtraHoursReportService,
    private headerConfigService: HeaderConfigService,
    private categoriaAuxiliarService: CategoriaAuxiliarService,
    private rhAreaService: RhAreaService
  ) {
    this.initializeForm();
    this.createColumnDefs();
  }

  ngOnInit(): void {
    this.loadHeaderConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const initialDateRange: DateRange = {
      start: firstDay.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
    
    this.filterForm = this.fb.group({
      dateRange: [initialDateRange, Validators.required],
      employeeId: [''],
      areaId: [''],
      areaFilter: [''],
      sedeId: [''],
      sedeFilter: [''],
      companiaId: [''],
      planillaId: ['']
    });
  }

  loadData(): void {
    if (!this.headerConfig || !this.filterForm.valid) {
      console.warn("Faltan datos de configuración o el formulario es inválido.");
      return;
    }

    this.loading = true;
    this.rowData = [];
    
    const formValues = this.filterForm.value;
    const dateRange = formValues.dateRange as DateRange;
    
    const params: ReportFiltersHE = {
      startDate: dateRange?.start || '',
      endDate: dateRange?.end || '',
      companyId: this.headerConfig.selectedEmpresa?.companiaId || '',
      areaId: this.filterForm.value.areaId || '',
      sedeId: this.filterForm.value.sedeId || '',
    };

    this.extraHoursService.getReportData(params).subscribe({
      next: (response: ExtraHoursReportResult) => {
        if (response.success && response.data) {
          this.rowData = this.processDataForGrid(response.data);
        } else {
          this.rowData = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando datos:', error);
        this.rowData = [];
        this.loading = false;
      }
    });
  }

  private processDataForGrid(data: ReporteAsistenciaSemanalDto[]): any[] {
    const flatData: any[] = [];
    if (!data) {
      return flatData;
    }

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    for (const employee of data) {
      for (const dateKey in employee.asistenciaPorDia) {
        if (Object.prototype.hasOwnProperty.call(employee.asistenciaPorDia, dateKey)) {
          const dayData = employee.asistenciaPorDia[dateKey];
          
          const dateObj = new Date(dateKey);

          flatData.push({
            nroDoc: employee.nro_Doc,
            colaborador: employee.colaborador,
            sede: employee.sede,
            area: employee.area,
            cargo: employee.cargo,
            fechaIngreso: employee.fechaIngreso,
            fecha: dateKey,
            diaSemanaEs: dayNames[dateObj.getUTCDay()],
            turno: dayData.tipoTurno,
            entrada: dayData.horaEntrada,
            salida: dayData.horaSalida,
          });
        }
      }
    }
    return flatData;
  }

  createColumnDefs(): void {
    this.columnDefs = [
      { headerName: 'Nro Doc', field: 'nroDoc', width: 120, headerClass: 'fiori-header' },
      { headerName: 'Colaborador', field: 'colaborador', width: 450, headerClass: 'fiori-header' },
      { headerName: 'Sede', field: 'sede', width: 120, headerClass: 'fiori-header' },
      { headerName: 'Área', field: 'area', width: 150, headerClass: 'fiori-header' },
      { headerName: 'Cargo', field: 'cargo', width: 150, headerClass: 'fiori-header' },
      { headerName: 'F. Ingreso', field: 'fechaIngreso', width: 120, headerClass: 'fiori-header', valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '' },
      { headerName: 'Fecha', field: 'fecha', width: 120, headerClass: 'fiori-header', valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '' },
      { headerName: 'Día', field: 'diaSemanaEs', width: 100, headerClass: 'fiori-header' },
      { headerName: 'Turno', field: 'turno', width: 100, headerClass: 'fiori-header' },
      {
        headerName: 'Entrada',
        field: 'entrada',
      
        cellClass: 'text-center bg-fiori-active text-fiori-primary font-bold',
        headerClass: 'fiori-header'
      },
      {
        headerName: 'Salida',
        field: 'salida',
       
        cellClass: 'text-center bg-fiori-active text-fiori-primary font-bold',
        headerClass: 'fiori-header'
      },
    ];
  }

  onFilter(): void {
    this.loadData();
  }

  private loadHeaderConfig(): void {
    this.headerConfig = this.headerConfigService.getCurrentHeaderConfig();
    this.applyHeaderConfigToForm();
    this.loadMasterData();

    this.headerConfigService.getHeaderConfig$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((config: HeaderConfig | null) => {
        this.headerConfig = config;
        this.applyHeaderConfigToForm();
        this.loadMasterData();
        // Cargar datos automáticamente cuando se actualice la configuración del header
        if (config && this.filterForm.valid) {
          this.loadData();
        }
      });

    // Cargar datos automáticamente al inicializar si ya tenemos configuración válida
    if (this.headerConfig && this.filterForm.valid) {
      setTimeout(() => {
        this.loadData();
      }, 100); // Pequeño delay para asegurar que todo esté inicializado
    }
  }

  private applyHeaderConfigToForm(): void {
    if (this.headerConfig && this.filterForm) {
      this.filterForm.patchValue({
        companiaId: this.headerConfig.selectedEmpresa?.companiaId || '',
        planillaId: this.headerConfig.selectedPlanilla?.planillaId || ''
      }, { emitEvent: false });
    }
  }

  // ===== MASTER DATA LOADING =====
  
  private loadMasterData(): void {
    if (!this.headerConfig?.selectedEmpresa?.companiaId) {
      console.warn('No se puede cargar datos maestros sin compañía seleccionada');
      return;
    }

    // Cargar sedes solo si no están cargadas
    if (this.sedes.length === 0) {
      this.categoriaAuxiliarService.getCategoriasAuxiliar()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (sedes) => {
            this.sedes = sedes || [];
            this.filteredSedes = [...this.sedes];
          },
          error: (error) => console.error('Error loading sedes:', error)
        });
    }

    // Cargar áreas basadas en la compañía actual
    const companiaId = this.headerConfig.selectedEmpresa.companiaId.toString();
    this.rhAreaService.getAreas(companiaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (areas) => {
          this.areas = areas || [];
          this.filteredAreas = [...this.areas];
          
          // Limpiar selección de área si ya no existe en la nueva lista
          const currentAreaId = this.filterForm.get('areaId')?.value;
          if (currentAreaId && !this.areas.some(a => a.areaId === currentAreaId)) {
            this.filterForm.patchValue({
              areaId: '',
              areaFilter: ''
            });
          }
        },
        error: (error) => console.error('Error loading areas:', error)
      });
  }

  // ===== AUTOCOMPLETE METHODS =====
  
  onAreaFilterChange(event: any) {
    const filterValue = (event.target.value || '').toLowerCase().trim();
    
    if (!filterValue) {
      this.filteredAreas = [...this.areas];
    } else {
      this.filteredAreas = this.areas.filter(area =>
        area.descripcion.toLowerCase().includes(filterValue)
      );
    }
    
    // Reset selection if typing new text
    const currentAreaFilter = this.filterForm.get('areaFilter')?.value || '';
    if (currentAreaFilter !== event.target.value) {
      this.filterForm.patchValue({ areaId: '' }, { emitEvent: false });
    }
  }

  onAreaSelected(area: RhArea | null) {
    this.showAreaDropdown = false;
    
    if (area) {
      this.filterForm.patchValue({
        areaId: area.areaId,
        areaFilter: area.descripcion
      }, { emitEvent: false });
    } else {
      this.filterForm.patchValue({
        areaId: '',
        areaFilter: ''
      }, { emitEvent: false });
    }
  }

  onAreaBlur() {
    setTimeout(() => {
      this.showAreaDropdown = false;
    }, 150);
  }

  onSedeFilterChange(event: any) {
    const filterValue = (event.target.value || '').toLowerCase().trim();
    
    if (!filterValue) {
      this.filteredSedes = [...this.sedes];
    } else {
      this.filteredSedes = this.sedes.filter(sede =>
        sede.descripcion.toLowerCase().includes(filterValue)
      );
    }
    
    // Reset selection if typing new text
    const currentSedeFilter = this.filterForm.get('sedeFilter')?.value || '';
    if (currentSedeFilter !== event.target.value) {
      this.filterForm.patchValue({ sedeId: '' }, { emitEvent: false });
    }
  }

  onSedeSelected(sede: CategoriaAuxiliar | null) {
    this.showSedeDropdown = false;
    
    if (sede) {
      this.filterForm.patchValue({
        sedeId: sede.categoriaAuxiliarId,
        sedeFilter: sede.descripcion
      }, { emitEvent: false });
    } else {
      this.filterForm.patchValue({
        sedeId: '',
        sedeFilter: ''
      }, { emitEvent: false });
    }
  }

  onSedeBlur() {
    setTimeout(() => {
      this.showSedeDropdown = false;
    }, 150);
  }

  onClearFilters(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const initialDateRange: DateRange = {
      start: firstDay.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
    
    this.filterForm.reset({
      dateRange: initialDateRange,
      employeeId: '',
      areaId: '',
      areaFilter: '',
      sedeId: '',
      sedeFilter: '',
      companiaId: this.headerConfig?.selectedEmpresa?.companiaId || '',
      planillaId: this.headerConfig?.selectedPlanilla?.planillaId || ''
    });
    
    // Reset filtered lists
    this.filteredAreas = [...this.areas];
    this.filteredSedes = [...this.sedes];
    
    this.applyHeaderConfigToForm();
    this.rowData = [];
  }

  // ===== EXPORT METHODS =====

  exportToExcel(): void {
    if (!this.rowData || this.rowData.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    // Preparar datos para el Excel
    const excelData = this.rowData.map(item => ({
      'Nro Doc': item.nroDoc || '',
      'Colaborador': item.colaborador || '',
      'Sede': item.sede || '',
      'Área': item.area || '',
      'Cargo': item.cargo || '',
      'F. Ingreso': item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
      'Fecha': item.fecha ? new Date(item.fecha).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
      'Día': item.diaSemanaEs || '',
      'Turno': item.turno || '',
      'Entrada': item.entrada || '',
      'Salida': item.salida || ''
    }));

    // Crear workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    
    // Configurar anchos de columna
    const columnWidths = [
      { wch: 15 }, // Nro Doc
      { wch: 55 }, // Colaborador (450px aprox)
      { wch: 15 }, // Sede
      { wch: 20 }, // Área
      { wch: 20 }, // Cargo
      { wch: 15 }, // F. Ingreso
      { wch: 15 }, // Fecha
      { wch: 12 }, // Día
      { wch: 12 }, // Turno
      { wch: 12 }, // Entrada
      { wch: 12 }  // Salida
    ];
    worksheet['!cols'] = columnWidths;

    // Estilos para encabezados
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0070F3" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    // Aplicar estilos a los encabezados
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }

    // Estilos para celdas de datos
    const dataStyle = {
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      },
      alignment: { vertical: "center" }
    };

    // Aplicar estilos a las celdas de datos
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = dataStyle;
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Asistencia');

    // Generar nombre de archivo con fecha actual
    const now = new Date();
    const fileName = `reporte_asistencia_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  }

  exportToPDF(): void {
    if (!this.rowData || this.rowData.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    
    // Título del documento
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Asistencia', 15, 15);

    // Información del filtro aplicado
    const formValues = this.filterForm.value;
    const dateRange = formValues.dateRange as DateRange;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 25;
    
    if (dateRange?.start && dateRange?.end) {
      const startDate = new Date(dateRange.start).toLocaleDateString('es-PE');
      const endDate = new Date(dateRange.end).toLocaleDateString('es-PE');
      doc.text(`Período: ${startDate} - ${endDate}`, 15, yPos);
      yPos += 5;
    }
    
    if (this.headerConfig?.selectedEmpresa?.descripcion) {
      doc.text(`Empresa: ${this.headerConfig.selectedEmpresa.descripcion}`, 15, yPos);
      yPos += 5;
    }

    // Preparar datos para la tabla
    const tableData = this.rowData.map(item => [
      item.nroDoc || '',
      item.colaborador || '',
      item.sede || '',
      item.area || '',
      item.cargo || '',
      item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
      item.fecha ? new Date(item.fecha).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '',
      item.diaSemanaEs || '',
      item.turno || '',
      item.entrada || '',
      item.salida || ''
    ]);

    // Configurar la tabla
    autoTable(doc, {
      head: [['Nro Doc', 'Colaborador', 'Sede', 'Área', 'Cargo', 'F. Ingreso', 'Fecha', 'Día', 'Turno', 'Entrada', 'Salida']],
      body: tableData,
      startY: yPos + 5,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [0, 112, 243], // Color azul similar al de la UI
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Nro Doc
        1: { cellWidth: 50 }, // Colaborador (más ancho)
        2: { cellWidth: 20 }, // Sede
        3: { cellWidth: 25 }, // Área
        4: { cellWidth: 25 }, // Cargo
        5: { cellWidth: 20 }, // F. Ingreso
        6: { cellWidth: 18 }, // Fecha
        7: { cellWidth: 15 }, // Día
        8: { cellWidth: 15 }, // Turno
        9: { cellWidth: 15 }, // Entrada
        10: { cellWidth: 15 } // Salida
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      margin: { left: 15, right: 15 }
    });

    // Generar nombre de archivo con fecha actual
    const now = new Date();
    const fileName = `reporte_asistencia_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}.pdf`;
    
    doc.save(fileName);
  }
}
