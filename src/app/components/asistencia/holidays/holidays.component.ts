import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions } from 'ag-grid-community';
import { initFlowbite } from 'flowbite';

import { HolidaysService } from 'src/app/core/services/holidays.service';
import { HolidayYear, HolidayTableRow, SynchronizationResult, HolidayStats } from 'src/app/core/models/holiday.model';
import { AG_GRID_LOCALE_ES } from 'src/app/ag-grid-locale.es';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-holidays',
  templateUrl: './holidays.component.html',
  styleUrls: ['./holidays.component.css']
})
export class HolidaysComponent implements OnInit, OnDestroy, AfterViewInit {
  
  // Formulario de filtros
  filterForm!: FormGroup;
  
  // AG-Grid
  @ViewChild('agGrid', { static: false }) agGrid!: AgGridAngular;
  columnDefs: ColDef[] = [];
  rowData: HolidayTableRow[] = [];
  filteredRowData: HolidayTableRow[] = [];
  paginatedData: HolidayTableRow[] = [];
  
  // Propiedades de paginación
  pageNumber = 1;
  pageSize = 25;
  
  gridOptions: GridOptions = {
    theme: 'legacy', // Usar temas CSS legacy (ag-grid.css, ag-theme-alpine.css)
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100
    },
    localeText: AG_GRID_LOCALE_ES,
    suppressHorizontalScroll: false,
    // enableRangeSelection: true, // Comentado: requiere AG-Grid Enterprise
    rowSelection: 'multiple',
    pagination: false // Deshabilitamos la paginación de AG-Grid
  };

  // Estados
  isLoading = false;
  isSynchronizing = false;
  availableYears: string[] = [];
  holidayStats: HolidayStats = { totalHolidays: 0, currentYearHolidays: 0, totalYears: 0, averagePerYear: 0 };
  
  // Mensajes
  successMessage = '';
  errorMessage = '';
  
  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private holidaysService: HolidaysService
  ) {
    this.initializeForm();
    this.setupColumnDefs();
  }

  ngOnInit(): void {
    this.loadHolidays();
  }

  ngAfterViewInit(): void {
    initFlowbite();
  }

  get currentDate(): Date {
    return new Date();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.filterForm = this.fb.group({
      yearFilter: ['all'],
      searchTerm: [''],
      showCurrentYearOnly: [false]
    });

    // Escuchar cambios en el formulario para filtrar datos
    this.filterForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300), // Espera 300ms después de la última entrada
        distinctUntilChanged() // Solo emite si el valor ha cambiado realmente
      )
      .subscribe(() => {
        this.filterData();
      });
  }

  private setupColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: '#',
        valueGetter: (params: any) => {
          const baseIndex = (this.pageNumber - 1) * (this.pageSize || this.filteredRowData.length);
          return baseIndex + params.node.rowIndex + 1;
        },
        width: 60,
        pinned: 'left',
        cellStyle: { textAlign: 'center' },
        headerClass: 'text-xs font-semibold bg-fiori-muted'
      },
      {
        headerName: 'Año',
        field: 'year',
        width: 80,
        pinned: 'left',
        cellStyle: { 
          textAlign: 'center', 
          fontWeight: 'bold',
          color: '#0a6ed1'
        },
        headerClass: 'text-xs font-semibold bg-fiori-muted',
        cellRenderer: (params: any) => {
          const isCurrentYear = params.data.isCurrentYear;
          const badgeClass = isCurrentYear 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-700';
          return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${params.value}</span>`;
        }
      },
      {
        headerName: 'Fecha',
        field: 'holidayDate',
        width: 120,
        headerClass: 'text-xs font-semibold bg-fiori-muted',
        valueFormatter: (params: any) => {
          if (!params.value) return '-';
          return new Date(params.value).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        },
        comparator: (valueA: any, valueB: any) => {
          return new Date(valueA).getTime() - new Date(valueB).getTime();
        }
      },
      {
        headerName: 'Día',
        field: 'dayName',
        width: 100,
        headerClass: 'text-xs font-semibold bg-fiori-muted',
        cellStyle: { fontWeight: '500' }
      },
      {
        headerName: 'Mes',
        field: 'monthName',
        width: 100,
        headerClass: 'text-xs font-semibold bg-fiori-muted'
      },
      {
        headerName: 'Descripción',
        field: 'description',
        flex: 1,
        minWidth: 200,
        headerClass: 'text-xs font-semibold bg-fiori-muted',
        cellStyle: { fontWeight: '500' },
        wrapText: true,
        autoHeight: true
      },
      {
        headerName: 'Duración',
        field: 'duration',
        width: 100,
        headerClass: 'text-xs font-semibold bg-fiori-muted',
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: any) => {
          const duration = params.value;
          const text = duration === 1 ? '1 día' : `${duration} días`;
          const badgeClass = duration > 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600';
          return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}">${text}</span>`;
        }
      }
    ];
  }

  loadHolidays(): void {
    this.isLoading = true;
    this.clearMessages();
    
    this.holidaysService.getHolidays()
      .pipe(
        finalize(() => this.isLoading = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data: HolidayYear[]) => {
          this.rowData = this.holidaysService.transformToTableData(data);
          this.availableYears = this.holidaysService.getAvailableYears(this.rowData);
          this.holidayStats = this.holidaysService.getHolidayStats(this.rowData);
          this.pageNumber = 1; // Reset página al cargar datos
          this.filterData();
          
          this.successMessage = `Se cargaron ${this.rowData.length} feriados correctamente`;
          this.clearMessagesAfterDelay();
        },
        error: (error) => {
          console.error('Error cargando feriados:', error);
          this.errorMessage = 'Error al cargar los feriados. Por favor, inténtelo nuevamente.';
          this.clearMessagesAfterDelay();
        }
      });
  }

  synchronizeData(): void {
    if (this.isSynchronizing) return;

    this.isSynchronizing = true;
    this.clearMessages();
    
    this.holidaysService.synchronizeHolidays(true) // useFullReplacement = true
      .pipe(
        finalize(() => this.isSynchronizing = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result: SynchronizationResult) => {
          if (result.success) {
            this.successMessage = `Sincronización exitosa: ${result.message}`;
            
            // Recargar datos después de sincronización exitosa
            setTimeout(() => {
              this.loadHolidays();
            }, 1000);
          } else {
            this.errorMessage = `Error en sincronización: ${result.message}`;
          }
          this.clearMessagesAfterDelay();
        },
        error: (error) => {
          console.error('Error en sincronización:', error);
          this.errorMessage = 'Error durante la sincronización. Por favor, inténtelo nuevamente.';
          this.clearMessagesAfterDelay();
        }
      });
  }

  private filterData(): void {
    const formValues = this.filterForm.value;
    this.filteredRowData = this.holidaysService.filterTableData(this.rowData, formValues);
    this.pageNumber = 1; // Reset a primera página cuando se filtra
    this.updatePaginatedData();
  }

  onClearFilters(): void {
    this.filterForm.reset({
      yearFilter: 'all',
      searchTerm: '',
      showCurrentYearOnly: false
    });
    this.pageNumber = 1; // Reset página al limpiar filtros
  }

  autoSizeColumns(): void {
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.sizeColumnsToFit();
    }
  }

  exportToCsv(): void {
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.exportDataAsCsv({
        fileName: `feriados_${new Date().getFullYear()}.csv`
      });
    }
  }

  exportToExcel() {

    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.errorMessage = 'No hay datos para exportar.';
      this.clearMessagesAfterDelay();
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    this.styleExcelSheet(worksheet);

    const workbook = { Sheets: { 'Feriados': worksheet }, SheetNames: ['Feriados'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    this.saveAsExcelFile(excelBuffer, 'reporte_feriados');

  }

  private getGridDataForExport(): any[] {
    return this.filteredRowData.map(row => ({
      'Año': row.year,
      'Fecha': new Date(row.holidayDate).toLocaleDateString('es-ES'),
      'Día': row.dayName,
      'Mes': row.monthName,
      'Descripción': row.description,
      'Duración (días)': row.duration
    }));
  }

  private styleExcelSheet(worksheet: XLSX.WorkSheet) {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0A6ED1" } }, // Fiori Primary
      alignment: { horizontal: "center", vertical: "center" }
    };

    const columnWidths = [
      { wch: 10 }, // Año
      { wch: 15 }, // Fecha
      { wch: 15 }, // Día
      { wch: 15 }, // Mes
      { wch: 50 }, // Descripción
      { wch: 15 }  // Duración
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
    this.successMessage = 'El reporte ha sido exportado a Excel.';
    this.clearMessagesAfterDelay();
  }

  exportToPdf() {
    const dataToExport = this.getGridDataForExport();
    if (dataToExport.length === 0) {
      this.errorMessage = 'No hay datos para exportar.';
      this.clearMessagesAfterDelay();
      return;
    }

    const doc = new jsPDF();
    const head = [['Año', 'Fecha', 'Día', 'Mes', 'Descripción', 'Duración (días)']];
    const body = dataToExport.map(row => [
      row.Año,
      row.Fecha,
      row.Día,
      row.Mes,
      row.Descripción,
      row['Duración (días)']
    ]);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Reporte de Feriados', 14, 22);

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

    doc.save('reporte_feriados_' + new Date().getTime() + '.pdf');
    this.successMessage = 'El reporte ha sido exportado a PDF.';
    this.clearMessagesAfterDelay();
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private clearMessagesAfterDelay(): void {
    setTimeout(() => {
      this.clearMessages();
    }, 5000);
  }

  // Getter para template
  get currentYear(): number {
    return new Date().getFullYear();
  }

  // Métodos de paginación
  private updatePaginatedData(): void {
    if (this.pageSize === 0) {
      // Mostrar todos
      this.paginatedData = [...this.filteredRowData];
    } else {
      // Paginación normal
      const startIndex = (this.pageNumber - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.paginatedData = this.filteredRowData.slice(startIndex, endIndex);
    }
  }

  onPageChange(event: { pageNumber: number; pageSize: number }): void {
    this.pageNumber = event.pageNumber;
    this.pageSize = event.pageSize;
    this.updatePaginatedData();
  }
}