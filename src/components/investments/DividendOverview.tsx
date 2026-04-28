import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioSummary } from '@/types/investment';

interface DividendOverviewProps {
  portfolioSummary: PortfolioSummary | null;
}

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('cs-CZ') : '—';

export const DividendOverview = ({ portfolioSummary }: DividendOverviewProps) => {
  if (!portfolioSummary) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Zatím nejsou k dispozici žádná dividendová data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dividendový kalendář</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {portfolioSummary.dividendCalendar.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatím nejsou evidované žádné dividendy.</p>
            ) : (
              portfolioSummary.dividendCalendar.map((item) => (
                <div key={`${item.month}-${item.currency}`} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{item.month}</span>
                  <span className="text-sm">{formatCurrency(item.amount, item.currency)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daňový odhad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrency(
                portfolioSummary.dividendTaxEstimate,
                portfolioSummary.reportingCurrency
              )}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Orientační odhad při 15% sazbě nad evidovanými a očekávanými dividendami.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail dividend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolioSummary.dividendDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground">Zatím nejsou k dispozici detailní dividendové záznamy.</p>
          ) : (
            portfolioSummary.dividendDetails.map((dividend) => (
              <div key={dividend.id} className="rounded-lg border border-border/70 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{dividend.ticker} · {dividend.asset_name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Ex-dividend date: {formatDate(dividend.ex_dividend_date)}</span>
                      <span>Dividend pay date: {formatDate(dividend.pay_date)}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-muted-foreground">Evidovaná dividenda</p>
                    <p className="font-semibold">{formatCurrency(dividend.amount, dividend.currency)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Předpokládaná výše vyplacené dividendy: </span>
                  <span className="font-medium">
                    {formatCurrency(dividend.expected_dividend_amount ?? dividend.amount, dividend.currency)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
