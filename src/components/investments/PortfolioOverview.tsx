import { PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioSummary } from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';
import { useIsMobile } from '@/hooks/use-mobile';

interface PortfolioOverviewProps {
  portfolioSummary: PortfolioSummary | null;
  loading: boolean;
}

const formatCurrency = (value: number, currency: string) => formatCurrencySafe(value, currency);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);

export const PortfolioOverview = ({ portfolioSummary, loading }: PortfolioOverviewProps) => {
  const isMobile = useIsMobile();

  if (loading || !portfolioSummary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Card key={item} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
  } = portfolioSummary;

  const isProfit = (portfolioSummary.profitLoss ?? 0) >= 0;
  const latestDividend = dividendCalendar[dividendCalendar.length - 1];

  const quickStats = [
    {
      label: 'Tržní portfolio',
      value: marketCurrentValue !== null ? formatCurrency(marketCurrentValue, reportingCurrency) : 'Chybí ceny',
      hint: 'Akcie, ETF, crypto',
    },
    {
      label: 'Evidované portfolio',
      value: formatCurrency(trackedCurrentValue, reportingCurrency),
      hint: 'Ručně vedené hodnoty',
    },
    {
      label: 'Úvěrové investice',
      value: formatCurrency(creditCurrentValue, reportingCurrency),
      hint: `${activeCreditInvestmentsCount} aktivních půjček`,
    },
    {
      label: 'Investováno',
      value: formatCurrency(totalInvested, reportingCurrency),
      hint: 'Suma nákupů a vkladů',
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={`grid gap-4 ${isMobile ? '' : 'xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]'}`}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'}`}>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Wallet className="h-3.5 w-3.5" />
                  Hlavní přehled portfolia
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktuální hodnota portfolia</p>
                  <p className={`${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl'} font-bold tracking-tight`}>
                    {currentValue !== null ? formatCurrency(currentValue, reportingCurrency) : 'Chybí ceny'}
                  </p>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Přehled kombinuje tržní portfolio, evidované portfolio a aktivní úvěrové investice.
                  Výkonnost zatím počítáme jen pro transakčně vedené tržní pozice.
                </p>
              </div>

              <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:min-w-[560px]'}`}>
                {quickStats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'sm:grid-cols-4 xl:grid-cols-1'}`}>
          <Card className="border-border/70 bg-card/80">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investováno</p>
                <p className="text-xl font-semibold">{formatCurrency(totalInvested, reportingCurrency)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-xl p-3 ${isProfit ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Výkonnost</p>
                <p className={`text-xl font-semibold ${isProfit ? 'text-success' : 'text-destructive'}`}>
                  {profitLossPercent !== null ? formatPercent(profitLossPercent) : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-warning/10 p-3 text-warning">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Poslední dividenda</p>
                <p className="text-lg font-semibold">
                  {latestDividend ? formatCurrency(latestDividend.amount, latestDividend.currency) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">Odhad daně {formatCurrency(dividendTaxEstimate, reportingCurrency)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Watchlist</p>
                <p className="text-xl font-semibold">{watchlistCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {portfolioHistory && portfolioHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Vývoj portfolia v čase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={isMobile ? 'h-[220px]' : 'h-[300px]'}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString('cs-CZ', { month: 'short', year: '2-digit' })
                    }
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value, reportingCurrency)}
                    className="text-muted-foreground"
                    width={isMobile ? 72 : 100}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                          <p className="text-sm text-muted-foreground">{new Date(label).toLocaleDateString('cs-CZ')}</p>
                          <p className="text-lg font-bold">
                            {formatCurrency(payload[0].value as number, reportingCurrency)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
