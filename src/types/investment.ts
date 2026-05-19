export type InvestmentTransactionType = 'buy' | 'sell' | 'dividend';

export type InvestmentAssetType =
  | 'stock'
  | 'etf'
  | 'crypto'
  | 'bond'
  | 'commodity'
  | 'p2p'
  | 'private_credit'
  | 'real_estate'
  | 'managed_portfolio'
  | 'fund'
  | 'other';

export type InvestmentProvider =
  | 'broker'
  | 'investown'
  | 'fingood'
  | 'edward'
  | 'conseq'
  | 'other';

export type BrokerConnectorKind = 'manual_template' | 'broker_export' | 'api_sync';

export type BrokerConnectorStatus = 'planned' | 'configured' | 'ready';

export interface InvestmentAsset {
  id: string;
  ticker: string;
  name: string;
  asset_type: InvestmentAssetType;
  provider: InvestmentProvider;
  sector: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransaction {
  id: string;
  asset_id: string;
  transaction_type: InvestmentTransactionType;
  quantity: number;
  price_per_unit: number;
  total_value: number;
  currency: string;
  transaction_date: string;
  notes: string | null;
  import_batch_id: string | null;
  ex_dividend_date?: string | null;
  pay_date?: string | null;
  expected_dividend_amount?: number | null;
  broker_connector_id?: string | null;
  created_at: string;
}

export interface AssetPrice {
  id: string;
  asset_id: string;
  price: number;
  currency: string;
  price_date: string;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_date: string;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  transaction_count: number;
  imported_at: string;
  notes: string | null;
  source_kind?: BrokerConnectorKind | null;
  source_label?: string | null;
}

export interface PortfolioSettings {
  id: string;
  reporting_currency: string;
  created_at: string;
  updated_at: string;
}

export interface BrokerConnector {
  id: string;
  broker_key: 'trading212' | 'ibkr_flex';
  name: string;
  source_kind: BrokerConnectorKind;
  status: BrokerConnectorStatus;
  description: string;
  auth_type: 'api_key' | 'flex_token';
  last_sync_at: string | null;
  config_hint: string;
}

export interface PortfolioAsset {
  id: string;
  ticker: string;
  name: string;
  asset_type: string;
  provider: InvestmentProvider;
  sector: string | null;
  currency: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  currentPrice: number | null;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  currentPriceInReportingCurrency: number | null;
  currentValueInReportingCurrency: number | null;
  totalInvestedInReportingCurrency: number;
  profitLossInReportingCurrency: number | null;
}

export interface DividendCalendarMonth {
  month: string;
  amount: number;
  currency: string;
}

export interface DividendDetail {
  id: string;
  asset_id: string;
  ticker: string;
  asset_name: string;
  currency: string;
  transaction_date: string;
  ex_dividend_date: string | null;
  pay_date: string | null;
  amount: number;
  expected_dividend_amount: number | null;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  reportingCurrency: string;
  assets: PortfolioAsset[];
  assetsByType: Record<string, { invested: number; value: number | null }>;
  assetsByProvider: Record<string, { invested: number; value: number | null }>;
  assetsByCurrency: Record<string, { invested: number; value: number | null }>;
  assetsBySector: Record<string, { invested: number; value: number | null }>;
  portfolioHistory: { date: string; value: number }[];
  dividendCalendar: DividendCalendarMonth[];
  dividendDetails: DividendDetail[];
  dividendTaxEstimate: number;
}

export type TickerAnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface TickerAnalysisResult {
  ticker: string;
  generatedAt: string;
  analysis: string;
  provider: 'mock' | 'backend';
  promptVersion: string;
}

export interface MarketSnapshot {
  ticker: string;
  shortName: string | null;
  currency: string | null;
  exchange: string | null;
  regularMarketPrice: number | null;
  regularMarketChangePercent: number | null;
  marketTime: string | null;
  summary?: Record<string, unknown> | null;
}

export const ASSET_TYPE_LABELS: Record<InvestmentAssetType, string> = {
  stock: 'Akcie',
  etf: 'ETF',
  crypto: 'Kryptoměny',
  bond: 'Dluhopisy',
  commodity: 'Komodity',
  p2p: 'P2P půjčky',
  private_credit: 'Soukromý úvěr',
  real_estate: 'Nemovitostní podíl',
  managed_portfolio: 'Řízené portfolio',
  fund: 'Fond',
  other: 'Ostatní',
};

export const INVESTMENT_PROVIDER_LABELS: Record<InvestmentProvider, string> = {
  broker: 'Broker',
  investown: 'Investown',
  fingood: 'Fingood',
  edward: 'Edward',
  conseq: 'Conseq',
  other: 'Jiný poskytovatel',
};

export const COMMON_CURRENCIES = ['CZK', 'USD', 'EUR', 'GBP', 'CHF'];
