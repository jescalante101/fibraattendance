import { Component, Inject, Input, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AttendanceService } from 'src/app/core/services/attendance.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';

@Component({
  selector: 'app-nuevo-descanso',
  templateUrl: './nuevo-descanso.component.html',
  styleUrls: ['./nuevo-descanso.component.css']
})
export class NuevoDescansoComponent implements OnInit {
  @Input() componentData: any;

  modalRef: any;
  descansoForm: FormGroup= new FormGroup({});
  idDescanso: number = 0;
  loading = false;
  isEditMode: boolean = false;
  
  // Dropdown states
  showCalcTypeDropdown = false;
  showMultiplePunchDropdown = false;
  showAvailableIntervalTypeDropdown = false;
  
  // Tab state
  activeTab = 'basic';

  // Datos de login
  userLogin: string = '';


  constructor(
    private fb: FormBuilder,
    @Optional() public dialogRef: MatDialogRef<NuevoDescansoComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private attendanceService: AttendanceService,
    private dialogLoading: MatDialog,
    private authService: AuthService

  ) {
    
  }
  private getCurrentUserLogin() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userLogin = user.username;
    }
  }


  ngOnInit() {
    this.descansoForm = this.fb.group({
      id: [this.data?.id || 0],
      alias: [this.data?.alias || '', Validators.required],
      periodStart: [this.data?.periodStart || '', Validators.required],
      duration: [this.data?.duration || 0, [Validators.required, Validators.min(1)]],
      funcKey: [this.data?.funcKey || 0],
      availableIntervalType: [this.data?.availableIntervalType || 0],
      availableInterval: [this.data?.availableInterval || 0],
      multiplePunch: [this.data?.multiplePunch || 0],
      calcType: [this.data?.calcType || 0, Validators.required],
      minimumDuration: [this.data?.minimumDuration || 0],
      earlyIn: [this.data?.earlyIn || 0],
      endMargin: [this.data?.endMargin || 0],
      lateIn: [this.data?.lateIn || 0],
      minEarlyIn: [this.data?.minEarlyIn || 0],
      minLateIn: [this.data?.minLateIn || 0]
    });
    // Si hay un id de descanso, cargamos los datos del descanso
    if (this.data?.id) {
      this.isEditMode = true;
      this.idDescanso = this.data.id ;
      this.loadDescansoData(this.data.id);
    }

    console.log(`DESCANSO: ${this.idDescanso}`)
  }

  onConfirm() {


    if (this.descansoForm.valid) {
      // Mostrar el modal de carga
      // Puedes usar un servicio de modal personalizado o el dialog de Angular Material
      // Aquí se usa un modal de carga genérico
      this.loading = true;

      

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
        formValue.updatedBy = this.userLogin;

        this.attendanceService.updateDescanso(formValue).subscribe({
         next: (response) => {
         this.modalRef.closeModalFromChild(response);
         },
         error: (error) => {
           console.error('Error al actualizar descanso:', error);
         }
        });
      }else{
        formValue.createdBy = this.userLogin;
         this.attendanceService.saveDescanso(formValue).subscribe({
        next: (response) => {
         this.modalRef.closeModalFromChild(response);
        },
        error: (error) => {
          console.error('Error al guardar descanso:', error);
          // Aquí puedes manejar el error, mostrar un mensaje al usuario, etc.
        }
      });
      }
      //Si quieres guardar por API, descomenta y ajusta:
     
    }
  }

  

  //vamos a cargar los datos del descanso que se recibe por la data 
  // y los vamos a cargar en el formulario
  // y si no hay datos, vamos a cargar los valores por defecto
  // y si no hay datos, vamos a cargar los valores por defecto
  loadDescansoData(idDescaanso: number) {
    this.loading = true;
    this.attendanceService.getDescansoByID(idDescaanso).subscribe({
      next: (response: any) => {
        if (response) {
          this.descansoForm.patchValue(response);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading descanso data:', error);
        this.loading = false;
      }
    });

  }

   cancelar() {
    // Cerrar el modal padre
    if (this.modalRef) {
      this.modalRef.closeModalFromChild();
    } else if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // Dropdown methods
  getCalcTypeName(): string {
    const calcType = this.descansoForm.get('calcType')?.value;
    switch(calcType) {
      case 0: return 'Auto Deducir';
      case 1: return 'Requiere marcación';
      default: return '';
    }
  }

  onCalcTypeSelected(value: number): void {
    this.descansoForm.patchValue({ calcType: value });
    this.showCalcTypeDropdown = false;
  }

  getMultiplePunchName(): string {
    const multiplePunch = this.descansoForm.get('multiplePunch')?.value;
    switch(multiplePunch) {
      case 0: return 'Acorde a la regla';
      case 1: return 'Usuario Definido';
      default: return '';
    }
  }

  onMultiplePunchSelected(value: number): void {
    this.descansoForm.patchValue({ multiplePunch: value });
    this.showMultiplePunchDropdown = false;
  }

  getAvailableIntervalTypeName(): string {
    const availableIntervalType = this.descansoForm.get('availableIntervalType')?.value;
    switch(availableIntervalType) {
      case 0: return 'No';
      case 1: return 'Sí';
      default: return '';
    }
  }

  onAvailableIntervalTypeSelected(value: number): void {
    this.descansoForm.patchValue({ availableIntervalType: value });
    this.showAvailableIntervalTypeDropdown = false;
  }

}
