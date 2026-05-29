import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { AuthService } from '../../core/services/auth.service';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Card,
    FloatLabelModule,
    InputTextModule,
    PasswordModule,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lockSec = signal(0);

  private failedAttempts = 0;
  private lockUntil = 0;
  private lockTimer: ReturnType<typeof setInterval> | null = null;

  readonly form = this.fb.nonNullable.group({
    login: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid || this.loading()) return;
    const now = Date.now();
    if (now < this.lockUntil) {
      this.error.set(
        `Повторите попытку через ${Math.ceil((this.lockUntil - now) / 1000)} с`,
      );
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.failedAttempts = 0;
        this.clearLockTimer();
        this.lockSec.set(0);
        this.router.navigateByUrl('/booking');
      },
      error: (err) => {
        this.failedAttempts += 1;
        if (this.failedAttempts >= 3) {
          this.lockUntil = Date.now() + 60_000;
          this.failedAttempts = 0;
          this.error.set(
            'Слишком много неудачных попыток. Вход заблокирован на 1 минуту.',
          );
          this.startLockCountdown();
        } else {
          this.error.set(err?.error?.message ?? 'Ошибка входа');
        }
      },
      complete: () => this.loading.set(false),
    });
  }

  private startLockCountdown() {
    this.clearLockTimer();
    const tick = () => {
      const s = Math.max(0, Math.ceil((this.lockUntil - Date.now()) / 1000));
      this.lockSec.set(s);
      if (s <= 0) {
        this.clearLockTimer();
      }
    };
    tick();
    this.lockTimer = setInterval(tick, 500);
  }

  private clearLockTimer() {
    if (this.lockTimer) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
  }
}
