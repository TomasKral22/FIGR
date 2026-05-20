import {
  AssetPrice,
  CreditInvestment,
  CreditInvestmentRepayment,
  ExchangeRate,
  InvestmentAsset,
  InvestmentTransaction,
  InvestmentValidationIssue,
  TrackedInvestment,
} from '@/types/investment';

const daysBetween = (fromIso: string, toIso: string) => {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
};

export const buildInvestmentValidationIssues = ({
  assets,
  transactions,
  prices,
  exchangeRates,
  reportingCurrency,
  creditInvestments,
  creditRepayments,
  trackedInvestments,
  latestFinanceMonth,
  closedFinanceMonths,
  todayIso,
}: {
  assets: InvestmentAsset[];
  transactions: InvestmentTransaction[];
  prices: AssetPrice[];
  exchangeRates: ExchangeRate[];
  reportingCurrency: string;
  creditInvestments: CreditInvestment[];
  creditRepayments: CreditInvestmentRepayment[];
  trackedInvestments: TrackedInvestment[];
  latestFinanceMonth: string | null;
  closedFinanceMonths: string[];
  todayIso: string;
}): InvestmentValidationIssue[] => {
  const issues: InvestmentValidationIssue[] = [];

  const latestPriceByAsset = new Map<string, AssetPrice>();
  for (const price of [...prices].sort((a, b) => b.price_date.localeCompare(a.price_date))) {
    if (!latestPriceByAsset.has(price.asset_id)) {
      latestPriceByAsset.set(price.asset_id, price);
    }
  }

  for (const asset of assets) {
    const assetTransactions = transactions.filter((transaction) => transaction.asset_id === asset.id);
    if (assetTransactions.length === 0) {
      issues.push({
        id: `empty-${asset.id}`,
        severity: 'warning',
        code: 'empty-asset',
        title: `Aktivum ${asset.ticker} nema transakce`,
        detail: 'Aktivum je zalozene, ale nema zadny nakup, prodej ani dividendu.',
      });
    }

    const latestPrice = latestPriceByAsset.get(asset.id);
    if (!latestPrice) {
      issues.push({
        id: `missing-price-${asset.id}`,
        severity: 'warning',
        code: 'missing-price',
        title: `Chybi cena pro ${asset.ticker}`,
        detail: 'Bez aktualni ceny nepujde spravne spocitat hodnota a vykonnost.',
      });
      continue;
    }

    const staleDays = daysBetween(latestPrice.price_date, todayIso);
    if (staleDays > 7) {
      issues.push({
        id: `stale-price-${asset.id}`,
        severity: staleDays > 30 ? 'error' : 'warning',
        code: 'stale-price',
        title: `Cena pro ${asset.ticker} je zastarala`,
        detail: `Posledni cena je stara ${staleDays} dni.`,
      });
    }

    if (latestPrice.currency !== reportingCurrency) {
      const hasRate = exchangeRates.some(
        (rate) => rate.from_currency === latestPrice.currency && rate.to_currency === reportingCurrency
      );
      if (!hasRate) {
        issues.push({
          id: `missing-rate-${asset.id}`,
          severity: 'warning',
          code: 'missing-rate',
          title: `Chybi kurz ${latestPrice.currency}/${reportingCurrency}`,
          detail: `Pro ${asset.ticker} chybi smenny kurz do reportovaci meny.`,
        });
      }
    }
  }

  for (const transaction of transactions) {
    const assetExists = assets.some((asset) => asset.id === transaction.asset_id);
    if (!assetExists) {
      issues.push({
        id: `orphan-${transaction.id}`,
        severity: 'error',
        code: 'orphan-transaction',
        title: 'Transakce odkazuje na chybejici aktivum',
        detail: `Transakce z ${transaction.transaction_date} nema navazane aktivum.`,
      });
    }
  }

  for (const tracked of trackedInvestments) {
    if (!tracked.is_watchlist && tracked.include_in_portfolio && tracked.current_value <= 0) {
      issues.push({
        id: `tracked-${tracked.id}`,
        severity: 'warning',
        code: 'tracked-value',
        title: `Evidovana pozice ${tracked.ticker} nema hodnotu`,
        detail: 'Evidovane portfolio obsahuje polozku s nulovou nebo zapornou hodnotou.',
      });
    }
  }

  for (const investment of creditInvestments) {
    if (investment.status !== 'repaying') continue;
    const repayments = creditRepayments.filter((repayment) => repayment.credit_investment_id === investment.id);
    if (repayments.length === 0) {
      issues.push({
        id: `credit-${investment.id}`,
        severity: 'info',
        code: 'credit-without-repayment',
        title: `Pujcka ${investment.name} nema zadne splatky`,
        detail: 'Aktivni uverova investice zatim nema evidovanou historii splatek.',
      });
    }
  }

  if (latestFinanceMonth && !closedFinanceMonths.includes(latestFinanceMonth)) {
    issues.push({
      id: `finance-open-${latestFinanceMonth}`,
      severity: 'warning',
      code: 'open-finance-month',
      title: `Mesic ${latestFinanceMonth} ve financich neni uzavreny`,
      detail: 'Audit upozornuje, ze posledni mesic financni agendy jeste neni uzavren jako zkontrolovany.',
    });
  }

  return issues;
};
