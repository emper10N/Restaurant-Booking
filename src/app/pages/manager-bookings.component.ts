import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Card } from 'primeng/card';
import { AppApiService } from '../core/app-api.service';
import { Booking } from '../core/models';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-manager-bookings',
  standalone: true,
  imports: [ReactiveFormsModule, Card],
  templateUrl: './manager-bookings.component.html'
})
export class ManagerBookingsComponent {
  private readonly api = inject(AppApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly pageTitle = (this.route.snapshot.data['pageTitle'] as string) ?? 'Бронирования';
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly detail = signal<Booking | null>(null);
  readonly detailLoading = signal(false);
  readonly statusUpdating = signal<number | null>(null);

  readonly statusOptions = ['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];

  readonly adminQuickActions: Array<{ label: string; status: string; variant: string }> = [
    { label: 'Подтвердить', status: 'CONFIRMED', variant: 'confirm' },
    { label: 'Отменить', status: 'CANCELLED', variant: 'danger' },
    { label: 'Завершить', status: 'COMPLETED', variant: 'neutral' },
    { label: 'Неявка', status: 'NO_SHOW', variant: 'warn' }
  ];

  readonly filtersForm = this.fb.group({
    dateFrom: '',
    dateTo: '',
    status: '',
    userId: '',
    tableId: ''
  });

  constructor() {
    this.search();
  }

  search() {
    this.loading.set(true);
    const value = this.filtersForm.getRawValue();
    this.api
      .getManagerBookings({
        dateFrom: value.dateFrom ?? undefined,
        dateTo: value.dateTo ?? undefined,
        status: value.status ?? undefined,
        userId: value.userId ? Number(value.userId) : undefined,
        tableId: value.tableId ? Number(value.tableId) : undefined
      })
      .subscribe({
        next: (res) => {
          const rows = res.data ?? [];
          rows.sort((a, b) => {
            const da = `${a.bookingDate}T${a.timeStart}`.localeCompare(`${b.bookingDate}T${b.timeStart}`);
            return da < 0 ? 1 : da > 0 ? -1 : 0;
          });
          this.bookings.set(rows);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  openDetail(id: number) {
    this.detail.set(null);
    this.detailLoading.set(true);
    this.api.getManagerBookingById(id).subscribe({
      next: (res) => {
        this.detail.set(res.data);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false)
    });
  }

  closeDetail() {
    this.detail.set(null);
  }

  setStatus(id: number, status: string) {
    this.statusUpdating.set(id);
    this.api.updateBookingStatus(id, status).subscribe({
      next: () => {
        this.statusUpdating.set(null);
        this.search();
        const d = this.detail();
        if (d?.id === id) {
          this.openDetail(id);
        } else {
          this.closeDetail();
        }
      },
      error: () => this.statusUpdating.set(null)
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'PENDING_CONFIRMATION':
        return 'status-pending';
      case 'CONFIRMED':
        return 'status-confirmed';
      case 'CANCELLED':
        return 'status-cancelled';
      case 'COMPLETED':
        return 'status-completed';
      case 'NO_SHOW':
        return 'status-noshow';
      default:
        return '';
    }
  }
}
