import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { AttManualLog, AttManualLogUpdate } from 'src/app/models/att-manual-log/att-maunual-log.model';

@Component({
  selector: 'app-editar-marcion-manual',
  templateUrl: './editar-marcion-manual.component.html',
  styleUrls: ['./editar-marcion-manual.component.css']
})
export class EditarMarcionManualComponent implements OnInit {
  @Input() id!: number; // Recibe solo el id
  editForm: FormGroup;
  empleadoLabel: string = '';
  isLoading: boolean = false;
  modalRef: any; // Referencia al modal para poder cerrarlo
  saving: boolean = false; // Estado de guardado

  // Datos de login
  userLogin: string = '';


  constructor(
    private fb: FormBuilder,
    private attManualLogService: AttManualLogService,
    @Optional() public dialogRef: MatDialogRef<EditarMarcionManualComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,

  ) {
    this.editForm = this.fb.group({
      fecha: [null, Validators.required],
      hora: ['', Validators.required],
      estadoMarcacion: ['', Validators.required],
      incidencias: [''],
      motivo: ['']
    });
  }

  ngOnInit(): void {
    this.id = this.data
    console.log("id", this.id)
    if (this.id) {
      this.isLoading = true;
      this.attManualLogService.getManualLogById(this.id).subscribe({
        next: (resp) => {
          console.log("resp", resp)
          const log: AttManualLog = (resp as any).data.items[0];
          // Set label empleado
          this.empleadoLabel = `${log.nroDoc ?? ''}`;
          // Parse fecha y hora
          const fechaObj = log.punchTime ? new Date(log.punchTime) : null;
          const fecha = fechaObj ? fechaObj.toISOString().substring(0, 10) : '';
          const hora = fechaObj ? fechaObj.toTimeString().substring(0, 5) : '';
          // Mapear punchState a estadoMarcacion
          const estadoMarcacion = this.getEstadoMarcacionFromPunchState(log.punchState);
          this.editForm.patchValue({
            fecha: fecha,
            hora: hora,
            estadoMarcacion: estadoMarcacion,
            incidencias: log.auditReason,
            motivo: log.applyReason,
          });
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    }
    this.getUserLogin()
  }

  // Obtener el login del usuario
  getUserLogin() {
    const user= this.authService.getCurrentUser();
    if(user){
      this.userLogin=user.username;
    }
  }


  getEstadoMarcacionFromPunchState(punchState: number): string {
    switch (punchState) {
      case 0: return 'entrada';
      case 1: return 'salida';
      case 2: return 'salida_descanso';
      case 3: return 'entrada_descanso';
      case 4: return 'entrada_he';
      case 5: return 'salida_he';
      default: return 'sin_estado';
    }
  }

  onCancel() {
    if (this.dialogRef) {
      this.dialogRef.close(null);
    } else if (this.modalRef) {
      this.modalRef.closeModalFromChild(null);
    }
  }

  onSave() {
    if (this.editForm.valid && this.id) {
      this.isLoading = true;

      const formData = this.editForm.value;

      // Crear punchTime combinando fecha y hora
      let punchTime: string;
      if (formData.fecha && formData.hora) {
        let fechaStr = formData.fecha;
        const horaStr = formData.hora;

        // Si la fecha es un objeto Date, convertir a string YYYY-MM-DD
        if (formData.fecha instanceof Date) {
          const year = formData.fecha.getFullYear();
          const month = String(formData.fecha.getMonth() + 1).padStart(2, '0');
          const day = String(formData.fecha.getDate()).padStart(2, '0');
          fechaStr = `${year}-${month}-${day}`;
        }

        punchTime = `${fechaStr}T${horaStr}:00`;
      } else {
        const ahora = new Date();
        punchTime = ahora.toISOString();
      }

      // Crear el objeto AttManualLog actualizado
      const marcacionActualizada: AttManualLogUpdate = {

        manualLogId: this.id,
        abstractexceptionPtrId: 1,
        punchTime: punchTime,
        punchState: this.getPunchStateValue(formData.estadoMarcacion),
        workCode: '',
        applyReason: formData.motivo || '',
        applyTime: new Date().toISOString(),
        auditReason: formData.incidencias || '',
        auditTime: new Date().toISOString(),
        approvalLevel: 0,
        auditUserId: null,
        approver: '',
        employeeId: this.id,
        isMask: false,
        temperature: null,
        nroDoc: this.empleadoLabel, // Se mantendrá el valor existente en el backend,
        fullName: this.empleadoLabel,
        updatedAt: new Date().toISOString(),
        updatedBy: this.userLogin,

      };

      console.log('Actualizando marcación manual:', marcacionActualizada);

      // Llamar al servicio para actualizar la marcación
      this.attManualLogService.updateManualLog(this.id, marcacionActualizada).subscribe({
        next: (response) => {
          console.log('Marcación actualizada exitosamente:', response);
          this.isLoading = false;

          // Cerrar modal con resultado exitoso
          const result = {
            success: true,
            data: marcacionActualizada,
            action: 'updated'
          };

          if (this.dialogRef) {
            this.dialogRef.close(result);
          } else if (this.modalRef) {
            this.modalRef.closeModalFromChild(result);
          }
        },
        error: (error) => {
          console.error('Error al actualizar marcación:', error);
          this.isLoading = false;

          // Cerrar modal con error
          const errorResult = {
            success: false,
            error: error,
            action: 'update_failed'
          };

          if (this.dialogRef) {
            this.dialogRef.close(errorResult);
          } else if (this.modalRef) {
            this.modalRef.closeModalFromChild(errorResult);
          }
        }
      });


    } else {
      this.editForm.markAllAsTouched();
      console.log('Formulario inválido:', this.editForm.errors);
    }
  }

  delete(id: number) {
    // show 
    this.attManualLogService.deleteManualLog(id).subscribe({
      next: (response) => {
        console.log('Marcación eliminada exitosamente:', response);
        this.isLoading = false;
        this.onCancel();
        this.modalRef.closeModalFromChild(response);
      },
      error: (error) => {
        console.error('Error al eliminar marcación:', error);
        this.isLoading = false;
      }
    });
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
      case 'entrada_he':
        return 4;
      case 'salida_he':
        return 5;
      default:
        return 0;
    }
  }
}
