import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { DashboardService } from '../../core/dashboard/dashboard.service';
import { FinancialsService } from '../../core/financials/financials.service';
import DashboardPage from './index.page';

describe('DashboardPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DashboardService,
          useValue: {
            getOverview: () =>
              of({
                total_products_in_stock: 7932,
                total_revenue: '162703.20',
                reserved_orders: 15,
                recently_sold: [],
              }),
          },
        },
        {
          provide: FinancialsService,
          useValue: {
            getOverview: () =>
              of({
                total_income: 162703.2,
                total_expenses: 48112.5,
                net_profit: 114590.7,
                total_cogs: 0,
                gross_profit: 0,
                inventory_valuation: 89214,
                returns_quantity: 7,
                damaged_quantity: 3,
              }),
            getTransactions: () => of({ transactions: [] }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the four headline financial metrics', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Net Profit');
    expect(text).toContain('Total Revenue');
    expect(text).toContain('Total Expenses');
    expect(text).toContain('Inventory Valuation');
    expect(text).toContain('$114,590.70');
  });
});