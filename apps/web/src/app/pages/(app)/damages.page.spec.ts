import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProductsService } from '../../core/products/products.service';
import DamagesPage from './damages.page';

describe('DamagesPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DamagesPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ProductsService,
          useValue: {
            listDamages: () =>
              of({
                damages: [
                  {
                    id: 1,
                    product_id: 5,
                    sku: 'SKU-005',
                    name: 'Fragile Widget',
                    cost: '8.00',
                    quantity: 3,
                    reason: 'Cracked during unload',
                    loss: '24.00',
                    created_at: '2026-09-02T14:30:00+00:00',
                  },
                ],
              }),
            reverseDamage: () =>
              of({ message: '3 units restored to Fragile Widget.', restored: 24, product_id: 5 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders damage write-offs with units, reason and loss', () => {
    const fixture = TestBed.createComponent(DamagesPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Fragile Widget');
    expect(text).toContain('SKU-005');
    expect(text).toContain('Cracked during unload');
    expect(text).toContain('$24.00');
    expect(text).toContain('Sep 2, 2026');
  });

  it('reports a damage as not damaged, restores stock and removes the entry', () => {
    const fixture = TestBed.createComponent(DamagesPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    const notDamaged = buttons.find((button) => button.textContent?.trim() === 'Not damaged');
    expect(notDamaged).toBeDefined();

    notDamaged?.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Report Fragile Widget not damaged?');

    const restore = Array.from(el.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Restore stock'
    );
    expect(restore).toBeDefined();

    restore?.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('3 units restored to Fragile Widget.');
    expect(el.textContent).not.toContain('Cracked during unload');
  });
});