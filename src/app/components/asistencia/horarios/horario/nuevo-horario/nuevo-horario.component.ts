import { Component, Inject, Input, OnInit, Optional, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Horario } from 'src/app/models/horario.model';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';
import { ToastService } from 'src/app/shared/services/toast.service';

@Component({
  selector: 'app-nuevo-horario',
  templateUrl: './nuevo-horario.component.html',
  styleUrls: ['./nuevo-horario.component.css']
})
export class NuevoHorarioComponent implements OnInit {

  @Input() componentData: any;
  
  // Referencia al modal padre (será inyectada por el modal component)
  modalRef: any;

  descansoData: any[] = [];
  horarioForm!: FormGroup;
  idHorario: number = 0;
  pageNumber: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;
  useMode:number=0;
  isEditMode: boolean = false;
  loading = false;

  // Datos de login
  userLogin: string = '';


  constructor(
    @Optional() public dialogRef: MatDialogRef<NuevoHorarioComponent>,
    private attendanceService: AttendanceService,
    private fb: FormBuilder,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    console.log('componentData nuevo horario',this.componentData);
    console.log('data nuevo horario',this.data);
    const data2 = this.data;
    
    if (data2) {
      this.useMode = data2.use_mode;
      this.isEditMode= data2.idHorario !== 0;
      this.loadEdit(data2.idHorario);
    }

    this.horarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      horaEntrada: ['', Validators.required],
      horaEntradaDesde: [''],
      horaEntradaHasta: [''],
      horaSalida: ['', Validators.required],
      horaSalidaDesde: [''],
      horaSalidaHasta: [''],
      isSelected: [false],
      breakTimeId: [0, [Validators.min(0)]],
      entradaTemprana: [0, [Validators.min(0)]],
      entradaTarde: [0, [Validators.min(0)]],
      minEntradaTemprana: [60, [Validators.min(0)]],
      minSalidaTarde: [60, [Validators.min(0)]],
      hNivel: [0, [Validators.min(0)]],
      hNivel1: [0, [Validators.min(0)]],
      hNivel2: [0, [Validators.min(0)]],
      hNivel3: [0, [Validators.min(0)]],
      marcarEntrada: [false],
      marcarSalida: [false],
      permiteLLegarT: [0, [Validators.min(0)]],
      permiteSalidaT: [0, [Validators.min(0)]],
      periodoMarcacion: [0, [Validators.min(0)]],
      tipoIntervalo: [0, [Validators.min(0)]],
      basadoM: [0, [Validators.min(0)]],
      horaCambio: [''],
      totalMarcaciones: [4, [Validators.min(1)]],
      diasLaboral: [0, [Validators.required, Validators.min(0), Validators.max(1)]],
      
    });

    this.loadDescansoData();
    this.getCurrentUserLogin();

    
  }

  private getCurrentUserLogin() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userLogin = user.username;
    }
  }


  ngOnChanges(changes: SimpleChanges) {
    console.log('componentData',this.componentData);
    console.log('data',this.data);
    if (changes['componentData'] && this.componentData) {
      // Aquí sí puedes usar los datos
      console.log('componentData',changes['componentData']);
      const data2 = this.componentData;
      if (data2) {
        this.useMode = data2.use_mode;
        this.loadEdit(data2.idHorario);
      }
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
        this.toastService.error('Error al cargar', 'No se pudieron cargar los descansos disponibles');
      }
    });
  }

  loadEdit(idHorario: number) {
    this.attendanceService.getHorarioByID(idHorario).subscribe({
      next: (response: any) => {
        if (response && response.horario) {
          console.log('Datos recibidos del API:', response);
          
          // Mapeo de propiedades del API al formulario
          const horario = {
            nombre: response.horario.nombre || '',
            horaEntrada: response.horario.horaEntrada || '',
            horaEntradaDesde: response.horario.horaEntradaDesde || '',
            horaEntradaHasta: response.horario.horaEntradaHasta || '',
            horaSalida: response.horario.horaSalida || '',
            horaSalidaDesde: response.horario.horaSalidaDesde || '',
            horaSalidaHasta: response.horario.horaSalidaHasta || '',
            isSelected: false,
            breakTimeId: response.breaktimeId || 0,
            entradaTemprana: response.horario.entradaTemprana || 0,
            entradaTarde: response.horario.entradaTarde || 0,
            minEntradaTemprana: response.horario.minEntradaTemprana || 60,
            minSalidaTarde: response.horario.minSalidaTarde || 60,
            hNivel: response.horario.hnivel || 0,
            hNivel1: response.horario.hNivel1 || 0,
            hNivel2: response.horario.hNivel2 || 0,
            hNivel3: response.horario.hNivel3 || 0,
            marcarEntrada: response.horario.marcarEntrada || false,
            marcarSalida: response.horario.marcarSalida || false,
            permiteLLegarT: response.horario.pLlegadaT || 0,
            permiteSalidaT: response.horario.pSalidaT || 0,
            periodoMarcacion: response.horario.periodoMarcacion || 0,
            tipoIntervalo: response.horario.tipoIntervalo || 0,
            basadoM: response.horario.basadoM || 0,
            horaCambio: response.horario.hCambioDia || '',
            diasLaboral: response.horario.diasLaboral || 0,
            totalMarcaciones: response.horario.totalMarcaciones || 1,
          };
          
          
          console.log('Datos mapeados para el formulario:', horario);
          
          this.horarioForm.patchValue(horario);
          this.idHorario = response.horario.idHorio || 0;
          
          // Verificar el estado del formulario después de cargar los datos
          setTimeout(() => {
            console.log('Estado del formulario después de cargar datos:', {
              valid: this.horarioForm.valid,
              invalid: this.horarioForm.invalid,
              errors: this.getFormErrors(),
              values: this.horarioForm.value
            });
          }, 100);
        }
      },
      error: (error) => {
        console.error('Error al cargar horario para editar:', error);
        this.toastService.error('Error al cargar', 'No se pudieron cargar los datos del horario para editar');
      }
    });
  }

  guardarTurno() {
    this.loading = true;
    // Si el formulario es inválido, marca todos los campos como tocados y no continúa
    if (this.horarioForm.invalid) {
      this.horarioForm.markAllAsTouched();
      console.log('formulario invalido', this.horarioForm);
      console.log('Errores del formulario:', this.getFormErrors());
      this.toastService.warning('Formulario incompleto', 'Por favor completa todos los campos requeridos');
      this.loading = false;
      return;
    }

    
    const form = this.horarioForm.value;
    const baseDate = '2000-01-01';   

    if (this.idHorario !== 0) {
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
      totalMarcaciones: form.totalMarcaciones,
      updatedBy:this.userLogin,
    };
      this.attendanceService.updateHorario(horarioApi).subscribe({
        next: (response) => {
          
          // Cerrar el modal padre con los datos de respuesta
          if (this.modalRef) {
            this.modalRef.closeModalFromChild(response);
          } else if (this.dialogRef) {
            this.dialogRef.close(response);
          }
        },
        error: (error) => {
          console.error('Error al actualizar horario:', error);
          this.toastService.error('Error al actualizar', 'No se pudo actualizar el horario. Verifica los datos e intenta nuevamente');
          this.loading = false;
        }
      });
    } else {
      const horarioApiInsert = {
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
      totalMarcaciones: form.totalMarcaciones,
      createdBy: this.userLogin,
    };

      this.attendanceService.saveHorario(horarioApiInsert).subscribe({
        next: (response) => {
          // Cerrar el modal padre con los datos de respuesta
          if (this.modalRef) {
            this.modalRef.closeModalFromChild(response);
          } else if (this.dialogRef) {
            this.dialogRef.close(response);
          }
        },
        error: (error) => {
          console.error('Error al guardar horario:', error);
          this.toastService.error('Error al crear', 'No se pudo crear el horario. Verifica los datos e intenta nuevamente');
          this.loading = false;
        }
      });
    }
  }

  // Método para debuggear errores del formulario
  getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.horarioForm.controls).forEach(key => {
      const control = this.horarioForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  handlePageEvent(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1;
    this.loadDescansoData();
  }

  cancelar() {
    // Cerrar el modal padre
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    } else if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

}

