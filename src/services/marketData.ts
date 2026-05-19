import { requestTickerQuote } from '@/lib/aiClient';
import { AssetPrice, InvestmentAsset, MarketSnapshot } from '@/types/investment';

export const fetchTickerMarketSnapshot = async (ticker: string): Promise<MarketSnapshot> => {
  if (!ticker.trim()) {
    throw new Error('Neplatný ticker symbol.');
  }

  const response = await requestTickerQuote(ticker.trim().toUpperCase());
  return response.snapshot;
};

export const marketSnapshotToAssetPrice = (
  asset: InvestmentAsset,
  snapshot: MarketSnapshot
): AssetPrice => {
  if (snapshot.regularMarketPrice === null || !snapshot.currency) {
    throw new Error(`Pro ${asset.ticker} nejsou dostupná aktuální cenová data.`);
  }

  return {
    id: crypto.randomUUID(),
    asset_id: asset.id,
    price: snapshot.regularMarketPrice,
    currency: snapshot.currency,
    price_date: snapshot.marketTime?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  };
};
