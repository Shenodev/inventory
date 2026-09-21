import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { SalesOrdersService } from '../../core/sales/sales-orders.service';
import ReturnsPage from './returns.page';

describe('ReturnsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReturnsPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SalesOrdersService,
          useValue: {
            listReturns: () =>
              of({
                returns: [
                  {
                    id: 1,
                    sales_order_id: 12,
                    product_id: 16,
                    product_sku: 'SKU-16-WDG',
                    product_name: 'Demo Widget',
                    quantity: 2,
                    reason: 'Customer changed mind',
                    customer: 'Bob Buyer',
                    created_at: '2026-09-03T09:15:00+00:00',
                  },
                ],
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders return entries with order, customer, product and reason', () => {
    const fixture = TestBed.createComponent(ReturnsPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('#12');
    expect(text).toContain('Bob Buyer');
    expect(text).toContain('Demo Widget');
    expect(text).toContain('Customer changed mind');
    expect(text).toContain('Sep 3, 2026');
  });
});