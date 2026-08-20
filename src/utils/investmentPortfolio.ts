import {
  AssetPrice,
  CreditInvestment,
  DividendDetail,
  ExchangeRate,
  InvestmentAsset,
  InvestmentSourceAccount,
  InvestmentTransaction,
  InvestmentValueSnapshot,
  PortfolioAsset,
  PortfolioSummary,
  TrackedInvestment,
} from '@/types/investment';

const DEFAULT_REPORTING_CURRENCY = 'CZK';
const UNCATEGORIZED_SECTOR = 'Nezařazeno';
const STALE_SOURCE_DAYS = 45;
const estimateDividendTax = (amount: number) => amount * 0.15;

const latestOnOrBefore = <T,>(items: T[], date: string, getDate: (item: T) => string) =>
  items
    .filter((item) => getDate(item) <= date)
    .sort((a, b) => getDate(b).localeCompare(getDate(a)))[0] ?? null;

const getExchangeRate = (
  exchangeRates: ExchangeRate[],
  fromCurrency: string,
  toCurrency: string,
  date?: string
): number | null => {
  if (fromCurrency === toCurrency) return 1;
  const direct = exchangeRates.filter((rate) => rate.from_currency === fromCurrency && rate.to_currency === toCurrency);
  const inverse = exchangeRates.filter((rate) => rate.from_currency === toCurrency && rate.to_currency === fromCurrency);
  const directRate = date ? latestOnOrBefore(direct, date, (rate) => rate.rate_date) : direct[0] ?? null;
  if (directRate?.rate) return directRate.rate;
  const inverseRate = date ? latestOnOrBefore(inverse, date, (rate) => rate.rate_date) : inverse[0] ?? null;
  return inverseRate?.rate ? 1 / inverseRate.rate : null;
};

const getPositionAt = (transactions: InvestmentTransaction[], date: string) => {
  let quantity = 0;
  let cost = 0;
  for (const transaction of transactions
    .filter((item) => item.transaction_date <= date)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))) {
    if (transaction.transaction_type === 'buy') {
      quantity += transaction.quantity;
      cost += transaction.total_value;
    } else if (transaction.transaction_type === 'sell') {
      const averageCost = quantity > 0 ? cost / quantity : 0;
      quantity -= transaction.quantity;
      cost -= averageCost * transaction.quantity;
    }
  }
  return { quantity: Math.max(0, quantity), cost: Math.max(0, cost) };
};

const toReportingCurrency = (
  amount: number,
  currency: string,
  reportingCurrency: string,
  exchangeRates: ExchangeRate[],
  date?: string
) => {
  const rate = getExchangeRate(exchangeRates, currency, reportingCurrency, date);
  return rate === null ? null : amount * rate;
};

const calculateTwr = (
  history: Array<{ date: string; value: number }>,
  transactions: InvestmentTransaction[],
  exchangeRates: ExchangeRate[],
  reportingCurrency: string
) => {
  if (history.length < 2) return null;
  let factor = 1;
  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1];
    const current = history[index];
    const externalFlow = transactions
      .filter(
        (transaction) =>
          transaction.transaction_date > previous.date &&
          transaction.transaction_date <= current.date &&
          (transaction.transaction_type === 'deposit' || transaction.transaction_type === 'withdrawal')
      )
      .reduce((sum, transaction) => {
        const converted = toReportingCurrency(
          transaction.total_value,
          transaction.currency,
          reportingCurrency,
          exchangeRates,
          transaction.transaction_date
        );
        if (converted === null) return sum;
        return sum + (transaction.transaction_type === 'deposit' ? converted : -converted);
      }, 0);
    const denominator = previous.value + externalFlow;
    if (denominator <= 0) return null;
    factor *= current.value / denominator;
  }
  const result = (factor - 1) * 100;
  return Number.isFinite(result) ? result : null;
};

export const calculatePortfolioSummary = ({
  assets,
  transactions,
  prices,
  exchangeRates,
  creditInvestments = [],
  trackedInvestments = [],
  sourceAccounts = [],
  valueSnapshots = [],
  reportingCurrency = DEFAULT_REPORTING_CURRENCY,
}: {
  assets: InvestmentAsset[];
  transactions: InvestmentTransaction[];
  prices: AssetPrice[];
  exchangeRates: ExchangeRate[];
  creditInvestments?: CreditInvestment[];
  trackedInvestments?: TrackedInvestment[];
  sourceAccounts?: InvestmentSourceAccount[];
  valueSnapshots?: InvestmentValueSnapshot[];
  reportingCurrency?: string;
}): PortfolioSummary => {
  const orderedTransactions = [...transactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  const orderedPrices = [...prices].sort((a, b) => b.price_date.localeCompare(a.price_date));
  const orderedRates = [...exchangeRates].sort((a, b) => b.rate_date.localeCompare(a.rate_date));
  const activeSources = sourceAccounts.filter((source) => source.is_active);
  const snapshotSourceIds = new Set(
    activeSources.filter((source) => source.valuation_mode === 'snapshot').map((source) => source.id)
  );
  const latestSnapshotBySource = new Map<string, InvestmentValueSnapshot>();
  for (const snapshot of [...valueSnapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))) {
    if (!latestSnapshotBySource.has(snapshot.source_account_id)) latestSnapshotBySource.set(snapshot.source_account_id, snapshot);
  }

  const portfolioAssets: PortfolioAsset[] = [];
  const assetsByType: PortfolioSummary['assetsByType'] = {};
  const assetsByProvider: PortfolioSummary['assetsByProvider'] = {};
  const assetsByCurrency: PortfolioSummary['assetsByCurrency'] = {};
  const assetsBySector: PortfolioSummary['assetsBySector'] = {};
  const dividendCalendarMap = new Map<string, { month: string; amount: number; currency: string }>();
  const dividendDetails: DividendDetail[] = [];
  let dividendTaxEstimate = 0;
  let missingPrices = 0;
  let missingExchangeRates = 0;
  let excludedValueCount = 0;

  for (const transaction of orderedTransactions.filter((item) => item.transaction_type === 'dividend')) {
    const asset = assets.find((item) => item.id === transaction.asset_id);
    const effectiveAmount = transaction.expected_dividend_amount ?? transaction.total_value;
    const key = `${transaction.transaction_date.slice(0, 7)}-${transaction.currency}`;
    const existing = dividendCalendarMap.get(key);
    if (existing) existing.amount += effectiveAmount;
    else dividendCalendarMap.set(key, { month: transaction.transaction_date.slice(0, 7), amount: effectiveAmount, currency: transaction.currency });
    dividendTaxEstimate += estimateDividendTax(effectiveAmount);
    dividendDetails.push({
      id: transaction.id,
      asset_id: transaction.asset_id,
      ticker: asset?.ticker || 'N/A',
      asset_name: asset?.name || 'Neznámé aktivum',
      currency: transaction.currency,
      transaction_date: transaction.transaction_date,
      ex_dividend_date: transaction.ex_dividend_date || null,
      pay_date: transaction.pay_date || null,
      amount: transaction.total_value,
      expected_dividend_amount: transaction.expected_dividend_amount ?? null,
    });
  }

  for (const asset of assets.filter((item) => !item.source_account_id || !snapshotSourceIds.has(item.source_account_id))) {
    const assetTransactions = orderedTransactions.filter((transaction) => transaction.asset_id === asset.id);
    const position = getPositionAt(assetTransactions, '9999-12-31');
    if (position.quantity <= 0) continue;
    const latestPrice = orderedPrices.find((price) => price.asset_id === asset.id) ?? null;
    const transactionCurrency = assetTransactions.find((transaction) => transaction.transaction_type === 'buy')?.currency ?? asset.currency;
    const costRate = getExchangeRate(orderedRates, transactionCurrency, reportingCurrency);
    const totalInvestedInReportingCurrency = costRate === null ? null : position.cost * costRate;
    const currentRate = latestPrice ? getExchangeRate(orderedRates, latestPrice.currency, reportingCurrency, latestPrice.price_date) : null;
    if (!latestPrice) missingPrices += 1;
    if (latestPrice && currentRate === null) missingExchangeRates += 1;
    if (totalInvestedInReportingCurrency === null) missingExchangeRates += 1;
    const currentValue = latestPrice ? latestPrice.price * position.quantity : null;
    const currentValueInReportingCurrency = currentValue !== null && currentRate !== null ? currentValue * currentRate : null;
    const investedReporting = totalInvestedInReportingCurrency ?? 0;
    if (currentValueInReportingCurrency === null) excludedValueCount += 1;

    const portfolioAsset: PortfolioAsset = {
      id: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      asset_type: asset.asset_type,
      provider: asset.provider,
      sector: asset.sector,
      currency: asset.currency,
      quantity: position.quantity,
      avgBuyPrice: position.cost / position.quantity,
      totalInvested: position.cost,
      currentPrice: latestPrice?.price ?? null,
      currentValue,
      profitLoss: currentValue === null ? null : currentValue - position.cost,
      profitLossPercent: currentValue === null || position.cost <= 0 ? null : ((currentValue - position.cost) / position.cost) * 100,
      currentPriceInReportingCurrency: latestPrice && currentRate !== null ? latestPrice.price * currentRate : null,
      currentValueInReportingCurrency,
      totalInvestedInReportingCurrency: investedReporting,
      profitLossInReportingCurrency:
        currentValueInReportingCurrency === null || totalInvestedInReportingCurrency === null
          ? null
          : currentValueInReportingCurrency - totalInvestedInReportingCurrency,
    };
    portfolioAssets.push(portfolioAsset);
    const addAllocation = (target: Record<string, { invested: number; value: number | null }>, key: string) => {
      const current = target[key] ?? { invested: 0, value: 0 };
      current.invested += investedReporting;
      if (currentValueInReportingCurrency === null) current.value = null;
      else if (current.value !== null) current.value += currentValueInReportingCurrency;
      target[key] = current;
    };
    addAllocation(assetsByType, asset.asset_type);
    addAllocation(assetsByProvider, asset.provider);
    addAllocation(assetsByCurrency, asset.currency);
    addAllocation(assetsBySector, asset.sector || UNCATEGORIZED_SECTOR);
  }

  const granularMarketValue = portfolioAssets.reduce((sum, asset) => sum + (asset.currentValueInReportingCurrency ?? 0), 0);
  const marketCurrentValue = portfolioAssets.length > 0 ? granularMarketValue : null;
  const granularInvested = portfolioAssets.reduce((sum, asset) => sum + asset.totalInvestedInReportingCurrency, 0);

  let trackedCurrentValue = 0;
  let trackedInvested = 0;
  for (const investment of trackedInvestments.filter(
    (item) => !item.is_watchlist && item.include_in_portfolio && (!item.source_account_id || !snapshotSourceIds.has(item.source_account_id))
  )) {
    const converted = toReportingCurrency(investment.current_value, investment.currency, reportingCurrency, orderedRates);
    if (converted === null) {
      missingExchangeRates += 1;
      excludedValueCount += 1;
    } else trackedCurrentValue += converted;
    if (investment.invested_value != null) trackedInvested += toReportingCurrency(investment.invested_value, investment.currency, reportingCurrency, orderedRates) ?? 0;
  }

  let creditCurrentValue = 0;
  let creditInvested = 0;
  for (const investment of creditInvestments.filter(
    (item) => item.status !== 'repaid' && (!item.source_account_id || !snapshotSourceIds.has(item.source_account_id))
  )) {
    const converted = toReportingCurrency(investment.current_value, investment.currency, reportingCurrency, orderedRates);
    if (converted === null) {
      missingExchangeRates += 1;
      excludedValueCount += 1;
    } else creditCurrentValue += converted;
    if (investment.invested_value != null) creditInvested += toReportingCurrency(investment.invested_value, investment.currency, reportingCurrency, orderedRates) ?? 0;
  }

  let snapshotCurrentValue = 0;
  let snapshotInvested = 0;
  for (const source of activeSources.filter((item) => item.valuation_mode === 'snapshot')) {
    const snapshot = latestSnapshotBySource.get(source.id);
    if (!snapshot) {
      excludedValueCount += 1;
      continue;
    }
    const converted = toReportingCurrency(snapshot.total_value, snapshot.currency, reportingCurrency, orderedRates, snapshot.snapshot_date);
    if (converted === null) {
      missingExchangeRates += 1;
      excludedValueCount += 1;
    } else snapshotCurrentValue += converted;
    if (snapshot.invested_value != null) snapshotInvested += toReportingCurrency(snapshot.invested_value, snapshot.currency, reportingCurrency, orderedRates, snapshot.snapshot_date) ?? 0;
  }

  const totalInvested = granularInvested + trackedInvested + creditInvested + snapshotInvested;
  const currentValue = granularMarketValue + trackedCurrentValue + creditCurrentValue + snapshotCurrentValue;
  const hasPortfolioData =
    assets.length > 0 ||
    transactions.length > 0 ||
    trackedInvestments.length > 0 ||
    creditInvestments.length > 0 ||
    activeSources.length > 0 ||
    valueSnapshots.length > 0;
  const performanceCoverageComplete =
    totalInvested > 0 &&
    trackedInvestments.every((item) => item.is_watchlist || !item.include_in_portfolio || item.invested_value != null) &&
    creditInvestments.every((item) => item.status === 'repaid' || item.invested_value != null) &&
    activeSources.filter((item) => item.valuation_mode === 'snapshot').every((source) => latestSnapshotBySource.get(source.id)?.invested_value != null);
  const totalReturn = performanceCoverageComplete ? currentValue - totalInvested : null;
  const profitLoss = portfolioAssets.length > 0 ? granularMarketValue - granularInvested : null;
  const profitLossPercent = profitLoss !== null && granularInvested > 0 ? (profitLoss / granularInvested) * 100 : null;

  const today = new Date().toISOString().slice(0, 10);
  const historyDates = new Set<string>();
  prices.forEach((price) => historyDates.add(price.price_date));
  valueSnapshots.forEach((snapshot) => historyDates.add(snapshot.snapshot_date));
  if (trackedInvestments.length > 0 || creditInvestments.length > 0) historyDates.add(today);
  const portfolioHistory = [...historyDates]
    .sort()
    .map((date) => {
      let value = 0;
      let hasValue = false;
      for (const asset of assets.filter((item) => !item.source_account_id || !snapshotSourceIds.has(item.source_account_id))) {
        const position = getPositionAt(orderedTransactions.filter((transaction) => transaction.asset_id === asset.id), date);
        const price = latestOnOrBefore(orderedPrices.filter((item) => item.asset_id === asset.id), date, (item) => item.price_date);
        if (!price || position.quantity <= 0) continue;
        const converted = toReportingCurrency(price.price * position.quantity, price.currency, reportingCurrency, orderedRates, date);
        if (converted !== null) {
          value += converted;
          hasValue = true;
        }
      }
      for (const source of activeSources.filter((item) => item.valuation_mode === 'snapshot')) {
        const snapshot = latestOnOrBefore(valueSnapshots.filter((item) => item.source_account_id === source.id), date, (item) => item.snapshot_date);
        if (!snapshot) continue;
        const converted = toReportingCurrency(snapshot.total_value, snapshot.currency, reportingCurrency, orderedRates, date);
        if (converted !== null) {
          value += converted;
          hasValue = true;
        }
      }
      if (date === today) {
        value += trackedCurrentValue + creditCurrentValue;
        hasValue ||= trackedCurrentValue + creditCurrentValue > 0;
      }
      return hasValue ? { date, value } : null;
    })
    .filter((item): item is { date: string; value: number } => item !== null);

  const twr = calculateTwr(portfolioHistory, orderedTransactions, orderedRates, reportingCurrency);
  const now = Date.now();
  const staleSources = activeSources.filter((source) => {
    const lastDate = source.valuation_mode === 'snapshot' ? latestSnapshotBySource.get(source.id)?.snapshot_date : source.last_synced_at?.slice(0, 10);
    if (!lastDate) return true;
    return (now - new Date(`${lastDate}T00:00:00`).getTime()) / 86_400_000 > STALE_SOURCE_DAYS;
  }).length;
  const messages: string[] = [];
  if (missingPrices > 0) messages.push(`${missingPrices} aktiv nemá aktuální cenu.`);
  if (missingExchangeRates > 0) messages.push(`${missingExchangeRates} hodnot nemá použitelný měnový kurz.`);
  if (staleSources > 0) messages.push(`${staleSources} zdrojů nebylo aktualizováno déle než ${STALE_SOURCE_DAYS} dní.`);
  if (!hasPortfolioData) messages.push('Zatím nejsou k dispozici žádná investiční data.');
  else if (!performanceCoverageComplete) messages.push('Celkový výnos není dostupný, dokud všechny započtené zdroje nemají investovanou částku.');
  const score = hasPortfolioData
    ? Math.max(0, 100 - missingPrices * 15 - missingExchangeRates * 15 - staleSources * 10 - excludedValueCount * 10)
    : 0;
  const dataQuality: PortfolioSummary['dataQuality'] = {
    status: score >= 90 ? 'complete' : score >= 50 ? 'partial' : 'insufficient',
    score,
    missingPrices,
    missingExchangeRates,
    staleSources,
    excludedValueCount,
    messages,
  };

  const sourceBreakdown: PortfolioSummary['sourceBreakdown'] = activeSources.map((source) => {
    const snapshot = latestSnapshotBySource.get(source.id);
    let value = 0;
    if (source.valuation_mode === 'snapshot' && snapshot) {
      value = toReportingCurrency(snapshot.total_value, snapshot.currency, reportingCurrency, orderedRates, snapshot.snapshot_date) ?? 0;
    } else {
      value += portfolioAssets
        .filter((asset) => assets.find((item) => item.id === asset.id)?.source_account_id === source.id)
        .reduce((sum, asset) => sum + (asset.currentValueInReportingCurrency ?? 0), 0);
      value += trackedInvestments
        .filter((item) => item.source_account_id === source.id && item.include_in_portfolio && !item.is_watchlist)
        .reduce((sum, item) => sum + (toReportingCurrency(item.current_value, item.currency, reportingCurrency, orderedRates) ?? 0), 0);
      value += creditInvestments
        .filter((item) => item.source_account_id === source.id && item.status !== 'repaid')
        .reduce((sum, item) => sum + (toReportingCurrency(item.current_value, item.currency, reportingCurrency, orderedRates) ?? 0), 0);
    }
    return {
      sourceAccountId: source.id,
      label: source.name,
      provider: source.provider,
      value,
      currency: reportingCurrency,
      lastUpdatedAt: snapshot?.snapshot_date ?? source.last_synced_at,
      valuationMode: source.valuation_mode,
    };
  });
  const assignedValue = sourceBreakdown.reduce((sum, item) => sum + item.value, 0);
  if (currentValue - assignedValue > 0.005) {
    sourceBreakdown.push({
      sourceAccountId: null,
      label: 'Bez přiřazeného účtu',
      provider: 'unassigned',
      value: currentValue - assignedValue,
      currency: reportingCurrency,
      lastUpdatedAt: null,
      valuationMode: 'positions',
    });
  }

  return {
    totalInvested,
    currentValue: currentValue > 0 || portfolioAssets.length > 0 ? currentValue : null,
    profitLoss,
    profitLossPercent,
    reportingCurrency,
    marketCurrentValue,
    trackedCurrentValue,
    creditCurrentValue,
    activeCreditInvestmentsCount: creditInvestments.filter((investment) => investment.status !== 'repaid').length,
    watchlistCount: trackedInvestments.filter((investment) => investment.is_watchlist).length,
    assets: portfolioAssets,
    assetsByType,
    assetsByProvider,
    assetsByCurrency,
    assetsBySector,
    portfolioHistory,
    dividendCalendar: Array.from(dividendCalendarMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    dividendDetails: dividendDetails.sort((a, b) => (a.pay_date || a.transaction_date).localeCompare(b.pay_date || b.transaction_date)),
    dividendTaxEstimate,
    sourceBreakdown,
    performance: {
      totalReturn,
      totalReturnPercent: totalReturn !== null && totalInvested > 0 ? (totalReturn / totalInvested) * 100 : null,
      twr,
      twrStatus: twr === null ? 'insufficient-data' : 'available',
    },
    dataQuality,
  };
};
