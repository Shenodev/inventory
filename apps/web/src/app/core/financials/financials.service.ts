import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../api.base-url';
import { BYPASS_CACHE } from '../http/api-cache.interceptor';

export interface FinancialOverview {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  total_cogs: number;
  gross_profit: number;
  inventory_valuation: number;
  returns_quantity: number;
  damaged_quantity: number;
}

export type FinancialTransactionType = 'income' | 'expense';

export interface FinancialTransaction {
  id: number;
  type: FinancialTransactionType;
  amount: string;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string | null;
}

export interface TransactionsResponse {
  transactions: FinancialTransaction[];
}

@Injectable({ providedIn: 'root' })
export class FinancialsService {
  private readonly http = inject(HttpClient);

  getOverview(force = false): Observable<FinancialOverview> {
    return this.http
      .get<{ overview: FinancialOverview }>(`${API_BASE_URL}/financials/overview`, {
        context: new HttpContext().set(BYPASS_CACHE, force),
      })
      .pipe(map((response) => response.overview));
  }

  getTransactions(force = false): Observable<TransactionsResponse> {
    return this.http.get<TransactionsResponse>(`${API_BASE_URL}/financials/transactions`, {
      context: new HttpContext().set(BYPASS_CACHE, force),
    });
  }
}