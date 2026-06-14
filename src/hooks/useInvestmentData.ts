import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AssetPrice,
  BrokerConnector,
  CreditInvestment,
  CreditInvestmentRepayment,
  ExchangeRate,
  ImportBatch,
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentAuditEntry,
  InvestmentDataMeta,
  InvestmentProvider,
  InvestmentSyncStatus,
  InvestmentTransaction,
  InvestmentTransactionType,
  InvestmentValidationIssue,
  PortfolioSettings,
  PortfolioSummary,
  TrackedInvestment,
} from '@/types/investment';
import { calculatePortfolioSummary } from '@/utils/investmentPortfolio';
import { buildInvestmentValidationIssues } from '@/utils/investmentDiagnostics';
import { appStorage } from '@/lib/appStorage';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildInvestmentSyncStatus,
  DEFAULT_INVESTMENT_CONNECTORS,
  DEFAULT_INVESTMENT_META,
  FINANCE_AUDIT_STORAGE_KEYS,
  INVESTMENT_STORAGE_KEYS,
  loadInvestmentFinanceAuditState,
  loadInvestmentState,
  saveInvestmentEntries,
} from '@/repositories/investmentRepository';

const createTimestamp = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);
const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : undefined);
const MAX_AUDIT_ITEMS = 300;

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

const downloadJson = (fileName: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const useInvestmentData = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [prices, setPrices] = useState<AssetPrice[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);
  const [connectors, setConnectors] = useState<BrokerConnector[]>([]);
  const [creditInvestments, setCreditInvestments] = useState<CreditInvestment[]>([]);
  const [creditRepayments, setCreditRepayments] = useState<CreditInvestmentRepayment[]>([]);
  const [trackedInvestments, setTrackedInvestments] = useState<TrackedInvestment[]>([]);
  const [auditLog, setAuditLog] = useState<InvestmentAuditEntry[]>([]);
  const [meta, setMeta] = useState<InvestmentDataMeta>(DEFAULT_INVESTMENT_META);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<InvestmentValidationIssue[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [calculatingPortfolio, setCalculatingPortfolio] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const touchMeta = useCallback((updates: Partial<InvestmentDataMeta>) => {
    setMeta((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const pushAudit = useCallback(
    (entry: Omit<InvestmentAuditEntry, 'id' | 'created_at' | 'actor'>) => {
      const actor = session?.user.user_metadata?.user_name || session?.user.email || 'lokalni uzivatel';
      setAuditLog((prev) =>
        [
          {
            id: crypto.randomUUID(),
            created_at: createTimestamp(),
            actor,
            ...entry,
          },
          ...prev,
        ].slice(0, MAX_AUDIT_ITEMS)
      );
    },
    [session?.user.email, session?.user.user_metadata]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setIsHydrated(false);
    try {
      const state = await loadInvestmentState();
      setAssets(state.assets);
      setTransactions(state.transactions);
      setPrices(state.prices);
      setExchangeRates(state.exchangeRates);
      setImportBatches(state.importBatches);
      setSettings(state.settings);
      setConnectors(state.connectors);
      setCreditInvestments(state.creditInvestments);
      setCreditRepayments(state.creditRepayments);
      setTrackedInvestments(state.trackedInvestments);
      setAuditLog(state.auditLog);
      setMeta(state.meta);
      setDbPath(state.dbPath);
      setIsHydrated(true);
    } catch (error: unknown) {
      console.error('Error fetching investment data:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se nacist investicni data.',
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
        creditInvestments,
        trackedInvestments,
        reportingCurrency: settings?.reporting_currency || 'CZK',
      });
      setPortfolioSummary(summary);
      return summary;
    } catch (error: unknown) {
      console.error('Error calculating portfolio:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se vypocitat portfolio.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setCalculatingPortfolio(false);
    }
  }, [assets, transactions, prices, exchangeRates, creditInvestments, trackedInvestments, settings, toast]);

  const refreshValidationIssues = useCallback(async () => {
    const { financeTransactions, monthClosures } = await loadInvestmentFinanceAuditState();

    const latestFinanceMonth =
      financeTransactions.length > 0
        ? financeTransactions.map((item) => item.month).sort((left, right) => right.localeCompare(left))[0]
        : null;

    const issues = buildInvestmentValidationIssues({
      assets,
      transactions,
      prices,
      exchangeRates,
      reportingCurrency: settings?.reporting_currency || 'CZK',
      creditInvestments,
      creditRepayments,
      trackedInvestments,
      latestFinanceMonth,
      closedFinanceMonths: monthClosures.map((item) => item.month),
      todayIso: todayIso(),
    });
    setValidationIssues(issues);
    return issues;
  }, [assets, transactions, prices, exchangeRates, settings, creditInvestments, creditRepayments, trackedInvestments]);

  const addAsset = async (asset: {
    ticker: string;
    name: string;
    asset_type: InvestmentAssetType;
    provider: InvestmentProvider;
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
        provider: asset.provider,
        sector: asset.sector || null,
        currency: asset.currency,
        created_at: now,
        updated_at: now,
      };

      setAssets((prev) => [...prev, newAsset].sort((a, b) => a.ticker.localeCompare(b.ticker)));
      touchMeta({ last_saved_at: now });
      pushAudit({
        action: 'asset-create',
        detail: `Pridano aktivum ${newAsset.ticker}.`,
        scope: 'asset',
        severity: 'info',
      });
      toast({ title: 'Aktivum pridano', description: `${newAsset.ticker} bylo pridano.` });
      return newAsset;
    } catch (error: unknown) {
      console.error('Error adding asset:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se pridat aktivum.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteAsset = async (id: string) => {
    try {
      setAssets((prev) => prev.filter((asset) => asset.id !== id));
      setTransactions((prev) => prev.filter((transaction) => transaction.asset_id !== id));
      setPrices((prev) => prev.filter((price) => price.asset_id !== id));
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'asset-delete',
        detail: `Smazano aktivum ${id} vcetne navazanych transakci a cen.`,
        scope: 'asset',
        severity: 'warning',
      });
      toast({ title: 'Aktivum smazano' });
    } catch (error: unknown) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se smazat aktivum.',
        variant: 'destructive',
      });
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
        toast({ title: 'Stejna investicni transakce uz existuje.' });
        return null;
      }

      setTransactions((prev) =>
        [newTransaction, ...prev].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      );
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'transaction-create',
        detail: `Pridana transakce ${newTransaction.transaction_type} pro aktivum ${newTransaction.asset_id}.`,
        scope: 'portfolio',
        severity: 'info',
      });
      toast({ title: 'Transakce pridana' });
      return newTransaction;
    } catch (error: unknown) {
      console.error('Error adding transaction:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se pridat transakci.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'transaction-delete',
        detail: `Smazana investicni transakce ${id}.`,
        scope: 'portfolio',
        severity: 'warning',
      });
      toast({ title: 'Transakce smazana' });
    } catch (error: unknown) {
      console.error('Error deleting transaction:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se smazat transakci.',
        variant: 'destructive',
      });
    }
  };

  const addPrice = async (
    price: {
      asset_id: string;
      price: number;
      currency: string;
      price_date: string;
    },
    options?: { silent?: boolean }
  ) => {
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
      touchMeta({
        last_saved_at: createTimestamp(),
        last_price_sync_at: options?.silent ? meta.last_price_sync_at : createTimestamp(),
      });
      if (!options?.silent) {
        pushAudit({
          action: 'price-update',
          detail: `Ulozena cena pro aktivum ${price.asset_id} k datu ${price.price_date}.`,
          scope: 'sync',
          severity: 'info',
        });
        toast({ title: 'Cena aktualizovana' });
      }
      return nextPrice;
    } catch (error: unknown) {
      console.error('Error adding price:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se pridat cenu.',
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
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'exchange-rate-update',
        detail: `Ulozen kurz ${rate.from_currency}/${rate.to_currency} pro ${rate.rate_date}.`,
        scope: 'sync',
        severity: 'info',
      });
      toast({ title: 'Smenny kurz aktualizovan' });
      return nextRate;
    } catch (error: unknown) {
      console.error('Error adding exchange rate:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se pridat smenny kurz.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const addCreditInvestment = async (investment: {
    name: string;
    kind: CreditInvestment['kind'];
    provider: CreditInvestment['provider'];
    current_value: number;
    interest_rate: number;
    status: CreditInvestment['status'];
    currency: string;
    note?: string;
  }) => {
    try {
      const now = createTimestamp();
      const nextInvestment: CreditInvestment = {
        id: crypto.randomUUID(),
        name: investment.name,
        kind: investment.kind,
        provider: investment.provider,
        current_value: investment.current_value,
        interest_rate: investment.interest_rate,
        status: investment.status,
        currency: investment.currency,
        note: investment.note || null,
        created_at: now,
        updated_at: now,
      };

      setCreditInvestments((prev) => [...prev, nextInvestment].sort((a, b) => a.name.localeCompare(b.name)));
      touchMeta({ last_saved_at: now });
      pushAudit({
        action: 'credit-create',
        detail: `Pridana uverova investice ${nextInvestment.name}.`,
        scope: 'credit',
        severity: 'info',
      });
      toast({ title: 'Uverova investice pridana' });
      return nextInvestment;
    } catch (error: unknown) {
      console.error('Error adding credit investment:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se pridat uverovou investici.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateCreditInvestment = async (
    id: string,
    updates: Partial<Omit<CreditInvestment, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      setCreditInvestments((prev) =>
        prev
          .map((investment) =>
            investment.id === id
              ? {
                  ...investment,
                  ...updates,
                  updated_at: createTimestamp(),
                }
              : investment
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'credit-update',
        detail: `Upravena uverova investice ${id}.`,
        scope: 'credit',
        severity: 'info',
      });
      toast({ title: 'Uverova investice upravena' });
    } catch (error: unknown) {
      console.error('Error updating credit investment:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se upravit uverovou investici.',
        variant: 'destructive',
      });
    }
  };

  const deleteCreditInvestment = async (id: string) => {
    try {
      setCreditInvestments((prev) => prev.filter((investment) => investment.id !== id));
      setCreditRepayments((prev) => prev.filter((repayment) => repayment.credit_investment_id !== id));
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'credit-delete',
        detail: `Smazana uverova investice ${id}.`,
        scope: 'credit',
        severity: 'warning',
      });
      toast({ title: 'Uverova investice smazana' });
    } catch (error: unknown) {
      console.error('Error deleting credit investment:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se smazat uverovou investici.',
        variant: 'destructive',
      });
    }
  };

  const addCreditRepayment = async (repayment: {
    credit_investment_id: string;
    payment_date: string;
    principal_paid: number;
    interest_paid: number;
    fee_paid?: number;
    note?: string;
  }) => {
    try {
      const nextRepayment: CreditInvestmentRepayment = {
        id: crypto.randomUUID(),
        credit_investment_id: repayment.credit_investment_id,
        payment_date: repayment.payment_date,
        principal_paid: repayment.principal_paid,
        interest_paid: repayment.interest_paid,
        fee_paid: repayment.fee_paid || 0,
        note: repayment.note || null,
        created_at: createTimestamp(),
      };

      setCreditRepayments((prev) =>
        [nextRepayment, ...prev].sort((a, b) => b.payment_date.localeCompare(a.payment_date))
      );
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'credit-repayment-create',
        detail: `Pridana splatka pro uverovou investici ${repayment.credit_investment_id}.`,
        scope: 'credit',
        severity: 'info',
      });
      toast({ title: 'Splatka ulozena' });
      return nextRepayment;
    } catch (error: unknown) {
      console.error('Error adding credit repayment:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se ulozit splatku.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteCreditRepayment = async (id: string) => {
    try {
      setCreditRepayments((prev) => prev.filter((repayment) => repayment.id !== id));
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'credit-repayment-delete',
        detail: `Smazana splatka ${id}.`,
        scope: 'credit',
        severity: 'warning',
      });
      toast({ title: 'Splatka smazana' });
    } catch (error: unknown) {
      console.error('Error deleting credit repayment:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se smazat splatku.',
        variant: 'destructive',
      });
    }
  };

  const addTrackedInvestment = async (investment: {
    ticker: string;
    name: string;
    asset_type: TrackedInvestment['asset_type'];
    provider: TrackedInvestment['provider'];
    sector?: string;
    currency: string;
    current_value: number;
    quantity?: number | null;
    current_price?: number | null;
    include_in_portfolio: boolean;
    is_watchlist: boolean;
    note?: string;
  }) => {
    try {
      const now = createTimestamp();
      const nextTracked: TrackedInvestment = {
        id: crypto.randomUUID(),
        ticker: investment.ticker.toUpperCase(),
        name: investment.name,
        asset_type: investment.asset_type,
        provider: investment.provider,
        sector: investment.sector || null,
        currency: investment.currency,
        current_value: investment.current_value,
        quantity: investment.quantity ?? null,
        current_price: investment.current_price ?? null,
        include_in_portfolio: investment.include_in_portfolio,
        is_watchlist: investment.is_watchlist,
        note: investment.note || null,
        last_price_synced_at: null,
        created_at: now,
        updated_at: now,
      };

      setTrackedInvestments((prev) => [...prev, nextTracked].sort((a, b) => a.ticker.localeCompare(b.ticker)));
      touchMeta({ last_saved_at: now });
      pushAudit({
        action: 'tracked-create',
        detail: `Pridana evidovana pozice ${nextTracked.ticker}${nextTracked.is_watchlist ? ' do watchlistu' : ''}.`,
        scope: 'tracked',
        severity: 'info',
      });
      toast({ title: nextTracked.is_watchlist ? 'Watchlist polozka pridana' : 'Evidovana pozice pridana' });
      return nextTracked;
    } catch (error: unknown) {
      console.error('Error adding tracked investment:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se pridat evidovanou pozici.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTrackedInvestment = async (
    id: string,
    updates: Partial<Omit<TrackedInvestment, 'id' | 'created_at' | 'updated_at'>>,
    options?: { silent?: boolean }
  ) => {
    try {
      setTrackedInvestments((prev) =>
        prev
          .map((investment) =>
            investment.id === id
              ? {
                  ...investment,
                  ...updates,
                  updated_at: createTimestamp(),
                }
              : investment
          )
          .sort((a, b) => a.ticker.localeCompare(b.ticker))
      );
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'tracked-update',
        detail: `Upravena evidovana pozice ${id}.`,
        scope: 'tracked',
        severity: 'info',
      });
      if (!options?.silent) {
        toast({ title: 'Evidovana pozice upravena' });
      }
    } catch (error: unknown) {
      console.error('Error updating tracked investment:', error);
      if (!options?.silent) {
        toast({
          title: 'Chyba',
          description: getErrorMessage(error) || 'Nepodarilo se upravit evidovanou pozici.',
          variant: 'destructive',
        });
      }
    }
  };

  const deleteTrackedInvestment = async (id: string) => {
    try {
      setTrackedInvestments((prev) => prev.filter((investment) => investment.id !== id));
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'tracked-delete',
        detail: `Smazana evidovana pozice ${id}.`,
        scope: 'tracked',
        severity: 'warning',
      });
      toast({ title: 'Evidovana pozice smazana' });
    } catch (error: unknown) {
      console.error('Error deleting tracked investment:', error);
      toast({
        title: 'Chyba',
        description: getErrorMessage(error) || 'Nepodarilo se smazat evidovanou pozici.',
        variant: 'destructive',
      });
    }
  };

  const importTransactions = async (
    importData: {
      ticker: string;
      name: string;
      asset_type: InvestmentAssetType;
      provider: InvestmentProvider;
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
            provider: item.provider,
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
      touchMeta({ last_saved_at: now });
      pushAudit({
        action: 'import',
        detail: `Importovano ${deduplicatedTransactions.length} transakci v davce ${batch.id}.`,
        scope: 'portfolio',
        severity: 'info',
      });
      toast({
        title: 'Import dokoncen',
        description: `Importovano ${deduplicatedTransactions.length} transakci.`,
      });
    } catch (error: unknown) {
      console.error('Error importing transactions:', error);
      toast({
        title: 'Chyba importu',
        description: getErrorMessage(error) || 'Nepodarilo se importovat transakce.',
        variant: 'destructive',
      });
    }
  };

  const undoImport = async (batchId: string) => {
    try {
      setTransactions((prev) => prev.filter((transaction) => transaction.import_batch_id !== batchId));
      setImportBatches((prev) => prev.filter((batch) => batch.id !== batchId));
      touchMeta({ last_saved_at: createTimestamp() });
      pushAudit({
        action: 'import-undo',
        detail: `Vracen import ${batchId}.`,
        scope: 'portfolio',
        severity: 'warning',
      });
      toast({ title: 'Import vracen zpet' });
    } catch (error: unknown) {
      console.error('Error undoing import:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se vratit import.',
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
      touchMeta({ last_saved_at: now });
      pushAudit({
        action: 'settings-update',
        detail: `Zmenena reportovaci mena na ${reportingCurrency}.`,
        scope: 'portfolio',
        severity: 'info',
      });
      toast({ title: 'Nastaveni ulozeno' });
    } catch (error: unknown) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo se ulozit nastaveni.',
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
    touchMeta({ last_saved_at: createTimestamp() });
    pushAudit({
      action: 'connector-configured',
      detail: `Konektor ${connectorId} byl oznacen jako pripraveny.`,
      scope: 'sync',
      severity: 'info',
    });
    toast({
      title: 'Konektor pripraven',
      description: 'Konektor byl oznacen jako pripraveny pro dalsi napojeni.',
    });
  };

  const recordPriceRefresh = async (summary: { updated: number; failed: number }) => {
    const now = createTimestamp();
    touchMeta({ last_saved_at: now, last_price_sync_at: now });
    pushAudit({
      action: 'price-refresh',
      detail: `Hromadna aktualizace cen: ${summary.updated} uspesnych, ${summary.failed} neuspesnych.`,
      scope: 'sync',
      severity: summary.failed > 0 ? 'warning' : 'info',
    });
  };

  const exportAccountBackup = async () => {
    const exportedAt = createTimestamp();
    const financeLoaded = await appStorage.getMany(Object.values(FINANCE_AUDIT_STORAGE_KEYS));
    const backup = {
      exportedAt,
      user: {
        id: session?.user.id || null,
        email: session?.user.email || null,
      },
      investment: {
        assets,
        transactions,
        prices,
        exchangeRates,
        importBatches,
        settings,
        connectors,
        creditInvestments,
        creditRepayments,
        trackedInvestments,
        auditLog,
        meta: {
          ...meta,
          last_backup_at: exportedAt,
        },
      },
      finance: {
        transactions: financeLoaded[FINANCE_AUDIT_STORAGE_KEYS.TRANSACTIONS]
          ? JSON.parse(financeLoaded[FINANCE_AUDIT_STORAGE_KEYS.TRANSACTIONS] as string)
          : [],
        monthClosures: financeLoaded[FINANCE_AUDIT_STORAGE_KEYS.MONTH_CLOSURES]
          ? JSON.parse(financeLoaded[FINANCE_AUDIT_STORAGE_KEYS.MONTH_CLOSURES] as string)
          : [],
      },
    };

    downloadJson(`figr-backup-${exportedAt.slice(0, 10)}.json`, backup);
    touchMeta({ last_backup_at: exportedAt, last_saved_at: exportedAt });
    pushAudit({
      action: 'backup-export',
      detail: 'Exportovana kompletni zaloha investic a auditnich dat.',
      scope: 'backup',
      severity: 'info',
    });
    toast({
      title: 'Zaloha exportovana',
      description: 'JSON zaloha byla stazena do zarizeni.',
    });
  };

  const syncStatus = useMemo<InvestmentSyncStatus>(
    () => buildInvestmentSyncStatus(session, meta, dbPath),
    [dbPath, meta, session?.user]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData, session?.user.id]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.ASSETS]: JSON.stringify(assets) });
  }, [assets, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.TRANSACTIONS]: JSON.stringify(transactions) });
  }, [transactions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.PRICES]: JSON.stringify(prices) });
  }, [prices, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.EXCHANGE_RATES]: JSON.stringify(exchangeRates) });
  }, [exchangeRates, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.IMPORT_BATCHES]: JSON.stringify(importBatches) });
  }, [importBatches, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !settings) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.SETTINGS]: JSON.stringify(settings) });
  }, [settings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.CONNECTORS]: JSON.stringify(connectors) });
  }, [connectors, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.CREDIT_INVESTMENTS]: JSON.stringify(creditInvestments) });
  }, [creditInvestments, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.CREDIT_REPAYMENTS]: JSON.stringify(creditRepayments) });
  }, [creditRepayments, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.TRACKED_INVESTMENTS]: JSON.stringify(trackedInvestments) });
  }, [trackedInvestments, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.AUDIT_LOG]: JSON.stringify(auditLog) });
  }, [auditLog, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveInvestmentEntries({ [INVESTMENT_STORAGE_KEYS.META]: JSON.stringify(meta) });
  }, [meta, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void calculatePortfolio();
  }, [assets, transactions, prices, exchangeRates, creditInvestments, trackedInvestments, settings, isHydrated, calculatePortfolio]);

  useEffect(() => {
    if (!isHydrated) return;
    void refreshValidationIssues();
  }, [
    assets,
    transactions,
    prices,
    exchangeRates,
    settings,
    creditInvestments,
    creditRepayments,
    trackedInvestments,
    isHydrated,
    refreshValidationIssues,
  ]);

  return {
    loading,
    assets,
    transactions,
    prices,
    exchangeRates,
    importBatches,
    settings,
    connectors,
    creditInvestments,
    creditRepayments,
    trackedInvestments,
    auditLog,
    meta,
    syncStatus,
    validationIssues,
    portfolioSummary,
    calculatingPortfolio,
    fetchData,
    calculatePortfolio,
    refreshValidationIssues,
    addAsset,
    deleteAsset,
    addTransaction,
    deleteTransaction,
    addPrice,
    addExchangeRate,
    addCreditInvestment,
    updateCreditInvestment,
    deleteCreditInvestment,
    addCreditRepayment,
    deleteCreditRepayment,
    addTrackedInvestment,
    updateTrackedInvestment,
    deleteTrackedInvestment,
    importTransactions,
    undoImport,
    updateSettings,
    markConnectorConfigured,
    recordPriceRefresh,
    exportAccountBackup,
  };
};
