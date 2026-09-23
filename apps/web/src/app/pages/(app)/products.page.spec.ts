import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductsService } from '../../core/products/products.service';
import ProductsPage from './products.page';

type RequestSubmit = (this: HTMLFormElement, submitter?: HTMLElement) => void;

if (typeof HTMLFormElement.prototype.requestSubmit === 'function') {
  HTMLFormElement.prototype.requestSubmit = function (this: HTMLFormElement) {
    this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  } as RequestSubmit;
}

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
            reportDamage: () =>
              of({
                message: '3 damaged units written off for Demo Widget.',
                damage: {
                  product_id: 1,
                  sku: 'SKU-001',
                  name: 'Demo Widget',
                  cost: '8.00',
                  quantity: 3,
                  reason: 'Broken on arrival',
                  loss: '24.00',
                  movement_id: 1,
                  transaction_id: 1,
                },
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

  it('reports damaged stock through the damage modal', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    const component = fixture.componentInstance as unknown as ProductsPageInternals;
    const service = TestBed.inject(ProductsService);
    const reportDamageSpy = vi.spyOn(service, 'reportDamage');

    component.load();
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    const openDamage = Array.from(native.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('Report Damage')
    );

    expect(openDamage).toBeTruthy();
    openDamage?.click();
    fixture.detectChanges();

    const dialog = native.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.className).toContain('rounded-xl');

    const select = dialog?.querySelector('select') as HTMLSelectElement | null;
    expect(select).toBeTruthy();
    select!.selectedIndex = 1;
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const quantity = dialog?.querySelector('#damage-quantity') as HTMLInputElement | null;
    expect(quantity).toBeTruthy();
    quantity!.value = '3';
    quantity!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const reason = dialog?.querySelector('#damage-reason') as HTMLTextAreaElement | null;
    expect(reason).toBeTruthy();
    reason!.value = 'Broken on arrival';
    reason!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const writeOff = Array.from(dialog?.querySelectorAll('button') ?? []).find((element) =>
      element.textContent?.includes('Write off')
    );
    writeOff?.click();
    fixture.detectChanges();

    expect(reportDamageSpy).toHaveBeenCalledWith({
      product_id: 1,
      quantity: 3,
      reason: 'Broken on arrival',
    });
    expect(native.textContent).toContain('3 damaged units written off for Demo Widget.');
  });

  it('reports a product as lost with a preselected product and stocktake reason', () => {
    const fixture = TestBed.createComponent(ProductsPage);
    const component = fixture.componentInstance as unknown as ProductsPageInternals;
    const service = TestBed.inject(ProductsService);
    const reportDamageSpy = vi.spyOn(service, 'reportDamage');

    component.load();
    fixture.detectChanges();

    const native = fixture.nativeElement as HTMLElement;
    const reportLost = Array.from(native.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('Report as lost')
    );

    expect(reportLost).toBeTruthy();
    reportLost?.click();
    fixture.detectChanges();

    const dialog = native.querySelector('[role="dialog"]');
    expect(dialog?.textContent ?? '').toContain('Report as lost');

    const writeOff = Array.from(dialog?.querySelectorAll('button') ?? []).find((element) =>
      element.textContent?.includes('Write off')
    );
    writeOff?.click();
    fixture.detectChanges();

    expect(reportDamageSpy).toHaveBeenCalledWith({
      product_id: 1,
      quantity: 1,
      reason: 'Marked as lost during stocktake',
    });
  });
});
