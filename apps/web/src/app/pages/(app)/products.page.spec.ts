import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProductsService } from '../../core/products/products.service';
import ProductsPage from './products.page';

interface ProductsPageInternals {
  load(): void;
}

const PRODUCT = {
  id: 1,
  sku: 'SKU-001',
  name: 'Demo Widget',
  price: '19.99',
  total_stock: 120,
  reserved_stock: 5,
  sold_stock: 15,
  available_stock: 100,
};

const LOW_STOCK_PRODUCT = {
  id: 2,
  sku: 'SKU-002',
  name: 'Low Stock Widget',
  price: '9.99',
  total_stock: 8,
  reserved_stock: 3,
  sold_stock: 0,
  available_stock: 5,
};

const REORDER_PRODUCT = {
  id: 3,
  sku: 'SKU-003',
  name: 'Reorder Widget',
  price: '14.99',
  total_stock: 30,
  reserved_stock: 15,
  sold_stock: 0,
  available_stock: 15,
  min_stock: 20,
};

const SOLD_OUT_PRODUCT = {
  id: 4,
  sku: 'SKU-004',
  name: 'Sold Out Widget',
  price: '4.99',
  total_stock: 0,
  reserved_stock: 0,
  sold_stock: 0,
  available_stock: 0,
};

describe('ProductsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ProductsService,
          useValue: {
            list: () =>
              of({
                products: [PRODUCT, LOW_STOCK_PRODUCT, REORDER_PRODUCT, SOLD_OUT_PRODUCT],
              }),
            adjustStock: () =>
              of({
                message: 'Stock updated.',
                product: { ...PRODUCT, total_stock: 121, available_stock: 101 },
                movement: { id: 1, type: 'in', quantity: 1, note: null, created_at: null },
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the stock breakdown columns', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    (fixture.componentInstance as unknown as ProductsPageInternals).load();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Total Stock');
    expect(text).toContain('Reserved');
    expect(text).toContain('Sold');
    expect(text).toContain('Available');
    expect(text).toContain('Demo Widget');
  });

  it('opens a rounded-xl adjust stock dialog from the row action', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    (fixture.componentInstance as unknown as ProductsPageInternals).load();
    fixture.detectChanges();

    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find((element) => element.textContent?.includes('Adjust Stock'));

    expect(button).toBeTruthy();

    button?.click();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');

    expect(dialog).toBeTruthy();
    expect(dialog?.className).toContain('rounded-xl');
  });

  it('filters the table by the Low Stock and Out of Stock toggles', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    (fixture.componentInstance as unknown as ProductsPageInternals).load();
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;

    const buttonFor = (label: string) =>
      Array.from(native.querySelectorAll('button')).find((element) =>
        element.textContent?.includes(label)
      );

    const lowButton = buttonFor('Low Stock');

    expect(lowButton).toBeTruthy();

    lowButton?.click();
    fixture.detectChanges();

    expect(native.textContent).toContain('Low Stock Widget');
    expect(native.textContent).toContain('Reorder Widget');
    expect(native.textContent).not.toContain('Demo Widget');
    expect(native.textContent).not.toContain('Sold Out Widget');

    const outButton = buttonFor('Out of Stock');

    expect(outButton).toBeTruthy();
    outButton?.click();
    fixture.detectChanges();

    expect(native.textContent).toContain('Low Stock Widget');
    expect(native.textContent).toContain('Reorder Widget');
    expect(native.textContent).toContain('Sold Out Widget');
    expect(native.textContent).not.toContain('Demo Widget');

    lowButton?.click();
    fixture.detectChanges();

    expect(native.textContent).toContain('Sold Out Widget');
    expect(native.textContent).not.toContain('Demo Widget');
    expect(native.textContent).not.toContain('Low Stock Widget');

    outButton?.click();
    fixture.detectChanges();

    expect(native.textContent).toContain('Demo Widget');
  });
});
