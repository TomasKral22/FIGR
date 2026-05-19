import { supabase } from '@/integrations/supabase/client';
import { MarketSnapshot, PortfolioAsset, TickerAnalysisResult } from '@/types/investment';

interface RequestTickerAnalysisParams {
  ticker: string;
  portfolioItem: PortfolioAsset;
  prompt: string;
}

export interface TickerAnalysisResponse {
  result: TickerAnalysisResult;
  marketSnapshot: MarketSnapshot | null;
}

export interface QuoteResponse {
  snapshot: MarketSnapshot;
}

const createFunctionError = (fallback: string, details?: unknown) => {
  if (details && typeof details === 'object' && 'message' in details && typeof details.message === 'string') {
    return new Error(details.message);
  }
  return new Error(fallback);
};

export const requestTickerAnalysis = async (
  params: RequestTickerAnalysisParams
): Promise<TickerAnalysisResponse> => {
  const { data, error } = await supabase.functions.invoke('investment-intelligence', {
    body: {
      mode: 'analysis',
      ...params,
    },
  });

  if (error) {
    throw createFunctionError('Nepodařilo se spojit s AI službou pro investiční analýzu.', error);
  }

  if (!data?.result?.analysis || !data?.result?.ticker) {
    throw new Error('AI služba vrátila prázdnou nebo neplatnou odpověď.');
  }

  return data as TickerAnalysisResponse;
};

export const requestTickerQuote = async (ticker: string): Promise<QuoteResponse> => {
  const { data, error } = await supabase.functions.invoke('investment-intelligence', {
    body: {
      mode: 'quote',
      ticker,
    },
  });

  if (error) {
    throw createFunctionError('Nepodařilo se načíst aktuální cenu z internetu.', error);
  }

  if (!data?.snapshot?.ticker) {
    throw new Error('Služba pro tržní data vrátila neplatnou odpověď.');
  }

  return data as QuoteResponse;
};
