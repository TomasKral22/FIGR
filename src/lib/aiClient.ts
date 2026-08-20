import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { MarketSnapshot } from '@/types/investment';

export interface QuoteResponse {
  snapshot: MarketSnapshot;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const createFunctionError = (fallback: string, details?: unknown) => {
  if (details && typeof details === 'object' && 'message' in details && typeof details.message === 'string') {
    return new Error(details.message);
  }
  return new Error(fallback);
};

const invokeInvestmentIntelligence = async <T>(
  body: Record<string, unknown>,
  fallback: string
): Promise<T> => {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase není v aplikaci nakonfigurovaný.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token || SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/investment-intelligence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { message: rawText };
    }
  }

  if (!response.ok) {
    throw createFunctionError(fallback, payload);
  }

  return payload as T;
};

export const requestTickerQuote = async (ticker: string): Promise<QuoteResponse> => {
  const data = await invokeInvestmentIntelligence<QuoteResponse>(
    {
      mode: 'quote',
      ticker,
    },
    'Nepodařilo se načíst aktuální cenu z internetu.'
  );

  if (!data?.snapshot?.ticker) {
    throw new Error('Služba pro tržní data vrátila neplatnou odpověď.');
  }

  return data;
};
