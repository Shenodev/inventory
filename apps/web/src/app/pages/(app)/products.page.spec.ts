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
            list: () => of({ products: [PRODUCT] }),
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
});
