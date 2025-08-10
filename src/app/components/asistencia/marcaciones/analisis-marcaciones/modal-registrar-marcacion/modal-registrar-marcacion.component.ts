import { Component, EventEmitter, Input, OnInit, Optional, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';

interface MarcacionData {
  employeeId: string;
  fullNameEmployee: string;
  nroDoc: string;
  areaDescription: string;
  shiftName: string;
  fecha: Date;
  fechaFormateada: string;
  tipo: 'entrada' | 'salida' | 'completa';
  horaEntradaEsperada?: string;
  horaSalidaEsperada?: string;
}

@Component({
  selector: 'app-modal-registrar-marcacion',
  templateUrl: './modal-registrar-marcacion.component.html',
  styleUrls: ['./modal-registrar-marcacion.component.css']
})
export class ModalRegistrarMarcacionComponent implements OnInit {
  @Input() data!: MarcacionData;
  modalRef: any;

  marcacionForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private attManualLogService: AttManualLogService,
    @Optional() public dialogRef: MatDialogRef<ModalRegistrarMarcacionComponent>
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    // Obtener fecha en formato YYYY-MM-DD para el input date
    const fechaFormatted = this.data.fecha instanceof Date
      ? this.data.fecha.toISOString().split('T')[0]
      : new Date(this.data.fecha).toISOString().split('T')[0];

    this.marcacionForm = this.fb.group({
      fechaMarcacion: [fechaFormatted, Validators.required],
      horaMarcacion: ['', Validators.required],
      estadoMarcacion: [this.data.tipo === 'completa' ? '' : this.data.tipo, this.data.tipo === 'completa' ? Validators.required : []],
      motivo: ['', [Validators.required, Validators.minLength(10)]],
      incidencias: [''],
      tipoMarcacion: [this.data.tipo]
    });

    // Precargar hora esperada si está disponible
    this.precargarHoraEsperada();
  }

  private precargarHoraEsperada(): void {
    let horaEsperada = '';

    switch (this.data.tipo) {
      case 'entrada':
        horaEsperada = this.data.horaEntradaEsperada || '';
        break;
      case 'salida':
        horaEsperada = this.data.horaSalidaEsperada || '';
        break;
      case 'completa':
        // Para marcación completa, usar la hora de entrada por defecto
        horaEsperada = this.data.horaEntradaEsperada || '';
        break;
    }

    if (horaEsperada) {
      this.marcacionForm.patchValue({
        horaMarcacion: horaEsperada
      });
    }
  }

  getModalTitle(): string {
    switch (this.data.tipo) {
      case 'entrada':
        return 'Registrar Marcación de Entrada';
      case 'salida':
        return 'Registrar Marcación de Salida';
      case 'completa':
        return 'Registrar Marcación';
      default:
        return 'Registrar Marcación Manual';
    }
  }

  getModalSubtitle(): string {
    switch (this.data.tipo) {
      case 'entrada':
        return 'Complete la información para registrar la entrada faltante';
      case 'salida':
        return 'Complete la información para registrar la salida faltante';
      case 'completa':
        return 'Complete la información para registrar entrada y/o salida';
      default:
        return 'Complete la información de la marcación manual';
    }
  }

  getTipoMarcacionText(): string {
    switch (this.data.tipo) {
      case 'entrada':
        return '🟢 Entrada';
      case 'salida':
        return '🔴 Salida';
      case 'completa':
        return '🟦 Entrada y/o Salida';
      default:
        return 'Marcación Manual';
    }
  }

  getTipoMarcacionIcon(): string {
    switch (this.data.tipo) {
      case 'entrada':
        return 'log-in';
      case 'salida':
        return 'log-out';
      case 'completa':
        return 'clock';
      default:
        return 'clock';
    }
  }

  getHoraEsperada(): string {
    switch (this.data.tipo) {
      case 'entrada':
        return this.data.horaEntradaEsperada || '';
      case 'salida':
        return this.data.horaSalidaEsperada || '';
      case 'completa':
        const entrada = this.data.horaEntradaEsperada || '';
        const salida = this.data.horaSalidaEsperada || '';
        if (entrada && salida) {
          return `${entrada} - ${salida}`;
        }
        return entrada || salida || '';
      default:
        return '';
    }
  }

  onCancel(): void {
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    } else if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  onSave(): void {
    if (this.marcacionForm.valid) {
      this.loading = true;

      const formData = this.marcacionForm.value;

      // Determinar el estado de marcación final
      const estadoFinal = this.data.tipo === 'completa' ? formData.estadoMarcacion : this.data.tipo;

      // Crear punchTime combinando fecha y hora
      let punchTime: string;
      if (formData.fechaMarcacion && formData.horaMarcacion) {
        let fechaStr = formData.fechaMarcacion;
        const horaStr = formData.horaMarcacion;

        // Si la fecha es un objeto Date, convertir a string YYYY-MM-DD
        if (formData.fechaMarcacion instanceof Date) {
          const year = formData.fechaMarcacion.getFullYear();
          const month = String(formData.fechaMarcacion.getMonth() + 1).padStart(2, '0');
          const day = String(formData.fechaMarcacion.getDate()).padStart(2, '0');
          fechaStr = `${year}-${month}-${day}`;
        }

        punchTime = `${fechaStr}T${horaStr}`;
      } else {
        const ahora = new Date();
        punchTime = ahora.toISOString();
      }

      // Crear el objeto AttManualLog usando la misma estructura que guardarMarcacion()
      const marcacionManual: AttManualLog = {
        manualLogId: 0,
        abstractexceptionPtrId: 1,
        punchTime: punchTime,
        punchState: this.getPunchStateValue(estadoFinal),
        workCode: '',
        applyReason: formData.motivo || '',
        applyTime: new Date().toISOString(),
        auditReason: formData.incidencias || '',
        auditTime: new Date().toISOString(),
        approvalLevel: 0,
        auditUserId: null,
        approver: '',
        employeeId: 0,
        isMask: false,
        temperature: 0,
        nroDoc: this.data.nroDoc
      };

      console.log('Guardando marcación manual:', marcacionManual);

      // Llamar al servicio para guardar la marcación
      this.attManualLogService.createManualLog([marcacionManual]).subscribe({
        next: (response) => {
          console.log('Marcación guardada exitosamente:', response);
          this.loading = false;

          // Emitir resultado exitoso al componente padre
          const result = {
            success: true,
            data: marcacionManual,
            empleadoInfo: {
              fullNameEmployee: this.data.fullNameEmployee,
              nroDoc: this.data.nroDoc,
              areaDescription: this.data.areaDescription,
              shiftName: this.data.shiftName
            }
          };

          if (this.dialogRef) {
            this.modalRef.closeModalFromChild(result);
          } else {
            this.modalRef.closeModalFromChild(result);
          }
        },
        error: (error) => {
          console.error('Error al guardar marcación:', error);
          this.loading = false;

          // Emitir error al componente padre
          const errorResult = {
            success: false,
            error: error
          };

          if (this.dialogRef) {
            this. modalRef.closeModalFromChild(errorResult);
          } else {
            this.modalRef.closeModalFromChild(errorResult);
          }
        }
      });

    } else {
      this.marcacionForm.markAllAsTouched();
      console.log('Formulario inválido:', this.marcacionForm.errors);
    }
  }

  private getPunchStateValue(estadoMarcacion: string): number {
    switch (estadoMarcacion) {
      case 'entrada':
        return 0;
      case 'salida':
        return 1;
      case 'salida_descanso':
        return 2;
      case 'entrada_descanso':
        return 3;
      default:
        return 0;
    }
  }
}