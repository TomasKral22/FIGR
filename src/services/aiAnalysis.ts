import { requestTickerAnalysis, TickerAnalysisResponse } from '@/lib/aiClient';
import { PortfolioAsset } from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';

export const TICKER_ANALYSIS_PROMPT_TEMPLATE = `
Jednej jako akciovy analytik (CFA). V cestine zpracuj aktualni analyzu spolecnosti {TICKER} s overenymi cisly a citacemi zdroju.

POKYNY K PRACI A ZDROJUM
- Pracuj pouze s daty, ktera dostanes v kontextu a z dostupnych zdroju.
- Pokud nektera pozadovana data nemas, vyslovne to napis a negeneruj smyslena cisla.
- U klicovych tvrzeni a metrik pridej citace v hranatych odkazech [1], [2] a na konec sekci "Pouzite zdroje".
- Mena: USD, pokud neni v datech uvedeno jinak. U kazde metriky uved obdobi, pokud je zname.

STRUKTURA VYSTUPU
1. Investicni teze (3-5 vet)
2. Profil a segmenty trzeb
3. Aktualni vysledky
4. Srovnani s konkurenty (peer group)
5. DCF valuace
6. Porovnani aktualni ceny vs. ferova cena
7. Insider transakce + analyticky konsenzus
8. Scenare (Bull / Base / Bear)
9. Rizika
10. Katalyzatory v horizontu 3-12 mesicu
11. DDM valuace, pokud jde o dividendovy titul
12. Verdikt

FORMAT
- Prehledne nadpisy
- Kratke odstavce
- 2-3 tabulky, pokud pro ne mas data
- Na konci pridej sekci "Pouzite zdroje"
`;

const formatNumber = (value: number | null, currency?: string) => {
  if (value === null) return 'neuvedeno';
  return currency
    ? formatCurrencySafe(value, currency)
    : new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 4 }).format(value);
};

export const buildTickerAnalysisPrompt = (ticker: string, portfolioItem: PortfolioAsset) => {
  const intro = TICKER_ANALYSIS_PROMPT_TEMPLATE.replace('{TICKER}', ticker);

  const positionContext = [
    `Ticker: ${portfolioItem.ticker}`,
    `Nazev: ${portfolioItem.name}`,
    `Typ aktiva: ${portfolioItem.asset_type}`,
    `Poskytovatel: ${portfolioItem.provider}`,
    `Sektor: ${portfolioItem.sector || 'neuvedeno'}`,
    `Mena pozice: ${portfolioItem.currency}`,
    `Drzene mnozstvi: ${formatNumber(portfolioItem.quantity)}`,
    `Prumerna nakupni cena: ${formatNumber(portfolioItem.avgBuyPrice, portfolioItem.currency)}`,
    `Investovano celkem: ${formatNumber(portfolioItem.totalInvestedInReportingCurrency)}`,
    `Aktualni cena v aplikaci: ${formatNumber(portfolioItem.currentPrice, portfolioItem.currency)}`,
    `Aktualni hodnota v reportovaci mene: ${formatNumber(portfolioItem.currentValueInReportingCurrency)}`,
    `Zisk / ztrata v reportovaci mene: ${formatNumber(portfolioItem.profitLossInReportingCurrency)}`,
    `Vynos v %: ${
      portfolioItem.profitLossPercent !== null ? `${portfolioItem.profitLossPercent.toFixed(2)} %` : 'neuvedeno'
    }`,
  ];

  return `${intro.trim()}\n\nDostupna data z portfolia:\n${positionContext.map((line) => `- ${line}`).join('\n')}`;
};

export const generateTickerAnalysis = async (
  ticker: string,
  portfolioItem: PortfolioAsset
): Promise<TickerAnalysisResponse> => {
  if (!ticker.trim()) {
    throw new Error('Neplatny ticker symbol.');
  }

  if (!portfolioItem) {
    throw new Error('Chybi data o vybrane pozici.');
  }

  const prompt = buildTickerAnalysisPrompt(ticker, portfolioItem);

  return requestTickerAnalysis({
    ticker,
    portfolioItem,
    prompt,
  });
};
