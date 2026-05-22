import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { AppApiService } from '../../core/services/app-api.service';
import { AuthService } from '../../core/services/auth.service';
import { UserListItem } from '../../core/models/models';

const namePattern = /^[A-Za-zА-Яа-я-]+$/;
const phonePattern = /^\+7\d{10}$/;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Card],
  templateUrl: './profile.component.html'
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly message = signal('');
  readonly messageIsError = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  readonly form = this.fb.nonNullable.group({
    lastName: ['', [Validators.pattern(namePattern)]],
    firstName: ['', [Validators.pattern(namePattern)]],
    middleName: ['', [Validators.pattern(namePattern)]],
    phone: ['', [Validators.pattern(phonePattern)]],
    email: ['', [Validators.email]]
  });

  readonly user = this.auth.user;

  constructor() {
    const currentUser = this.auth.user();
    if (!currentUser) {
      this.loading.set(false);
      return;
    }

    if (currentUser.role === 'ADMIN') {
      this.api.getAdminUserById(currentUser.userId).subscribe({
        next: (res) => {
          const d = res.data;
          if (d) this.patchFromUser(d);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
      return;
    }

    if (currentUser.login) {
      this.api.getProfile(currentUser.login).subscribe({
        next: (res) => {
          const d = res.data;
          if (d) this.patchFromUser(d);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
      return;
    }
    if (currentUser.role === 'MANAGER') {
        this.api.getManagerUsers().subscribe({
        next: (res) => {
          const myData = (res.data ?? []).find((item) => item.id === currentUser.userId);
          if (myData) {
            this.patchFromUser(myData);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
    
  }

  private patchFromUser(d: UserListItem): void {
    this.form.patchValue({
      lastName: d.lastName ?? '',
      firstName: d.firstName ?? '',
      middleName: d.middleName ?? '',
      phone: d.phone ?? '',
      email: d.email ?? ''
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.message.set('');
    this.messageIsError.set(false);
    this.api.updateProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.message.set('Профиль сохранён');
        this.messageIsError.set(false);
      },
      error: (err) => {
        this.message.set(err?.error?.message ?? 'Не удалось сохранить');
        this.messageIsError.set(true);
      },
      complete: () => this.saving.set(false)
    });
  }

  deleteAccount() {
    if (!confirm('Удалить аккаунт без возможности восстановления?')) {
      return;
    }
    this.deleting.set(true);
    this.api.deleteAccount().subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.message.set(err?.error?.message ?? 'Не удалось удалить аккаунт');
        this.messageIsError.set(true);
        this.deleting.set(false);
      }
    });
  }
}
