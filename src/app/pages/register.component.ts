import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { AuthService } from '../core/auth.service';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

const loginPattern = /^[A-Za-z0-9]{3,20}$/;
const namePattern = /^[A-Za-zА-Яа-я-]+$/;
const phonePattern = /^\+7\d{10}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Card, FloatLabelModule, InputTextModule, PasswordModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly message = signal<string | null>(null);
  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    login: ['', [Validators.required, Validators.pattern(loginPattern)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    lastName: ['', [Validators.required, Validators.pattern(namePattern)]],
    firstName: ['', [Validators.required, Validators.pattern(namePattern)]],
    middleName: ['', [Validators.pattern(namePattern)]],
    phone: ['', [Validators.pattern(phonePattern)]],
    email: ['', [Validators.required, Validators.email]]
  });

  submit() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (value.password !== value.confirmPassword) {
      this.message.set('Пароли не совпадают');
      return;
    }
    this.loading.set(true);
    this.message.set(null);
    this.authService.register(value).subscribe({
      next: () => {
        this.router.navigateByUrl('/login');
      },
      error: (err) => this.message.set(err?.error?.message ?? 'Ошибка регистрации'),
      complete: () => this.loading.set(false)
    });
  }
}
