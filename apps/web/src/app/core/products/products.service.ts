import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export type StockMovementType = 'in' | 'out';

export interface Product {
  id: number;
  sku: string;
  name: string;
  price: string;
  total_stock: number;
  reserved_stock: number;
  sold_stock: number;
  available_stock: number;
  min_stock?: number;
}

export interface ProductsResponse {
  products: Product[];
}

export interface StockMovement {
  id: number;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  created_at: string | null;
}

export interface AdjustStockResponse {
  message: string;
  product: Product;
  movement: StockMovement;
}

export interface AdjustStockPayload {
  type: StockMovementType;
  quantity: number;
  note?: string | null;
}

export interface ReportDamagePayload {
  product_id: number;
  quantity: number;
  reason?: string | null;
}

export interface DamageEntry {
  id?: number;
  product_id: number;
  sku: string | null;
  name: string | null;
  cost: string | null;
  quantity: number;
  reason: string | null;
  loss: string | number;
  created_at?: string | null;
}

export interface DamagesResponse {
  damages: DamageEntry[];
}

export interface ReportDamageResponse {
  message: string;
  damage: DamageEntry;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  list(force = false): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(`${API_BASE_URL}/products`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }

  adjustStock(productId: number, payload: AdjustStockPayload): Observable<AdjustStockResponse> {
    return this.http.post<AdjustStockResponse>(
      `${API_BASE_URL}/products/${productId}/stock`,
      payload
    );
  }

  reportDamage(payload: ReportDamagePayload): Observable<ReportDamageResponse> {
    return this.http.post<ReportDamageResponse>(`${API_BASE_URL}/damages`, payload);
  }

  listDamages(force = false): Observable<DamagesResponse> {
    return this.http.get<DamagesResponse>(`${API_BASE_URL}/damages`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }
}
