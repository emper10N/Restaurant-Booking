import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Card } from 'primeng/card';
import { AppApiService } from '../core/app-api.service';
import { UserListItem } from '../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [ReactiveFormsModule, Card],
  templateUrl: './admin-users.component.html'
})
export class AdminUsersComponent {
  private readonly api = inject(AppApiService);
  private readonly fb = inject(FormBuilder);

  readonly users = signal<UserListItem[]>([]);
  readonly roles = ['CLIENT', 'MANAGER', 'ADMIN'];

  readonly filters = this.fb.group({
    role: [''],
    status: ['']
  });

  readonly filteredUsers = computed(() => {
    let list = this.users();
    const role = this.filters.value.role?.trim();
    const status = this.filters.value.status;
    if (role) {
      list = list.filter((u) => u.role === role);
    }
    if (status === 'active') {
      list = list.filter((u) => u.active);
    } else if (status === 'inactive') {
      list = list.filter((u) => !u.active);
    }
    return list;
  });

  constructor() {
    this.reload();
  }

  reload() {
    this.api.getAdminUsers().subscribe((res) => this.users.set(res.data ?? []));
  }

  changeRole(user: UserListItem, role: string) {
    this.api.updateUserRole(user.id, role).subscribe(() => this.reload());
  }

  toggleActive(user: UserListItem) {
    this.api.updateUserStatus(user.id, !user.active).subscribe(() => this.reload());
  }
}
