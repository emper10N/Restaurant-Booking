import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { AppApiService } from '../../../core/services/app-api.service';
import { ServiceItem } from '../../../core/models/models';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [ReactiveFormsModule, Card],
  templateUrl: './admin-services.component.html',
})
export class AdminServicesComponent {
  private readonly api = inject(AppApiService);
  private readonly fb = inject(FormBuilder);
  readonly services = signal<ServiceItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.reload();
  }

  reload() {
    this.api
      .getServices(false)
      .subscribe((res) => this.services.set(res.data ?? []));
  }

  create() {
    if (this.form.invalid) return;
    this.api.createService(this.form.getRawValue()).subscribe(() => {
      this.form.reset({ name: '', description: '', price: 0 });
      this.reload();
    });
  }

  toggle(item: ServiceItem) {
    this.api
      .toggleServiceActive(item.id, !Boolean(item.available))
      .subscribe(() => this.reload());
  }

  remove(id: number) {
    this.api.deleteService(id).subscribe(() => this.reload());
  }
}
