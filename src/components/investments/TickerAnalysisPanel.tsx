import { AlertTriangle, Bot, ChevronDown, ChevronUp, LoaderCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarketSnapshot, PortfolioAsset, TickerAnalysisResult, TickerAnalysisStatus } from '@/types/investment';

interface TickerAnalysisPanelProps {
  selectedAsset: PortfolioAsset | null;
  status: TickerAnalysisStatus;
  result: TickerAnalysisResult | null;
  error: string | null;
  marketSnapshot: MarketSnapshot | null;
  onGenerate: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const formatGeneratedAt = (value: string) =>
  new Date(value).toLocaleString('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export const TickerAnalysisPanel = ({
  selectedAsset,
  status,
  result,
  error,
  marketSnapshot,
  onGenerate,
  collapsed = false,
  onToggleCollapsed,
}: TickerAnalysisPanelProps) => {
  const isDisabled = !selectedAsset || status === 'loading';

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              AI analýza titulu
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vyber jeden ticker z portfolia a vygeneruj analytický komentář nad dostupnými daty.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onToggleCollapsed ? (
              <Button type="button" variant="ghost" size="icon" onClick={onToggleCollapsed} aria-label="Přepnout panel analýzy">
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            ) : null}
            <Button type="button" onClick={onGenerate} disabled={isDisabled}>
              {status === 'loading' ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Vygenerovat analýzu
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/50 p-3">
          {selectedAsset ? (
            <div className="space-y-1">
              <p className="font-medium">
                Vybraný titul: {selectedAsset.ticker} · {selectedAsset.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Typ: {selectedAsset.asset_type} · Poskytovatel: {selectedAsset.provider} · Sektor:{' '}
                {selectedAsset.sector || 'neuvedeno'}
              </p>
              {marketSnapshot?.regularMarketPrice !== null ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Aktuální online cena:{' '}
                  {marketSnapshot.regularMarketPrice?.toLocaleString('cs-CZ', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {marketSnapshot.currency || selectedAsset.currency}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nejdřív vyber jeden titul v seznamu portfolia. Tlačítko analýzy se aktivuje až po výběru.
            </p>
          )}
        </div>
      </CardHeader>

      {collapsed ? null : (
        <CardContent>
          {status === 'loading' ? (
            <div className="rounded-xl border border-border/70 bg-background/50 p-4">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                <span>Generuji analýzu…</span>
              </div>
            </div>
          ) : null}

          {status === 'error' && error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Nepodařilo se vygenerovat analýzu
              </div>
              <p className="mt-2">{error}</p>
            </div>
          ) : null}

          {status === 'success' && result ? (
            <div className="space-y-3 rounded-xl border border-border/70 bg-background/50 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-medium">{result.ticker}</span>
                <span className="text-muted-foreground">Vygenerováno: {formatGeneratedAt(result.generatedAt)}</span>
                <span className="text-muted-foreground">
                  Zdroj: {result.provider === 'backend' ? 'server-side AI' : 'mock režim'}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{result.analysis}</div>
            </div>
          ) : null}

          {status === 'idle' ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
              Výsledek analýzy se zobrazí zde. Pokud externí data nebudou dostupná, analýza to výslovně
              uvede a nebude si vymýšlet čísla.
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
};
