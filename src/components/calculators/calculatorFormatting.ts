export const money = (value: number, currency = 'CZK') => Number.isFinite(value)
  ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency, maximumFractionDigits: currency === 'CZK' ? 0 : 2 }).format(value)
  : '—';

export const number = (value: number, digits = 1) => new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: digits }).format(value);
export const compact = (value: number) => new Intl.NumberFormat('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export const parseNumber = (raw: string) => raw.trim() ? Number(raw.replace(/\s/g, '').replace(',', '.')) : NaN;
