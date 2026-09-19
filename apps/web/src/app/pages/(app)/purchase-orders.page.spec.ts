import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProductsService } from '../../core/products/products.service';
import { PurchaseOrdersService } from '../../core/procurement/purchase-orders.service';
import { SuppliersService } from '../../core/procurement/suppliers.service';
import PurchaseOrdersPage from './purchase-orders.page';

interface PurchaseOrdersPageInternals {
  load(force?: boolean): void;
  selectPurchaseOrder(id: number): void;
}

const SUPPLIER = {
  id: 1,
  name: 'Northwind Manufacturing',
  email: 'purchasing@northwind-supply.com',
  phone: '+1-206-555-0198',
  purchase_order_count: 1,
  created_at: null,
  updated_at: null,
};

const PRODUCT = {
  id: 16,
  sku: 'SKU-16-WDG',
  name: 'Demo Widget',
  price: '25.00',
  total_stock: 100,
  reserved_stock: 0,
  sold_stock: 0,
  available_stock: 100,
};

const LIST_ITEM = {
  id: 7,
  supplier_id: 1,
  supplier: 'Northwind Manufacturing',
  status: 'pending' as const,
  total_cost: '125.00',
  item_count: 1,
  created_at: null,
  updated_at: null,
};

const RECEIVED_ITEM = {
  ...LIST_ITEM,
  status: 'received' as const,
};

const DETAIL = {
  ...LIST_ITEM,
  items: [
    {
      id: 1,
      product_id: 16,
      product_sku: 'SKU-16-WDG',
      product_name: 'Demo Widget',
      quantity: 10,
      unit_cost: '12.50',
      line_total: '125.00',
    },
  ],
  transactions: [],
};

describe('PurchaseOrdersPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrdersPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PurchaseOrdersService,
          useValue: {
            list: () => of({ purchase_orders: [LIST_ITEM] }),
            show: () => of({ purchase_order: DETAIL }),
            store: () => of({ message: 'Purchase order created.', purchase_order: DETAIL }),
            addItem: () => of({ message: 'Item added.', purchase_order: DETAIL }),
            removeItem: () => of({ message: 'Item removed.', purchase_order: DETAIL }),
            receive: () =>
              of({
                message: 'Purchase order #7 received.',
                purchase_order: { ...RECEIVED_ITEM, items: DETAIL.items, transactions: [] },
              }),
          },
        },
        {
          provide: SuppliersService,
          useValue: { list: () => of({ suppliers: [SUPPLIER] }) },
        },
        {
          provide: ProductsService,
          useValue: { list: () => of({ products: [PRODUCT] }) },
        },
      ],
    }).compileComponents();
  });

  it('lists purchase orders and shows the selected master detail', () => {
    const fixture = TestBed.createComponent(PurchaseOrdersPage);
    (fixture.componentInstance as unknown as PurchaseOrdersPageInternals).load();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('#7');
    expect(text).toContain('Northwind Manufacturing');

    (fixture.componentInstance as unknown as PurchaseOrdersPageInternals).selectPurchaseOrder(7);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Demo Widget');
  });

  it('shows Receive Shipment for a pending order and confirms a receive', () => {
    const fixture = TestBed.createComponent(PurchaseOrdersPage);
    (fixture.componentInstance as unknown as PurchaseOrdersPageInternals).load();
    fixture.detectChanges();
    (fixture.componentInstance as unknown as PurchaseOrdersPageInternals).selectPurchaseOrder(7);
    fixture.detectChanges();

    const receive = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find((element) => element.textContent?.includes('Receive Shipment'));

    expect(receive).toBeTruthy();

    receive?.click();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]');

    expect(dialog).toBeTruthy();

    const confirm = Array.from(dialog?.querySelectorAll('button') ?? []).find((element) =>
      element.textContent?.includes('Receive shipment')
    );

    confirm?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('received');
    expect(text).toContain('stock and expenses updated');
  });
});