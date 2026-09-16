import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import LoginPage from './login.page';

interface LoginPageInternals {
  form: { getRawValue(): { email: string; password: string } };
}

describe('LoginPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('pre-fills the demo credentials so the demo is one click away', () => {
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance as unknown as LoginPageInternals;

    expect(component.form.getRawValue()).toEqual({
      email: 'demo@shenodev.tech',
      password: 'password',
    });
  });
});
