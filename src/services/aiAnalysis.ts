import { PortfolioAsset } from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';

export const EXTERNAL_AI_URLS = {
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/new',
} as const;

export const TICKER_ANALYSIS_PROMPT_TEMPLATE = `
Jednej jako akciovy analytik (CFA). V cestine zpracuj aktualni analyzu spolecnosti {TICKER} s overenymi cisly a citacemi zdroju.

POKYNY K PRACI A ZDROJUM
- Projdi posledni vyrocni a kvartalni zpravy, investor prezentace, earnings call transcript, 8-K/6-K, 10-K/10-Q a relevantni zpravy z poslednich 12-18 mesicu.
- U klicovych tvrzeni a metrik uved citaci v hranatych odkazech [1], [2] a na konci pridej sekci "Pouzite zdroje".
- Mena: USD, pokud neni uvedeno jinak. Marze v %. U kazde metriky specifikuj obdobi (Q, FY, LTM).
- Pokud nejsou dostupna aktualni nebo overitelna data, vyslovne to uved a negeneruj smyslena cisla.
- Pracuj pouze s dostupnymi daty z verejnych zdroju a s kontextem portfolia uvedenym nize.

STRUKTURA VYSTUPU
1. Investicni teze (3-5 vet): co je hlavni pribeh a proc prave ted.
2. Profil a segmenty trzeb: kratce popis business; tabulka (segment | % trzeb | rust | marze).
3. Aktualni vysledky: trzby, EPS, FCF, hruba/provozni/cista marze, CAPEX, cisty dluh, cisty dluh/EBITDA, buyback/dividenda - posledni Q a LTM.
4. Srovnani s konkurenty (peer group): tabulka (Ticker | EV/S | EV/EBITDA | P/E | P/FCF | rust trzeb | marze) a vysvetleni premii/diskontu.
5. DCF valuace: predpoklady, WACC, terminalni g, citlivostni tabulka (WACC x g), fair value na akcii.
6. Porovnani aktualni ceny vs. ferova cena: aktualni cena s casovou znackou, rozdil v %, triangulace podle nasobku.
7. Insider transakce + analyticky konsenzus: vyznamne insider obchody a konsenzus analytiku.
8. Scenare (Bull / Base / Bear): predpoklady, pravdepodobnost, cilova cena.
9. Rizika: 3-6 klicovych rizik a mechanismus dopadu.
10. Katalyzatory v horizontu 3-12 mesicu: 4-8 potencialnich udalosti s odhadovanym casovanim.
11. DDM valuace: proved jen pokud firma vyplaci vyznamnou dividendu.
12. Verdikt: Buy/Hold/Sell, cilova cena, pasmo jistoty, co by zmenilo nazor.

FORMAT
- Prehledne nadpisy
- Kratke odstavce
- 2-3 tabulky (segmenty, peer group, citlivost DCF), pokud jsou data k dispozici
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
