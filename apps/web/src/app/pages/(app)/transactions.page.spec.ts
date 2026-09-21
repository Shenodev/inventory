import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { FinancialsService } from '../../core/financials/financials.service';
import TransactionsPage from './transactions.page';

describe('TransactionsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: FinancialsService,
          useValue: {
            getTransactions: () =>
              of({
                transactions: [
                  {
                    id: 1,
                    type: 'income',
                    amount: '99.00',
                    reference_type: 'App\\Models\\SalesOrder',
                    reference_id: 12,
                    created_at: '2026-09-01T10:00:00+00:00',
                  },
                  {
                    id: 2,
                    type: 'expense',
                    amount: '24.00',
                    reference_type: 'App\\Models\\Product',
                    reference_id: 5,
                    created_at: '2026-09-02T14:30:00+00:00',
                  },
                ],
              }),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders income and expense rows with amounts, dates and references', () => {
    const fixture = TestBed.createComponent(TransactionsPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Income');
    expect(text).toContain('Expense');
    expect(text).toContain('$99.00');
    expect(text).toContain('$24.00');
    expect(text).toContain('Sales order #12');
    expect(text).toContain('Product #5');
    expect(text).toContain('Sep 1, 2026');
    expect(text).toContain('Sep 2, 2026');
  });
});