import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';

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

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  list(): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(`${API_BASE_URL}/products`);
  }

  adjustStock(productId: number, payload: AdjustStockPayload): Observable<AdjustStockResponse> {
    return this.http.post<AdjustStockResponse>(
      `${API_BASE_URL}/products/${productId}/stock`,
      payload
    );
  }
}
