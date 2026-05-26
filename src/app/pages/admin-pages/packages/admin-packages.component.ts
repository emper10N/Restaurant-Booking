import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { AppApiService } from '../../../core/services/app-api.service';
import { PackageItem, ReasonItem, ServiceItem } from '../../../core/models/models';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-admin-packages',
  standalone: true,
  imports: [ReactiveFormsModule, Card, CheckboxModule],
  templateUrl: './admin-packages.component.html'
})
export class AdminPackagesComponent {
  private readonly api = inject(AppApiService);
  private readonly fb = inject(FormBuilder);
  readonly packages = signal<PackageItem[]>([]);
  readonly services = signal<ServiceItem[]>([]);
  readonly reasons = signal<ReasonItem[]>([]);
  readonly selectedServiceIds = signal<number[]>([]);
  readonly selectedReasonIds = signal<number[]>([]);

  readonly total = computed(() =>
    this.services()
      .filter((service) => this.selectedServiceIds().includes(service.id))
      .reduce((acc, item) => acc + item.price, 0)
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  constructor() {
    this.reload();
  }
  
  reload() {
    this.api.getPackages({ activeOnly: false }).subscribe((res) => this.packages.set(res.data ?? []));
    this.api.getServices(false).subscribe((res) => this.services.set(res.data ?? []));
    this.api.getReasonsList(false).subscribe((res) => this.reasons.set(res.data ?? []));
  }

  toggleService(serviceId: number, checked: boolean) {
    const current = this.selectedServiceIds();
    this.selectedServiceIds.set(checked ? [...current, serviceId] : current.filter((id) => id !== serviceId));
  }

  toggleReason(reasonId: number, checked: boolean) {
    const current = this.selectedReasonIds();
    this.selectedReasonIds.set(checked ? [...current, reasonId] : current.filter((id) => id !== reasonId));
  }

  create() {
    if (this.form.invalid || !this.selectedServiceIds().length || !this.selectedReasonIds().length) return;
    const services = this.selectedServiceIds().map((serviceId) => ({ serviceId, quantity: 1 }));
    this.api
      .createPackage({ ...this.form.getRawValue(), services, reasonIds: this.selectedReasonIds() })
      .subscribe(() => {
        this.form.reset({ name: '', description: '' });
        this.selectedServiceIds.set([]);
        this.selectedReasonIds.set([]);
        this.reload();
      });
  }

  toggle(item: PackageItem) {
    this.api.togglePackageActive(item.id, !item.active).subscribe(() => this.reload());
  }

  remove(id: number) {
    this.api.deletePackage(id).subscribe(() => this.reload());
  }
}
