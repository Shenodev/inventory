import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { CustomersService } from '../../core/sales/customers.service';
import CustomersPage from './customers.page';

interface CustomersPageInternals {
  load(force?: boolean): void;
}

const CUSTOMER = {
  id: 4,
  name: 'Jane Cooper',
  email: 'jane@company.com',
  phone: '+1-206-555-0198',
  sales_order_count: 2,
  created_at: null,
  updated_at: null,
};

describe('CustomersPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CustomersService,
          useValue: {
            list: () => of({ customers: [CUSTOMER] }),
            store: () => of({ message: 'Customer created.', customer: CUSTOMER }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders customer rows with contact details and order counts', () => {
    const fixture = TestBed.createComponent(CustomersPage);
    (fixture.componentInstance as unknown as CustomersPageInternals).load();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Jane Cooper');
    expect(text).toContain('jane@company.com');
    expect(text).toContain('+1-206-555-0198');
    expect(text).toContain('Sales orders placed');
    expect(text).toContain('New order');
  });

  it('opens a rounded-xl create dialog from the header action', () => {
    const fixture = TestBed.createComponent(CustomersPage);
    (fixture.componentInstance as unknown as CustomersPageInternals).load();
    fixture.detectChanges();

    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find((element) => element.textContent?.includes('New customer'));

    expect(button).toBeTruthy();

    button?.click();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');

    expect(dialog).toBeTruthy();
    expect(dialog?.className).toContain('rounded-xl');
  });
});