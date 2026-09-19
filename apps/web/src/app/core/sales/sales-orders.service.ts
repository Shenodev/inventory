import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export type SalesOrderStatus = 'reserved' | 'shipped' | 'cancelled';

export interface SalesOrderListItem {
  id: number;
  customer_id: number;
  customer: string | null;
  status: SalesOrderStatus;
  total_price: string;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SalesOrderItem {
  id: number;
  product_id: number;
  product_sku: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export type TransactionType = 'income' | 'expense';

export interface SalesOrderTransaction {
  id: number;
  type: TransactionType;
  amount: string;
}

export interface SalesOrder extends SalesOrderListItem {
  items: SalesOrderItem[];
  transactions: SalesOrderTransaction[];
}

export interface SalesOrdersResponse {
  sales_orders: SalesOrderListItem[];
}

export interface SalesOrderResponse {
  message: string;
  sales_order: SalesOrder;
}

export interface SalesOrderLinePayload {
  product_id: number;
  quantity: number;
  unit_price: string;
}

export interface CreateSalesOrderPayload {
  customer_id: number;
  items: SalesOrderLinePayload[];
}

@Injectable({ providedIn: 'root' })
export class SalesOrdersService {
  private readonly http = inject(HttpClient);

  list(force = false, status?: SalesOrderStatus): Observable<SalesOrdersResponse> {
    const params: Record<string, string> = {};

    if (status !== undefined) {
      params['status'] = status;
    }

    return this.http.get<SalesOrdersResponse>(`${API_BASE_URL}/sales-orders`, {
      params,
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }

  store(payload: CreateSalesOrderPayload): Observable<SalesOrderResponse> {
    return this.http.post<SalesOrderResponse>(`${API_BASE_URL}/sales-orders`, payload);
  }

  fulfill(id: number): Observable<SalesOrderResponse> {
    return this.http.post<SalesOrderResponse>(`${API_BASE_URL}/sales-orders/${id}/fulfill`, {});
  }
}