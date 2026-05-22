import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { AppApiService } from '../core/app-api.service';
import { TableItem, ZoneItem } from '../core/models';

@Component({
  selector: 'app-admin-tables',
  standalone: true,
  imports: [ReactiveFormsModule, Card],
  templateUrl: './admin-tables.component.html'
})
export class AdminTablesComponent {
  private readonly api = inject(AppApiService);
  private readonly fb = inject(FormBuilder);
  readonly zones = signal<ZoneItem[]>([]);
  readonly tables = signal<TableItem[]>([]);
  
  // Добавьте сигналы для уведомлений
  readonly info = signal<string | null>(null);
  readonly infoIsError = signal(false);

  readonly zoneForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['']
  });

  readonly tableForm = this.fb.nonNullable.group({
    zoneId: [0, Validators.required],
    number: ['', Validators.required],
    capacity: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    locationDescription: ['']
  });

  constructor() {
    this.reload();
  }

  reload() {
    this.api.getZones().subscribe((res) => this.zones.set(res.data ?? []));
    this.api.getTables().subscribe((res) => this.tables.set(res.data ?? []));
  }

  createZone() {
    if (this.zoneForm.invalid) return;
    this.api.createZone(this.zoneForm.getRawValue()).subscribe(() => {
      this.zoneForm.reset({ name: '', description: '' });
      this.reload();
    });
  }

  toggleZone(zone: ZoneItem) {
    this.api.toggleZoneActive(zone.id, !zone.active).subscribe(() => this.reload());
  }

  removeZone(id: number) {
    // Проверяем, есть ли столы в этой зоне
    const tablesInZone = this.tables().filter(table => table.zoneId === id);
    
    if (tablesInZone.length > 0) {
      // Показываем список столов в зоне
      const tableNumbers = tablesInZone.map(t => `№${t.number}`).join(', ');
      this.info.set(`Невозможно удалить зону. В ней находятся столы: ${tableNumbers}`);
      this.infoIsError.set(true);
      
      // Спрашиваем, хочет ли пользователь удалить все столы
      if (confirm(`В зоне есть столы: ${tableNumbers}. Удалить их все и затем удалить зону?`)) {
        this.deleteTablesAndZone(id, tablesInZone);
      }
      return;
    }
    
    // Если столов нет, просто удаляем зону
    this.deleteZoneWithConfirmation(id);
  }

  private deleteZoneWithConfirmation(id: number) {
    const zone = this.zones().find(z => z.id === id);
    const zoneName = zone?.name || `#${id}`;
    
    if (confirm(`Удалить зону "${zoneName}"?`)) {
      this.api.deleteZone(id).subscribe({
        next: () => {
          this.info.set(`Зона "${zoneName}" удалена`);
          this.infoIsError.set(false);
          this.reload();
        },
        error: (err) => {
          this.info.set(err?.error?.error?.message || 'Ошибка удаления зоны');
          this.infoIsError.set(true);
        }
      });
    }
  }

  private deleteTablesAndZone(zoneId: number, tables: TableItem[]) {
    let deletedCount = 0;
    
    // Удаляем все столы по очереди
    tables.forEach(table => {
      this.api.deleteTable(table.id).subscribe({
        next: () => {
          deletedCount++;
          // Когда все столы удалены, удаляем зону
          if (deletedCount === tables.length) {
            this.api.deleteZone(zoneId).subscribe({
              next: () => {
                this.info.set('Зона и все столы в ней удалены');
                this.infoIsError.set(false);
                this.reload();
              },
              error: (err) => {
                this.info.set(err?.error?.error?.message || 'Ошибка удаления зоны');
                this.infoIsError.set(true);
              }
            });
          }
        },
        error: (err) => {
          this.info.set(`Ошибка удаления стола №${table.number}: ${err?.error?.error?.message}`);
          this.infoIsError.set(true);
        }
      });
    });
  }

  createTable() {
    if (this.tableForm.invalid) return;
    const value = this.tableForm.getRawValue();
    this.api
      .createTable({ ...value, zoneId: Number(value.zoneId) })
      .subscribe(() => {
        this.tableForm.reset({ zoneId: 0, number: '', capacity: 2, locationDescription: '' });
        this.reload();
      });
  }

  toggleTable(table: TableItem) {
    this.api.toggleTableActive(table.id, !table.active).subscribe(() => this.reload());
  }

  removeTable(id: number) {
    // Находим стол по ID для отображения информации
    const table = this.tables().find(t => t.id === id);
    const tableInfo = table ? `№${table.number}` : `#${id}`;
    
    if (!confirm(`Удалить стол ${tableInfo}?`)) {
        return;
    }
    
    console.log('Попытка удаления стола:', { id, table });
    
    this.api.deleteTable(id).subscribe({
        next: (response) => {
            console.log('Стол успешно удален:', response);
            this.info.set(`Стол ${tableInfo} удален`);
            this.infoIsError.set(false);
            this.reload();
        },
        error: (err) => {
            console.error('Ошибка удаления стола:', err);
            
            // Детальная информация об ошибке
            let errorMessage = 'Ошибка удаления стола';
            
            if (err.status === 400) {
                errorMessage = err?.error?.error?.message || 'Некорректный запрос на удаление';
            } else if (err.status === 404) {
                errorMessage = 'Стол не найден (возможно, уже удален)';
                // Обновляем список после 404
                setTimeout(() => this.reload(), 1000);
            } else if (err.status === 409 || err?.error?.error?.code === 'TABLE_HAS_BOOKINGS') {
                errorMessage = 'Невозможно удалить стол: есть активные бронирования';
            } else if (err.status === 500) {
                errorMessage = 'Внутренняя ошибка сервера';
            }
            
            this.info.set(errorMessage);
            this.infoIsError.set(true);
            
            // Показываем сырой ответ сервера в консоль
            console.log('Полный ответ ошибки:', {
                status: err.status,
                statusText: err.statusText,
                error: err.error,
                url: err.url
            });
        }
    });
}
}