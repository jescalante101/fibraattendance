import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions } from 'ag-grid-community';

import { HolidaysService } from 'src/app/core/services/holidays.service';
import { HolidayYear, HolidayTableRow, SynchronizationResult } from 'src/app/core/models/holiday.model';

@Component({
  selector: 'app-holidays',
  templateUrl: './holidays.component.html',
  styleUrls: ['./holidays.component.css']
})
export class HolidaysComponent implements OnInit, OnDestroy {
  
  // Formulario de filtros
  filterForm!: FormGroup;
  
  // AG-Grid
  @ViewChild('agGrid', { static: false }) agGrid!: AgGridAngular;
  columnDefs: ColDef[] = [];
  rowData: HolidayTableRow[] = [];
  filteredRowData: HolidayTableRow[] = [];
  gridOptions: GridOptions = {
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100
    },
    suppressHorizontalScroll: false,
    enableRangeSelection: true,
    rowSelection: 'multiple',
    pagination: true,
    paginationPageSize: 25
  };

  // Estados
  isLoading = false;
  isSynchronizing = false;
  availableYears: string[] = [];
  holidayStats: any = {};
  
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
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterData();
      });
  }

  private setupColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: '#',
        valueGetter: 'node.rowIndex + 1',
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
  }

  onClearFilters(): void {
    this.filterForm.reset({
      yearFilter: 'all',
      searchTerm: '',
      showCurrentYearOnly: false
    });
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
}