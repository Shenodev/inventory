import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProductsService } from '../../core/products/products.service';
import StockPage from './stock.page';

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

const SOLD_OUT_PRODUCT = {
  id: 3,
  sku: 'SKU-003',
  name: 'Sold Out Widget',
  price: '4.99',
  total_stock: 0,
  reserved_stock: 0,
  sold_stock: 0,
  available_stock: 0,
};

describe('StockPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ProductsService,
          useValue: {
            list: () =>
              of({ products: [PRODUCT, LOW_STOCK_PRODUCT, SOLD_OUT_PRODUCT] }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders stock levels with status chips for each product', () => {
    const fixture = TestBed.createComponent(StockPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Demo Widget');
    expect(text).toContain('Low Stock Widget');
    expect(text).toContain('Sold Out Widget');
    expect(text).toContain('In stock');
    expect(text).toContain('Low stock');
    expect(text).toContain('Out of stock');
  });
});