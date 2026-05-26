import { ArrowUpRight, Landmark, PiggyBank, Wallet } from 'lucide-react';
import { BankAccount, WealthSnapshot } from '@/types/finance';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/calculations';
import { InstitutionAvatar } from '@/components/InstitutionAvatar';
import { convertCurrencyValue, ExchangeRateLike, normalizeCurrencyCode } from '@/utils/currency';

interface WealthOverviewProps {
  snapshots: WealthSnapshot[];
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  exchangeRates: ExchangeRateLike[];
}

const AccountGroup = ({
  title,
  accounts,
  kind,
  exchangeRates,
}: {
  title: string;
  accounts: BankAccount[];
  kind: 'bank' | 'broker';
  exchangeRates: ExchangeRateLike[];
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
        <span className="text-xs text-muted-foreground">{accounts.length} uctu</span>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
          Zatim bez uctu v teto skupine.
        </div>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {accounts.map((account) => {
            const accountCurrency = normalizeCurrencyCode(account.currency, 'CZK');
            const convertedToCzk = convertCurrencyValue(
              account.currentBalance,
              accountCurrency,
              'CZK',
              exchangeRates
            );

            return (
              <div
                key={account.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5"
              >
                <InstitutionAvatar
                  institutionId={account.institutionId}
                  fallback={account.name}
                  className="h-9 w-9 rounded-2xl text-[10px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{account.name}</p>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {accountCurrency}
                    </span>
                    {kind === 'bank' && account.isSavings && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        s.u.
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-base font-semibold">
                    {formatCurrency(account.currentBalance, accountCurrency)}
                  </p>
                  {accountCurrency !== 'CZK' ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCurrency(convertedToCzk, 'CZK')}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const WealthOverview = ({
  snapshots,
  bankAccounts,
  brokerAccounts,
  exchangeRates,
}: WealthOverviewProps) => {
  const latest = snapshots[0];
  const previous = snapshots[1];
  const monthDelta = latest && previous ? latest.totalNetWorth - previous.totalNetWorth : 0;
  const monthDeltaLabel =
    monthDelta >= 0 ? 'Rust oproti minulemu snapshotu' : 'Pokles oproti minulemu snapshotu';

  if (!latest) {
    return (
      <div className="panel-card">
        <div className="section-header">
          <p className="text-section">Cisty majetek</p>
          <p className="section-description">
            Pridej ucty a prvni transakce. Jakmile budou data uvnitr, objevi se tady cisty majetek,
            zmena oproti minulemu mesici, likvidita, investovana cast i prehled jednotlivych uctu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4" id="overview-section">
      <Card className="panel-card overflow-hidden bg-card/88">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-caption font-medium text-primary">
              <Wallet className="h-3.5 w-3.5" />
              Celkovy majetek (CZK)
            </div>

            <div className="space-y-1">
              <p className="text-[clamp(2rem,3.6vw,3rem)] font-bold leading-none tracking-[-0.04em]">
                {formatCurrency(latest.totalNetWorth, 'CZK')}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="metric-card !p-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-[12px] p-2.5 ${
                      monthDelta >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    <ArrowUpRight className={`h-4 w-4 ${monthDelta < 0 ? 'rotate-90' : ''}`} />
                  </div>
                  <div>
                    <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Mesicni zmena</p>
                    <p className={`mt-0.5 text-xl font-semibold ${monthDelta >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(monthDelta, 'CZK')}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{monthDeltaLabel}</p>
                  </div>
                </div>
              </div>

              <div className="metric-card !p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-[12px] bg-success/10 p-2.5 text-success">
                    <PiggyBank className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Likvidita</p>
                    <p className="mt-0.5 text-xl font-semibold">{formatCurrency(latest.bankAssets, 'CZK')}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Hotovost a bankovni zustatky po prepocitu do CZK.
                    </p>
                  </div>
                </div>
              </div>

              <div className="metric-card !p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-[12px] bg-primary/10 p-2.5 text-primary">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Investovano</p>
                    <p className="mt-0.5 text-xl font-semibold">{formatCurrency(latest.brokerAssets, 'CZK')}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Brokerske ucty a prostredky v investicni casti po prepocitu do CZK.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-border/70 pt-4 xl:grid-cols-2">
            <AccountGroup title="Bankovni ucty" accounts={bankAccounts} kind="bank" exchangeRates={exchangeRates} />
            <AccountGroup title="Brokerske ucty" accounts={brokerAccounts} kind="broker" exchangeRates={exchangeRates} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
};
