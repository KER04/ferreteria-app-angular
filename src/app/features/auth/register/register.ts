import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, ToastModule, CardModule],
  templateUrl: './register.html',
  providers: [MessageService]
})
export class Register {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      username:        ['', [Validators.required]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatch }); // ← valida que coincidan
  }

  // Validador personalizado — verifica que password === confirmPassword
  private passwordsMatch(group: AbstractControl) {
    const password        = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ noMatch: true });
    }
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos correctamente'
      });
      return;
    }

    this.loading = true;

    // Solo enviamos lo que Django espera, sin confirmPassword
    const { confirmPassword, ...userData } = this.form.value;

    this.authService.register(userData).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Registro exitoso',
          detail: 'Tu cuenta fue creada, inicia sesión'
        });
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.detail || 'Error al registrar usuario'
        });
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required'])   return `Este campo es requerido`;
      if (field.errors['email'])      return 'Email no válido';
      if (field.errors['minlength'])  return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['noMatch'])    return 'Las contraseñas no coinciden';
    }
    return '';
  }
}