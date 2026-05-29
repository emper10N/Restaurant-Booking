import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard, roleGuard } from './core/guards/guards';
import { BookingComponent } from './pages/booking/booking.component';
import { AdminPackagesComponent } from './pages/admin-pages/packages/admin-packages.component';
import { AdminReasonsComponent } from './pages/admin-pages/reasons/admin-reasons.component';
import { AdminServicesComponent } from './pages/admin-pages/services/admin-services.component';
import { AdminTablesComponent } from './pages/admin-pages/tables/admin-tables.component';
import { AdminUsersComponent } from './pages/admin-pages/users/admin-users.component';
import { LoginComponent } from './pages/login/login.component';
import { ManagerBookingsComponent } from './pages/manager-pages/bookings/manager-bookings.component';
import { ManagerServicesComponent } from './pages/manager-pages/services/manager-services.component';
import { ManagerTablesComponent } from './pages/manager-pages/tables/manager-tables.component';
import { MyBookingsComponent } from './pages/my-bookings/my-bookings.component';
import { PasswordComponent } from './pages/change-password/password.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { RegisterComponent } from './pages/register/register.component';

export const routes: Routes = [
  { path: 'login', canActivate: [publicOnlyGuard], component: LoginComponent },
  {
    path: 'register',
    canActivate: [publicOnlyGuard],
    component: RegisterComponent,
  },
  { path: '', pathMatch: 'full', redirectTo: 'booking' },
  { path: 'booking', canActivate: [authGuard], component: BookingComponent },
  {
    path: 'my-bookings',
    canActivate: [authGuard],
    component: MyBookingsComponent,
  },
  { path: 'profile', canActivate: [authGuard], component: ProfileComponent },
  {
    path: 'profile/password',
    canActivate: [authGuard],
    component: PasswordComponent,
  },

  {
    path: 'manager/bookings',
    canActivate: [authGuard, roleGuard],
    component: ManagerBookingsComponent,
    data: { roles: ['MANAGER', 'ADMIN'], pageTitle: 'Все бронирования' },
  },
  {
    path: 'manager/tables',
    canActivate: [authGuard, roleGuard],
    component: ManagerTablesComponent,
    data: { roles: ['MANAGER', 'ADMIN'] },
  },
  {
    path: 'manager/services',
    canActivate: [authGuard, roleGuard],
    component: ManagerServicesComponent,
    data: { roles: ['MANAGER', 'ADMIN'] },
  },
  {
    path: 'admin/bookings',
    canActivate: [authGuard, roleGuard],
    component: ManagerBookingsComponent,
    data: { roles: ['ADMIN'], pageTitle: 'Управление бронированиями' },
  },
  {
    path: 'admin/tables',
    canActivate: [authGuard, roleGuard],
    component: AdminTablesComponent,
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/services',
    canActivate: [authGuard, roleGuard],
    component: AdminServicesComponent,
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/reasons',
    canActivate: [authGuard, roleGuard],
    component: AdminReasonsComponent,
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/packages',
    canActivate: [authGuard, roleGuard],
    component: AdminPackagesComponent,
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, roleGuard],
    component: AdminUsersComponent,
    data: { roles: ['ADMIN'] },
  },
  { path: '**', redirectTo: 'booking' },
];
