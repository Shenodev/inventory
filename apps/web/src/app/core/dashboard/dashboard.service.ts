import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';

export interface DashboardSoldItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
}

export interface DashboardSoldOrder {
  id: number;
  customer: { id: number | null; name: string | null };
  total: string;
  sold_at: string | null;
  items: DashboardSoldItem[];
}

export interface DashboardOverview {
  total_products_in_stock: number;
  total_revenue: string;
  reserved_orders: number;
  recently_sold: DashboardSoldOrder[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${API_BASE_URL}/dashboard`);
  }
}
