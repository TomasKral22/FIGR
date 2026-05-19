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
