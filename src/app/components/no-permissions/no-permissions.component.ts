import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-no-permissions',
  templateUrl: './no-permissions.component.html',
  styleUrls: ['./no-permissions.component.css']
})
export class NoPermissionsComponent implements OnInit {

  userName: string = '';
  userEmail: string = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userName = currentUser.name;
      this.userEmail = currentUser.email;
    }
  }

  /**
   * Logout the user
   */
  logout(): void {
    this.authService.logout();
  }

  /**
   * Contact support
   */
  contactSupport(): void {
    // Open email client with support email
    const supportEmail = 'acanales@grupofibrafil.com';
    const subject = 'Solicitud de Permisos - Sistema FIBRA Asistencia';
    const body = `Hola,

Mi cuenta ${this.userName || 'N/A'} (${this.userEmail || 'N/A'}) no tiene permisos asignados para acceder al sistema FIBRA Asistencia.

Por favor, podrían revisar y asignar los permisos correspondientes.

Gracias,
${this.userName || 'Usuario'}`;

    const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  }
}