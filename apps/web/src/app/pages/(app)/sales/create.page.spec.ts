import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductsService } from '../../../core/products/products.service';
import { CustomersService } from '../../../core/sales/customers.service';
import { SalesOrdersService } from '../../../core/sales/sales-orders.service';
import { ToastService } from '../../../core/ui/toast.service';
import SalesCreatePage from './create.page';

interface SalesCreatePageInternals {
  load(force?: boolean): void;
  reserve(): void;
}

const CUSTOMER = {
  id: 1,
  name: 'Jane Cooper',
  email: 'jane@company.com',
  phone: null,
  sales_order_count: 0,
  created_at: null,
  updated_at: null,
};

const PRODUCT = {
  id: 10,
  sku: 'WIDG-1',
  name: 'Chrome Widget',
  price: '50.00',
  total_stock: 10,
  reserved_stock: 5,
  sold_stock: 0,
  available_stock: 5,
};

describe('SalesCreatePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesCreatePage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CustomersService,
          useValue: { list: () => of({ customers: [CUSTOMER] }) },
        },
        {
          provide: ProductsService,
          useValue: { list: () => of({ products: [PRODUCT] }) },
        },
        {
          provide: SalesOrdersService,
          useValue: {
            list: () => of({ sales_orders: [] }),
            store: vi.fn(() =>
              of({
                message: 'Sales order created.',
                sales_order: {
                  id: 14,
                  customer_id: 1,
                  customer: 'Jane Cooper',
                  status: 'reserved',
                  total_price: '50.00',
                  item_count: 1,
                  items: [],
                  transactions: [],
                  created_at: null,
                  updated_at: null,
                },
              })
            ),
          },
        },
      ],
    }).compileComponents();
  });

  it('adds a searched product to the cart and shows the order total', () => {
    const fixture = TestBed.createComponent(SalesCreatePage);
    (fixture.componentInstance as unknown as SalesCreatePageInternals).load();
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'widget';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const add = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === 'Add'
    );

    expect(add).toBeTruthy();
    add?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Chrome Widget');
    expect(text).toContain('$50.00');
  });

  it('reserves the order for the selected customer through the sales orders service', () => {
    const fixture = TestBed.createComponent(SalesCreatePage);
    const component = fixture.componentInstance as unknown as SalesCreatePageInternals;
    const service = TestBed.inject(SalesOrdersService);
    const store = service.store as ReturnType<typeof vi.fn>;

    component.load();
    fixture.detectChanges();

    const customerSelect = (fixture.nativeElement as HTMLElement).querySelector('#pos-customer') as HTMLSelectElement;
    customerSelect.value = '1';
    customerSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const search = (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'widget';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const add = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === 'Add'
    );
    add?.click();
    fixture.detectChanges();

    const reserve = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === 'Reserve'
    ) as HTMLButtonElement;

    expect(reserve.disabled).toBe(false);
    reserve.click();
    fixture.detectChanges();

    expect(store).toHaveBeenCalledWith({
      customer_id: 1,
      items: [{ product_id: 10, quantity: 1, unit_price: '50.00' }],
    });

    const toast = TestBed.inject(ToastService);
    expect(toast.toasts().some((item) => item.type === 'success' && item.message.includes('#14'))).toBe(true);
  });
});