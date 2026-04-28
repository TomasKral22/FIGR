import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AssetPrice,
  BrokerConnector,
  ExchangeRate,
  ImportBatch,
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentTransaction,
  InvestmentTransactionType,
  PortfolioSettings,
  PortfolioSummary,
} from '@/types/investment';
import { calculatePortfolioSummary } from '@/utils/investmentPortfolio';
import { appStorage } from '@/lib/appStorage';

const STORAGE_KEYS = {
  ASSETS: 'investment_assets',
  TRANSACTIONS: 'investment_transactions',
  PRICES: 'investment_prices',
  EXCHANGE_RATES: 'investment_exchange_rates',
  IMPORT_BATCHES: 'investment_import_batches',
  SETTINGS: 'investment_settings',
  CONNECTORS: 'investment_broker_connectors',
};

const createTimestamp = () => new Date().toISOString();
const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : undefined);

const DEFAULT_CONNECTORS: BrokerConnector[] = [
  {
    id: 'connector-trading212',
    broker_key: 'trading212',
    name: 'Trading 212 API',
    source_kind: 'api_sync',
    status: 'planned',
    description: 'Připravený konektor pro read-only synchronizaci účtu a historie z Trading 212 Public API.',
    auth_type: 'api_key',
    last_sync_at: null,
    config_hint: 'Bude vyžadovat API key vygenerovaný přímo v účtu Trading 212.',
  },
  {
    id: 'connector-ibkr-flex',
    broker_key: 'ibkr_flex',
    name: 'IBKR Flex Web Service',
    source_kind: 'api_sync',
    status: 'planned',
    description: 'Doporučený oficiální konektor pro activity reporty a historii obchodů z Interactive Brokers.',
    auth_type: 'flex_token',
    last_sync_at: null,
    config_hint: 'Bude vyžadovat Flex Query ID a Flex token z Client Portalu.',
  },
];

const isDuplicateInvestmentTransaction = (
  left: InvestmentTransaction,
  right: {
    asset_id: string;
    transaction_type: InvestmentTransactionType;
    quantity: number;
    price_per_unit: number;
    total_value: number;
    currency: string;
    transaction_date: string;
    notes: string | null;
  }
) =>
  left.asset_id === right.asset_id &&
  left.transaction_type === right.transaction_type &&
  left.quantity === right.quantity &&
  left.price_per_unit === right.price_per_unit &&
  left.currency === right.currency &&
  left.transaction_date === right.transaction_date &&
  left.total_value === right.total_value &&
  left.notes === right.notes;

export const useInvestmentData = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [prices, setPrices] = useState<AssetPrice[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);
  const [connectors, setConnectors] = useState<BrokerConnector[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [calculatingPortfolio, setCalculatingPortfolio] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await appStorage.getMany(Object.values(STORAGE_KEYS));
      const storedAssets = loaded[STORAGE_KEYS.ASSETS] ?? localStorage.getItem(STORAGE_KEYS.ASSETS);
      const storedTransactions = loaded[STORAGE_KEYS.TRANSACTIONS] ?? localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const storedPrices = loaded[STORAGE_KEYS.PRICES] ?? localStorage.getItem(STORAGE_KEYS.PRICES);
      const storedExchangeRates = loaded[STORAGE_KEYS.EXCHANGE_RATES] ?? localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
      const storedImportBatches = loaded[STORAGE_KEYS.IMPORT_BATCHES] ?? localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES);
      const storedSettings = loaded[STORAGE_KEYS.SETTINGS] ?? localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const storedConnectors = loaded[STORAGE_KEYS.CONNECTORS] ?? localStorage.getItem(STORAGE_KEYS.CONNECTORS);
      const now = createTimestamp();

      setAssets(
        storedAssets
          ? (JSON.parse(storedAssets) as InvestmentAsset[]).sort((a, b) => a.ticker.localeCompare(b.ticker))
          : []
      );
      setTransactions(
        storedTransactions
          ? (JSON.parse(storedTransactions) as InvestmentTransaction[]).sort((a, b) =>
              b.transaction_date.localeCompare(a.transaction_date)
            )
          : []
      );
      setPrices(
        storedPrices
          ? (JSON.parse(storedPrices) as AssetPrice[]).sort((a, b) => b.price_date.localeCompare(a.price_date))
          : []
      );
      setExchangeRates(
        storedExchangeRates
          ? (JSON.parse(storedExchangeRates) as ExchangeRate[]).sort((a, b) =>
              b.rate_date.localeCompare(a.rate_date)
            )
          : []
      );
      setImportBatches(
        storedImportBatches
          ? (JSON.parse(storedImportBatches) as ImportBatch[]).sort((a, b) =>
              b.imported_at.localeCompare(a.imported_at)
            )
          : []
      );
      setSettings(
        storedSettings
          ? (JSON.parse(storedSettings) as PortfolioSettings)
          : {
              id: crypto.randomUUID(),
              reporting_currency: 'CZK',
              created_at: now,
              updated_at: now,
            }
      );
      setConnectors(storedConnectors ? (JSON.parse(storedConnectors) as BrokerConnector[]) : DEFAULT_CONNECTORS);
      setIsHydrated(true);
    } catch (error: unknown) {
      console.error('Error fetching investment data:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se načíst investiční data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const calculatePortfolio = useCallback(async () => {
    setCalculatingPortfolio(true);
    try {
      const summary = calculatePortfolioSummary({
        assets,
        transactions,
        prices,
        exchangeRates,
        reportingCurrency: settings?.reporting_currency || 'CZK',
      });
      setPortfolioSummary(summary);
      return summary;
    } catch (error: unknown) {
      console.error('Error calculating portfolio:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se vypočítat portfolio.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setCalculatingPortfolio(false);
    }
  }, [assets, transactions, prices, exchangeRates, settings, toast]);

  const addAsset = async (asset: {
    ticker: string;
    name: string;
    asset_type: InvestmentAssetType;
    sector?: string;
    currency: string;
  }) => {
    try {
      const now = createTimestamp();
      const newAsset: InvestmentAsset = {
        id: crypto.randomUUID(),
        ticker: asset.ticker.toUpperCase(),
        name: asset.name,
        asset_type: asset.asset_type,
        sector: asset.sector || null,
        currency: asset.currency,
        created_at: now,
        updated_at: now,
      };

      setAssets((prev) => [...prev, newAsset].sort((a, b) => a.ticker.localeCompare(b.ticker)));
      toast({ title: 'Aktivum přidáno', description: `${newAsset.ticker} bylo přidáno.` });
      return newAsset;
    } catch (error: unknown) {
      console.error('Error adding asset:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodařilo se přidat aktivum.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const addTransaction = async (transaction: {
    asset_id: string;
    transaction_type: InvestmentTransactionType;
    quantity: number;
    price_per_unit: number;
    currency: string;
    transaction_date: string;
    notes?: string;
    ex_dividend_date?: string;
    pay_date?: string;
    expected_dividend_amount?: number;
  }) => {
    try {
      const newTransaction: InvestmentTransaction = {
        id: crypto.randomUUID(),
        asset_id: transaction.asset_id,
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        price_per_unit: transaction.price_per_unit,
        total_value: transaction.quantity * transaction.price_per_unit,
        currency: transaction.currency,
        transaction_date: transaction.transaction_date,
        notes: transaction.notes || null,
        import_batch_id: null,
        ex_dividend_date: transaction.ex_dividend_date || null,
        pay_date: transaction.pay_date || null,
        expected_dividend_amount: transaction.expected_dividend_amount ?? null,
        broker_connector_id: null,
        created_at: createTimestamp(),
      };

      if (
        transactions.some((existing) =>
          isDuplicateInvestmentTransaction(existing, {
            asset_id: newTransaction.asset_id,
            transaction_type: newTransaction.transaction_type,
            quantity: newTransaction.quantity,
            price_per_unit: newTransaction.price_per_unit,
            total_value: newTransaction.total_value,
            currency: newTransaction.currency,
            transaction_date: newTransaction.transaction_date,
            notes: newTransaction.notes,
          })
        )
      ) {
        toast({ title: 'Stejná investiční transakce už existuje.' });
        return null;
      }

      setTransactions((prev) =>
        [newTransaction, ...prev].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      );
      toast({ title: 'Transakce přidána' });
      return newTransaction;
    } catch (error: unknown) {
      console.error('Error adding transaction:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodařilo se přidat transakci.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
      toast({ title: 'Transakce smazána' });
    } catch (error: unknown) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se smazat transakci.',
        variant: 'destructive',
      });
    }
  };

  const addPrice = async (price: {
    asset_id: string;
    price: number;
    currency: string;
    price_date: string;
  }) => {
    try {
      const existingPrice = prices.find(
        (entry) => entry.asset_id === price.asset_id && entry.price_date === price.price_date
      );

      const nextPrice: AssetPrice = {
        id: existingPrice?.id || crypto.randomUUID(),
        asset_id: price.asset_id,
        price: price.price,
        currency: price.currency,
        price_date: price.price_date,
        created_at: existingPrice?.created_at || createTimestamp(),
      };

      setPrices((prev) => {
        const filtered = prev.filter(
          (entry) => !(entry.asset_id === price.asset_id && entry.price_date === price.price_date)
        );
        return [nextPrice, ...filtered].sort((a, b) => b.price_date.localeCompare(a.price_date));
      });
      toast({ title: 'Cena aktualizována' });
      return nextPrice;
    } catch (error: unknown) {
      console.error('Error adding price:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přidat cenu.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const addExchangeRate = async (rate: {
    from_currency: string;
    to_currency: string;
    rate: number;
    rate_date: string;
  }) => {
    try {
      const existingRate = exchangeRates.find(
        (entry) =>
          entry.from_currency === rate.from_currency &&
          entry.to_currency === rate.to_currency &&
          entry.rate_date === rate.rate_date
      );

      const nextRate: ExchangeRate = {
        id: existingRate?.id || crypto.randomUUID(),
        from_currency: rate.from_currency,
        to_currency: rate.to_currency,
        rate: rate.rate,
        rate_date: rate.rate_date,
        created_at: existingRate?.created_at || createTimestamp(),
      };

      setExchangeRates((prev) => {
        const filtered = prev.filter(
          (entry) =>
            !(
              entry.from_currency === rate.from_currency &&
              entry.to_currency === rate.to_currency &&
              entry.rate_date === rate.rate_date
            )
        );
        return [nextRate, ...filtered].sort((a, b) => b.rate_date.localeCompare(a.rate_date));
      });
      toast({ title: 'Směnný kurz aktualizován' });
      return nextRate;
    } catch (error: unknown) {
      console.error('Error adding exchange rate:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se přidat směnný kurz.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const importTransactions = async (
    importData: {
      ticker: string;
      name: string;
      asset_type: InvestmentAssetType;
      transaction_type: InvestmentTransactionType;
      quantity: number;
      price_per_unit: number;
      currency: string;
      transaction_date: string;
      sector?: string;
      ex_dividend_date?: string;
      pay_date?: string;
      expected_dividend_amount?: number;
      source_label?: string;
      source_kind?: 'manual_template' | 'broker_export' | 'api_sync';
      broker_connector_id?: string;
    }[]
  ) => {
    try {
      const now = createTimestamp();
      const batch: ImportBatch = {
        id: crypto.randomUUID(),
        transaction_count: importData.length,
        imported_at: now,
        notes: null,
        source_label: importData[0]?.source_label || null,
        source_kind: importData[0]?.source_kind || 'manual_template',
      };

      const createdAssets: InvestmentAsset[] = [];
      const createdTransactions: InvestmentTransaction[] = [];
      const assetMap = new Map(assets.map((asset) => [asset.ticker.toUpperCase(), asset]));

      for (const item of importData) {
        const normalizedTicker = item.ticker.toUpperCase();
        let asset = assetMap.get(normalizedTicker);

        if (!asset) {
          asset = {
            id: crypto.randomUUID(),
            ticker: normalizedTicker,
            name: item.name,
            asset_type: item.asset_type,
            sector: item.sector || null,
            currency: item.currency,
            created_at: now,
            updated_at: now,
          };
          assetMap.set(normalizedTicker, asset);
          createdAssets.push(asset);
        }

        createdTransactions.push({
          id: crypto.randomUUID(),
          asset_id: asset.id,
          transaction_type: item.transaction_type,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          total_value: item.quantity * item.price_per_unit,
          currency: item.currency,
          transaction_date: item.transaction_date,
          notes: null,
          import_batch_id: batch.id,
          ex_dividend_date: item.ex_dividend_date || null,
          pay_date: item.pay_date || null,
          expected_dividend_amount: item.expected_dividend_amount ?? null,
          broker_connector_id: item.broker_connector_id || null,
          created_at: now,
        });
      }

      const deduplicatedTransactions = createdTransactions.filter(
        (candidate) =>
          !transactions.some((existing) =>
            isDuplicateInvestmentTransaction(existing, {
              asset_id: candidate.asset_id,
              transaction_type: candidate.transaction_type,
              quantity: candidate.quantity,
              price_per_unit: candidate.price_per_unit,
              total_value: candidate.total_value,
              currency: candidate.currency,
              transaction_date: candidate.transaction_date,
              notes: candidate.notes,
            })
          )
      );

      if (createdAssets.length > 0) {
        setAssets((prev) => [...prev, ...createdAssets].sort((a, b) => a.ticker.localeCompare(b.ticker)));
      }
      setTransactions((prev) =>
        [...deduplicatedTransactions, ...prev].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      );
      setImportBatches((prev) => [batch, ...prev]);
      toast({
        title: 'Import dokončen',
        description: `Importováno ${deduplicatedTransactions.length} transakcí.`,
      });
    } catch (error: unknown) {
      console.error('Error importing transactions:', error);
      toast({
        title: 'Chyba importu',
        description: getErrorMessage(error) || 'Nepodařilo se importovat transakce.',
        variant: 'destructive',
      });
    }
  };

  const undoImport = async (batchId: string) => {
    try {
      setTransactions((prev) => prev.filter((transaction) => transaction.import_batch_id !== batchId));
      setImportBatches((prev) => prev.filter((batch) => batch.id !== batchId));
      toast({ title: 'Import vrácen zpět' });
    } catch (error: unknown) {
      console.error('Error undoing import:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se vrátit import.',
        variant: 'destructive',
      });
    }
  };

  const updateSettings = async (reportingCurrency: string) => {
    try {
      const now = createTimestamp();
      const nextSettings: PortfolioSettings = settings
        ? {
            ...settings,
            reporting_currency: reportingCurrency,
            updated_at: now,
          }
        : {
            id: crypto.randomUUID(),
            reporting_currency: reportingCurrency,
            created_at: now,
            updated_at: now,
          };

      setSettings(nextSettings);
      toast({ title: 'Nastavení uloženo' });
    } catch (error: unknown) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se uložit nastavení.',
        variant: 'destructive',
      });
    }
  };

  const markConnectorConfigured = async (connectorId: string) => {
    setConnectors((prev) =>
      prev.map((connector) =>
        connector.id === connectorId ? { ...connector, status: 'configured' } : connector
      )
    );
    toast({ title: 'Konektor připraven', description: 'Konektor byl označen jako připravený pro další napojení.' });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isHydrated) return;
    void appStorage.setMany({ [STORAGE_KEYS.ASSETS]: JSON.stringify(assets) });
  }, [assets, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void appStorage.setMany({ [STORAGE_KEYS.TRANSACTIONS]: JSON.stringify(transactions) });
  }, [transactions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void appStorage.setMany({ [STORAGE_KEYS.PRICES]: JSON.stringify(prices) });
  }, [prices, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void appStorage.setMany({ [STORAGE_KEYS.EXCHANGE_RATES]: JSON.stringify(exchangeRates) });
  }, [exchangeRates, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void appStorage.setMany({ [STORAGE_KEYS.IMPORT_BATCHES]: JSON.stringify(importBatches) });
  }, [importBatches, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !settings) return;
    void appStorage.setMany({ [STORAGE_KEYS.SETTINGS]: JSON.stringify(settings) });
  }, [settings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void appStorage.setMany({ [STORAGE_KEYS.CONNECTORS]: JSON.stringify(connectors) });
  }, [connectors, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    calculatePortfolio();
  }, [assets, transactions, prices, exchangeRates, settings, isHydrated, calculatePortfolio]);

  return {
    loading,
    assets,
    transactions,
    prices,
    exchangeRates,
    importBatches,
    settings,
    connectors,
    portfolioSummary,
    calculatingPortfolio,
    fetchData,
    calculatePortfolio,
    addAsset,
    addTransaction,
    deleteTransaction,
    addPrice,
    addExchangeRate,
    importTransactions,
    undoImport,
    updateSettings,
    markConnectorConfigured,
  };
};
