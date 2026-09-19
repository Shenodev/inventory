import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  purchase_order_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SuppliersResponse {
  suppliers: Supplier[];
}

export interface SupplierPayload {
  name: string;
  email: string;
  phone?: string | null;
}

export interface SupplierResponse {
  message: string;
  supplier: Supplier;
}

export interface MessageResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);

  list(force = false): Observable<SuppliersResponse> {
    return this.http.get<SuppliersResponse>(`${API_BASE_URL}/suppliers`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }

  create(payload: SupplierPayload): Observable<SupplierResponse> {
    return this.http.post<SupplierResponse>(`${API_BASE_URL}/suppliers`, payload);
  }

  update(supplierId: number, payload: SupplierPayload): Observable<SupplierResponse> {
    return this.http.put<SupplierResponse>(`${API_BASE_URL}/suppliers/${supplierId}`, payload);
  }

  destroy(supplierId: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${API_BASE_URL}/suppliers/${supplierId}`);
  }
}