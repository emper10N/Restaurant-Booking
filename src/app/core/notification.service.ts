import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly message = signal<string | null>(null);

  error(text: string) {
    this.message.set(text);
  }

  clear() {
    this.message.set(null);
  }
}
