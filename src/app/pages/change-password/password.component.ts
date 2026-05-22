import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Card } from 'primeng/card';
import { AppApiService } from '../../core/services/app-api.service';

@Component({
  selector: 'app-password',
  standalone: true,
  imports: [ReactiveFormsModule, Card],
  templateUrl: './password.component.html'
})
export class PasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppApiService);
  private readonly router = inject(Router);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmNewPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit() {
    const value = this.form.getRawValue();
    if (value.newPassword !== value.confirmNewPassword) {
      this.error.set('Пароли не совпадают');
      return;
    }
    this.api.updatePassword(value).subscribe({
      next: () => this.router.navigateByUrl('/profile'),
      error: (err) => this.error.set(err?.error?.message ?? 'Не удалось сменить пароль')
    });
  }
}
