import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';
import { NuevoHorarioComponent } from './nuevo-horario/nuevo-horario.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';
import { FixedSizeVirtualScrollStrategy } from '@angular/cdk/scrolling';
import { ModalService } from 'src/app/shared/modal/modal.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-horario',
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.css']
})
export class HorarioComponent implements OnInit {

  dataHorarios: any[] = [];
  dataHorariosFiltrados: any[] = [];
  filtroTexto: string = '';

  totalRecords: number = 0;
  pageSize: number = 15;
  pageNumber: number = 1;

  constructor(
    private service: AttendanceService,
    private dialog: MatDialog,
    private modalService: ModalService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
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
    const loadinngRef=this.dialog.open(ModalLoadingComponent);
    this.service.getHorarios(this.pageNumber,this.pageSize).subscribe(
      (data)=>{
        console.log(data);
        this.dataHorarios=data.data;
        this.dataHorariosFiltrados = [...data.data];
        this.totalRecords=data.totalRecords;
        loadinngRef.close();
      },
      (error)=>{
        console.error('Error al cargar los horarios:', error);
        this.toastService.error('Error al cargar', 'No se pudieron cargar los horarios. Verifica tu conexión.');
        loadinngRef.close();
      }
    )
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
  }

  limpiarFiltro(): void {
    this.filtroTexto = '';
    this.dataHorariosFiltrados = [...this.dataHorarios];
  }
}