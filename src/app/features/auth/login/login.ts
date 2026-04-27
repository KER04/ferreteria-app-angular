import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service'; // ← ruta correcta

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, ToastModule, CardModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  providers: [MessageService]  // ← quitar AuthService de aquí
})
export class Login {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],       // ← username, no email
      password: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.loading = true;

    this.authService.login(this.form.value).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Sesión iniciada correctamente'
        });
        setTimeout(() => {
          this.router.navigate(['/dashboard']); // ← redirige al dashboard
        }, );
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.detail || 'Credenciales incorrectas'
        });
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}