import { DatePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { TimeIntervalService } from 'src/app/core/services/time-interval.service';
import { TimeIntervalDetailDto, PaginatedResponse } from 'src/app/core/models/att-time-interval-responde.model';
import { NuevoHorarioRedesignComponent } from './nuevo-horario/nuevo-horario-redesign.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { FixedSizeVirtualScrollStrategy } from '@angular/cdk/scrolling';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import { AuthService } from 'src/app/core/services/auth.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { finalize } from 'rxjs';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';
import { HeaderConfigService, HeaderConfig } from '../../../../core/services/header-config.service';

@Component({
  selector: 'app-horario',
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();

  dataHorarios: TimeIntervalDetailDto[] = [];
  dataHorariosFiltrados: TimeIntervalDetailDto[] = [];
  filtroTexto: string = '';
  loading: boolean = false;

  totalRecords: number = 0;
  pageSize: number = 50;
  pageNumber: number = 1;

  // ag-Grid configuration
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {
    ...createFioriGridOptions(),
    defaultColDef: {
      ...createFioriGridOptions().defaultColDef,
      cellClass: 'ag-cell-vertical-center'
    }
  };
  gridApi: any;

  // Column Manager - Actualizado para TimeIntervalDetailDto
  tableColumns: ColumnConfig[] = [
    { key: 'id', label: 'ID', visible: true, required: true, sortable: true, type: 'number' },
    { key: 'alias', label: 'Nombre', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'horario', label: 'Horario', visible: true, required: true, sortable: false, type: 'text' },
    { key: 'totalDurationMinutes', label: 'Duración Total', visible: true, required: false, sortable: true, type: 'number' },
    { key: 'normalWorkDay', label: 'Jornada Normal', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'breaks', label: 'Descansos', visible: true, required: false, sortable: false, type: 'text' },
    { key: 'acciones', label: 'Acciones', visible: true, required: true, sortable: false, type: 'actions' }
  ];

  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas - Horarios'
  };

  constructor(
    private timeIntervalService: TimeIntervalService,
    private authService: AuthService,
    private dialog: MatDialog,
    private modalService: ModalService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private HeaderConfig: HeaderConfigService

  ) { }

  ngOnInit() {
    this.setupAgGrid();
    this.loadHoraiosData();
    this.setupModalEventListener();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupModalEventListener() {
    // Por ahora no hay modalClosed$ observable disponible
    // La lógica de refresco está en el finally() de cada modal
    console.log('Modal event listener configurado (usando finally() como backup)');
  }

  exportToExcel() {
    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    this.styleExcelSheet(worksheet);

    const workbook = { Sheets: { 'Horarios': worksheet }, SheetNames: ['Horarios'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'reporte_horarios');
  }

  private getGridDataForExport(): any[] {
    return this.dataHorariosFiltrados.map(item => ({
      'ID': item.id,
      'Nombre': item.alias,
      'Horario': `${item.formattedStartTime} - ${item.scheduledEndTime}`,
      'Duración Total (min)': item.totalDurationMinutes,
      'Jornada Normal': item.normalWorkDay,
      'Descansos': item.breaks?.map(b => `${b.alias} (${b.duration}min)`).join(', ') || 'Sin descansos'
    }));
  }

  private styleExcelSheet(worksheet: XLSX.WorkSheet) {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0A6ED1" } }, // Fiori Primary
      alignment: { horizontal: "center", vertical: "center" }
    };

    const columnWidths = [
      { wch: 10 }, // ID
      { wch: 25 }, // Nombre
      { wch: 20 }, // Horario
      { wch: 20 }, // Duración Total (min)
      { wch: 20 }, // Jornada Normal
      { wch: 30 }  // Descansos
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
    const head = [['ID', 'Nombre', 'Horario', 'Duración Total (min)', 'Jornada Normal', 'Descansos']];
    const body = dataToExport.map(row => [
      row.ID,
      row.Nombre,
      row.Horario,
      row['Duración Total (min)'],
      row['Jornada Normal'],
      row.Descansos
    ]);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Reporte de Horarios', 14, 22);

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

    doc.save('reporte_horarios_' + new Date().getTime() + '.pdf');
    this.toastService.success('Éxito', 'El reporte ha sido exportado a PDF.');
  }

  loadHoraiosData(){
    console.log('🚀 Iniciando loadHoraiosData()...');
    this.loading = true;
    this.cdr.detectChanges();
    
    // Obtener company ID del usuario autenticado
    const header= this.HeaderConfig.getCurrentHeaderConfig();
    const companyId = header?.selectedEmpresa?.companiaId || '';


    
    if (!companyId) {
      this.toastService.error('Error', 'No se pudo obtener la información de la compañía');
      this.loading = false;
      return;
    }
    
    this.timeIntervalService.getTimeIntervals(companyId, this.pageNumber, this.pageSize)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: PaginatedResponse<TimeIntervalDetailDto>) => {
          console.log('✅ Time intervals cargados exitosamente:', response);
          console.log(`📊 Total de registros: ${response.totalRecords}, Datos recibidos: ${response.data.length}`);
          this.dataHorarios = response.data;
          this.dataHorariosFiltrados = [...response.data];
          this.totalRecords = response.totalRecords;
          
          // Update ag-Grid data
          if (this.gridApi) {
            this.gridApi.setRowData(this.dataHorariosFiltrados);
            console.log('🔄 ag-Grid actualizado con nuevos datos');
          }
        },
        error: (error) => {
          console.error('Error al cargar los horarios:', error);
          this.toastService.error('Error al cargar', 'No se pudieron cargar los horarios. Verifica tu conexión.');
        }
      });
  }
  

  onPageChangeCustom(event: any) {
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    
    // Si pageSize es 0 (mostrar todos), no recargar del servidor
    // Solo actualizar los datos filtrados localmente
    if (this.pageSize === 0) {
      // No hacer nada, los datos ya están filtrados
      return;
    } else {
      // Comportamiento normal: recargar datos del servidor
      this.loadHoraiosData();
    }
  }

  // Método para abrir el modal de nuevo horario usando el modal personalizado
  abrirModalNuevoHorario(mode: number): void {
    console.log('=== ABRIR MODAL NUEVO HORARIO ===');
    console.log('Mode:', mode);
    
     this.modalService.open({
      title: mode == 0 ? 'Nuevo Horario Normal' : 'Nuevo Horario Flexible',
      componentType: NuevoHorarioRedesignComponent,
      width: '1200px',
      componentData: { use_mode: mode },
    }).then(result => {
      console.log('✅ Modal CREAR cerrado con resultado:', result);
    }).catch(error => {
      console.error('❌ Error al abrir el modal:', error);
    }).finally(() => {
      console.log('🔄 Ejecutando loadHoraiosData() desde CREAR modal...');
      this.loadHoraiosData();
    });
    
  }

  // Método para abrir el modal de edición usando el modal personalizado
  editarHorario(idHorario: number, use_mode: number) {
    console.log('=== ABRIR MODAL EDITAR HORARIO ===');
    console.log('ID:', idHorario, 'Mode:', use_mode);
    
    this.modalService.open({
      title: 'Editar Horario',
      componentType: NuevoHorarioRedesignComponent,
      width:'1200px',
      componentData: { idHorario: idHorario, use_mode: use_mode },
    }).then(result => {
      console.log('✅ Modal EDITAR cerrado con resultado:', result);
    }).catch(error => {
      console.error('❌ Error al abrir el modal:', error);
    }).finally(() => {
      console.log('🔄 Ejecutando loadHoraiosData() desde EDITAR modal...');
      this.loadHoraiosData();
    });

  }

  // Método para eliminar un horario
  eliminarHorario(idHorario: number) {
    this.timeIntervalService.deleteTimeInterval(idHorario).subscribe({
      next: () => {
        console.log('Horario eliminado:', idHorario);
        this.toastService.success('Horario eliminado', 'El horario ha sido eliminado correctamente');
        this.loadHoraiosData();
      },
      error: (error) => {
        console.error('Error al eliminar horario:', error);
        this.toastService.error('Error al eliminar', 'No se pudo eliminar el horario. Inténtalo nuevamente');
      }
    });
  }

  // Método para abrir el modal de confirmación
  openConfirmationDialog(idHorario: number) {
    const dialogRef = this.dialog.open(ModalConfirmComponent, {
      width: '400px',
      height: '200px',
      hasBackdrop: true,
      data: {
        tipo: 'danger',
        titulo: '¿Eliminar horario?',
        mensaje: '¿Estás seguro de que deseas eliminar este horario? Esta acción no se puede deshacer.',
        confirmacion: true,
        textoConfirmar: 'Eliminar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // El usuario confirmó
        this.eliminarHorario(idHorario);
      }
    });
  }

 

  // Métodos para estadísticas
  getHorariosEstandar(): number {
    return this.dataHorarios?.length || 0;
  }

  getHorariosFlexibles(): number {
    return 0; // Ya no diferenciamos por tipo en el nuevo modelo
  }

  // Métodos para filtrado local
  filtrarDatos(): void {
    if (!this.filtroTexto || this.filtroTexto.trim() === '') {
      this.dataHorariosFiltrados = [...this.dataHorarios];
      return;
    }

    const filtro = this.filtroTexto.toLowerCase().trim();
    this.dataHorariosFiltrados = this.dataHorarios.filter(horario => 
      horario.alias?.toLowerCase().includes(filtro) ||
      horario.id?.toString().includes(filtro) ||
      horario.formattedStartTime?.toLowerCase().includes(filtro) ||
      horario.scheduledEndTime?.toLowerCase().includes(filtro) ||
      horario.normalWorkDay?.toLowerCase().includes(filtro) ||
      horario.totalDurationMinutes?.toString().includes(filtro) ||
      horario.breaks?.some(b => b.alias?.toLowerCase().includes(filtro))
    );
    
    // Update ag-Grid data with filtered results
    if (this.gridApi) {
      this.gridApi.setRowData(this.dataHorariosFiltrados);
    }
  }

  limpiarFiltro(): void {
    this.filtroTexto = '';
    this.dataHorariosFiltrados = [...this.dataHorarios];
    
    // Update ag-Grid data
    if (this.gridApi) {
      this.gridApi.setRowData(this.dataHorariosFiltrados);
    }
  }

  // === AG-GRID CONFIGURATION ===
  
  private setupAgGrid(): void {
    this.columnDefs = [
      {
        field: 'checkbox',
        headerName: '',
        width: 30,
        maxWidth: 30,
        pinned: 'left',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        resizable: false,
        sortable: false,
        filter: false
      },
      {
        field: 'id',
        headerName: 'ID',
        maxWidth: 75,
        width: 50,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center py-1">
            <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center">
              <span class="text-xs font-medium text-fiori-primary">#${params.value}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'alias',
        headerName: 'Nombre',
        width: 350,
        maxWidth: 350,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-fiori-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-fiori-text" title="${params.value}">${params.value}</div>
            </div>
          </div>`;
        }
      },
      {
        field: 'horario',
        headerName: 'Horario',
        width: 200,
        cellRenderer: (params: any) => {
          const startTime = params.data.formattedStartTime;
          const endTime = params.data.scheduledEndTime;
          return `<div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-fiori-text font-medium">${startTime}</span>
            </div>
            <svg class="w-3 h-3 text-fiori-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3 text-fiori-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-fiori-text font-medium">${endTime}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'totalDurationMinutes',
        headerName: 'Duración Total',
        width: 130,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center space-x-1">
            <svg class="w-3 h-3 text-fiori-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium text-fiori-text">${params.value} min</span>
          </div>`;
        }
      },
      {
        field: 'normalWorkDay',
        headerName: 'Jornada Normal',
        width: 140,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center space-x-1">
            <svg class="w-3 h-3 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium text-fiori-text">${params.value}</span>
          </div>`;
        }
      },
      {
        field: 'breaks',
        headerName: 'Descansos',
        width: 200,
        cellRenderer: (params: any) => {
          const breaks = params.value || [];
          if (breaks.length === 0) {
            return `<div class="flex items-center justify-center">
              <span class="text-xs text-fiori-subtext">Sin descansos</span>
            </div>`;
          }
          
          const breaksList = breaks.map((breakItem: any) => 
            `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-fiori-warning/10 text-fiori-warning border border-fiori-warning/20">
              ${breakItem.alias} (${breakItem.duration}min)
            </span>`
          ).join(' ');
          
          return `<div class="flex items-center space-x-1 py-1">
            <svg class="w-3 h-3 text-fiori-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
            <div class="flex flex-wrap gap-1">${breaksList}</div>
          </div>`;
        }
      },
      {
        field: 'acciones',
        headerName: 'Acciones',
        width: 140,
        pinned: 'right',
        lockPosition: true,
        resizable: false,
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center space-x-1 h-full">
            <button class="edit-btn p-1.5 text-fiori-primary hover:text-fiori-secondary hover:bg-fiori-primary/5 rounded-lg transition-colors" title="Editar horario">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-btn p-1.5 text-fiori-error hover:text-red-800 hover:bg-fiori-error/5 rounded-lg transition-colors" title="Eliminar horario">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>`;
        }
      }
    ];
  }
  
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    // Apply initial column visibility from tableColumns configuration
    this.tableColumns.forEach(col => {
      params.api.setColumnsVisible([col.key], col.visible);
    });
    
    params.api.sizeColumnsToFit();
    
    // Set up action button click handlers
    this.setupActionHandlers();
  }
  
  private setupActionHandlers(): void {
    // Use event delegation to handle action button clicks
    const gridElement = document.querySelector('.ag-theme-quartz');
    if (gridElement) {
      gridElement.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('button');
        
        if (button && button.classList.contains('edit-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.editarHorario(rowData.id, 0); // Default mode since useMode is not available
            }
          }
        } else if (button && button.classList.contains('delete-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.openConfirmationDialog(rowData.id);
            }
          }
        }
      });
    }
  }

  // === COLUMN MANAGER ===
  
  onColumnManagerChange(event: ColumnChangeEvent): void {
    console.log('Column visibility changed:', event);
    
    // Obtener la clave y visibilidad de la columna
    const columnKey = event.column.key;
    const visible = event.column.visible;
    
    // Actualizar el estado local primero
    const column = this.tableColumns.find(col => col.key === columnKey);
    if (column) {
      column.visible = visible;
    }
    
    // Aplicar cambios inmediatamente a ag-Grid
    if (this.gridApi) {
      this.gridApi.setColumnsVisible([columnKey], visible);
      
      // Trigger re-render of cells to update responsive content
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
      }, 100);
    }
  }
  
  onColumnsApply(columns: ColumnConfig[]): void {
    this.tableColumns = columns;
    console.log('Columns applied:', columns);
    
    // Aplicar todas las visibilidades a ag-Grid
    if (this.gridApi) {
      columns.forEach(col => {
        this.gridApi.setColumnsVisible([col.key], col.visible);
      });
      
      // Trigger refresh and resize after column visibility changes
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
  }
  
  onColumnsReset(): void {
    // Restaurar configuración por defecto
    const defaultVisibleColumns = ['id', 'alias', 'horario', 'totalDurationMinutes', 'normalWorkDay', 'breaks', 'acciones'];
    
    this.tableColumns.forEach(col => {
      col.visible = defaultVisibleColumns.includes(col.key);
    });
    
    // Aplicar reset a ag-Grid
    if (this.gridApi) {
      this.tableColumns.forEach(col => {
        this.gridApi.setColumnsVisible([col.key], col.visible);
      });
      
      // Trigger refresh and resize after reset
      setTimeout(() => {
        this.gridApi.refreshCells({ force: true });
        this.gridApi.sizeColumnsToFit();
      }, 100);
    }
    
    console.log('Columns reset to default');
  }
}