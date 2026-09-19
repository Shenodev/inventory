import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';

import { authInterceptor } from './core/auth/auth.interceptor';
import { apiCacheInterceptor } from './core/http/api-cache.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(),
    provideHttpClient(
      withInterceptors([apiCacheInterceptor, authInterceptor, requestContextInterceptor])
    ),
    provideClientHydration(withEventReplay()),
  ],
};
