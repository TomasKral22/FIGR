import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "quote" | "analysis";

interface AnalysisRequestBody {
  mode: Mode;
  ticker?: string;
  portfolioItem?: Record<string, unknown>;
  prompt?: string;
}

interface MarketSnapshot {
  ticker: string;
  shortName: string | null;
  currency: string | null;
  exchange: string | null;
  regularMarketPrice: number | null;
  regularMarketChangePercent: number | null;
  marketTime: string | null;
  summary?: Record<string, unknown> | null;
}

const safeNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const safeString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const fetchYahooData = async (ticker: string): Promise<MarketSnapshot> => {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) {
    throw new Error("Ticker symbol je povinny.");
  }

  const quoteUrl =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedTicker)}` +
    "?range=1d&interval=1d";
  const summaryUrl =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(normalizedTicker)}` +
    "?modules=price,summaryDetail,financialData,defaultKeyStatistics,assetProfile";

  const [quoteResponse, summaryResponse] = await Promise.all([
    fetch(quoteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    }),
    fetch(summaryUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
    }),
  ]);

  if (!quoteResponse.ok) {
    throw new Error(`Yahoo Finance nevratilo cenu pro ticker ${normalizedTicker}.`);
  }

  const quoteJson = await quoteResponse.json();
  const chartResult = quoteJson?.chart?.result?.[0];
  const quote = chartResult?.meta;
  if (!quote) {
    throw new Error(`Ticker ${normalizedTicker} nebyl v Yahoo Finance nalezen.`);
  }

  let summary: Record<string, unknown> | null = null;
  if (summaryResponse.ok) {
    const summaryJson = await summaryResponse.json();
    summary = summaryJson?.quoteSummary?.result?.[0] ?? null;
  }

  return {
    ticker: normalizedTicker,
    shortName: safeString(quote.shortName) ?? safeString(quote.longName),
    currency: safeString(quote.currency),
    exchange: safeString(quote.fullExchangeName) ?? safeString(quote.exchangeName),
    regularMarketPrice: safeNumber(quote.regularMarketPrice),
    regularMarketChangePercent: safeNumber(quote.regularMarketChangePercent),
    marketTime:
      typeof quote.regularMarketTime === "number"
        ? new Date(quote.regularMarketTime * 1000).toISOString()
        : null,
    summary,
  };
};

const stringifyContext = (value: unknown) => JSON.stringify(value, null, 2);

const callOpenAI = async (
  prompt: string,
  snapshot: MarketSnapshot,
  portfolioItem?: Record<string, unknown>
) => {
