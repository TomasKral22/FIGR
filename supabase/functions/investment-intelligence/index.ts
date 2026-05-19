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
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Chybi OPENAI_API_KEY pro AI analyzu.");
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Jsi zkuseny investicni analytik. Pis cesky. Nepouzivej smyslena cisla. Pokud data chybi, vyslovne to rekni. Cituj zdroje, pokud jsou v kontextu dostupne.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `${prompt}\n\nYahoo Finance snapshot:\n${stringifyContext(snapshot)}\n\n` +
                `Portfolio context:\n${stringifyContext(portfolioItem ?? null)}`,
            },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI analyza selhala: ${errorText}`);
  }

  const json = await response.json();
  const text = json?.output_text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("OpenAI vratil prazdnou odpoved.");
  }

  return text.trim();
};

const callAnthropic = async (
  prompt: string,
  snapshot: MarketSnapshot,
  portfolioItem?: Record<string, unknown>
) => {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("Chybi ANTHROPIC_API_KEY pro AI analyzu.");
  }

  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-sonnet-latest";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      temperature: 0.2,
      system:
        "Jsi zkuseny investicni analytik. Pis cesky. Nepouzivej smyslena cisla. Pokud data chybi, vyslovne to rekni. Cituj zdroje, pokud jsou v kontextu dostupne.",
      messages: [
        {
          role: "user",
          content:
            `${prompt}\n\nYahoo Finance snapshot:\n${stringifyContext(snapshot)}\n\n` +
            `Portfolio context:\n${stringifyContext(portfolioItem ?? null)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude analyza selhala: ${errorText}`);
  }

  const json = await response.json();
  const text = json?.content
    ?.map((item: { type?: string; text?: string }) => item?.text || "")
    .join("\n")
    .trim();
  if (!text) {
    throw new Error("Claude vratil prazdnou odpoved.");
  }

  return text;
};

const generateAnalysis = async ({
  ticker,
  prompt,
  portfolioItem,
}: {
  ticker: string;
  prompt: string;
  portfolioItem?: Record<string, unknown>;
}) => {
  const snapshot = await fetchYahooData(ticker);
  const provider = (Deno.env.get("AI_PROVIDER") || "openai").toLowerCase();

  let analysis: string;
  if (provider === "anthropic" || provider === "claude") {
    analysis = await callAnthropic(prompt, snapshot, portfolioItem);
  } else {
    analysis = await callOpenAI(prompt, snapshot, portfolioItem);
  }

  return {
    result: {
      ticker: snapshot.ticker,
      generatedAt: new Date().toISOString(),
      analysis,
      provider: "backend",
      promptVersion: "ticker-analysis-v2",
    },
    marketSnapshot: snapshot,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as AnalysisRequestBody;
    const mode = body.mode;
    const ticker = body.ticker?.trim().toUpperCase();

    if (!mode) {
      throw new Error("Chybi rezim pozadavku.");
    }
    if (!ticker) {
      throw new Error("Chybi ticker symbol.");
    }

    if (mode === "quote") {
      const snapshot = await fetchYahooData(ticker);
      return new Response(JSON.stringify({ snapshot }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (mode === "analysis") {
      if (!body.prompt?.trim()) {
        throw new Error("Chybi prompt pro AI analyzu.");
      }

      const payload = await generateAnalysis({
        ticker,
        prompt: body.prompt,
        portfolioItem: body.portfolioItem,
      });

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Neplatny rezim pozadavku.");
  } catch (error: unknown) {
    console.error("investment-intelligence error:", error);
    const message = error instanceof Error ? error.message : "Neznama chyba.";
    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
