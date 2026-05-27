import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { AppApiService } from '../../core/services/app-api.service';
import { PackageItem, SelectItem, ServiceItem, TableItem, ZoneItem } from '../../core/models/models';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DateService } from '../../core/services/date-service';
import { Subject } from 'rxjs';
import {PublicFloorPlanComponent} from '../../floor-planner/components/public-floor-plan.component';

interface AutoCompleteCompleteEvent {
    originalEvent: Event;
    query: string;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [PublicFloorPlanComponent, ReactiveFormsModule, Card, TextareaModule, FloatLabelModule, AutoCompleteModule, FormsModule, CheckboxModule],
  templateUrl: './booking.component.html'
})
export class BookingComponent {
  private readonly fb = inject(FormBuilder);
  readonly dateService = inject(DateService);
  private readonly api = inject(AppApiService);

  readonly reasons = signal<SelectItem[]>([]);
  readonly services = signal<ServiceItem[]>([]);
  readonly packages = signal<PackageItem[]>([]);
  readonly info = signal<string | null>(null);
  readonly infoIsError = signal(false);
  readonly selectedServiceIds = signal<number[]>([]);
  readonly packageServiceIds = signal<Set<number>>(new Set());
  readonly selectedPackage = signal<PackageItem | null>(null);
  readonly initialLoading = signal(true);
  readonly tablesLoading = signal(false);
  readonly submitting = signal(false);
  readonly timeSlots = signal<string[]>([]);
  private destroy$ = new Subject<void>();
  currentView = signal<string>('default');
  items!: any[];
  value!: any;
  table!: TableItem;
  date: string = "";
  time:string = "";
  zone!: ZoneItem;

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


  isServiceDisabled(id: number): boolean {
    return this.isPackageService(id);
  }
  
  isServiceChecked(id: number): boolean {
    return this.selectedServiceIds().includes(id);
  }

  readonly todayStr = (() => {
    const d = new Date(new Date().getTime()+ 5*60*60*1000);
    return d.toISOString().slice(0, 10);
  })();

  readonly maxDateStr = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  })();

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

    onTableSelected(table: TableItem) {
      this.table = table;
      this.form.controls.tableId.setValue(this.table.id);
    } 
  constructor() {
    this.loadInitialData();
  }

  ngOnInit() {
    this.form.controls.bookingDate.valueChanges.subscribe(date => {
      if (date) {
        this.updateTimeSlots(date);
    }
    });
    
    let initialDate = this.form.controls.bookingDate.value;
    if (initialDate) {
      this.updateTimeSlots(initialDate);
    }
  }

    private updateTimeSlots(date: string) {
    let slots = this.dateService.generateFutureTimeSlots(date);
    this.timeSlots.set(slots);
    
    if (slots.length > 0) {
      let currentTime = this.form.controls.timeStart.value;
      
      if (!currentTime || !slots.includes(currentTime)) {
        this.form.patchValue({ timeStart: slots[0] });
      }
    } else {
      this.form.patchValue({ timeStart: slots[0] });
      this.info.set('На сегодня свободных слотов больше нет');
      this.infoIsError.set(true);
    }
  }
  
  onDateChange() {
    const date = this.form.controls.bookingDate.value;
    if (date) {
      this.updateTimeSlots(date);
      
      if (date === this.todayStr && !this.dateService.canBookToday()) {
        this.info.set('Бронирование на сегодня недоступно (после 22:00)');
        this.infoIsError.set(true);
      }
    }
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
    this.serviceCheckState[s.serviceId] = true;
  }
  
  this.packageServiceIds.set(packageServiceIds);
  
  const currentSelected = new Set(this.selectedServiceIds());
  for (const serviceId of packageServiceIds) {
    currentSelected.add(serviceId);
  }
  
  this.selectedServiceIds.set([...currentSelected]);
}

  submit() {
    this.info.set(null);
    this.infoIsError.set(false);
    this.form.controls.tableId.setValue(this.table.id);
    if (this.form.invalid) {
      console.log(this.form.getRawValue());
      this.form.markAllAsTouched();
      this.info.set('Проверьте обязательные поля');
      this.infoIsError.set(true);
      return;
    }
    const data = this.form.getRawValue();
      
    if (!this.table) {
      console.log(!this.table)
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
    this.api.createBooking(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.info.set('Бронирование успешно создано');
        this.infoIsError.set(false);
      },
      error: (err) => {
        console.log(payload);
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
    this.form.patchValue({ bookingDate: this.todayStr, timeStart: this.dateService.generateFutureTimeSlots(this.todayStr)[0] });
  }

  onZoneSelected(zone: ZoneItem){
    this.zone = zone;
    this.form.controls.zoneName.setValue(this.zone.name);
  }
}