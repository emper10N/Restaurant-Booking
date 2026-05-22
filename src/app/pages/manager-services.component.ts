import { Component, inject, signal } from '@angular/core';
import { Card } from 'primeng/card';
import { AppApiService } from '../core/app-api.service';
import { PackageItem, ServiceItem } from '../core/models';

@Component({
  selector: 'app-manager-services',
  standalone: true,
  imports: [Card],
  templateUrl: './manager-services.component.html'
})
export class ManagerServicesComponent {
  private readonly api = inject(AppApiService);
  readonly services = signal<ServiceItem[]>([]);
  readonly packages = signal<PackageItem[]>([]);

  constructor() {
    this.api.getServices(false).subscribe((res) => this.services.set(res.data ?? []));
    this.api.getPackages().subscribe((res) => this.packages.set(res.data ?? []));
  }
}
