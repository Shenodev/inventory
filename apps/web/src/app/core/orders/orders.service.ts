import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export interface OrderLine {
  order_id: number;
  ordered_at: string | null;
  customer_name: string | null;
  product_id: number;
  product_name: string | null;
  quantity: number;
  price: string;
  line_total: string;
  remaining_stock: number | null;
}

export interface ReservedOrdersResponse {
  reserved: OrderLine[];
}

export interface SoldOrdersResponse {
  sold: OrderLine[];
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  reserved(force = false): Observable<ReservedOrdersResponse> {
    return this.http.get<ReservedOrdersResponse>(`${API_BASE_URL}/orders/reserved`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }

  sold(force = false): Observable<SoldOrdersResponse> {
    return this.http.get<SoldOrdersResponse>(`${API_BASE_URL}/orders/sold`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }
}
