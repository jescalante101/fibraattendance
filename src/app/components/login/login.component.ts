import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  
  // Form data
  credentials: LoginCredentials = {
    username: '',
    password: ''
  };

  // UI state
  isLoading = false;
  showPassword = false;
  rememberMe = false;
  errorMessage = '';

  // Demo users for development
  private demoUsers = [
    { username: 'admin', password: 'admin123', role: 'Administrador' },
    { username: 'supervisor', password: 'super123', role: 'Supervisor' },
    { username: 'empleado', password: 'emp123', role: 'Empleado' }
  ];

  private returnUrl: string = '/panel';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    // Check if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/panel']);
    }
  }

  ngOnInit(): void {
    // Clear any existing error messages
    this.errorMessage = '';
    
    // Get return URL from route parameters or default to '/panel'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/panel';
    
    // Load remembered username if exists
    const rememberedUsername = localStorage.getItem('fibra_remembered_username');
    if (rememberedUsername) {
      this.credentials.username = rememberedUsername;
      this.rememberMe = true;
    }
  }

  /**
   * Handle form submission
   */
  async login(loginForm: NgForm): Promise<void> {
    if (loginForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Simulate API call delay
      await this.delay(1500);
      
      // Demo authentication - replace with actual API call
      const response = await this.authenticateUser(this.credentials);
      
      if (response.success) {
        // Store authentication data using AuthService
        this.authService.setAuthData(response.token!, response.user!);
        
        // Handle remember me
        if (this.rememberMe) {
          localStorage.setItem('fibra_remembered_username', this.credentials.username);
        } else {
          localStorage.removeItem('fibra_remembered_username');
        }
        
        // Navigate to return URL or dashboard
        this.router.navigate([this.returnUrl]);
        
      } else {
        this.errorMessage = response.message || 'Usuario o contraseña incorrectos';
      }
      
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage = 'Error del servidor. Inténtelo más tarde.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }


  /**
   * Demo authentication - replace with actual API service
   */
  private async authenticateUser(credentials: LoginCredentials): Promise<LoginResponse> {
    // Demo authentication logic
    const user = this.demoUsers.find(u => 
      u.username === credentials.username && u.password === credentials.password
    );

    if (user) {
      return {
        success: true,
        token: this.generateDemoToken(),
        user: {
          id: Date.now(),
          username: user.username,
          role: user.role,
          name: this.getDisplayName(user.username),
          loginTime: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        message: 'Usuario o contraseña incorrectos'
      };
    }
  }

  /**
   * Generate demo token
   */
  private generateDemoToken(): string {
    return 'fibra_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get display name for user
   */
  private getDisplayName(username: string): string {
    const names: { [key: string]: string } = {
      'admin': 'Administrador del Sistema',
      'supervisor': 'Supervisor de Área',
      'empleado': 'Usuario Empleado'
    };
    return names[username] || username;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}