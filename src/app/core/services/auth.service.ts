import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { ApiResponse, AuthPayload, User, UserRole } from '../models/models';

const API_BASE = '';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userState = signal<User | null>(this.readUserFromStorage());
  readonly user = computed(() => this.userState());
  readonly isAuthenticated = computed(() => !!this.userState());

  constructor(private readonly http: HttpClient) {}

  login(payload: { login: string; password: string }) {
    return this.http.post<ApiResponse<AuthPayload>>(`${API_BASE}/api/auth/login`, payload).pipe(
      tap((response) => {
        if (response.data) {
          this.persistSession(response.data);
        }
      })
    );
  }

  register(payload: {
    login: string;
    password: string;
    confirmPassword: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    phone?: string;
    email: string;
  }) {
    return this.http.post<ApiResponse<AuthPayload>>(`${API_BASE}/api/auth/register`, payload);
  }

  logout() {
    this.clearSession();
  }

  hasRole(roles: UserRole[]) {
    const currentRole = this.userState()?.role;
    return !!currentRole && roles.includes(currentRole);
  }

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persistSession(data: AuthPayload) {
    const user: User = {
      userId: data.userId,
      role: data.role,
      fullName: data.fullName,
      login: this.extractLoginFromJwt(data.token)
    };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.userState.set(user);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userState.set(null);
  }

  private readUserFromStorage(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  private extractLoginFromJwt(token: string): string {
    try {
      const base64Payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decodedPayload.sub ?? '';
    } catch {
      return '';
    }
  }
}
