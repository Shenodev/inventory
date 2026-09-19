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
            fulfill: (id: number) =>
              of({
                message: `Sales order #${id} fulfilled.`,
                sales_order: { ...RESERVED_ORDER, status: 'shipped' },
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
});