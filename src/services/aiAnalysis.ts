import { requestTickerAnalysis, TickerAnalysisResponse } from '@/lib/aiClient';
import { PortfolioAsset } from '@/types/investment';

export const TICKER_ANALYSIS_PROMPT_TEMPLATE = `
Jednej jako akciový analytik. V češtině zpracuj analýzu investičního titulu {TICKER}.

Zaměř se na:
- obchodní model,
- finanční kondici,
- valuaci,
- růstový potenciál,
- rizika,
- dividendy,
- technický pohled,
- vhodnost do portfolia,
- závěrečné shrnutí.

Pracuj pouze s dostupnými daty, která dostaneš v kontextu. Pokud nejsou dostupná aktuální data, výslovně to uveď a negeneruj smyšlená čísla.
`;

const formatNumber = (value: number | null, currency?: string) => {
  if (value === null) return 'neuvedeno';
  return currency
    ? new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 4 }).format(value);
};

export const buildTickerAnalysisPrompt = (ticker: string, portfolioItem: PortfolioAsset) => {
  const intro = TICKER_ANALYSIS_PROMPT_TEMPLATE.replace('{TICKER}', ticker);

  const positionContext = [
    `Ticker: ${portfolioItem.ticker}`,
    `Název: ${portfolioItem.name}`,
    `Typ aktiva: ${portfolioItem.asset_type}`,
    `Poskytovatel: ${portfolioItem.provider}`,
    `Sektor: ${portfolioItem.sector || 'neuvedeno'}`,
    `Měna pozice: ${portfolioItem.currency}`,
    `Držené množství: ${formatNumber(portfolioItem.quantity)}`,
    `Průměrná nákupní cena: ${formatNumber(portfolioItem.avgBuyPrice, portfolioItem.currency)}`,
    `Investováno celkem: ${formatNumber(portfolioItem.totalInvestedInReportingCurrency)}`,
    `Aktuální cena v aplikaci: ${formatNumber(portfolioItem.currentPrice, portfolioItem.currency)}`,
    `Aktuální hodnota v reportovací měně: ${formatNumber(portfolioItem.currentValueInReportingCurrency)}`,
    `Zisk / ztráta v reportovací měně: ${formatNumber(portfolioItem.profitLossInReportingCurrency)}`,
    `Výnos v %: ${
      portfolioItem.profitLossPercent !== null ? `${portfolioItem.profitLossPercent.toFixed(2)} %` : 'neuvedeno'
    }`,
  ];

  return `${intro.trim()}\n\nDostupná data z portfolia:\n${positionContext.map((line) => `- ${line}`).join('\n')}`;
};

export const generateTickerAnalysis = async (
  ticker: string,
  portfolioItem: PortfolioAsset
): Promise<TickerAnalysisResponse> => {
  if (!ticker.trim()) {
    throw new Error('Neplatný ticker symbol.');
  }

  if (!portfolioItem) {
    throw new Error('Chybí data o vybrané pozici.');
  }

  const prompt = buildTickerAnalysisPrompt(ticker, portfolioItem);

  return requestTickerAnalysis({
    ticker,
    portfolioItem,
    prompt,
  });
};
