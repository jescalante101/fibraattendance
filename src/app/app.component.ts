import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { AuthService } from './core/services/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Fibra Asistencia';
  sidebarCollapsed = false;
  showLayout = true;
  isAuthenticated = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Listen to route changes to determine if we should show layout
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigationEvent = event as NavigationEnd;
        this.showLayout = !navigationEvent.url.includes('/login');
      });
    
    // Listen to auth state changes
    this.authService.authState$.subscribe(authState => {
      this.isAuthenticated = authState.isAuthenticated;
    });
  }

  ngOnInit(): void {
    // Check initial route
    this.showLayout = !this.router.url.includes('/login');
    
    // Inicializar Flowbite cuando la aplicación carga
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        initFlowbite();
      }, 100);
    }
  }

  onSidebarToggled(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }

  /**
   * Handle user logout
   */
  onLogout(): void {
    this.authService.logout();
  }

  /**
   * Handle user menu actions from header
   */
  handleUserMenuAction(action: string): void {
    switch (action) {
      case 'logout':
        this.onLogout();
        break;
      case 'settings':
        // Navigate to settings or show settings modal
        console.log('Navigate to settings');
        break;
      case 'support':
        // Open support page or contact form
        console.log('Open support');
        break;
      case 'about':
        // Show about dialog
        console.log('Show about');
        break;
      default:
        console.log('Unhandled action:', action);
        break;
    }
  }
}
