import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  sales_order_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CustomersResponse {
  customers: Customer[];
}

export interface CustomerPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface CustomerResponse {
  message: string;
  customer: Customer;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);

  list(force = false): Observable<CustomersResponse> {
    return this.http.get<CustomersResponse>(`${API_BASE_URL}/customers`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }

  store(payload: CustomerPayload): Observable<CustomerResponse> {
    return this.http.post<CustomerResponse>(`${API_BASE_URL}/customers`, payload);
  }
}