import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  ApiResponse,
  AvailableTable,
  Booking,
  PackageItem,
  ReasonItem,
  SelectItem,
  ServiceItem,
  TableItem,
  UserListItem,
  ZoneItem,
} from '../models/models';
import { Observable, of, tap, throwError } from 'rxjs';

const API_BASE = '/api';

@Injectable({ providedIn: 'root' })
export class AppApiService {
  constructor(private readonly http: HttpClient) {}

  getReasons(activeOnly = true) {
    return this.http.get<ApiResponse<SelectItem[]>>(`${API_BASE}/reasons`, {
      params: new HttpParams().set('activeOnly', activeOnly),
    });
  }

  getServices(availableOnly = true) {
    return this.http.get<ApiResponse<ServiceItem[]>>(`${API_BASE}/services`, {
      params: new HttpParams().set('availableOnly', availableOnly),
    });
  }

  getPackages(opts?: { activeOnly?: boolean; reasonId?: number }) {
    let params = new HttpParams().set(
      'activeOnly',
      String(opts?.activeOnly ?? true),
    );
    if (opts?.reasonId) {
      params = params.set('reasonId', String(opts.reasonId));
    }
    return this.http.get<ApiResponse<PackageItem[]>>(`${API_BASE}/packages`, {
      params,
    });
  }

  getPackageById(id: number) {
    return this.http.get<ApiResponse<PackageItem>>(
      `${API_BASE}/packages/${id}`,
    );
  }

  getAvailableTables(payload: {
    date: string;
    timeStart: string;
    guestCount: number;
  }) {
    const params = new HttpParams()
      .set('date', payload.date)
      .set('timeStart', payload.timeStart)
      .set('guestCount', payload.guestCount);
    return this.http.get<ApiResponse<AvailableTable[]>>(
      `${API_BASE}/tables/available`,
      { params },
    );
  }

  createBooking(payload: unknown) {
    return this.http.post<ApiResponse<Booking>>(
      `${API_BASE}/bookings`,
      payload,
    );
  }

  getMyBookings() {
    return this.http.get<ApiResponse<Booking[]>>(`${API_BASE}/bookings/my`);
  }

  cancelBooking(id: number) {
    return this.http.put<ApiResponse<Booking>>(
      `${API_BASE}/bookings/${id}/cancel`,
      {},
    );
  }

  getProfile(login?: string): Observable<any> {
    const stored = localStorage.getItem('user');

    if (stored) {
      try {
        const user: any = JSON.parse(stored);
        return of(user);
      } catch {
        localStorage.removeItem('user');
      }
    }

    // Если данных нет — пользователь не залогинен
    return throwError(() => new Error('Профиль не найден. Авторизуйтесь.'));
  }

  updateProfile(data: Partial<any>): Observable<any> {
    return this.http.patch<any>(`${API_BASE}/auth/update/user`, data).pipe(
      tap((updatedUser) => {
        // Сервер должен вернуть обновлённый объект пользователя
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }),
    );
  }

  updatePassword(payload: unknown) {
    return this.http.patch<ApiResponse<null>>(
      `${API_BASE}/auth/update/password`,
      payload,
    );
  }

  deleteAccount() {
    return this.http.delete<ApiResponse<null>>(`${API_BASE}/auth/delete`);
  }

  getManagerBookingById(id: number) {
    return this.http.get<ApiResponse<Booking>>(
      `${API_BASE}/manager/bookings/${id}`,
    );
  }

  getManagerBookings(filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    userId?: number;
    tableId?: number;
  }) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiResponse<Booking[]>>(
      `${API_BASE}/manager/bookings`,
      { params },
    );
  }

  updateBookingStatus(id: number, status: string) {
    return this.http.put<ApiResponse<Booking>>(
      `${API_BASE}/manager/bookings/${id}/status`,
      { status },
    );
  }

  getAdminUsers() {
    return this.http.get<ApiResponse<UserListItem[]>>(
      `${API_BASE}/admin/users`,
    );
  }

  getAdminUserById(userId: number) {
    return this.http.get<ApiResponse<UserListItem>>(
      `${API_BASE}/admin/users/${userId}`,
    );
  }

  getManagerUsers() {
    return this.http.get<ApiResponse<UserListItem[]>>(
      `${API_BASE}/manager/users`,
    );
  }

  updateUserRole(userId: number, role: string) {
    return this.http.put<ApiResponse<UserListItem>>(
      `${API_BASE}/admin/users/${userId}/role`,
      { role },
    );
  }

  updateUserStatus(userId: number, active: boolean) {
    return this.http.put<ApiResponse<UserListItem>>(
      `${API_BASE}/admin/users/${userId}/status`,
      {},
      { params: new HttpParams().set('active', active) },
    );
  }

  getZones(activeOnly = false) {
    return this.http.get<ApiResponse<ZoneItem[]>>(`${API_BASE}/zones`, {
      params: new HttpParams().set('activeOnly', activeOnly),
    });
  }

  createZone(payload: { name: string; description?: string }) {
    return this.http.post<ApiResponse<ZoneItem>>(`${API_BASE}/zones`, payload);
  }

  updateZone(id: number, payload: { name: string; description?: string }) {
    return this.http.put<ApiResponse<ZoneItem>>(
      `${API_BASE}/zones/${id}`,
      payload,
    );
  }

  deleteZone(id: number) {
    return this.http.delete<ApiResponse<null>>(`${API_BASE}/zones/${id}`);
  }

  toggleZoneActive(id: number, active: boolean) {
    return this.http.patch<ApiResponse<ZoneItem>>(
      `${API_BASE}/zones/${id}/${active ? 'activate' : 'deactivate'}`,
      {},
    );
  }

  getTables(zoneId?: number, activeOnly = false) {
    let params = new HttpParams().set('activeOnly', activeOnly);
    if (zoneId) {
      params = params.set('zoneId', zoneId);
    }
    return this.http.get<ApiResponse<TableItem[]>>(`${API_BASE}/tables`, {
      params,
    });
  }

  createTable(payload: {
    zoneId: number;
    number: string;
    capacity: number;
    locationDescription?: string;
  }) {
    return this.http.post<ApiResponse<TableItem>>(
      `${API_BASE}/tables`,
      payload,
    );
  }

  updateTable(
    id: number,
    payload: {
      zoneId: number;
      number: string;
      capacity: number;
      locationDescription?: string;
    },
  ) {
    return this.http.put<ApiResponse<TableItem>>(
      `${API_BASE}/tables/${id}`,
      payload,
    );
  }

  deleteTable(id: number) {
    console.log('DELETE запрос к:', `${API_BASE}/tables/${id}`);
    return this.http.delete(`${API_BASE}/tables/${id}`);
  }

  toggleTableActive(id: number, active: boolean) {
    return this.http.patch<ApiResponse<TableItem>>(
      `${API_BASE}/tables/${id}/${active ? 'activate' : 'deactivate'}`,
      {},
    );
  }

  createService(payload: {
    name: string;
    description?: string;
    price: number;
  }) {
    return this.http.post<ApiResponse<ServiceItem>>(
      `${API_BASE}/services`,
      payload,
    );
  }

  updateService(
    id: number,
    payload: { name: string; description?: string; price: number },
  ) {
    return this.http.put<ApiResponse<ServiceItem>>(
      `${API_BASE}/services/${id}`,
      payload,
    );
  }

  deleteService(id: number) {
    return this.http.delete<ApiResponse<null>>(`${API_BASE}/services/${id}`);
  }

  toggleServiceActive(id: number, active: boolean) {
    return this.http.patch<ApiResponse<ServiceItem>>(
      `${API_BASE}/services/${id}/${active ? 'activate' : 'deactivate'}`,
      {},
    );
  }

  getReasonsList(activeOnly = false) {
    return this.http.get<ApiResponse<ReasonItem[]>>(`${API_BASE}/reasons`, {
      params: new HttpParams().set('activeOnly', activeOnly),
    });
  }

  createReason(payload: {
    code: string;
    displayName: string;
    description?: string;
  }) {
    return this.http.post<ApiResponse<ReasonItem>>(
      `${API_BASE}/reasons`,
      payload,
    );
  }

  updateReason(
    id: number,
    payload: { code: string; displayName: string; description?: string },
  ) {
    return this.http.put<ApiResponse<ReasonItem>>(
      `${API_BASE}/reasons/${id}`,
      payload,
    );
  }

  deleteReason(id: number) {
    return this.http.delete<ApiResponse<null>>(`${API_BASE}/reasons/${id}`);
  }

  toggleReasonActive(id: number, active: boolean) {
    return this.http.patch<ApiResponse<ReasonItem>>(
      `${API_BASE}/reasons/${id}/${active ? 'activate' : 'deactivate'}`,
      {},
    );
  }

  createPackage(payload: {
    name: string;
    description?: string;
    services: Array<{ serviceId: number; quantity: number }>;
    reasonIds: number[];
  }) {
    return this.http.post<ApiResponse<PackageItem>>(
      `${API_BASE}/packages`,
      payload,
    );
  }

  updatePackage(
    id: number,
    payload: {
      name: string;
      description?: string;
      services: Array<{ serviceId: number; quantity: number }>;
      reasonIds: number[];
    },
  ) {
    return this.http.put<ApiResponse<PackageItem>>(
      `${API_BASE}/packages/${id}`,
      payload,
    );
  }

  deletePackage(id: number) {
    return this.http.delete<ApiResponse<null>>(`${API_BASE}/packages/${id}`);
  }

  togglePackageActive(id: number, active: boolean) {
    return this.http.patch<ApiResponse<PackageItem>>(
      `${API_BASE}/packages/${id}/${active ? 'activate' : 'deactivate'}`,
      {},
    );
  }
}
