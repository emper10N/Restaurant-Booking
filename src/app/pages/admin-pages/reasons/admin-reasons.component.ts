import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Card } from 'primeng/card';
import { AppApiService } from '../../../core/services/app-api.service';
import { ReasonItem } from '../../../core/models/models';

@Component({
  selector: 'app-admin-reasons',
  standalone: true,
  imports: [ReactiveFormsModule, Card],
  templateUrl: './admin-reasons.component.html',
})
export class AdminReasonsComponent {
  private readonly api = inject(AppApiService);
  private readonly fb = inject(FormBuilder);
  readonly reasons = signal<ReasonItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(2)]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  constructor() {
    this.reload();
  }

  reload() {
    this.api
      .getReasonsList(false)
      .subscribe((res) => this.reasons.set(res.data ?? []));
  }

  create() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.api
      .createReason({ ...value, code: value.code.toUpperCase() })
      .subscribe(() => {
        this.form.reset({ code: '', displayName: '', description: '' });
        this.reload();
      });
  }

  toggle(item: ReasonItem) {
    this.api
      .toggleReasonActive(item.id, !item.active)
      .subscribe(() => this.reload());
  }

  remove(id: number) {
    this.api.deleteReason(id).subscribe(() => this.reload());
  }
}
