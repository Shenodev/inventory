import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SalesOrdersService } from '../../core/sales/sales-orders.service';
import { ToastService } from '../../core/ui/toast.service';
import SalesPage from './sales.page';

type RequestSubmit = (this: HTMLFormElement, submitter?: HTMLElement) => void;

if (typeof HTMLFormElement.prototype.requestSubmit === 'function') {
  HTMLFormElement.prototype.requestSubmit = function (this: HTMLFormElement) {
    this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  } as RequestSubmit;
}

interface SalesPageInternals {
  load(force?: boolean): void;
}

const RESERVED_ORDER = {
  id: 13,
  customer_id: 1,
  customer: 'Alice Reserve',
  status: 'reserved',
  total_price: '105.00',
  item_count: 2,
  created_at: '2026-09-01T10:00:00+00:00',
  updated_at: '2026-09-01T10:00:00+00:00',
};

const SHIPPED_ORDER = {
  id: 12,
  customer_id: 2,
  customer: 'Bob Buyer',
  status: 'shipped',
  total_price: '99.00',
  item_count: 3,
  created_at: '2026-08-20T10:00:00+00:00',
  updated_at: '2026-08-21T10:00:00+00:00',
};

const SHIPPED_DETAIL = {
  ...SHIPPED_ORDER,
  items: [
    {
      id: 1,
      product_id: 16,
      product_sku: 'SKU-16-WDG',
      product_name: 'Demo Widget',
      quantity: 4,
      unit_price: '24.75',
      line_total: '99.00',
    },
  ],
  transactions: [{ id: 1, type: 'income', amount: '99.00' }],
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
          provide: SalesOrdersService,
          useValue: {
            list: () => of({ sales_orders: [RESERVED_ORDER, SHIPPED_ORDER] }),
            show: () => of({ sales_order: SHIPPED_DETAIL }),
            fulfill: (id: number) =>
              of({
                message: `Sales order #${id} fulfilled.`,
                sales_order: { ...RESERVED_ORDER, status: 'shipped' },
              }),
            processReturn: (id: number) =>
              of({
                message: `Return processed. Refund of 99.00 logged against sales order #${id}.`,
                refund: '99.00',
                sales_order: SHIPPED_ORDER,
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders reserved and shipped orders and shows Fulfill & Ship on reserved rows', () => {
    const fixture = TestBed.createComponent(SalesPage);
    (fixture.componentInstance as unknown as SalesPageInternals).load();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('#13');
    expect(text).toContain('Alice Reserve');
    expect(text).toContain('#12');
    expect(text).toContain('Bob Buyer');
    expect(text).toContain('Fulfill & Ship');
    expect(text).toContain('$105.00');
  });

  it('fulfills a reserved order and raises a success toast', () => {
    const fixture = TestBed.createComponent(SalesPage);
    const component = fixture.componentInstance as unknown as SalesPageInternals;
    const service = TestBed.inject(SalesOrdersService);
    const fulfillSpy = vi.spyOn(service, 'fulfill');

    component.load();
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const fulfill = buttons.find((element) => element.textContent?.includes('Fulfill & Ship'));

    expect(fulfill).toBeTruthy();
    fulfill?.click();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();

    const confirm = Array.from(dialog?.querySelectorAll('button') ?? []).find((element) =>
      element.textContent?.includes('Fulfill & Ship')
    );
    confirm?.click();
    fixture.detectChanges();

    expect(fulfillSpy).toHaveBeenCalledWith(13);

    const toast = TestBed.inject(ToastService);
    expect(toast.toasts().some((item) => item.type === 'success' && item.message.includes('13'))).toBe(true);
  });

  it('processes a return by selecting shipped items and submitting the return form', () => {
    const fixture = TestBed.createComponent(SalesPage);
    const component = fixture.componentInstance as unknown as SalesPageInternals;
    const service = TestBed.inject(SalesOrdersService);
    const returnSpy = vi.spyOn(service, 'processReturn');

    component.load();
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const openReturn = buttons.find((element) => element.textContent?.includes('Process Return'));

    expect(openReturn).toBeTruthy();
    openReturn?.click();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect((dialog?.textContent ?? '').includes('Demo Widget')).toBe(true);

    const boxes = dialog?.querySelectorAll('input[type="checkbox"]') ?? [];
    expect(boxes.length).toBe(1);
    const box = boxes[0] as HTMLInputElement;
    box.click();
    fixture.detectChanges();

    const quantity = dialog?.querySelector('input[type="number"]') as HTMLInputElement | null;
    expect(quantity).toBeTruthy();
    quantity!.value = '2';
    quantity!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitLine = Array.from(dialog?.querySelectorAll('button') ?? []).find((element) =>
      element.textContent?.includes('Process return')
    );
    submitLine?.click();
    fixture.detectChanges();

    expect(returnSpy).toHaveBeenCalledWith(12, {
      items: [{ product_id: 16, quantity: 2 }],
    });

    const toast = TestBed.inject(ToastService);
    expect(toast.toasts().some((item) => item.type === 'success' && item.message.includes('Return processed'))).toBe(true);
  });
});