import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { OrdersService } from '../../core/orders/orders.service';
import SalesPage from './sales.page';

interface SalesPageInternals {
  loadReserved(): void;
  loadSold(): void;
  selectTab(tab: 'reserved' | 'sold'): void;
}

const RESERVED_LINE = {
  order_id: 11,
  ordered_at: '2026-09-01T10:00:00+00:00',
  customer_name: 'Alice Reserve',
  product_id: 1,
  product_name: 'Reserved Widget',
  quantity: 3,
  price: '19.99',
  line_total: '59.97',
  remaining_stock: 120,
};

const SOLD_LINE = {
  order_id: 22,
  ordered_at: '2026-09-02T10:00:00+00:00',
  customer_name: 'Bob Buyer',
  product_id: 2,
  product_name: 'Sold Gadget',
  quantity: 2,
  price: '49.50',
  line_total: '99.00',
  remaining_stock: 40,
};

describe('SalesPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: OrdersService,
          useValue: {
            reserved: () => of({ reserved: [RESERVED_LINE] }),
            sold: () => of({ sold: [SOLD_LINE] }),
          },
        },
      ],
    }).compileComponents();
  });

  it('lists who reserved what on the reserved tab', () => {
    const fixture = TestBed.createComponent(SalesPage);
    const component = fixture.componentInstance as unknown as SalesPageInternals;

    component.loadReserved();
    component.loadSold();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Reserved Qty');
    expect(text).toContain('Reserved Widget');
    expect(text).toContain('Alice Reserve');
  });

  it('lists buyer, sale price and quantity on the sold tab', () => {
    const fixture = TestBed.createComponent(SalesPage);
    const component = fixture.componentInstance as unknown as SalesPageInternals;

    component.loadReserved();
    component.loadSold();
    component.selectTab('sold');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Qty Sold');
    expect(text).toContain('Sale Price');
    expect(text).toContain('Sold Gadget');
    expect(text).toContain('Bob Buyer');
    expect(text).toContain('$49.50');
    expect(text).toContain('$99.00');
  });
});
