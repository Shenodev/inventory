import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { SuppliersService } from '../../core/procurement/suppliers.service';
import SuppliersPage from './suppliers.page';

interface SuppliersPageInternals {
  load(force?: boolean): void;
}

const SUPPLIER = {
  id: 1,
  name: 'Northwind Manufacturing',
  email: 'purchasing@northwind-supply.com',
  phone: '+1-206-555-0198',
  purchase_order_count: 3,
  created_at: null,
  updated_at: null,
};

describe('SuppliersPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuppliersPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SuppliersService,
          useValue: {
            list: () => of({ suppliers: [SUPPLIER] }),
            create: () => of({ message: 'Supplier created.', supplier: SUPPLIER }),
            update: () => of({ message: 'Supplier updated.', supplier: SUPPLIER }),
            destroy: () => of({ message: 'Supplier deleted.' }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders supplier rows with contact details and order counts', () => {
    const fixture = TestBed.createComponent(SuppliersPage);
    (fixture.componentInstance as unknown as SuppliersPageInternals).load();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Northwind Manufacturing');
    expect(text).toContain('purchasing@northwind-supply.com');
    expect(text).toContain('+1-206-555-0198');
    expect(text).toContain('Purchase orders');
    expect(text).toContain('Edit');
    expect(text).toContain('Delete');
  });

  it('opens a rounded-xl create dialog from the header action', () => {
    const fixture = TestBed.createComponent(SuppliersPage);
    (fixture.componentInstance as unknown as SuppliersPageInternals).load();
    fixture.detectChanges();

    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button')
    ).find((element) => element.textContent?.includes('New supplier'));

    expect(button).toBeTruthy();

    button?.click();
    fixture.detectChanges();

    const dialog = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');

    expect(dialog).toBeTruthy();
    expect(dialog?.className).toContain('rounded-xl');
  });
});