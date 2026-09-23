import { HttpErrorResponse } from '@angular/common/http';

export const PERMISSION_DENIED_MESSAGE =
  "You don't have permission to do that — this action requires the admin or manager role.";

/** Maps common API statuses to human-readable copy; otherwise falls back. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 403) {
      return PERMISSION_DENIED_MESSAGE;
    }

    if (error.status === 401) {
      return 'Your session expired. Please sign in again.';
    }

    if (error.status === 0) {
      return 'Cannot reach the server. Please try again.';
    }
  }

  return fallback;
}