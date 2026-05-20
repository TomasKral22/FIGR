import {
  AssetPrice,
  CreditInvestment,
  DividendDetail,
  ExchangeRate,
  InvestmentAsset,
  InvestmentTransaction,
  PortfolioAsset,
  PortfolioSummary,
} from '@/types/investment';

const DEFAULT_REPORTING_CURRENCY = 'CZK';
const UNCATEGORIZED_SECTOR = 'Nezařazeno';
const estimateDividendTax = (amount: number) => amount * 0.15;

const getExchangeRate = (
  exchangeRates: ExchangeRate[],
  fromCurrency: string,
  toCurrency: string,
  date?: string
) => {
  if (fromCurrency === toCurrency) return 1;

  const relevantRates = exchangeRates.filter(
    (rate) => rate.from_currency === fromCurrency && rate.to_currency === toCurrency
  );

  if (date) {
    const matchingRate = relevantRates.find((rate) => rate.rate_date <= date);
    if (matchingRate) return matchingRate.rate;
  }

  return relevantRates[0]?.rate ?? 1;
};

const getLatestPrice = (prices: AssetPrice[], assetId: string) => {
  const assetPrices = prices.filter((price) => price.asset_id === assetId);
  if (!assetPrices.length) return null;

  return {
    price: assetPrices[0].price,
    currency: assetPrices[0].currency,
  };
};

export const calculatePortfolioSummary = ({
  assets,
  transactions,
  prices,
  exchangeRates,
  reportingCurrency = DEFAULT_REPORTING_CURRENCY,
  creditInvestments = [],
}: {
  assets: InvestmentAsset[];
  transactions: InvestmentTransaction[];
  prices: AssetPrice[];
  exchangeRates: ExchangeRate[];
  creditInvestments?: CreditInvestment[];
  reportingCurrency?: string;
}): PortfolioSummary => {
  const orderedTransactions = [...transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date)
  );
  const orderedPrices = [...prices].sort((a, b) => b.price_date.localeCompare(a.price_date));
  const orderedRates = [...exchangeRates].sort((a, b) => b.rate_date.localeCompare(a.rate_date));

  const portfolioAssets: PortfolioAsset[] = [];
  const assetsByType: PortfolioSummary['assetsByType'] = {};
  const assetsByProvider: PortfolioSummary['assetsByProvider'] = {};
  const assetsByCurrency: PortfolioSummary['assetsByCurrency'] = {};
  const assetsBySector: PortfolioSummary['assetsBySector'] = {};
  const dividendCalendarMap = new Map<string, { month: string; amount: number; currency: string }>();
  const dividendDetails: DividendDetail[] = [];
  let dividendTaxEstimate = 0;

  for (const transaction of orderedTransactions.filter((item) => item.transaction_type === 'dividend')) {
    const asset = assets.find((item) => item.id === transaction.asset_id);
    const effectiveAmount = transaction.expected_dividend_amount ?? transaction.total_value;
    const key = `${transaction.transaction_date.slice(0, 7)}-${transaction.currency}`;
    const existing = dividendCalendarMap.get(key);
    if (existing) {
      existing.amount += effectiveAmount;
    } else {
      dividendCalendarMap.set(key, {
        month: transaction.transaction_date.slice(0, 7),
        amount: effectiveAmount,
        currency: transaction.currency,
      });
    }
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

  for (const asset of assets) {
    const assetTransactions = orderedTransactions.filter(
      (transaction) => transaction.asset_id === asset.id && transaction.transaction_type !== 'dividend'
    );

    let quantity = 0;
    let totalCost = 0;
    let totalInvestedInReportingCurrency = 0;

    for (const transaction of assetTransactions) {
      const rate = getExchangeRate(
        orderedRates,
        transaction.currency,
        reportingCurrency,
        transaction.transaction_date
      );
      const valueInReportingCurrency = transaction.total_value * rate;

      if (transaction.transaction_type === 'buy') {
        quantity += transaction.quantity;
        totalCost += transaction.total_value;
        totalInvestedInReportingCurrency += valueInReportingCurrency;
      } else if (transaction.transaction_type === 'sell') {
        const avgCost = quantity > 0 ? totalCost / quantity : 0;
        const avgCostInReporting = quantity > 0 ? totalInvestedInReportingCurrency / quantity : 0;
        quantity -= transaction.quantity;
        totalCost -= avgCost * transaction.quantity;
        totalInvestedInReportingCurrency -= avgCostInReporting * transaction.quantity;
      }
    }

    if (quantity <= 0) continue;

    const totalInvested = totalCost;
    const avgBuyPrice = totalInvested / quantity;
    const latestPrice = getLatestPrice(orderedPrices, asset.id);

    let currentPrice: number | null = null;
    let currentValue: number | null = null;
    let profitLoss: number | null = null;
    let profitLossPercent: number | null = null;
    let currentPriceInReportingCurrency: number | null = null;
    let currentValueInReportingCurrency: number | null = null;
    let profitLossInReportingCurrency: number | null = null;

    if (latestPrice) {
      currentPrice = latestPrice.price;
      currentValue = currentPrice * quantity;
      profitLoss = currentValue - totalInvested;
      profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

      const rate = getExchangeRate(orderedRates, latestPrice.currency, reportingCurrency);
      currentPriceInReportingCurrency = currentPrice * rate;
      currentValueInReportingCurrency = currentValue * rate;
      profitLossInReportingCurrency = currentValueInReportingCurrency - totalInvestedInReportingCurrency;
    }

    const portfolioAsset: PortfolioAsset = {
      id: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      asset_type: asset.asset_type,
      provider: asset.provider,
      sector: asset.sector,
      currency: asset.currency,
      quantity,
      avgBuyPrice,
      totalInvested,
      currentPrice,
      currentValue,
      profitLoss,
      profitLossPercent,
      currentPriceInReportingCurrency,
      currentValueInReportingCurrency,
      totalInvestedInReportingCurrency,
      profitLossInReportingCurrency,
    };

    portfolioAssets.push(portfolioAsset);

    if (!assetsByType[asset.asset_type]) {
      assetsByType[asset.asset_type] = { invested: 0, value: 0 };
    }
    assetsByType[asset.asset_type].invested += totalInvestedInReportingCurrency;
    if (currentValueInReportingCurrency !== null) {
      assetsByType[asset.asset_type].value =
        (assetsByType[asset.asset_type].value ?? 0) + currentValueInReportingCurrency;
    }

    if (!assetsByProvider[asset.provider]) {
      assetsByProvider[asset.provider] = { invested: 0, value: 0 };
    }
    assetsByProvider[asset.provider].invested += totalInvestedInReportingCurrency;
    if (currentValueInReportingCurrency !== null) {
      assetsByProvider[asset.provider].value =
        (assetsByProvider[asset.provider].value ?? 0) + currentValueInReportingCurrency;
    }

    if (!assetsByCurrency[asset.currency]) {
      assetsByCurrency[asset.currency] = { invested: 0, value: 0 };
    }
    assetsByCurrency[asset.currency].invested += totalInvestedInReportingCurrency;
    if (currentValueInReportingCurrency !== null) {
      assetsByCurrency[asset.currency].value =
        (assetsByCurrency[asset.currency].value ?? 0) + currentValueInReportingCurrency;
    }

    const sector = asset.sector || UNCATEGORIZED_SECTOR;
    if (!assetsBySector[sector]) {
      assetsBySector[sector] = { invested: 0, value: 0 };
    }
    assetsBySector[sector].invested += totalInvestedInReportingCurrency;
    if (currentValueInReportingCurrency !== null) {
      assetsBySector[sector].value =
        (assetsBySector[sector].value ?? 0) + currentValueInReportingCurrency;
    }
  }

  const totalInvested = portfolioAssets.reduce(
    (sum, asset) => sum + asset.totalInvestedInReportingCurrency,
    0
  );
  const creditCurrentValue = creditInvestments
    .filter((investment) => investment.status !== 'repaid')
    .reduce((sum, investment) => {
      const rate = getExchangeRate(orderedRates, investment.currency, reportingCurrency);
      return sum + investment.current_value * rate;
    }, 0);
  const activeCreditInvestmentsCount = creditInvestments.filter(
    (investment) => investment.status !== 'repaid'
  ).length;
  const pricedAssets = portfolioAssets.filter(
    (asset) => asset.currentValueInReportingCurrency !== null
  );
  const marketCurrentValue =
    pricedAssets.length > 0
      ? pricedAssets.reduce((sum, asset) => sum + (asset.currentValueInReportingCurrency ?? 0), 0)
      : null;
  const currentValue =
    marketCurrentValue !== null || creditCurrentValue > 0
      ? (marketCurrentValue ?? 0) + creditCurrentValue
      : null;
  const investedForPricedAssets =
    pricedAssets.length > 0
      ? pricedAssets.reduce((sum, asset) => sum + asset.totalInvestedInReportingCurrency, 0)
      : 0;
  const profitLoss =
    marketCurrentValue !== null ? marketCurrentValue - investedForPricedAssets : null;
  const profitLossPercent =
    profitLoss !== null && investedForPricedAssets > 0
      ? (profitLoss / investedForPricedAssets) * 100
      : null;

  const portfolioHistoryMap: Record<string, number> = {};
  let runningValue = 0;

  for (const transaction of orderedTransactions) {
    const rate = getExchangeRate(
      orderedRates,
      transaction.currency,
      reportingCurrency,
      transaction.transaction_date
    );
    const valueInReporting = transaction.total_value * rate;

    if (transaction.transaction_type === 'buy') {
      runningValue += valueInReporting;
    } else {
      runningValue -= valueInReporting;
    }

    portfolioHistoryMap[transaction.transaction_date] = runningValue;
  }

  const portfolioHistory = Object.entries(portfolioHistoryMap).map(([date, value]) => ({
    date,
    value,
  }));
  const dividendCalendar = Array.from(dividendCalendarMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );
  const orderedDividendDetails = dividendDetails.sort((a, b) => {
    const left = a.pay_date || a.transaction_date;
    const right = b.pay_date || b.transaction_date;
    return left.localeCompare(right);
  });

  return {
    totalInvested,
    currentValue,
    profitLoss,
    profitLossPercent,
    reportingCurrency,
    marketCurrentValue,
    creditCurrentValue,
    activeCreditInvestmentsCount,
    assets: portfolioAssets,
    assetsByType,
    assetsByProvider,
    assetsByCurrency,
    assetsBySector,
    portfolioHistory,
    dividendCalendar,
    dividendDetails: orderedDividendDetails,
    dividendTaxEstimate,
  };
};
