import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { Horario } from 'src/app/models/horario.model';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-nuevo-horario',
  templateUrl: './nuevo-horario.component.html',
  styleUrls: ['./nuevo-horario.component.css']
})
export class NuevoHorarioComponent implements OnInit {

  descansoData: any[] = [];
  horarioForm!: FormGroup;
  idHorario: number = 0;
  pageNumber: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;
  useMode:number=0;

  constructor(
    public dialogRef: MatDialogRef<NuevoHorarioComponent>,
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogLoading:MatDialog
  ) {}

  ngOnInit() {
    this.horarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      horaEntrada: ['', Validators.required],
      horaEntradaDesde: [''],
      horaEntradaHasta: [''],
      horaSalida: ['', Validators.required],
      horaSalidaDesde: [''],
      horaSalidaHasta: [''],
      isSelected: [false],
      breakTimeId: [0],
      entradaTemprana: [0],
      entradaTarde: [0],
      minEntradaTemprana: [0],
      minSalidaTarde: [0],
      hNivel: [0],
      hNivel1: [0],
      hNivel2: [0],
      hNivel3: [0],
      marcarEntrada: [false],
      marcarSalida: [false],
      permiteLLegarT: [0],
      permiteSalidaT: [0],
      periodoMarcacion: [0],
      tipoIntervalo: [0],
      basadoM: [0],
      horaCambio: [''],
      diasLaboral: [0, [Validators.required, Validators.min(1), Validators.max(7)]],
    });

    this.loadDescansoData();

    if (this.data) {
      console.log(this.data);
      this.useMode=this.data.use_mode;
      this.loadEdit(this.data.idHorario);
    }
  }

  loadDescansoData() {
    this.attendanceService.getDescansos(this.pageNumber, this.pageSize).subscribe({
      next: (response: any) => {
        if (response) {
          this.descansoData = response.data || [];
          this.totalRecords = response.totalRecords || 0;
        }
      },
      error: (error) => {
        console.error('Error loading descansos:', error);
      }
    });
  }

  loadEdit(idHorario: number) {
    this.attendanceService.getHorarioByID(idHorario).subscribe({
      next: (response: any) => {
        if (response && response.horario) {
          // Mapeo de propiedades del API al formulario
          const horario = {
            nombre: response.horario.nombre,
            horaEntrada: response.horario.horaEntrada,
            horaEntradaDesde: response.horario.horaEntradaDesde,
            horaEntradaHasta: response.horario.horaEntradaHasta,
            horaSalida: response.horario.horaSalida,
            horaSalidaDesde: response.horario.horaSalidaDesde,
            horaSalidaHasta: response.horario.horaSalidaHasta,
            isSelected: false,
            breakTimeId: response.breaktimeId,
            entradaTemprana: response.horario.entradaTemprana,
            entradaTarde: response.horario.entradaTarde,
            minEntradaTemprana: response.horario.minEntradaTemprana,
            minSalidaTarde: response.horario.minSalidaTarde,
            hNivel: response.horario.hnivel,
            hNivel1: response.horario.hNivel1,
            hNivel2: response.horario.hNivel2,
            hNivel3: response.horario.hNivel3,
            marcarEntrada: response.horario.marcarEntrada,
            marcarSalida: response.horario.marcarSalida,
            permiteLLegarT: response.horario.pLlegadaT,
            permiteSalidaT: response.horario.pSalidaT,
            periodoMarcacion: response.horario.periodoMarcacion,
            tipoIntervalo: response.horario.tipoIntervalo,
            basadoM: response.horario.basadoM,
            horaCambio: response.horario.hCambioDia,
            diasLaboral:response.horario.diasLaboral,
          };
          this.horarioForm.patchValue(horario);
          this.idHorario = response.horario.idHorio || 0;
        }
      }
    });
  }

  guardarTurno() {
    // Si el formulario es inválido, marca todos los campos como tocados y no continúa
    if (this.horarioForm.invalid) {
      this.horarioForm.markAllAsTouched();
      return;
    }

    // abrir el modal de loading
    const loadinngRef = this.dialogLoading.open(ModalLoadingComponent);

    const form = this.horarioForm.value;
    const baseDate = '2000-01-01';

    const horarioApi = {
      idHorio: this.idHorario || 0,
      nombre: form.nombre,
      tipo: this.useMode,
      horaEntrada: `${baseDate}T${form.horaEntrada}`,
      horaSalida: `${baseDate}T${form.horaSalida}`,
      tiempoTrabajo: "",
      descanso: form.breakTimeId,
      tipoTrabajo: "",
      horaEntradaDesde: `${baseDate}T${form.horaEntradaDesde}`,
      horaEntradaHasta: `${baseDate}T${form.horaEntradaHasta}`,
      horaSalidaDesde: `${baseDate}T${form.horaSalidaDesde}`,
      horaSalidaHasta: `${baseDate}T${form.horaSalidaHasta}`,
      entradaTemprana: form.entradaTemprana,
      entradaTarde: form.entradaTarde,
      minEntradaTemprana: form.minEntradaTemprana,
      minSalidaTarde: form.minSalidaTarde,
      hnivel: form.hNivel,
      hNivel1: form.hNivel1,
      hNivel2: form.hNivel2,
      hNivel3: form.hNivel3,
      marcarEntrada: form.marcarEntrada,
      marcarSalida: form.marcarSalida,
      pLlegadaT: form.permiteLLegarT,
      pSalidaT: form.permiteSalidaT,
      tipoIntervalo: form.tipoIntervalo,
      periodoMarcacion: form.periodoMarcacion,
      hCambioDia: form.horaCambio ? `${baseDate}T${form.horaCambio}` : "",
      basadoM: form.basadoM,
      diasLaboral: form.diasLaboral,
    };

    if (this.idHorario !== 0) {
      this.attendanceService.updateHorario(horarioApi).subscribe({
        next: (response) => {
          this.dialogRef.close(response);
          loadinngRef.close();
        },
        error: (error) => {
          console.error('Error al actualizar horario:', error);
          loadinngRef.close();
        }
      });
    } else {
      this.attendanceService.saveHorario(horarioApi).subscribe({
        next: (response) => {
          this.dialogRef.close(response);
          loadinngRef.close();
        },
        error: (error) => {
          console.error('Error al guardar horario:', error);
          loadinngRef.close();
        }
      });
    }
  }

  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1;
    this.loadDescansoData();
  }

  cancelar() {
    this.dialogRef.close();
  }

}

