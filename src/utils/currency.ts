export const SUPPORTED_CURRENCIES = ['CZK', 'EUR', 'USD', 'GBP', 'CHF'] as const;

export interface ExchangeRateLike {
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_date: string;
}

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

export const getExchangeRateValue = (
  exchangeRates: ExchangeRateLike[],
  fromCurrency?: string | null,
  toCurrency?: string | null,
  date?: string
) => {
  const normalizedFrom = normalizeCurrencyCode(fromCurrency, 'CZK');
  const normalizedTo = normalizeCurrencyCode(toCurrency, 'CZK');

  if (normalizedFrom === normalizedTo) return 1;

  const relevantRates = exchangeRates
    .filter((rate) => rate.from_currency === normalizedFrom && rate.to_currency === normalizedTo)
    .sort((left, right) => right.rate_date.localeCompare(left.rate_date));

  if (date) {
    const matchingRate = relevantRates.find((rate) => rate.rate_date <= date);
    if (matchingRate) return matchingRate.rate;
  }

  return relevantRates[0]?.rate ?? 1;
};

export const convertCurrencyValue = (
  value: number,
  fromCurrency?: string | null,
  toCurrency?: string | null,
  exchangeRates: ExchangeRateLike[] = [],
  date?: string
) => {
  if (!Number.isFinite(value)) return 0;
  const rate = getExchangeRateValue(exchangeRates, fromCurrency, toCurrency, date);
  return value * rate;
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
