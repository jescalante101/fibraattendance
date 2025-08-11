import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService, LoginRequest } from 'src/app/core/services/auth.service';

// Interfaces moved to AuthService - no longer needed here

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  
  // Form data
  credentials: LoginRequest = {
    userName: '',
    password: ''
  };

  // UI state
  isLoading = false;
  showPassword = false;
  rememberMe = false;
  errorMessage = '';

  // Demo users removed - now using real backend authentication

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
      this.credentials.userName = rememberedUsername;
      this.rememberMe = true;
    }
  }

  /**
   * Handle form submission with real backend authentication
   */
  login(loginForm: NgForm): void {
    if (loginForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        
        // Handle remember me
        if (this.rememberMe) {
          localStorage.setItem('fibra_remembered_username', this.credentials.userName);
        } else {
          localStorage.removeItem('fibra_remembered_username');
        }
        
        // Navigate to return URL or dashboard
        this.router.navigate([this.returnUrl]);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage = error.message || 'Error de autenticación';
        this.isLoading = false;
      }
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }


  // All demo methods removed - now using real backend authentication
}