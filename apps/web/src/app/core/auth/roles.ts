export const ALL_ROLES = ['admin', 'manager', 'operator', 'viewer'] as const;

export const FINANCIAL_ROLES = ['admin', 'manager'] as const;

export function canViewFinancials(role?: string): boolean {
  return FINANCIAL_ROLES.includes((role ?? '').toLowerCase() as (typeof FINANCIAL_ROLES)[number]);
}