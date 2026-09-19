import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export type PurchaseOrderStatus = 'pending' | 'received';

export interface PurchaseOrderListItem {
  id: number;
  supplier_id: number;
  supplier: string | null;
  status: PurchaseOrderStatus;
  total_cost: string;
  item_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PurchaseOrderItem {
  id: number;
  product_id: number;
  product_sku: string | null;
  product_name: string | null;
  quantity: number;
  unit_cost: string;
  line_total: string;
}

export interface PurchaseOrderTransaction {
  id: number;
  type: string;
  amount: string;
}

export interface PurchaseOrder extends PurchaseOrderListItem {
  items: PurchaseOrderItem[];
  transactions: PurchaseOrderTransaction[];
}

export interface PurchaseOrdersResponse {
  purchase_orders: PurchaseOrderListItem[];
}

export interface PurchaseOrderResponse {
  message?: string;
  purchase_order: PurchaseOrder;
}

export interface PurchaseOrderItemPayload {
  product_id: number;
  quantity: number;
  unit_cost: string;
}

export interface CreatePurchaseOrderPayload {
  supplier_id: number;
  items?: PurchaseOrderItemPayload[];
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  private readonly http = inject(HttpClient);

  list(force = false, status?: PurchaseOrderStatus): Observable<PurchaseOrdersResponse> {
    const params: Record<string, string> = {};

    if (status !== undefined) {
      params['status'] = status;
    }

    return this.http.get<PurchaseOrdersResponse>(`${API_BASE_URL}/purchase-orders`, {
      params,
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }

  store(payload: CreatePurchaseOrderPayload): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(`${API_BASE_URL}/purchase-orders`, payload);
  }

  show(purchaseOrderId: number): Observable<PurchaseOrderResponse> {
    return this.http.get<PurchaseOrderResponse>(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}`);
  }

  addItem(purchaseOrderId: number, payload: PurchaseOrderItemPayload): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(
      `${API_BASE_URL}/purchase-orders/${purchaseOrderId}/items`,
      payload
    );
  }

  removeItem(purchaseOrderId: number, itemId: number): Observable<PurchaseOrderResponse> {
    return this.http.delete<PurchaseOrderResponse>(
      `${API_BASE_URL}/purchase-orders/${purchaseOrderId}/items/${itemId}`
    );
  }

  receive(purchaseOrderId: number): Observable<PurchaseOrderResponse> {
    return this.http.post<PurchaseOrderResponse>(
      `${API_BASE_URL}/purchase-orders/${purchaseOrderId}/receive`,
      {}
    );
  }
}