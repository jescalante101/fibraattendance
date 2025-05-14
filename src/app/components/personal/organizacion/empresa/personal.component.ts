import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PersonService } from 'src/app/core/services/person.service';
import { ModalLoadingComponent } from 'src/app/shared/modal-loading/modal-loading.component';
import { ModalConfirmComponent } from 'src/app/shared/modal-confirm/modal-confirm.component';

@Component({
  selector: 'app-personal',
  templateUrl: './personal.component.html',
  styleUrls: ['./personal.component.css']
})
export class PersonalComponent implements OnInit {

  dataCompany: any[] = [];

  constructor(private deviceService: PersonService,private dialog:MatDialog) { }

  ngOnInit() {
    this.loadData();
  }

  loadData(){
    const dialgoRef=this.dialog.open(ModalLoadingComponent);
    
        this.deviceService.getListCompany().subscribe(
          (data)=>{
            console.log(data);
            this.dataCompany=data;
            dialgoRef.close();
          },
          (error)=>{
            this.dialog.open(ModalConfirmComponent,{
              data:{mensaje:error,tipo:'error'}
            });
             dialgoRef.close();
          }
        );
  }

}
