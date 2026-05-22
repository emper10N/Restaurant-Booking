import { Component, inject, signal } from '@angular/core';
import { Card } from 'primeng/card';
import { AppApiService } from '../../../core/services/app-api.service';
import { TableItem, ZoneItem } from '../../../core/models/models';

@Component({
  selector: 'app-manager-tables',
  standalone: true,
  imports: [Card],
  templateUrl: './manager-tables.component.html'
})
export class ManagerTablesComponent {
  private readonly api = inject(AppApiService);
  readonly zones = signal<ZoneItem[]>([]);
  readonly tables = signal<TableItem[]>([]);

  constructor() {
    this.api.getZones(false).subscribe((res) => this.zones.set(res.data ?? []));
    this.api.getTables(undefined, false).subscribe((res) => this.tables.set(res.data ?? []));
  }
}
