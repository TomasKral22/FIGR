import { AlertTriangle, CheckCircle2, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioSummary } from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';
import { useIsMobile } from '@/hooks/use-mobile';

interface PortfolioOverviewProps {
  portfolioSummary: PortfolioSummary | null;
  loading: boolean;
}

const formatCurrency = (value: number, currency: string) => formatCurrencySafe(value, currency);
const formatPercent = (value: number) => new Intl.NumberFormat('cs-CZ', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 100);

export const PortfolioOverview = ({ portfolioSummary, loading }: PortfolioOverviewProps) => {
  const isMobile = useIsMobile();
  if (loading || !portfolioSummary) {
    return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">{[1, 2, 3, 4, 5, 6].map((item) => <Card key={item} className="animate-pulse"><CardHeader className="pb-2"><div className="h-4 w-24 rounded bg-muted" /></CardHeader><CardContent><div className="h-8 w-32 rounded bg-muted" /></CardContent></Card>)}</div>;
  }

  const {
    totalInvested,
    currentValue,
    marketCurrentValue,
    trackedCurrentValue,
    creditCurrentValue,
    activeCreditInvestmentsCount,
    watchlistCount,
    profitLossPercent,
    reportingCurrency,
    portfolioHistory,
    dividendCalendar,
    dividendTaxEstimate,
    excludedValue,
    performance,
    dataQuality,
  } = portfolioSummary;
  const isProfit = (performance.totalReturn ?? portfolioSummary.profitLoss ?? 0) >= 0;
  // A dividend remains part of history after the final position is sold, but it
  // should not make the current-portfolio overview look populated.
  const latestDividend = currentValue !== null ? dividendCalendar[dividendCalendar.length - 1] : undefined;
  const quickStats = [
    {
      label: 'Tržní portfolio',
      value: marketCurrentValue !== null ? formatCurrency(marketCurrentValue, reportingCurrency) : 'Chybí ocenění',
      hint: dataQuality.fallbackPrices > 0
        ? `Akcie, ETF, krypto · ${dataQuality.fallbackPrices}× náhradní cena`
        : 'Akcie, ETF, krypto',
    },
    { label: 'Evidované portfolio', value: formatCurrency(trackedCurrentValue, reportingCurrency), hint: 'Ručně vedené hodnoty' },
    { label: 'Úvěrové investice', value: formatCurrency(creditCurrentValue, reportingCurrency), hint: `${activeCreditInvestmentsCount} aktivních půjček` },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`grid gap-4 ${isMobile ? '' : 'xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]'}`}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className={isMobile ? 'p-4' : 'p-6'}>
            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'}`}>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Wallet className="h-3.5 w-3.5" />Celkový investiční majetek</div>
                <div><p className="text-sm text-muted-foreground">Aktuální hodnota</p><p className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold tracking-tight`}>{currentValue !== null ? formatCurrency(currentValue, reportingCurrency) : 'Chybí ocenění'}</p>{excludedValue > 0 ? <p className="mt-1 text-xs text-muted-foreground">Mimo vlastní majetek: {formatCurrency(excludedValue, reportingCurrency)}</p> : null}</div>
                <p className="max-w-2xl text-sm text-muted-foreground">Součet pozic a agregovaných snapshotů z brokerů, Investownu, Edwarda a dalších zdrojů. Neúplná data se nevydávají za přesnou výkonnost.</p>
              </div>
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:min-w-[560px]'}`}>{quickStats.map((stat) => <div key={stat.label} className="rounded-xl border border-border/70 bg-background/70 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p><p className="mt-2 text-lg font-semibold">{stat.value}</p><p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p></div>)}</div>
            </div>
          </CardContent>
        </Card>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'sm:grid-cols-4 xl:grid-cols-1'}`}>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary"><PiggyBank className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Investováno</p><p className="text-xl font-semibold">{totalInvested > 0 ? formatCurrency(totalInvested, reportingCurrency) : '—'}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className={`rounded-xl p-3 ${isProfit ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}</div><div><p className="text-sm text-muted-foreground">Výkonnost</p><p className={`text-xl font-semibold ${isProfit ? 'text-success' : 'text-destructive'}`}>{performance.totalReturnPercent !== null ? formatPercent(performance.totalReturnPercent) : profitLossPercent !== null ? formatPercent(profitLossPercent) : '—'}</p><p className="text-xs text-muted-foreground">{performance.totalReturnPercent !== null ? 'Celé portfolio' : 'Jen známé pozice'}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-warning/10 p-3 text-warning"><Wallet className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Poslední dividenda</p><p className="text-lg font-semibold">{latestDividend ? formatCurrency(latestDividend.amount, latestDividend.currency) : '—'}</p><p className="text-xs text-muted-foreground">{latestDividend ? `Odhad daně ${formatCurrency(dividendTaxEstimate, reportingCurrency)}` : 'Žádné aktivní portfolio'}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Wallet className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Watchlist</p><p className="text-xl font-semibold">{watchlistCount}</p></div></CardContent></Card>
        </div>
      </div>

      <Card className={dataQuality.status === 'complete' ? 'border-success/30' : 'border-warning/30'}><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base">{dataQuality.status === 'complete' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}Kvalita dat {dataQuality.score} %</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${dataQuality.status === 'complete' ? 'bg-success' : dataQuality.status === 'partial' ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${dataQuality.score}%` }} /></div>{dataQuality.messages.length > 0 ? dataQuality.messages.map((message) => <p key={message} className="text-muted-foreground">• {message}</p>) : <p className="text-success">Všechny započtené hodnoty mají potřebná data.</p>}<div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground"><span>Chybí ceny: {dataQuality.missingPrices}</span><span>Náhradní ceny: {dataQuality.fallbackPrices}</span><span>Chybí kurzy: {dataQuality.missingExchangeRates}</span><span>Staré zdroje: {dataQuality.staleSources}</span><span>Vyloučeno: {dataQuality.excludedValueCount}</span></div></CardContent></Card>

      {portfolioHistory.length > 1 ? <Card><CardHeader><CardTitle>Vývoj investičního majetku v čase</CardTitle></CardHeader><CardContent><div className={isMobile ? 'h-[220px]' : 'h-[300px]'}><ResponsiveContainer width="100%" height="100%"><LineChart data={portfolioHistory}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' })} className="text-muted-foreground" /><YAxis tickFormatter={(value) => formatCurrency(value, reportingCurrency)} className="text-muted-foreground" width={isMobile ? 72 : 100} /><Tooltip content={({ active, payload, label }) => !active || !payload?.length ? null : <div className="rounded-lg border border-border bg-popover p-3 shadow-lg"><p className="text-sm text-muted-foreground">{new Date(label).toLocaleDateString('cs-CZ')}</p><p className="text-lg font-bold">{formatCurrency(payload[0].value as number, reportingCurrency)}</p></div>} /><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} /></LineChart></ResponsiveContainer></div></CardContent></Card> : null}
    </div>
  );
};
