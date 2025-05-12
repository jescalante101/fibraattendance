import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
// import { AdminService } from 'src/app/service/admin.service';
declare var jQuery:any;
declare var $:any;
declare var iziToast:any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  public user:any ={};
  public usuario : any = {};
  public token : any ='';


  userlogin: number | null = null;
  password: number | null = null;; 


  images = [
    'assets/img/FibraPrintBack.jfif',
    'assets/img/FibraPrintBack2.jfif',
    'assets/img/FibraPrintBack3.jfif',
  ];
  currentImageIndex = 0;
  currentBackground = this.images[0];
  
  constructor(
    /*private _adminService:AdminService,*/
    private _router : Router,
  ) {
    // this.token = this._adminService.getToken();
  }

  ngOnInit(): void{
    console.log(this.token);
    if(this.token){
      this._router.navigate(['/'])
    }else{

    }

    setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
      this.currentBackground = this.images[this.currentImageIndex];
    }, 3000);
  }

  login(loginForm: NgForm){
    // Se elimina la verificación de validación del formulario:
    let data = {
      email: this.user.email,
      password: this.user.password
    };
    // this._adminService.login_admin(data).subscribe(
    //   response => {
    //     if(response.data == undefined){
    //       iziToast.show({
    //         title: 'ERROR',
    //         titleColor: '#FF0000',
    //         class: 'text-danger',
    //         position: 'topRight',
    //         message: response.message
    //       });
    //     } else {
    //       this.usuario = response.data;
    //       // Aquí podrías almacenar el token u otros datos necesarios
    //       this._router.navigate(['/']);
    //     }
    //   },
    //   error => {
    //     console.log(error);
    //   }
    // );
  }
  
  
  

}
