import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { AppApiService } from '../core/app-api.service';
import { PackageItem, SelectItem, ServiceItem, TableItem } from '../core/models';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 10; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`);
    }
  }
  return slots;
}

interface AutoCompleteCompleteEvent {
    originalEvent: Event;
    query: string;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [ReactiveFormsModule, Card, TextareaModule, FloatLabelModule, AutoCompleteModule, FormsModule, CheckboxModule],
  templateUrl: './booking.component.html'
})
export class BookingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppApiService);

  readonly reasons = signal<SelectItem[]>([]);
  readonly services = signal<ServiceItem[]>([]);
  readonly packages = signal<PackageItem[]>([]);
  readonly tables = signal<TableItem[]>([]);
  readonly info = signal<string | null>(null);
  readonly infoIsError = signal(false);
  readonly selectedServiceIds = signal<number[]>([]);
  readonly packageServiceIds = signal<Set<number>>(new Set());
  readonly selectedPackage = signal<PackageItem | null>(null);
  readonly initialLoading = signal(true);
  readonly tablesLoading = signal(false);
  readonly submitting = signal(false);
  items!: any[];
  value!: any;
  table!: any;

  selectedServices: { [key: number]: boolean } = {};
  serviceCheckState: { [key: number]: boolean } = {};
  readonly pkgPrice = computed(() => {
  const pkg = this.selectedPackage();
  return pkg?.totalPrice ?? 0;
});

  toggleService(serviceId: number, checked: boolean) {
    this.selectedServices[serviceId] = checked;
    
    const current = this.selectedServiceIds();
    if (checked) {
      this.selectedServiceIds.set([...current, serviceId]);
    } else {
      this.selectedServiceIds.set(current.filter((id) => id !== serviceId));
    }
  }

  isPackageService(id: number): boolean {
  return this.packageServiceIds().has(id);
}

// Проверка, заблокирован ли сервис (из пакета и не отключен вручную)
isServiceDisabled(id: number): boolean {
  return this.isPackageService(id);
}
  
  isServiceChecked(id: number): boolean {
    return this.selectedServiceIds().includes(id);
  }

  readonly timeSlots = generateTimeSlots();

  readonly todayStr = (() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  })();

  readonly maxDateStr = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  })();

  readonly zones = computed(() => {
    const names = new Set<string>();
    for (const t of this.tables()) {
      names.add(t.zoneName);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'ru'));
  });

  readonly filteredTables = computed(() => {
    const zone = this.form.controls.zoneName.value;
    const list = this.tables();
    if (!zone) return list;
    return list.filter((t) => t.zoneName === zone);
  });

  readonly extraServicesTotal = computed(() => {
    const pkgIds = this.packageServiceIds();
    return this.services()
      .filter((s) => this.selectedServiceIds().includes(s.id) && !pkgIds.has(s.id))
      .reduce((acc, s) => acc + s.price, 0 + this.pkgPrice());
  });

  readonly form = this.fb.nonNullable.group({
    bookingDate: ['', Validators.required],
    timeStart: ['', Validators.required],
    guestCount: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    reasonId: [0, [Validators.required, Validators.min(1)]],
    packageId: [0],
    zoneName: [''],
    tableId: [0, [Validators.required, Validators.min(1)]],
    comment: ['', Validators.maxLength(500)]
  });

  search(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    let _items = this.filteredTables().filter(item => 
        item.number.toString().includes(query) ||
        item.zoneName.toLowerCase().includes(query)
    );
    this.items = _items.map((item) => 
        item.id
    );
}

  constructor() {
    this.loadInitialData();
  }

  loadTables() {
    const { bookingDate, timeStart, guestCount } = this.form.getRawValue();
    if (!bookingDate || !timeStart || !guestCount) {
      this.info.set('Укажите дату, время и число гостей');
      this.infoIsError.set(true);
      return;
    }
    const d = new Date(bookingDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      this.info.set('Дата не может быть в прошлом');
      this.infoIsError.set(true);
      return;
    }
    if (bookingDate > this.maxDateStr) {
      this.info.set('Дата не может быть позже чем через 3 месяца');
      this.infoIsError.set(true);
      return;
    }
    this.tablesLoading.set(true);
    this.info.set(null);
    this.api.getTables().subscribe({
      next: (res) => {
        this.tables.set(res.data ?? []);
        this.tablesLoading.set(false);
      },
      error: (err) => {
        this.tablesLoading.set(false);
        this.info.set(err?.error?.message ?? 'Не удалось загрузить столы');
        this.infoIsError.set(true);
      }
    });
  }

  onReasonChange() {
    const reasonId = this.form.controls.reasonId.value;
    this.form.patchValue({ packageId: 0 });
    this.selectedPackage.set(null);
    this.packageServiceIds.set(new Set());
    if (!reasonId) {
      this.packages.set([]);
      return;
    }
    this.api.getPackages({ reasonId, activeOnly: true }).subscribe((res) => this.packages.set(res.data ?? []));
  }

  onPackageChange() {
    const pid = this.form.controls.packageId.value;
    if (!pid) {
      this.selectedPackage.set(null);
      this.packageServiceIds.set(new Set());
      return;
    }
    const fromList = this.packages().find((p) => p.id === pid) ?? null;
    if (fromList && fromList.services?.length) {
      this.applyPackageServices(fromList);
      return;
    }
    this.api.getPackageById(pid).subscribe({
      next: (res) => {
        const pkg = res.data;
        if (pkg) this.applyPackageServices(pkg);
      },
      error: () => {
        const fallback = this.packages().find((p) => p.id === pid);
        if (fallback) this.applyPackageServices(fallback);
      }
    });
  }

  private applyPackageServices(pkg: PackageItem) {
  this.selectedPackage.set(pkg);
  
  const packageServiceIds = new Set<number>();
  
  for (const s of pkg.services ?? []) {
    packageServiceIds.add(s.serviceId);
    // Автоматически отмечаем чекбоксы пакета
    this.serviceCheckState[s.serviceId] = true;
  }
  
  this.packageServiceIds.set(packageServiceIds);
  
  const currentSelected = new Set(this.selectedServiceIds());
  for (const serviceId of packageServiceIds) {
    currentSelected.add(serviceId);
  }
  
  this.selectedServiceIds.set([...currentSelected]);
}

  onZoneChange() {
    this.form.patchValue({ tableId: 0 });
  }

  submit() {
    this.info.set(null);
    this.infoIsError.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.info.set('Проверьте обязательные поля');
      this.infoIsError.set(true);
      return;
    }
    const data = this.form.getRawValue();
    console.log(data)
    let id = this.form.get('tableId')!.value;
    this.table = this.tables().find((t) => t.id === id);
      
    if (!this.table) {
      this.info.set('Выберите стол из списка доступных');
      this.infoIsError.set(true);
      return;
    }
    if (data.guestCount > this.table.capacity) {
      this.info.set(`Число гостей превышает вместимость стола (${this.table.capacity})`);
      this.infoIsError.set(true);
      return;
    }
    const payload = {
      tableId: data.tableId,
      reasonId: data.reasonId,
      guestCount: data.guestCount,
      bookingDate: data.bookingDate,
      timeStart: data.timeStart,
      comment: data.comment?.trim() ?? '',
      serviceIds: this.selectedServiceIds(),
      packageId: data.packageId || null
    };
    this.submitting.set(true);
    console.log(this.form.controls.tableId.value)
    this.api.createBooking(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.info.set('Бронирование успешно создано');
        this.infoIsError.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.info.set(err?.error?.message ?? 'Ошибка создания бронирования');
        this.infoIsError.set(true);
      }
    });
  }

  private loadInitialData() {
    this.initialLoading.set(true);
    let pending = 2;
    const done = () => {
      pending--;
      if (pending <= 0) this.initialLoading.set(false);
    };
    this.api.getReasons().subscribe({
      next: (res) => {
        this.reasons.set(res.data ?? []);
        done();
      },
      error: () => done()
    });
    this.api.getServices().subscribe({
      next: (res) => {
        this.services.set(res.data ?? []);
        done();
      },
      error: () => done()
    });
    this.form.patchValue({ bookingDate: this.todayStr, timeStart: '19:00' });
  }
}