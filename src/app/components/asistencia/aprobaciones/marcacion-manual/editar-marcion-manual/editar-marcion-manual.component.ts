import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AttManualLogService } from 'src/app/core/services/att-manual-log.service';
import { AttManualLog } from 'src/app/models/att-manual-log/att-maunual-log.model';

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

  constructor(
    private fb: FormBuilder, 
    private attManualLogService: AttManualLogService,
    @Optional() public dialogRef: MatDialogRef<EditarMarcionManualComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
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
    this.id=this.data
    console.log("id",this.id)
    if (this.id) {
      this.isLoading = true;
      this.attManualLogService.getManualLogById(this.id).subscribe({
        next: (resp) => {
          console.log("resp",resp)
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
            motivo: log.applyReason
          });
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
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
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    }
  }
}
