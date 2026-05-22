import { Component, inject, signal } from '@angular/core';
import { Card } from 'primeng/card';
import { AppApiService } from '../core/app-api.service';
import { Booking } from '../core/models';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [Card],
  templateUrl: './my-bookings.component.html'
})
export class MyBookingsComponent {
  private readonly api = inject(AppApiService);
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(true);
  stat: string = '';

  constructor() {
    this.reload();
  }

  canCancel(status: string) {
    return status === 'PENDING_CONFIRMATION';
  }

  cancel(id: number) {
    if (!confirm('Отменить бронирование?')) return;
    this.api.cancelBooking(id).subscribe(() => this.reload());
  }

  statusClass(status: string): string {
    switch (status) {
      case 'PENDING_CONFIRMATION':
        this.stat = 'Ожидает подтверждения';
        return 'status-pending';
      case 'CONFIRMED':
        this.stat = 'Подтверждён';
        return 'status-confirmed';
      case 'CANCELLED':
        this.stat = 'Отменён';
        return 'status-cancelled';
      case 'COMPLETED':
        this.stat = 'Выполнен';
        return 'status-completed';
      case 'NO_SHOW':
        this.stat = 'Не указан';
        return 'status-noshow';
      default:
        return '';
    }
  }

  private reload() {
    this.loading.set(true);
    this.api.getMyBookings().subscribe({
      next: (res) => {
        const items = (res.data ?? []).sort((a, b) => (a.bookingDate < b.bookingDate ? 1 : -1));
        this.bookings.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
