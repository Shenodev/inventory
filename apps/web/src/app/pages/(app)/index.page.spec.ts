import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { DashboardService } from '../../core/dashboard/dashboard.service';
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
      ],
    }).compileComponents();
  });

  it('renders the three headline metrics', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Total Inventory');
    expect(text).toContain('Sold Revenue');
    expect(text).toContain('Active Reservations');
  });
});
