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
  pageSize: number = 10;
  pageNumber: number = 1;

  constructor(
    private attendanceService: AttendanceService,
    private dialog: MatDialog,
    private modalService: ModalService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
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

}