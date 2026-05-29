export type UserRole = 'CLIENT' | 'MANAGER' | 'ADMIN';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  timestamp: string;
}

export interface User {
  userId: number;
  role: UserRole;
  fullName: string;
  login: string;
}

export interface AuthPayload {
  token: string;
  role: UserRole;
  userId: number;
  fullName: string;
}

export interface SelectItem {
  id: number;
  name?: string;
  displayName?: string;
}

export interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  available?: boolean;
}

export interface PackageItem {
  id: number;
  name: string;
  description?: string;
  totalPrice?: number;
  active?: boolean;
  services?: Array<{
    serviceId: number;
    serviceName: string;
    quantity: number;
    price: number;
  }>;
  reasons?: Array<{ id: number; code: string; displayName: string }>;
}

export interface ZoneItem {
  id: number;
  name: string;
  description?: string;
  active: boolean;
  tableCount: number;
}

export interface TableItem {
  id: number;
  zoneId: number;
  zoneName: string;
  number: string;
  capacity: number;
  locationDescription?: string;
  active: boolean;
}

export interface ReasonItem {
  id: number;
  code: string;
  displayName: string;
  description?: string;
  active: boolean;
}

export interface AvailableTable {
  tableId: number;
  tableNumber: string;
  zoneName: string;
  capacity: number;
  locationDescription?: string;
}

export interface Booking {
  id: number;
  userFullName?: string;
  bookingDate: string;
  timeStart: string;
  timeEnd?: string;
  guestCount: number;
  status: string;
  comment?: string;
  table: { id: number; number: string; zoneName: string };
  reason?: { id: number; displayName: string };
  services?: Array<{
    serviceId: number;
    serviceName: string;
    quantity?: number;
    price: number;
    totalPrice: number;
  }>;
  totalServicesPrice?: number;
}

export interface UserListItem {
  id: number;
  login: string;
  fullName: string;
  lastName?: string;
  firstName?: string;
  middleName?: string | null;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}
