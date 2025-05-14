import { Component, Inject, Input, OnInit, SimpleChanges, ViewEncapsulation} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
@Component({
  selector: 'app-modal-alerta',
  templateUrl: './modal-alerta.component.html',
  styleUrls: ['./modal-alerta.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class ModalAlertaComponent implements OnInit{



  @Input() datalocal: any;
  registrosPaginados: AttendanceRecord[] = [];
  pageSize = 7;
  currentPage = 1;
  totalPages = 1;

  constructor(
    private dialogRef: MatDialogRef<ModalAlertaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mensaje?: string; field?: AttendanceRecord[] }
  ) {}

  ngOnInit(): void {
     this.actualizarPaginacion();
  }

  close(): void {
    this.dialogRef.close();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.currentPage = 1; // Resetear a la primera página cuando los datos cambian
      this.actualizarPaginacion();
    }
  }

  actualizarPaginacion(): void {
    if (this.data && this.data.field) {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.registrosPaginados = this.data.field.slice(startIndex, endIndex);
      this.totalPages = Math.ceil(this.data.field.length / this.pageSize);
    } else {
      this.registrosPaginados = [];
      this.totalPages = 1;
    }
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages) {
      this.currentPage = pagina;
      this.actualizarPaginacion();
    }
  }

  getPaginas(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
}


export interface AttendanceRecord {
  enrollNumber: string;
  verifyMode: number;
  inOutMode: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  timestamp: string;
  recordType: "Entrada" | "Salida" | string; // Assuming "Salida" is another possible type
  workCode: number;
}