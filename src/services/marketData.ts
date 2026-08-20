import { requestTickerQuote } from '@/lib/aiClient';
import { AssetPrice, InvestmentAsset, MarketSnapshot } from '@/types/investment';

const YAHOO_TICKER_ALIASES: Record<string, string> = {
  AML: 'AML.L',
  BITCOIN: 'BTC-USD',
  BMW: 'BMW.DE',
  BMW3: 'BMW3.DE',
  BP: 'BP.L',
  BWY: 'BWY.L',
  CEZ: 'CEZ.PR',
  CSPX: 'CSPX.L',
  MBG: 'MBG.DE',
  NVD: 'NVD.DE',
  P911: 'P911.DE',
  SHEL: 'SHEL.L',
  VUAA: 'VUAA.L',
};

export const resolveMarketDataTicker = (ticker: string): string => {
  const normalizedTicker = ticker.trim().toUpperCase();
  return YAHOO_TICKER_ALIASES[normalizedTicker] || normalizedTicker;
};

export const fetchTickerMarketSnapshot = async (ticker: string): Promise<MarketSnapshot> => {
  if (!ticker.trim()) {
    throw new Error('Neplatný ticker symbol.');
  }

  const response = await requestTickerQuote(resolveMarketDataTicker(ticker));
  return response.snapshot;
};

export const marketSnapshotToAssetPrice = (
  asset: InvestmentAsset,
  snapshot: MarketSnapshot
): AssetPrice => {
  if (snapshot.regularMarketPrice === null || !snapshot.currency) {
    throw new Error(`Pro ${asset.ticker} nejsou dostupná aktuální cenová data.`);
  }

  const sourceCurrency = snapshot.currency.trim();
  const isBritishPence = sourceCurrency === 'GBp' || sourceCurrency.toUpperCase() === 'GBX';

  return {
    id: crypto.randomUUID(),
    asset_id: asset.id,
    price: isBritishPence ? snapshot.regularMarketPrice / 100 : snapshot.regularMarketPrice,
    currency: isBritishPence ? 'GBP' : sourceCurrency.toUpperCase(),
    price_date: snapshot.marketTime?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  };
};
