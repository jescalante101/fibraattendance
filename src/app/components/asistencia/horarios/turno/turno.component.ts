import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ShiftsService, Shift } from 'src/app/core/services/shifts.service';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ModalNuevoTurnoComponent } from './modal-nuevo-turno/modal-nuevo-turno.component';
import { MatDialog } from '@angular/material/dialog';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { ToastService } from 'src/app/shared/services/toast.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { finalize } from 'rxjs';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { createFioriGridOptions } from 'src/app/shared/ag-grid-theme-fiori';
import { ColumnManagerConfig, ColumnConfig, ColumnChangeEvent } from 'src/app/shared/column-manager/column-config.interface';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-turno',
  templateUrl: './turno.component.html',
  styleUrls: ['./turno.component.css']
})
export class TurnoComponent implements OnInit {

  dataHorarios: Shift[] = [];
  dataHorariosFiltrados: Shift[] = [];
  filtroTexto: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  totalRecords: number = 0;
  pageSize: number = 50;
  pageNumber: number = 1;
  datosSeleccionado: any[] = [];

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
    { key: 'horario', label: 'Horarios', visible: true, required: true, sortable: true, type: 'text' },
    { key: 'cycleUnit', label: 'Tipo', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'shiftCycle', label: 'Ciclo', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'autoShift', label: 'Estado', visible: true, required: false, sortable: true, type: 'text' },
    { key: 'acciones', label: 'Acciones', visible: true, required: true, sortable: false, type: 'actions' }
  ];

  columnManagerConfig: ColumnManagerConfig = {
    title: 'Gestionar Columnas - Turnos'
  };

  constructor(
    private service: ShiftsService, 
    private modalService: ModalService,  
    private dialog: MatDialog,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.setupAgGrid();
    this.loadTurnosData();
  }

  exportToExcel() {
    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.toastService.warning('Advertencia', 'No hay datos para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    this.styleExcelSheet(worksheet);

    const workbook = { Sheets: { 'Turnos': worksheet }, SheetNames: ['Turnos'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'reporte_turnos');
  }

  private getGridDataForExport(): any[] {
    return this.dataHorariosFiltrados.map(item => ({
      'ID': item.id,
      'Nombre': item.alias,
      'Horarios': this.getAreas(item.horario),
      'Tipo': item.cycleUnit === 1 ? 'Semanal' : 'Diario',
      'Ciclo': `${item.shiftCycle} ${item.cycleUnit === 1 ? 'semanas' : 'días'}`,
      'Estado': item.autoShift ? 'Automático' : 'Manual'
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
      { wch: 40 }, // Horarios
      { wch: 15 }, // Tipo
      { wch: 20 }, // Ciclo
      { wch: 15 }  // Estado
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
    const head = [['ID', 'Nombre', 'Horarios', 'Tipo', 'Ciclo', 'Estado']];
    const body = dataToExport.map(row => [
      row.ID,
      row.Nombre,
      row.Horarios,
      row.Tipo,
      row.Ciclo,
      row.Estado
    ]);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Reporte de Turnos', 14, 22);

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

    doc.save('reporte_turnos_' + new Date().getTime() + '.pdf');
    this.toastService.success('Éxito', 'El reporte ha sido exportado a PDF.');
  }

  updateThorarioSelect(select: any[]) {
    console.log(select);
    this.datosSeleccionado = select;
  }

  loadTurnosData() {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();
    
    this.service.getShifts(this.pageNumber, this.pageSize)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          console.log(data);
          this.dataHorarios = data.data;
          this.dataHorariosFiltrados = [...data.data];
          this.totalRecords = data.totalRecords;
          
          // Update ag-Grid data
          if (this.gridApi) {
            this.gridApi.setRowData(this.dataHorariosFiltrados);
          }
        },
        error: (error) => {
          console.error('Error al cargar turnos:', error);
          this.errorMessage = 'No se pudieron cargar los turnos. Por favor, intente nuevamente.';
          this.toastService.error('Error al cargar', 'No se pudieron cargar los turnos. Verifica tu conexión.');
          this.dataHorarios = [];
          this.dataHorariosFiltrados = [];
          this.totalRecords = 0;
          
          // Clear ag-Grid data on error
          if (this.gridApi) {
            this.gridApi.setRowData([]);
          }
        }
      });
  }

  getAreas(horario: any[]): string {
    // Extrae los alias únicos
    const aliasUnicos = Array.from(new Set(horario.map(item => item.alias)));
    return aliasUnicos.join(', ');
  }

  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24; // Usamos el módulo 24 para manejar el cambio de día
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  ExtraerHoraDeFecha(fechaHora: string ): string {
    const fecha = new Date(fechaHora);
    const hora = fecha.getHours();
    const minutos = fecha.getMinutes();
    const segundos = fecha.getSeconds();
    return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  }

  calcularHoraSalida(horaIngreso: string, tiempoTrabajoMinutos: number): string {
    const horaIngresoCorta = horaIngreso.substring(0, 5);
    const minutosIngreso = this.timeToMinutes(horaIngresoCorta);
    const minutosSalidaTotales = minutosIngreso + tiempoTrabajoMinutos;
    const horaSalida = this.minutesToTime(minutosSalidaTotales);

    if (horaIngreso.length > 5) {
      const segundos = horaIngreso.substring(5);
      return horaSalida + segundos;
    }

    return horaSalida;
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
      this.loadTurnosData();
    }
  }

  openNuevoTurnoModal(): void {
    this.modalService.open({
      title: 'Nuevo Turno',
      componentType: ModalNuevoTurnoComponent,
      componentData: {},
      width: '900px'
    }).then(result => {
      if (result) {
        // console.log('Turno creado:', result);
        // this.toastService.success('Turno creado', 'El nuevo turno ha sido creado exitosamente');
        this.loadTurnosData();
      }
    });
  }

  openEditTurnoModal(turno: Shift): void {
    this.modalService.open({
      title: 'Editar Turno',
      componentType: ModalNuevoTurnoComponent,
      componentData: { turno: turno },
      width: '900px'
    }).then(result => {
      if (result) {
        // console.log('Turno actualizado:', result);
        // this.toastService.success('Turno actualizado', `El turno "${turno.alias}" ha sido actualizado correctamente`);
        this.loadTurnosData();
      }
    });
  }

  // Métodos para estadísticas
  getTurnosAutomaticos(): number {
    return this.dataHorarios.filter(turno => turno.autoShift).length;
  }

  getTurnosManuales(): number {
    return this.dataHorarios.filter(turno => !turno.autoShift).length;
  }

  // Método para recargar datos en caso de error
  retryLoadData(): void {
    this.loadTurnosData();
  }

  // Método para eliminar turno
  deleteTurno(turno: Shift): void {
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
          this.service.deleteShift(turno.id).subscribe(
        (response) => {
          console.log('Turno eliminado exitosamente:', response);
          this.toastService.success('Turno eliminado', `El turno "${turno.alias}" ha sido eliminado correctamente`);
          this.loadTurnosData();
          // Resetear el error message si existía
          this.errorMessage = '';
        },
        (error) => {
          console.error('Error al eliminar turno:', error);
          this.toastService.error('Error al eliminar', `No se pudo eliminar el turno "${turno.alias}". Inténtalo nuevamente.`);
          this.errorMessage = `No se pudo eliminar el turno "${turno.alias}". Por favor, intente nuevamente.`;
        }
      );
        }
      });

    
  }

  // Métodos para filtrado local
  filtrarDatos(): void {
    if (!this.filtroTexto || this.filtroTexto.trim() === '') {
      this.dataHorariosFiltrados = [...this.dataHorarios];
      return;
    }

    const filtro = this.filtroTexto.toLowerCase().trim();
    this.dataHorariosFiltrados = this.dataHorarios.filter(turno => 
      turno.alias?.toLowerCase().includes(filtro) ||
      turno.id?.toString().includes(filtro) ||
      this.getAreas(turno.horario)?.toLowerCase().includes(filtro) ||
      (turno.cycleUnit === 1 ? 'semanal' : 'diario').includes(filtro) ||
      turno.shiftCycle?.toString().includes(filtro) ||
      (turno.autoShift ? 'automatico' : 'manual').includes(filtro)
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
        maxWidth: 50,
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
        maxWidth: 80,
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
        width: 450,
        maxWidth: 450,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `<div class="flex items-center py-1">
            <div class="w-8 h-8 bg-fiori-primary/10 rounded-lg flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-fiori-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
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
        headerName: 'Horarios',
        width: 500,
        maxWidth: 500,

        cellRenderer: (params: any) => {
          const horarios = this.getAreas(params.value);
          return `<div class="flex items-center text-sm">
            <svg class="w-4 h-4 text-fiori-info mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span class="text-fiori-text" title="${horarios}">${horarios}</span>
          </div>`;
        }
      },
      {
        field: 'cycleUnit',
        headerName: 'Tipo',
        width: 120,
        cellRenderer: (params: any) => {
          if (params.value === 1) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-info/10 text-fiori-info border border-fiori-info/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Semanal
            </span>`;
          } else {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-warning/10 text-fiori-warning border border-fiori-warning/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Diario
            </span>`;
          }
        }
      },
      {
        field: 'shiftCycle',
        headerName: 'Ciclo',
        cellRenderer: (params: any) => {
          const unit = params.data.cycleUnit === 1 ? 'semanas' : 'días';
          return `<div class="flex items-center justify-center">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-muted text-fiori-text">
              ${params.value} ${unit}
            </span>
          </div>`;
        }
      },
      {
        field: 'autoShift',
        headerName: 'Estado',
        cellRenderer: (params: any) => {
          if (params.value) {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-success/10 text-fiori-success border border-fiori-success/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Automático
            </span>`;
          } else {
            return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fiori-error/10 text-fiori-error border border-fiori-error/20">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
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
            <button class="edit-btn p-1.5 text-fiori-primary hover:text-fiori-secondary hover:bg-fiori-primary/5 rounded-lg transition-colors" title="Editar turno">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button class="delete-btn p-1.5 text-fiori-error hover:text-red-800 hover:bg-fiori-error/5 rounded-lg transition-colors" title="Eliminar turno">
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
              this.openEditTurnoModal(rowData);
            }
          }
        } else if (button && button.classList.contains('delete-btn')) {
          const cell = button.closest('.ag-cell');
          if (cell) {
            const rowIndex = parseInt(cell.closest('.ag-row')?.getAttribute('row-index') || '0');
            const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
            if (rowData) {
              this.deleteTurno(rowData);
            }
          }
        }
      });
      
      // Also handle row clicks for updateThorarioSelect
      gridElement.addEventListener('click', (event: Event) => {
        const target = event.target as HTMLElement;
        const row = target.closest('.ag-row');
        
        if (row && !target.closest('button')) {
          const rowIndex = parseInt(row.getAttribute('row-index') || '0');
          const rowData = this.gridApi.getDisplayedRowAtIndex(rowIndex)?.data;
          if (rowData && rowData.horario) {
            this.updateThorarioSelect(rowData.horario);
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
    const defaultVisibleColumns = ['id', 'alias', 'horario', 'cycleUnit', 'shiftCycle', 'autoShift', 'acciones'];
    
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