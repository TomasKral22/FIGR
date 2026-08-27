export type InvestmentTransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'deposit'
  | 'withdrawal'
  | 'interest'
  | 'principal_repayment'
  | 'fee'
  | 'tax'
  | 'cash_adjustment';

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
  | 'alocano'
  | 'investown'
  | 'fingood'
  | 'edward'
  | 'conseq'
  | 'other';

export type CreditInvestmentKind = 'p2p' | 'b2b';

export type CreditInvestmentStatus = 'repaying' | 'pending' | 'recovery' | 'repaid';

export type BrokerConnectorKind = 'manual_template' | 'broker_export' | 'api_sync';

export type BrokerConnectorStatus = 'planned' | 'configured' | 'ready';

export type InvestmentSourceAccountType =
  | 'brokerage'
  | 'managed_portfolio'
  | 'crowdfunding'
  | 'p2p'
  | 'crypto'
  | 'other';

export type InvestmentSourceSyncMode = 'manual' | 'file_import' | 'api_sync';

export type InvestmentSourceValuationMode = 'positions' | 'snapshot';

export interface InvestmentSourceAccount {
  id: string;
  name: string;
  provider: InvestmentProvider;
  account_type: InvestmentSourceAccountType;
  currency: string;
  sync_mode: InvestmentSourceSyncMode;
  valuation_mode: InvestmentSourceValuationMode;
  covers_unassigned_positions: boolean;
  excluded_amount: number;
  is_active: boolean;
  last_synced_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentValueSnapshot {
  id: string;
  source_account_id: string;
  snapshot_date: string;
  total_value: number;
  cash_balance: number;
  invested_value: number | null;
  currency: string;
  source_kind: 'manual' | 'file_import' | 'api_sync';
  note: string | null;
  created_at: string;
}

export interface InvestmentAsset {
  id: string;
  ticker: string;
  name: string;
  asset_type: InvestmentAssetType;
  provider: InvestmentProvider;
  sector: string | null;
  currency: string;
  source_account_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditInvestment {
  id: string;
  name: string;
  kind: CreditInvestmentKind;
  provider: InvestmentProvider;
  current_value: number;
  interest_rate: number;
  status: CreditInvestmentStatus;
  currency: string;
  source_account_id?: string | null;
  invested_value?: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditInvestmentRepayment {
  id: string;
  credit_investment_id: string;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  fee_paid: number;
  note: string | null;
  created_at: string;
}

export interface TrackedInvestment {
  id: string;
  ticker: string;
  name: string;
  asset_type: Exclude<InvestmentAssetType, 'p2p' | 'private_credit'>;
  provider: InvestmentProvider;
  sector: string | null;
  currency: string;
  current_value: number;
  invested_value?: number | null;
  quantity: number | null;
  current_price: number | null;
  include_in_portfolio: boolean;
  is_watchlist: boolean;
  note: string | null;
  last_price_synced_at: string | null;
  source_account_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentAuditEntry {
  id: string;
  created_at: string;
  actor: string;
  action: string;
  detail: string;
  scope: 'portfolio' | 'asset' | 'credit' | 'tracked' | 'sync' | 'backup';
  severity: 'info' | 'warning' | 'error';
}

export interface InvestmentDataMeta {
  last_saved_at: string | null;
  last_backup_at: string | null;
  last_price_sync_at: string | null;
  hydrated_at: string | null;
}

export interface InvestmentValidationIssue {
  id: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  detail: string;
  code:
    | 'missing-price'
    | 'stale-price'
    | 'missing-rate'
    | 'orphan-transaction'
      | 'empty-asset'
    | 'tracked-value'
    | 'credit-without-repayment';
}

export interface InvestmentSyncStatus {
  mode: 'cloud' | 'local';
  userEmail: string | null;
  userId: string | null;
  hydratedAt: string | null;
  lastSavedAt: string | null;
  lastBackupAt: string | null;
  lastPriceSyncAt: string | null;
  dbPath: string | null;
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
  source_account_id?: string | null;
  external_id?: string | null;
  source_row_hash?: string | null;
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
  source_account_id?: string | null;
  imported_count?: number;
  duplicate_count?: number;
  rejected_count?: number;
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
  priceSource: 'market' | 'transaction' | 'missing';
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
  marketCurrentValue: number | null;
  trackedCurrentValue: number;
  creditCurrentValue: number;
  activeCreditInvestmentsCount: number;
  watchlistCount: number;
  assets: PortfolioAsset[];
  assetsByType: Record<string, { invested: number; value: number | null }>;
  assetsByProvider: Record<string, { invested: number; value: number | null }>;
  assetsByCurrency: Record<string, { invested: number; value: number | null }>;
  assetsBySector: Record<string, { invested: number; value: number | null }>;
  portfolioHistory: { date: string; value: number }[];
  dividendCalendar: DividendCalendarMonth[];
  dividendDetails: DividendDetail[];
  dividendTaxEstimate: number;
  excludedValue: number;
  sourceBreakdown: Array<{
    sourceAccountId: string | null;
    label: string;
    provider: InvestmentProvider | 'unassigned';
    value: number;
    grossValue: number;
    excludedValue: number;
    currency: string;
    lastUpdatedAt: string | null;
    valuationMode: InvestmentSourceValuationMode | 'positions';
  }>;
  performance: {
    totalReturn: number | null;
    totalReturnPercent: number | null;
    twr: number | null;
    twrStatus: 'available' | 'insufficient-data';
  };
  dataQuality: {
    status: 'complete' | 'partial' | 'insufficient';
    score: number;
    missingPrices: number;
    fallbackPrices: number;
    missingExchangeRates: number;
    staleSources: number;
    excludedValueCount: number;
    messages: string[];
  };
}

export type TickerAnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface TickerAnalysisResult {
  ticker: string;
  generatedAt: string;
  analysis: string;
  provider: 'mock' | 'backend' | 'fallback';
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
  alocano: 'Alocano',
  investown: 'Investown',
  fingood: 'Fingood',
  edward: 'Edward',
  conseq: 'Conseq',
  other: 'Jiný poskytovatel',
};

export const COMMON_CURRENCIES = ['CZK', 'USD', 'EUR', 'GBP', 'CHF'];

export const CREDIT_INVESTMENT_KIND_LABELS: Record<CreditInvestmentKind, string> = {
  p2p: 'P2P půjčka',
  b2b: 'B2B půjčka',
};

export const CREDIT_INVESTMENT_STATUS_LABELS: Record<CreditInvestmentStatus, string> = {
  repaying: 'Splácí se',
  pending: 'Čeká se',
  recovery: 'Vymáhání',
  repaid: 'Splaceno',
};

export const INVESTMENT_SOURCE_ACCOUNT_TYPE_LABELS: Record<InvestmentSourceAccountType, string> = {
  brokerage: 'Brokerský účet',
  managed_portfolio: 'Řízené portfolio',
  crowdfunding: 'Crowdfunding',
  p2p: 'P2P / úvěry',
  crypto: 'Krypto účet',
  other: 'Jiný zdroj',
};

export const INVESTMENT_SOURCE_SYNC_MODE_LABELS: Record<InvestmentSourceSyncMode, string> = {
  manual: 'Ruční snapshot',
  file_import: 'Import souboru',
  api_sync: 'API synchronizace',
};
