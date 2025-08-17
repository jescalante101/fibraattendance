import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { NuevoDescansoComponent } from './nuevo-descanso/nuevo-descanso.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { PaginatorEvent } from 'src/app/shared/fiori-paginator/fiori-paginator.component';
import { ToastService } from 'src/app/shared/services/toast.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';

@Component({
  selector: 'app-descanso',
  templateUrl: './descanso.component.html',
  styleUrls: ['./descanso.component.css']
})
export class DescansoComponent implements OnInit {
  // Variables for data
  dataDescansos: any[] = [];
  filteredDescansos: any[] = [];
  searchTerm: string = '';
  
  // Variables for pagination
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
    { key: 'id', label: 'ID', visible: true, required: true, sortable: true, type: 'number' },
    { key: 'alias', label: 'Nombre', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'periodStart', label: 'Horario', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'duration', label: 'Duración', visible: true, required: true, sortable: true, type: 'number' },
    { key: 'calcType', label: 'Tipo de Cálculo', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'acciones', label: 'Acciones', visible: true, required: true, sortable: false, type: 'actions' }
  ];

  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas - Descansos'
  };

  constructor(
    private attendanceService: AttendanceService,
    private dialog: MatDialog,
    private modalService: ModalService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.setupAgGrid();
    this.loadDescansos();
  }

  exportToExcel() {
    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    this.styleExcelSheet(worksheet);

    const workbook = { Sheets: { 'Descansos': worksheet }, SheetNames: ['Descansos'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'reporte_descansos');
  }

  private getGridDataForExport(): any[] {
    return this.filteredDescansos.map(item => ({
      'ID': item.id,
      'Nombre': item.alias,
      'Inicio': this.extraerHora(item.periodStart),
      'Fin': this.calcularHoraFin(this.extraerHora(item.periodStart), item.duration),
      'Duración (min)': item.duration,
      'Tipo de Cálculo': item.calcType === 0 ? 'Auto Deducir' : 'Manual'
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
      { wch: 15 }, // Inicio
      { wch: 15 }, // Fin
      { wch: 20 }, // Duración (min)
      { wch: 20 }  // Tipo de Cálculo
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
    const head = [['ID', 'Nombre', 'Inicio', 'Fin', 'Duración (min)', 'Tipo de Cálculo']];
    const body = dataToExport.map(row => [
      row.ID,
      row.Nombre,
      row.Inicio,
      row.Fin,
      row['Duración (min)'],
      row['Tipo de Cálculo']
    ]);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Reporte de Descansos', 14, 22);

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

    doc.save('reporte_descansos_' + new Date().getTime() + '.pdf');
    this.toastService.success('Éxito', 'El reporte ha sido exportado a PDF.');
  }

  loadDescansos() {
    this.attendanceService.getDescansos(this.pageNumber, this.pageSize).subscribe({
      next: (response: any) => {
        console.log('Response:', response);
        if (response) {
          this.dataDescansos = response.data || [];
          this.filteredDescansos = [...this.dataDescansos];
          this.totalRecords = response.totalRecords || 0;
          
          // Update ag-Grid data
          if (this.gridApi) {
            this.gridApi.setRowData(this.filteredDescansos);
          }
        }
      },
      error: (error) => {
        console.error('Error loading descansos:', error);
        this.toastService.error('Error al cargar', 'No se pudieron cargar los descansos. Verifica tu conexión.');
      }
    });
  }

calcularHoraFin(horaInicio: string, duracionEnMinutos: number): string {
    if (!horaInicio || isNaN(duracionEnMinutos)) {
      return '';
    }

    // Convertir la hora de inicio en minutos desde medianoche
    const [horas, minutos, segundos] = horaInicio.split(':').map(Number);
    let totalMinutosInicio = horas * 60 + minutos;

    // Añadir la duración
    let totalMinutosFin = totalMinutosInicio + duracionEnMinutos;

    // Asegurar que no pase las 24 horas
    totalMinutosFin = totalMinutosFin % (24 * 60);

    // Convertir de vuelta a formato HH:mm:ss
    const horasFin = Math.floor(totalMinutosFin / 60);
    const minutosFin = totalMinutosFin % 60;

    return `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  handlePageEvent(event: PageEvent) {
    this.pageNumber = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadDescansos();
  }

   onPageChangeCustom(event: PaginatorEvent) {
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    this.totalRecords=event.totalRecords
    this.loadDescansos();
  }

  /**
   * Extrae solo la parte de la hora de una fecha ISO en formato string
   * @param isoDateString Fecha en formato ISO (ej: "1900-01-01T23:30:00")
   * @returns String con formato "HH:mm:ss"
   */
  extraerHora(isoDateString: string): string {
    if (!isoDateString) {
      return '';
}

    try {
      // Crear un objeto Date a partir del string ISO
      const fecha = new Date(isoDateString);

      // Extraer las horas, minutos y segundos
      const horas = fecha.getHours().toString().padStart(2, '0');
      const minutos = fecha.getMinutes().toString().padStart(2, '0');
      const segundos = fecha.getSeconds().toString().padStart(2, '0');

      // Devolver en formato HH:mm:ss
      return `${horas}:${minutos}:${segundos}`;
    } catch (error) {
      console.error('Error al extraer hora:', error);
      return '';
    }
  }


  //Metodo para abrir un modal y registrar un nuevo descanso
  //vamos a abrir NuevoDescansoComponent
  openModalNuevoDescanso() {
    this.dialog.open(NuevoDescansoComponent, {
      hasBackdrop: true,
      backdropClass: 'backdrop-modal', // Clase personalizada para el fondo
      
    }).afterClosed().subscribe(result => {
      if (result) {
        // Aquí puedes manejar el resultado del modal
        console.log('Resultado del modal:', result);
        // Recargar los descansos después de cerrar el modal
        this.loadDescansos();
      }
      
    });
    console.log('Abrir modal para nuevo descanso');
  }
  //Metodo para abrir un modal y registrar un nuevo descanso
  //vamos a abrir NuevoDescansoComponent
  openModalNuevoDescanso2() {
    this.modalService.open({
      title: 'Nuevo Descanso',
      componentType: NuevoDescansoComponent,
       // Clase personalizada para el fondo
    }).then(result => {
      if (result) {
        // Aquí puedes manejar el resultado del modal
        console.log('Resultado del modal:', result);
        // Recargar los descansos después de cerrar el modal
        this.loadDescansos();
        this.toastService.success('Descanso creado', 'El descanso se guardó correctamente');
      }
    });
    console.log('Abrir modal para nuevo descanso');
  }


  //Metodo para abrir un modal y editar un descanso
  //vamos a abrir NuevoDescansoComponent
  openModalEditarDescanso(idDescanso: number) {
    this.dialog.open(NuevoDescansoComponent, {
      hasBackdrop: true,
      backdropClass: 'backdrop-modal', // Clase personalizada para el fondo
      data: {
        id: idDescanso
      }
    }).afterClosed().subscribe(result => {
      if (result) {
        console.log('Resultado del modal:', result);
        this.loadDescansos();
        this.toastService.success('Descanso actualizado', 'El descanso se guardó correctamente');
      }
    });
    console.log('Abrir modal para editar descanso');
  }
  //Metodo para abrir un modal y editar un descanso
  //vamos a abrir NuevoDescansoComponent
  openModalEditarDescanso2(idDescanso: number) {
    this.modalService.open({
      title: 'Editar Descanso',
      componentType: NuevoDescansoComponent,
      componentData: { id: idDescanso },
      // Clase personalizada para el fondo
    }).then(result => {
      if (result) {
        console.log('Resultado del modal:', result);
        this.loadDescansos();
        this.toastService.success('Descanso actualizado', 'El descanso se actualizó correctamente');
      }
    });
    console.log('Abrir modal para editar descanso');
  }

  //metedo para eliminar un descanso
  eliminarDescanso(idDescanso: number) {
    this.attendanceService.deleteDescanso(idDescanso).subscribe({
      next: (response) => {
        console.log('Descanso eliminado:', response);
        this.loadDescansos();
        this.toastService.success('Descanso eliminado', 'El descanso se eliminó correctamente');
      },
      error: (error) => {
        console.error('Error al eliminar descanso:', error);
        this.toastService.error('Error al eliminar', 'No se pudo eliminar el descanso. Inténtalo nuevamente');
      }
    });
  }

   openConfirmationDialog(idDescanso: number) {
     const dialogRef = this.dialog.open(ModalConfirmComponent, {
        width: '400px',
        height: '200px',
        hasBackdrop: true,
        backdropClass: 'backdrop-modal',
        data: {
          tipo: 'danger',
          titulo: '¿Eliminar Descanso?',
          mensaje: '¿Estás seguro de que deseas eliminar este Descanso? Esta acción no se puede deshacer.',
          confirmacion: true,
          textoConfirmar: 'Eliminar'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // El usuario confirmó
          this.eliminarDescanso(idDescanso);
        }
      });
    }

  eliminarSeleccionados(){
    
  }

  // Search functionality
  onSearchChange(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDescansos = [...this.dataDescansos];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDescansos = this.dataDescansos.filter(descanso => 
      descanso.alias?.toLowerCase().includes(term) ||
      descanso.id?.toString().includes(term)
    );
    
    // Update ag-Grid data with filtered results
    if (this.gridApi) {
      this.gridApi.setRowData(this.filteredDescansos);
    }
  }

  // Statistics methods
  getAutoDeductCount(): number {
    return this.dataDescansos.filter(item => item.calcType === 0).length;
  }

  getManualCount(): number {
    return this.dataDescansos.filter(item => item.calcType !== 0).length;
  }

  // Display helper for pagination
  getDisplayRange(): string {
    const start = (this.pageNumber - 1) * this.pageSize + 1;
    const end = Math.min(this.pageNumber * this.pageSize, this.totalRecords);
    return `${start}-${end}`;
  }

  // TrackBy function for performance
  trackByDescansoId(index: number, descanso: any): number {
    return descanso.id;
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
        field: 'id',
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
        field: 'alias',
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
        field: 'periodStart',
        headerName: 'Horario',
        cellRenderer: (params: any) => {
          const horaInicio = this.extraerHora(params.value);
          const horaFin = this.calcularHoraFin(horaInicio, params.data.duration);
          return `<div class="flex items-center space-x-2">
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3 text-fiori-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-fiori-text">${horaInicio}</span>
            </div>
            <svg class="w-3 h-3 text-fiori-subtext" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3 text-fiori-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-fiori-text">${horaFin}</span>
            </div>
          </div>`;
        }
      },
      {
        field: 'duration',
        headerName: 'Duración',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-fiori-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium text-fiori-text">${params.value} min</span>
          </div>`;
        }
      },
      {
        field: 'calcType',
        headerName: 'Tipo de Cálculo',
        cellRenderer: (params: any) => {
          if (params.value === 0) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-success/10 text-fiori-success border border-fiori-success/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Auto Deducir
            </span>`;
          } else {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-warning/10 text-fiori-warning border border-fiori-warning/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015.16 2.76L14 12.5V11.5a1.5 1.5 0 00-3 0v0"></path>
              </svg>
              Manual
            </span>`;
          }
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
            <button class="edit-btn p-1.5 text-fiori-primary hover:text-fiori-secondary hover:bg-fiori-primary/5 rounded-lg transition-colors" title="Editar descanso">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-btn p-1.5 text-fiori-error hover:text-red-800 hover:bg-fiori-error/5 rounded-lg transition-colors" title="Eliminar descanso">
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
              this.openModalEditarDescanso2(rowData.id);
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
    const defaultVisibleColumns = ['id', 'alias', 'periodStart', 'duration', 'calcType', 'acciones'];
    
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