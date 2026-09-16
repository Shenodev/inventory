const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const numberFormatter = new Intl.NumberFormat('en-US');

export const formatCurrency = (value: string | number): string =>
  currencyFormatter.format(Number(value));

export const formatNumber = (value: string | number): string =>
  numberFormatter.format(Number(value));

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

export const formatDate = (value: string | null): string =>
  value === null ? '—' : dateTimeFormatter.format(new Date(value));
