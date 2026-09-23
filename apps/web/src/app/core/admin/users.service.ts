import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string | null;
}

export interface UsersResponse {
  users: AdminUser[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string | null;
  role?: string;
}

export interface UserResponse {
  message: string;
  user: AdminUser;
}

export interface RoleResponse {
  message: string;
  user: { id: number; email: string; role: string };
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);

  list(force = false): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${API_BASE_URL}/admin/users`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }

  create(payload: CreateUserPayload): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${API_BASE_URL}/admin/users`, payload);
  }

  update(userId: number, payload: UpdateUserPayload): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${API_BASE_URL}/admin/users/${userId}`, payload);
  }

  updateRole(userId: number, role: string): Observable<RoleResponse> {
    return this.http.patch<RoleResponse>(`${API_BASE_URL}/admin/users/${userId}/role`, { role });
  }
}