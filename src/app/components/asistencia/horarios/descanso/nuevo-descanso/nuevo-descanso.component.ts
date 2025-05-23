import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-nuevo-descanso',
  templateUrl: './nuevo-descanso.component.html',
  styleUrls: ['./nuevo-descanso.component.css']
})
export class NuevoDescansoComponent implements OnInit {
  descansoForm: FormGroup;
  idDescanso: number = 0;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<NuevoDescansoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private attendanceService: AttendanceService,
    private dialogLoading: MatDialog
  ) {
    this.descansoForm = this.fb.group({
      id: [data?.id || 0],
      alias: [data?.alias || '', Validators.required],
      periodStart: [data?.periodStart || '', Validators.required],
      duration: [data?.duration || 0, [Validators.required, Validators.min(1)]],
      funcKey: [data?.funcKey || 0],
      availableIntervalType: [data?.availableIntervalType || 0],
      availableInterval: [data?.availableInterval || 0],
      multiplePunch: [data?.multiplePunch || 0],
      calcType: [data?.calcType || 0, Validators.required],
      minimumDuration: [data?.minimumDuration || 0],
      earlyIn: [data?.earlyIn || 0],
      endMargin: [data?.endMargin || 0],
      lateIn: [data?.lateIn || 0],
      minEarlyIn: [data?.minEarlyIn || 0],
      minLateIn: [data?.minLateIn || 0]
    });
  }

  ngOnInit() {
    // Si hay un id de descanso, cargamos los datos del descanso
    if (this.data?.id) {
      this.idDescanso = this.data.id;
      this.loadDescansoData(this.data.id);
    }
  }

  onConfirm() {


    if (this.descansoForm.valid) {

      const loadinngRef = this.dialogLoading.open(ModalLoadingComponent);

      const formValue = { ...this.descansoForm.value };

      // Obtener la fecha actual en formato yyyy-MM-dd
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      // periodStart y endMargin vienen como "HH:mm"
      formValue.periodStart = `${dateStr}T${formValue.periodStart}`;
      formValue.endMargin = `${dateStr}T${formValue.endMargin}`;

      // Aquí puedes llamar a tu API o cerrar el modal con los datos formateados
      //this.dialogRef.close(formValue);
      console.log('Formulario válido:', formValue);

      if (this.idDescanso) {
        // Si hay un id de descanso, actualizamos el descanso
        formValue.id = this.idDescanso;
        this.attendanceService.updateDescanso(formValue).subscribe({
         next: (response) => {
           this.dialogRef.close(response);
           loadinngRef.close();
         },
         error: (error) => {
           console.error('Error al actualizar descanso:', error);
           loadinngRef.close(error);
         }
        });
      }else{
         this.attendanceService.saveDescanso(formValue).subscribe({
        next: (response) => {
          this.dialogRef.close(response);
          loadinngRef.close();
        },
        error: (error) => {
          console.error('Error al guardar descanso:', error);
          loadinngRef.close(error);
          // Aquí puedes manejar el error, mostrar un mensaje al usuario, etc.
        }
      });
      }
      //Si quieres guardar por API, descomenta y ajusta:
     
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  //vamos a cargar los datos del descanso que se recibe por la data 
  // y los vamos a cargar en el formulario
  // y si no hay datos, vamos a cargar los valores por defecto
  // y si no hay datos, vamos a cargar los valores por defecto
  loadDescansoData(idDescaanso: number) {
    this.attendanceService.getDescansoByID(idDescaanso).subscribe({
      next: (response: any) => {
        if (response) {
          this.descansoForm.patchValue(response);
        }
      },
      error: (error) => {
        console.error('Error loading descanso data:', error);
      }
    });

  }

  

}
