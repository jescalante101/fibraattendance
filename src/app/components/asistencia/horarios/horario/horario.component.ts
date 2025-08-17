import { DatePipe } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { NuevoHorarioComponent } from './nuevo-horario/nuevo-horario.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { FixedSizeVirtualScrollStrategy } from '@angular/cdk/scrolling';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { finalize } from 'rxjs';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';

@Component({
  selector: 'app-horario',
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit {

  dataHorarios: any[] = [];
  dataHorariosFiltrados: any[] = [];
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

  // Column Manager
  tableColumns: ColumnConfig[] = [
    { key: 'idHorio', label: 'ID', visible: true, required: true, sortable: true, type: 'number' },
    { key: 'nombre', label: 'Nombre', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'tipo', label: 'Tipo', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'horario', label: 'Horario', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'tiempoTrabajo', label: 'Tiempo Trabajo', visible: true, required: false, sortable: true, type: 'number' },
    { key: 'descanso', label: 'Descanso', visible: true, required: false, sortable: true, type: 'number' },
    { key: 'diasLaboral', label: 'Días', visible: true, required: false, sortable: true, type: 'number' },
    { key: 'acciones', label: 'Acciones', visible: true, required: true, sortable: false, type: 'actions' }
  ];

  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas - Horarios'
  };

  constructor(
    private service: AttendanceService,
    private dialog: MatDialog,
    private modalService: ModalService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.setupAgGrid();
    this.loadHoraiosData();
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
      'ID': item.idHorio,
      'Nombre': item.nombre,
      'Tipo': item.tipo === 0 ? 'Estándar' : 'Flexible',
      'Entrada': item.horaEntrada,
      'Salida': item.horaSalida,
      'Tiempo Trabajo (min)': item.tiempoTrabajo,
      'Descanso (min)': item.descanso,
      'Días Laborales': item.diasLaboral
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
      { wch: 15 }, // Tipo
      { wch: 15 }, // Entrada
      { wch: 15 }, // Salida
      { wch: 20 }, // Tiempo Trabajo (min)
      { wch: 20 }, // Descanso (min)
      { wch: 20 }  // Días Laborales
    ];
    worksheet['!cols'] = columnWidths;

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:H1');
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
    const head = [['ID', 'Nombre', 'Tipo', 'Entrada', 'Salida', 'Tiempo Trabajo (min)', 'Descanso (min)', 'Días Laborales']];
    const body = dataToExport.map(row => [
      row.ID,
      row.Nombre,
      row.Tipo,
      row.Entrada,
      row.Salida,
      row['Tiempo Trabajo (min)'],
      row['Descanso (min)'],
      row['Días Laborales']
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
    this.loading = true;
    this.cdr.detectChanges();
    
    this.service.getHorarios(this.pageNumber,this.pageSize)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log(data);
          this.dataHorarios=data.data;
          this.dataHorariosFiltrados = [...data.data];
          this.totalRecords=data.totalRecords;
          
          // Update ag-Grid data
          if (this.gridApi) {
            this.gridApi.setRowData(this.dataHorariosFiltrados);
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
    console.log('Abrir modal para nuevo horario');
    
    this.modalService.open({
      title: mode == 0 ? 'Nuevo Horario Normal' : 'Nuevo Horario Flexible',
      componentType: NuevoHorarioComponent,
      componentData: { use_mode: mode },
    }).then(result => {
      this.loadHoraiosData();
      if (result?.id) {
        this.toastService.success('Horario creado', 'El horario se guardó correctamente');
      }
    });
  }

  // Método para abrir el modal de edición usando el modal personalizado
  editarHorario(idHorario: number, use_mode: number) {
    console.log('Abrir modal para Editar horario');
    
    this.modalService.open({
      title: 'Editar Horario',
      componentType: NuevoHorarioComponent,
      componentData: { idHorario: idHorario, use_mode: use_mode },
    }).then(result => {
      if (result) {
        if(result.id){
          this.loadHoraiosData();
          this.toastService.success('Horario actualizado', 'El horario se actualizó correctamente');
        }
        console.log('Horario actualizado:', result);
      }
    });
  }

  // Método para eliminar un horario
  eliminarHorario(idHorario: number) {
    this.service.deleteHorario(idHorario).subscribe({
      next: (response) => {
        console.log('Horario eliminado:', response);
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

  testModal() {
    console.log('=== TEST MODAL BÁSICO ===');
    try {
      this.modalService.open({
        title: 'Test Modal',
        componentType: NuevoHorarioComponent,
        componentData: { use_mode: 0 },
        width: '600px',
        height: 'auto'
      }).then(result => {
        console.log('Modal cerrado con resultado:', result);
      });
    } catch (e) {
      console.error('Error en test modal:', e);
    }
  }

  // Métodos para estadísticas
  getHorariosEstandar(): number {
    return this.dataHorarios?.filter(h => h.tipo === 0)?.length || 0;
  }

  getHorariosFlexibles(): number {
    return this.dataHorarios?.filter(h => h.tipo !== 0)?.length || 0;
  }

  // Métodos para filtrado local
  filtrarDatos(): void {
    if (!this.filtroTexto || this.filtroTexto.trim() === '') {
      this.dataHorariosFiltrados = [...this.dataHorarios];
      return;
    }

    const filtro = this.filtroTexto.toLowerCase().trim();
    this.dataHorariosFiltrados = this.dataHorarios.filter(horario => 
      horario.nombre?.toLowerCase().includes(filtro) ||
      horario.idHorio?.toString().includes(filtro) ||
      horario.horaEntrada?.toLowerCase().includes(filtro) ||
      horario.horaSalida?.toLowerCase().includes(filtro) ||
      (horario.tipo === 0 ? 'estandar' : 'flexible').includes(filtro) ||
      horario.diasLaboral?.toString().includes(filtro) ||
      horario.tiempoTrabajo?.toString().includes(filtro) ||
      horario.descanso?.toString().includes(filtro)
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
        width: 50,
        pinned: 'left',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        resizable: false,
        sortable: false,
        filter: false
      },
      {
        field: 'idHorio',
        headerName: 'ID',
        width: 80,
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
        field: 'nombre',
        headerName: 'Nombre',
        width: 280,
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
        field: 'tipo',
        headerName: 'Tipo',
        cellRenderer: (params: any) => {
          if (params.value === 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-info/10 text-fiori-info border border-fiori-info/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Estándar
            </span>`;
          } else {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-warning/10 text-fiori-warning border border-fiori-warning/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Flexible
            </span>`;
          }
        }
      },
      {
        field: 'horario',
        headerName: 'Horario',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-fiori-text font-medium">${params.data.horaEntrada}</span>
            </div>
            <svg class="w-3 h-3 text-fiori-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3 text-fiori-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-fiori-text font-medium">${params.data.horaSalida}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'tiempoTrabajo',
        headerName: 'Tiempo Trabajo',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center space-x-2">
            <svg class="w-4 h-4 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium text-fiori-text">${params.value} min</span>
          </div>`;
        }
      },
      {
        field: 'descanso',
        headerName: 'Descanso',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center space-x-2">
            <svg class="w-4 h-4 text-fiori-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
            <span class="text-sm font-medium text-fiori-text">${params.value} min</span>
          </div>`;
        }
      },
      {
        field: 'diasLaboral',
        headerName: 'Días',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center justify-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-muted text-fiori-text">
              ${params.value} días
            </span>
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
              this.editarHorario(rowData.idHorio, rowData.tipo);
            }
          }
        } else if (button && button.classList.contains('delete-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.openConfirmationDialog(rowData.idHorio);
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
    const defaultVisibleColumns = ['idHorio', 'nombre', 'tipo', 'horario', 'tiempoTrabajo', 'descanso', 'diasLaboral', 'acciones'];
    
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