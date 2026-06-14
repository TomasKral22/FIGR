import { appStorage } from '@/lib/appStorage';
import {
  AssetPrice,
  BrokerConnector,
  CreditInvestment,
  CreditInvestmentRepayment,
  ExchangeRate,
  ImportBatch,
  InvestmentAsset,
  InvestmentAuditEntry,
  InvestmentDataMeta,
  InvestmentSyncStatus,
  InvestmentTransaction,
  PortfolioSettings,
  TrackedInvestment,
} from '@/types/investment';

export const INVESTMENT_STORAGE_KEYS = {
  ASSETS: 'investment_assets',
  TRANSACTIONS: 'investment_transactions',
  PRICES: 'investment_prices',
  EXCHANGE_RATES: 'investment_exchange_rates',
  IMPORT_BATCHES: 'investment_import_batches',
  SETTINGS: 'investment_settings',
  CONNECTORS: 'investment_broker_connectors',
  CREDIT_INVESTMENTS: 'investment_credit_investments',
  CREDIT_REPAYMENTS: 'investment_credit_repayments',
  TRACKED_INVESTMENTS: 'investment_tracked_investments',
  AUDIT_LOG: 'investment_audit_log',
  META: 'investment_meta',
} as const;

export const FINANCE_AUDIT_STORAGE_KEYS = {
  TRANSACTIONS: 'finance_transactions',
  MONTH_CLOSURES: 'finance_month_closures',
} as const;

export const DEFAULT_INVESTMENT_CONNECTORS: BrokerConnector[] = [
  {
    id: 'connector-trading212',
    broker_key: 'trading212',
    name: 'Trading 212 API',
    source_kind: 'api_sync',
    status: 'planned',
    description: 'Pripraveny konektor pro read-only synchronizaci uctu a historie z Trading 212 Public API.',
    auth_type: 'api_key',
    last_sync_at: null,
    config_hint: 'Bude vyzadovat API klic vygenerovany primo v uctu Trading 212.',
  },
  {
    id: 'connector-ibkr-flex',
    broker_key: 'ibkr_flex',
    name: 'IBKR Flex Web Service',
    source_kind: 'api_sync',
    status: 'planned',
    description: 'Doporuceny oficialni konektor pro activity reporty a historii obchodu z Interactive Brokers.',
    auth_type: 'flex_token',
    last_sync_at: null,
    config_hint: 'Bude vyzadovat Flex Query ID a Flex token z Client Portalu.',
  },
];

export const DEFAULT_INVESTMENT_META: InvestmentDataMeta = {
  last_saved_at: null,
  last_backup_at: null,
  last_price_sync_at: null,
  hydrated_at: null,
};

export interface LoadedInvestmentState {
  assets: InvestmentAsset[];
  transactions: InvestmentTransaction[];
  prices: AssetPrice[];
  exchangeRates: ExchangeRate[];
  importBatches: ImportBatch[];
  settings: PortfolioSettings;
  connectors: BrokerConnector[];
  creditInvestments: CreditInvestment[];
  creditRepayments: CreditInvestmentRepayment[];
  trackedInvestments: TrackedInvestment[];
  auditLog: InvestmentAuditEntry[];
  meta: InvestmentDataMeta;
  dbPath: string | null;
}

const createTimestamp = () => new Date().toISOString();

const parseStoredValue = <T,>(loaded: Record<string, string | null>, key: string, fallback: T): T => {
  const raw = loaded[key];
  return raw ? (JSON.parse(raw) as T) : fallback;
};

export const loadInvestmentState = async (): Promise<LoadedInvestmentState> => {
  const loaded = await appStorage.getMany(Object.values(INVESTMENT_STORAGE_KEYS));
  const now = createTimestamp();
  const desktopDbPath = await appStorage.getDbPath();

  return {
    assets: parseStoredValue<InvestmentAsset[]>(loaded, INVESTMENT_STORAGE_KEYS.ASSETS, [])
      .map((asset) => ({
        ...asset,
        provider: asset.provider || 'broker',
      }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker)),
    transactions: parseStoredValue<InvestmentTransaction[]>(loaded, INVESTMENT_STORAGE_KEYS.TRANSACTIONS, []).sort(
      (a, b) => b.transaction_date.localeCompare(a.transaction_date)
    ),
    prices: parseStoredValue<AssetPrice[]>(loaded, INVESTMENT_STORAGE_KEYS.PRICES, []).sort((a, b) =>
      b.price_date.localeCompare(a.price_date)
    ),
    exchangeRates: parseStoredValue<ExchangeRate[]>(loaded, INVESTMENT_STORAGE_KEYS.EXCHANGE_RATES, []).sort((a, b) =>
      b.rate_date.localeCompare(a.rate_date)
    ),
    importBatches: parseStoredValue<ImportBatch[]>(loaded, INVESTMENT_STORAGE_KEYS.IMPORT_BATCHES, []).sort((a, b) =>
      b.imported_at.localeCompare(a.imported_at)
    ),
    settings:
      parseStoredValue<PortfolioSettings | null>(loaded, INVESTMENT_STORAGE_KEYS.SETTINGS, null) || {
        id: crypto.randomUUID(),
        reporting_currency: 'CZK',
        created_at: now,
        updated_at: now,
      },
    connectors: parseStoredValue<BrokerConnector[]>(
      loaded,
      INVESTMENT_STORAGE_KEYS.CONNECTORS,
      DEFAULT_INVESTMENT_CONNECTORS
    ),
    creditInvestments: parseStoredValue<CreditInvestment[]>(loaded, INVESTMENT_STORAGE_KEYS.CREDIT_INVESTMENTS, []).sort(
      (a, b) => a.name.localeCompare(b.name)
    ),
    creditRepayments: parseStoredValue<CreditInvestmentRepayment[]>(
      loaded,
      INVESTMENT_STORAGE_KEYS.CREDIT_REPAYMENTS,
      []
    ).sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
    trackedInvestments: parseStoredValue<TrackedInvestment[]>(loaded, INVESTMENT_STORAGE_KEYS.TRACKED_INVESTMENTS, []).sort(
      (a, b) => a.ticker.localeCompare(b.ticker)
    ),
    auditLog: parseStoredValue<InvestmentAuditEntry[]>(loaded, INVESTMENT_STORAGE_KEYS.AUDIT_LOG, []).sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    ),
    meta: {
      ...DEFAULT_INVESTMENT_META,
      ...parseStoredValue<InvestmentDataMeta>(loaded, INVESTMENT_STORAGE_KEYS.META, DEFAULT_INVESTMENT_META),
      hydrated_at: now,
    },
    dbPath: desktopDbPath,
  };
};

export const saveInvestmentEntries = async (entries: Record<string, string>) => {
  await appStorage.setMany(entries);
};

export const loadInvestmentFinanceAuditState = async () => {
  const loaded = await appStorage.getMany(Object.values(FINANCE_AUDIT_STORAGE_KEYS));
  return {
    financeTransactions: loaded[FINANCE_AUDIT_STORAGE_KEYS.TRANSACTIONS]
      ? (JSON.parse(loaded[FINANCE_AUDIT_STORAGE_KEYS.TRANSACTIONS] as string) as Array<{ month: string }>)
      : [],
    monthClosures: loaded[FINANCE_AUDIT_STORAGE_KEYS.MONTH_CLOSURES]
      ? (JSON.parse(loaded[FINANCE_AUDIT_STORAGE_KEYS.MONTH_CLOSURES] as string) as Array<{ month: string }>)
      : [],
  };
};

export const buildInvestmentSyncStatus = (
  session: { user?: { email?: string | null; id?: string | null } } | null,
  meta: InvestmentDataMeta,
  dbPath: string | null
): InvestmentSyncStatus => ({
  mode: session?.user ? 'cloud' : 'local',
  userEmail: session?.user?.email ?? null,
  userId: session?.user?.id ?? null,
  hydratedAt: meta.hydrated_at,
  lastSavedAt: meta.last_saved_at,
  lastBackupAt: meta.last_backup_at,
  lastPriceSyncAt: meta.last_price_sync_at,
  dbPath,
});
