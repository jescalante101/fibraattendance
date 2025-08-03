import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

export interface PaginatorEvent {
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

@Component({
  selector: 'app-fiori-paginator',
  templateUrl: './fiori-paginator.component.html',
  styleUrls: ['./fiori-paginator.component.css']
})
export class FioriPaginatorComponent implements OnInit {

  // Inputs para configurar el paginador
  @Input() totalRecords: number = 0;
  @Input() pageSize: number = 10;
  @Input() pageNumber: number = 1;
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50, 100];
  @Input() showAllOption: boolean = true;
  @Input() loading: boolean = false;

  // Outputs para eventos
  @Output() pageChange = new EventEmitter<PaginatorEvent>();

  // Propiedades calculadas
  totalPages: number = 0;
  startRecord: number = 0;
  endRecord: number = 0;
  showPageSizeDropdown: boolean = false;

  ngOnInit(): void {
    this.calculatePages();
  }

  ngOnChanges(): void {
    this.calculatePages();
  }

  calculatePages(): void {
    if (this.pageSize === 0) {
      // Mostrar todos los registros
      this.totalPages = 1;
      this.startRecord = this.totalRecords > 0 ? 1 : 0;
      this.endRecord = this.totalRecords;
    } else {
      this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
      this.startRecord = this.totalRecords > 0 ? (this.pageNumber - 1) * this.pageSize + 1 : 0;
      this.endRecord = Math.min(this.pageNumber * this.pageSize, this.totalRecords);
    }
  }

  // Navegación de páginas
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.pageNumber) {
      this.pageNumber = page;
      this.emitPageChange();
    }
  }

  previousPage(): void {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.emitPageChange();
    }
  }

  nextPage(): void {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.emitPageChange();
    }
  }

  // Cambio de tamaño de página
  changePageSize(newSize: number): void {
    this.pageSize = newSize;
    this.pageNumber = 1; // Resetear a la primera página
    this.showPageSizeDropdown = false;
    this.emitPageChange();
  }

  // Mostrar todos los registros
  showAll(): void {
    this.pageSize = 0; // 0 significa todos los registros
    this.pageNumber = 1;
    this.showPageSizeDropdown = false;
    this.emitPageChange();
  }

  // Generar array de páginas para mostrar
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Mostrar todas las páginas si hay 5 o menos
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica para mostrar páginas alrededor de la actual
      let start = Math.max(1, this.pageNumber - 2);
      let end = Math.min(this.totalPages, start + maxVisiblePages - 1);
      
      // Ajustar el inicio si estamos cerca del final
      if (end - start < maxVisiblePages - 1) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // Toggle dropdown de tamaño de página
  togglePageSizeDropdown(): void {
    this.showPageSizeDropdown = !this.showPageSizeDropdown;
  }

  closePageSizeDropdown(): void {
    setTimeout(() => {
      this.showPageSizeDropdown = false;
    }, 150);
  }

  // Emitir evento de cambio
  private emitPageChange(): void {
    this.calculatePages();
    this.pageChange.emit({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      totalRecords: this.totalRecords
    });
  }

  // Getters para el template
  get isFirstPage(): boolean {
    return this.pageNumber <= 1;
  }

  get isLastPage(): boolean {
    return this.pageNumber >= this.totalPages;
  }

  get currentPageSizeLabel(): string {
    return this.pageSize === 0 ? 'Todos' : this.pageSize.toString();
  }
}