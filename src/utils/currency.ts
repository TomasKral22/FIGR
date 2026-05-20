export const normalizeCurrencyCode = (currency?: string | null, fallback = 'CZK') => {
  const normalized = String(currency || '').trim().toUpperCase();

  if (/^[A-Z]{3}$/.test(normalized)) {
    try {
      new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: normalized,
      }).format(0);
      return normalized;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export const formatCurrencySafe = (
  value: number | null | undefined,
  currency?: string | null,
  fallbackCurrency = 'CZK'
) => {
  const numericValue = Number.isFinite(value) ? Number(value) : 0;
  const normalizedCurrency = normalizeCurrencyCode(currency, fallbackCurrency);

  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};
