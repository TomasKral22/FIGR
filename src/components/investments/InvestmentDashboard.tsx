import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FolderKanban,
  Link2,
  ListFilter,
  Plus,
  RefreshCw,
  Settings,
  Upload,
} from 'lucide-react';
import { useInvestmentData } from '@/hooks/useInvestmentData';
import { PortfolioOverview } from './PortfolioOverview';
import { AssetTable } from './AssetTable';
import { AssetDetail } from './AssetDetail';
import { AddTransactionForm } from './AddTransactionForm';
import { InvestmentCSVImport } from './InvestmentCSVImport';
import { ImportHistory } from './ImportHistory';
import { SettingsPanel } from './SettingsPanel';
import { PriceManagement } from './PriceManagement';
import { ExchangeRateManagement } from './ExchangeRateManagement';
import { DividendOverview } from './DividendOverview';
import { BrokerConnectionsPanel } from './BrokerConnectionsPanel';
import { CreditInvestmentsPanel } from './CreditInvestmentsPanel';
import { TrackedInvestmentsPanel } from './TrackedInvestmentsPanel';
import { InvestmentAuditPanel } from './InvestmentAuditPanel';
import { InvestmentSourcesPanel } from './InvestmentSourcesPanel';
import { InvestmentWorkspacePanels } from './InvestmentWorkspacePanels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildTickerAnalysisPrompt, EXTERNAL_AI_URLS } from '@/services/aiAnalysis';
import { fetchTickerMarketSnapshot, marketSnapshotToAssetPrice } from '@/services/marketData';
import { useToast } from '@/hooks/use-toast';

interface InvestmentDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type InvestmentTabKey = 'assets' | 'prices' | 'dividends' | 'rates' | 'imports';
type InvestmentFocusSection = 'portfolio' | 'tracked' | 'credit' | 'audit' | 'assets';

interface InvestmentSavedView {
  id: string;
  name: string;
  tab: InvestmentTabKey;
  focusSection: InvestmentFocusSection;
  workflowCollapsed: boolean;
  connectorsCollapsed: boolean;
}

const INVESTMENT_DASHBOARD_PREFS_KEY = 'finance_investment_dashboard_prefs';
const INVESTMENT_DASHBOARD_VIEWS_KEY = 'finance_investment_dashboard_saved_views';
const INVESTMENT_DASHBOARD_TIP_KEY = 'finance_investment_dashboard_tip_hidden';
const LEGACY_INVESTMENT_LAYOUT_ENABLED = import.meta.env.VITE_SHOW_LEGACY_INVESTMENT_LAYOUT === 'true';

const DEFAULT_INVESTMENT_VIEWS: InvestmentSavedView[] = [
  {
    id: 'market-overview',
    name: 'Trzni portfolio',
    tab: 'assets',
    focusSection: 'portfolio',
    workflowCollapsed: true,
    connectorsCollapsed: true,
  },
  {
    id: 'tracked-positions',
    name: 'Evidovane pozice',
    tab: 'assets',
    focusSection: 'tracked',
    workflowCollapsed: true,
    connectorsCollapsed: true,
  },
  {
    id: 'credit-investments',
    name: 'Uverove investice',
    tab: 'assets',
    focusSection: 'credit',
    workflowCollapsed: true,
    connectorsCollapsed: true,
  },
  {
    id: 'audit-check',
    name: 'Audit a kontrola',
    tab: 'assets',
    focusSection: 'audit',
    workflowCollapsed: true,
    connectorsCollapsed: true,
  },
];

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
};

const SectionToggle = ({
  title,
  description,
  collapsed,
  onToggle,
}: {
  title: string;
  description: string;
  collapsed: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-left transition-colors hover:bg-card"
    onClick={onToggle}
  >
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
  </button>
);

export const InvestmentDashboard = ({ isOpen, onClose }: InvestmentDashboardProps) => {
  const { toast } = useToast();
  const {
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
    sourceAccounts,
    valueSnapshots,
    auditLog,
    syncStatus,
    validationIssues,
    portfolioSummary,
    calculatingPortfolio,
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
    addSourceAccount,
    updateSourceAccount,
    addValueSnapshot,
    importTransactions,
    undoImport,
    updateSettings,
    markConnectorConfigured,
    recordPriceRefresh,
    exportAccountBackup,
  } = useInvestmentData();

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAnalysisAssetId, setSelectedAnalysisAssetId] = useState<string | null>(null);
  const [isAnalysisActionsOpen, setIsAnalysisActionsOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<InvestmentTabKey>('assets');
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [isWorkflowCollapsed, setIsWorkflowCollapsed] = useState(true);
  const [isConnectorsCollapsed, setIsConnectorsCollapsed] = useState(true);
  const [savedViews, setSavedViews] = useState<InvestmentSavedView[]>([]);
  const [showDashboardTip, setShowDashboardTip] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(INVESTMENT_DASHBOARD_TIP_KEY) !== 'true';
  });
  const [lastPriceRefreshReport, setLastPriceRefreshReport] = useState<{
    ranAt: string;
    updated: number;
    failed: number;
    failures: string[];
  } | null>(null);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const autoRefreshGuardRef = useRef<string | null>(null);
  const portfolioSectionRef = useRef<HTMLDivElement | null>(null);
  const trackedSectionRef = useRef<HTMLDivElement | null>(null);
  const creditSectionRef = useRef<HTMLDivElement | null>(null);
  const auditSectionRef = useRef<HTMLDivElement | null>(null);
  const assetsSectionRef = useRef<HTMLDivElement | null>(null);

  const selectedAsset = selectedAssetId
    ? portfolioSummary?.assets.find((asset) => asset.id === selectedAssetId) || null
    : null;

  const selectedAnalysisAsset = useMemo(() => {
    if (!selectedAnalysisAssetId) return null;

    const summarizedAsset = portfolioSummary?.assets.find((asset) => asset.id === selectedAnalysisAssetId);
    if (summarizedAsset) {
      return summarizedAsset;
    }

    const trackedAsset = trackedInvestments.find((asset) => asset.id === selectedAnalysisAssetId);
    if (trackedAsset) {
      return {
        id: trackedAsset.id,
        ticker: trackedAsset.ticker,
        name: trackedAsset.name,
        asset_type: trackedAsset.asset_type,
        provider: trackedAsset.provider,
        sector: trackedAsset.sector,
        currency: trackedAsset.currency,
        quantity: trackedAsset.quantity || 0,
        avgBuyPrice: 0,
        totalInvested: 0,
        currentPrice: trackedAsset.current_price,
        currentValue: trackedAsset.current_value,
        profitLoss: null,
        profitLossPercent: null,
        currentPriceInReportingCurrency: trackedAsset.current_price,
        currentValueInReportingCurrency: trackedAsset.current_value,
        totalInvestedInReportingCurrency: 0,
        profitLossInReportingCurrency: null,
      };
    }

    const baseAsset = assets.find((asset) => asset.id === selectedAnalysisAssetId);
    if (!baseAsset) {
      return null;
    }

    return {
      id: baseAsset.id,
      ticker: baseAsset.ticker,
      name: baseAsset.name,
      asset_type: baseAsset.asset_type,
      provider: baseAsset.provider,
      sector: baseAsset.sector,
      currency: baseAsset.currency,
      quantity: 0,
      avgBuyPrice: 0,
      totalInvested: 0,
      currentPrice: null,
      currentValue: null,
      profitLoss: null,
      profitLossPercent: null,
      currentPriceInReportingCurrency: null,
      currentValueInReportingCurrency: null,
      totalInvestedInReportingCurrency: 0,
      profitLossInReportingCurrency: null,
    };
  }, [assets, portfolioSummary?.assets, selectedAnalysisAssetId, trackedInvestments]);

  const selectedAnalysisPrompt = useMemo(() => {
    if (!selectedAnalysisAsset) {
      return '';
    }

    return buildTickerAnalysisPrompt(selectedAnalysisAsset.ticker, selectedAnalysisAsset);
  }, [selectedAnalysisAsset]);

  const assetTransactions = selectedAssetId
    ? transactions.filter((transaction) => transaction.asset_id === selectedAssetId)
    : [];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const rawPrefs = window.localStorage.getItem(INVESTMENT_DASHBOARD_PREFS_KEY);
      if (rawPrefs) {
        const parsed = JSON.parse(rawPrefs) as Partial<{
          activeTab: InvestmentTabKey;
          workflowCollapsed: boolean;
          connectorsCollapsed: boolean;
        }>;

        if (parsed.activeTab) setActiveTab(parsed.activeTab);
        if (typeof parsed.workflowCollapsed === 'boolean') setIsWorkflowCollapsed(parsed.workflowCollapsed);
        if (typeof parsed.connectorsCollapsed === 'boolean') setIsConnectorsCollapsed(parsed.connectorsCollapsed);
      }

      const rawViews = window.localStorage.getItem(INVESTMENT_DASHBOARD_VIEWS_KEY);
      if (rawViews) {
        setSavedViews(JSON.parse(rawViews) as InvestmentSavedView[]);
      }
    } catch {
      setSavedViews([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      INVESTMENT_DASHBOARD_PREFS_KEY,
      JSON.stringify({
        activeTab,
        workflowCollapsed: isWorkflowCollapsed,
        connectorsCollapsed: isConnectorsCollapsed,
      })
    );
  }, [activeTab, isConnectorsCollapsed, isWorkflowCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(INVESTMENT_DASHBOARD_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  const latestPriceDateByAsset = useMemo(() => {
    const map = new Map<string, string>();
    for (const price of prices) {
      const current = map.get(price.asset_id);
      if (!current || price.price_date > current) {
        map.set(price.asset_id, price.price_date);
      }
    }
    return map;
  }, [prices]);

  const handleDeleteAsset = async (assetId: string) => {
    await deleteAsset(assetId);

    if (selectedAssetId === assetId) {
      setSelectedAssetId(null);
    }

    if (selectedAnalysisAssetId === assetId) {
      setSelectedAnalysisAssetId(null);
    }
  };

  const handleSelectAnalysisAsset = (id: string) => {
    setSelectedAssetId(null);
    setSelectedAnalysisAssetId(id);
    setIsAnalysisActionsOpen(true);
  };

  const sectionRefs = useMemo(
    () => ({
      portfolio: portfolioSectionRef,
      tracked: trackedSectionRef,
      credit: creditSectionRef,
      audit: auditSectionRef,
      assets: assetsSectionRef,
    }),
    []
  );

  const scrollToSection = useCallback(
    (section: InvestmentFocusSection) => {
      sectionRefs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [sectionRefs]
  );

  const applySavedView = useCallback(
    (view: InvestmentSavedView) => {
      setActiveTab(view.tab);
      setIsWorkflowCollapsed(view.workflowCollapsed);
      setIsConnectorsCollapsed(view.connectorsCollapsed);
      requestAnimationFrame(() => {
        scrollToSection(view.focusSection);
      });
    },
    [scrollToSection]
  );

  const handleSaveCurrentView = () => {
    const name = window.prompt('Nazev pohledu');
    if (!name || !name.trim()) return;

    const nextView: InvestmentSavedView = {
      id: `${Date.now()}`,
      name: name.trim(),
      tab: activeTab,
      focusSection:
        activeTab === 'assets'
          ? selectedAsset
            ? 'assets'
            : selectedAnalysisAsset
              ? 'assets'
              : 'portfolio'
          : 'assets',
      workflowCollapsed: isWorkflowCollapsed,
      connectorsCollapsed: isConnectorsCollapsed,
    };

    setSavedViews((current) => [nextView, ...current].slice(0, 8));
    toast({
      title: 'Pohled ulozen',
      description: `Ulozil jsem pohled "${name.trim()}".`,
    });
  };

  const handleDeleteSavedView = (viewId: string) => {
    setSavedViews((current) => current.filter((view) => view.id !== viewId));
  };

  const copyPromptToClipboard = async () => {
    if (!selectedAnalysisAsset || !selectedAnalysisPrompt) {
      throw new Error('Nejdriv vyber jeden ticker v seznamu aktiv.');
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(selectedAnalysisPrompt);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = selectedAnalysisPrompt;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const handleCopyAnalysisPrompt = async () => {
    try {
      await copyPromptToClipboard();
      toast({
        title: 'Prompt zkopirovan',
        description: 'Prompt pro analyzu je ve schrance.',
      });
      setIsAnalysisActionsOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Prompt se nepodarilo zkopirovat.';
      toast({
        title: 'Kopirovani selhalo',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenExternalAnalysis = async (target: keyof typeof EXTERNAL_AI_URLS) => {
    try {
      await copyPromptToClipboard();

      const opened = window.open(EXTERNAL_AI_URLS[target], '_blank', 'noopener,noreferrer');
      if (!opened) {
        throw new Error('Prohlizec zablokoval otevreni noveho okna.');
      }

      toast({
        title: target === 'chatgpt' ? 'Oteviram ChatGPT' : 'Oteviram Claude',
        description: 'Prompt je zkopirovany do schranky. Vloz ho do nove konverzace.',
      });
      setIsAnalysisActionsOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Nepodarilo se otevrit externi AI.';
      toast({
        title: 'Externi AI se neotevrela',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const refreshPrices = useCallback(async ({
    silent = false,
    onlyStale = false,
  }: {
    silent?: boolean;
    onlyStale?: boolean;
  } = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    const failures: string[] = [];
    let updated = 0;

    const marketAssetTypes = new Set(['stock', 'etf', 'crypto', 'bond', 'commodity']);
    const positionSourceIds = new Set(
      sourceAccounts.filter((source) => source.valuation_mode === 'positions').map((source) => source.id)
    );
    const refreshableAssets = assets.filter(
      (asset) =>
        marketAssetTypes.has(asset.asset_type) &&
        (!asset.source_account_id || positionSourceIds.has(asset.source_account_id))
    );
    const targetAssets = onlyStale
      ? refreshableAssets.filter((asset) => latestPriceDateByAsset.get(asset.id) !== today)
      : refreshableAssets;

    const targetTracked = trackedInvestments.filter((investment) => {
      if (!investment.ticker) return false;
      if (!onlyStale) return true;
      return investment.last_price_synced_at?.slice(0, 10) !== today;
    });

    if (targetAssets.length === 0 && targetTracked.length === 0) {
      if (!silent) {
        toast({
          title: 'Zadne tickerove polozky',
          description: 'Nejdriiv pridej alespon jedno aktivum nebo evidovanou pozici s tickerem.',
        });
      }
      return;
    }

    setUpdatingPrices(true);

    for (const asset of targetAssets) {
      try {
        const snapshot = await fetchTickerMarketSnapshot(asset.ticker);
        const nextPrice = marketSnapshotToAssetPrice(asset, snapshot);
        await addPrice(
          {
            asset_id: nextPrice.asset_id,
            price: nextPrice.price,
            currency: nextPrice.currency,
            price_date: nextPrice.price_date,
          },
          { silent: true }
        );
        updated += 1;
      } catch (error) {
        failures.push(`${asset.ticker}: ${getErrorMessage(error) || 'chyba nacteni ceny'}`);
      }
    }

    const syncedAt = new Date().toISOString();
    for (const tracked of targetTracked) {
      try {
        const snapshot = await fetchTickerMarketSnapshot(tracked.ticker);
        const nextPrice = snapshot.regularMarketPrice;
        if (nextPrice == null) {
          throw new Error('chybi trzni cena');
        }

        await updateTrackedInvestment(
          tracked.id,
          {
            current_price: nextPrice,
            current_value: tracked.quantity ? tracked.quantity * nextPrice : tracked.current_value,
            last_price_synced_at: syncedAt,
          },
          { silent: true }
        );
        updated += 1;
      } catch (error) {
        failures.push(`${tracked.ticker}: ${getErrorMessage(error) || 'chyba nacteni ceny'}`);
      }
    }

    setUpdatingPrices(false);

    const report = {
      ranAt: syncedAt,
      updated,
      failed: failures.length,
      failures,
    };
    setLastPriceRefreshReport(report);
    await recordPriceRefresh({ updated, failed: failures.length });

    if (!silent && updated > 0) {
      toast({
        title: 'Ceny aktualizovany',
        description:
          failures.length > 0
            ? `Aktualizovano ${updated} polozek, ${failures.length} se nepodarilo nacist.`
            : `Aktualizovano ${updated} polozek.`,
      });
    } else if (!silent) {
      toast({
        title: 'Aktualizace cen selhala',
        description: 'Nepodarilo se nacist zadnou aktualni cenu z internetu.',
        variant: 'destructive',
      });
    }
  }, [addPrice, assets, latestPriceDateByAsset, recordPriceRefresh, sourceAccounts, toast, trackedInvestments, updateTrackedInvestment]);

  const handleRefreshPrices = useCallback(async () => {
    await refreshPrices({ silent: false, onlyStale: false });
  }, [refreshPrices]);

  useEffect(() => {
    if (!isOpen || (assets.length === 0 && trackedInvestments.length === 0) || updatingPrices) return;

    const today = new Date().toISOString().slice(0, 10);
    const refreshKey = `${assets.length}-${trackedInvestments.length}-${today}`;
    if (autoRefreshGuardRef.current === refreshKey) return;
    autoRefreshGuardRef.current = refreshKey;

    void refreshPrices({ silent: true, onlyStale: true });
  }, [isOpen, assets, trackedInvestments, updatingPrices, refreshPrices]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || !event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === 'r') {
        event.preventDefault();
        void handleRefreshPrices();
      } else if (key === 'i') {
        event.preventDefault();
        setIsImportOpen(true);
      } else if (key === 'n') {
        event.preventDefault();
        setIsAddTransactionOpen(true);
      } else if (key === '1') {
        event.preventDefault();
        applySavedView(DEFAULT_INVESTMENT_VIEWS[0]);
      } else if (key === '2') {
        event.preventDefault();
        applySavedView(DEFAULT_INVESTMENT_VIEWS[1]);
      } else if (key === '3') {
        event.preventDefault();
        applySavedView(DEFAULT_INVESTMENT_VIEWS[2]);
      } else if (key === '4') {
        event.preventDefault();
        applySavedView(DEFAULT_INVESTMENT_VIEWS[3]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applySavedView, handleRefreshPrices, isOpen]);

  const dismissDashboardTip = () => {
    setShowDashboardTip(false);
    window.localStorage.setItem(INVESTMENT_DASHBOARD_TIP_KEY, 'true');
  };

  const investmentPanels = {
    workflow: (
      <>
        <SectionToggle
          title="Investicni workflow a zdroje dat"
          description="Doporuceny postup prace s importy, cenami a analytikou."
          collapsed={isWorkflowCollapsed}
          onToggle={() => setIsWorkflowCollapsed((value) => !value)}
        />

        {isWorkflowCollapsed ? null : (
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-primary" />
                  Doporuceny investicni workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 1</p>
                  <p className="font-medium">Nacist data z brokera</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Idealne importem exportu brokera. Sablonu pouzij jen tehdy, kdyz broker nema vhodny export.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 2</p>
                  <p className="font-medium">Doplnit ceny a kurzy</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Portfolio pak spravne prepocita hodnotu, ziskovost i menove prepočty.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 3</p>
                  <p className="font-medium">Vyhodnotit titul v externi AI</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pro detailni analyzu vyber ticker, zkopiruj prompt a otevri ho v ChatGPT nebo Claude.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Zdroje dat</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="font-medium">Export brokera</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Preferovana cesta pro Trading 212, IBKR a dalsi brokery s dostupnym exportem obchodu.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="font-medium">Univerzalni sablona FIGR</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Zalozni cesta pro rucni doplneni nebo jednorazove cisteni dat pred importem.
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                  <p className="flex items-center gap-2 font-medium">
                    <Link2 className="h-4 w-4 text-primary" />
                    Online ceny a audit
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aktualni ceny nacitame server-side. Validace dat a audit bezne ukazuji, co chybi nebo co je zastarale.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    ),
    connectors: (
      <>
        <SectionToggle
          title="Broker konektory"
          description="Pripravene konektory pro napojeni brokeru a budoucí synchronizaci."
          collapsed={isConnectorsCollapsed}
          onToggle={() => setIsConnectorsCollapsed((value) => !value)}
        />
        {isConnectorsCollapsed ? null : (
          <div className="mt-4">
            <BrokerConnectionsPanel connectors={connectors} onMarkConfigured={markConnectorConfigured} />
          </div>
        )}
      </>
    ),
    actions: (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void calculatePortfolio()} disabled={calculatingPortfolio}>
          <RefreshCw className={`mr-2 h-4 w-4 ${calculatingPortfolio ? 'animate-spin' : ''}`} />
          Prepocitat portfolio
        </Button>
        <Button variant="outline" size="sm" onClick={() => void handleRefreshPrices()} disabled={updatingPrices}>
          <RefreshCw className={`mr-2 h-4 w-4 ${updatingPrices ? 'animate-spin' : ''}`} />
          Aktualizovat ceny
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import brokera / sablony
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Nastaveni
        </Button>
        <Button size="sm" onClick={() => setIsAddTransactionOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Pridat rucni transakci
        </Button>
      </div>
    ),
    audit: (
      <div ref={auditSectionRef}>
        <InvestmentAuditPanel
          syncStatus={syncStatus}
          validationIssues={validationIssues}
          auditLog={auditLog}
          onRefreshAudit={refreshValidationIssues}
          onExportBackup={exportAccountBackup}
          lastPriceRefreshReport={lastPriceRefreshReport}
        />
      </div>
    ),
    portfolio: (
      <div ref={portfolioSectionRef}>
        <PortfolioOverview portfolioSummary={portfolioSummary} loading={calculatingPortfolio} />
      </div>
    ),
    sources: (
      <InvestmentSourcesPanel
        sourceAccounts={sourceAccounts}
        valueSnapshots={valueSnapshots}
        onAddSourceAccount={addSourceAccount}
        onUpdateSourceAccount={updateSourceAccount}
        onAddValueSnapshot={addValueSnapshot}
      />
    ),
    tracked: (
      <div ref={trackedSectionRef}>
        <TrackedInvestmentsPanel
          trackedInvestments={trackedInvestments}
          reportingCurrency={settings?.reporting_currency || 'CZK'}
          onAddTrackedInvestment={addTrackedInvestment}
          onUpdateTrackedInvestment={updateTrackedInvestment}
          onDeleteTrackedInvestment={deleteTrackedInvestment}
        />
      </div>
    ),
    credit: (
      <div ref={creditSectionRef}>
        <CreditInvestmentsPanel
          creditInvestments={creditInvestments}
          creditRepayments={creditRepayments}
          reportingCurrency={settings?.reporting_currency || 'CZK'}
          creditCurrentValue={portfolioSummary?.creditCurrentValue || 0}
          onAddCreditInvestment={addCreditInvestment}
          onUpdateCreditInvestment={updateCreditInvestment}
          onDeleteCreditInvestment={deleteCreditInvestment}
          onAddCreditRepayment={addCreditRepayment}
          onDeleteCreditRepayment={deleteCreditRepayment}
        />
      </div>
    ),
    marketAssets: (
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InvestmentTabKey)} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="assets" className="text-xs md:text-sm">Aktiva</TabsTrigger>
          <TabsTrigger value="prices" className="text-xs md:text-sm">Ceny</TabsTrigger>
          <TabsTrigger value="dividends" className="text-xs md:text-sm">Dividendy</TabsTrigger>
          <TabsTrigger value="rates" className="text-xs md:text-sm">Smenne kurzy</TabsTrigger>
          <TabsTrigger value="imports" className="text-xs md:text-sm">Historie importu</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <div ref={assetsSectionRef} />
          {selectedAsset ? (
            <AssetDetail
              asset={selectedAsset}
              transactions={assetTransactions}
              prices={prices.filter((price) => price.asset_id === selectedAssetId)}
              reportingCurrency={settings?.reporting_currency || 'CZK'}
              onBack={() => setSelectedAssetId(null)}
              onDeleteAsset={handleDeleteAsset}
              onDeleteTransaction={deleteTransaction}
              onAddPrice={addPrice}
            />
          ) : (
            <>
              <Card className="border-border/70 bg-card/80">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-base">Prompt pro externi AI analyzu</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Vyber ticker, prompt zkopiruj do schranky a otevri ho v ChatGPT nebo Claude.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void handleCopyAnalysisPrompt()} disabled={!selectedAnalysisAsset}>
                        <Copy className="mr-2 h-4 w-4" />
                        Zkopirovat prompt
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void handleOpenExternalAnalysis('chatgpt')} disabled={!selectedAnalysisAsset}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Otevrit ChatGPT
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void handleOpenExternalAnalysis('claude')} disabled={!selectedAnalysisAsset}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Otevrit Claude
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm">
                    {selectedAnalysisAsset ? (
                      <span>
                        Vybrany ticker:{' '}
                        <span className="font-semibold text-primary">
                          {selectedAnalysisAsset.ticker} · {selectedAnalysisAsset.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Zatim neni vybrany zadny ticker pro externi AI analyzu.</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prompt pouziva ticker, dostupna trzni data a kontext tve pozice. Vysledek se zobrazi primo v otevrene AI sluzbe.
                  </p>
                </CardContent>
              </Card>

              <AssetTable
                assets={portfolioSummary?.assets || []}
                assetsByType={portfolioSummary?.assetsByType || {}}
                assetsByProvider={portfolioSummary?.assetsByProvider || {}}
                assetsByCurrency={portfolioSummary?.assetsByCurrency || {}}
                assetsBySector={portfolioSummary?.assetsBySector || {}}
                reportingCurrency={settings?.reporting_currency || 'CZK'}
                onSelectAsset={setSelectedAssetId}
                selectedAnalysisAssetId={selectedAnalysisAssetId}
                onDeleteAsset={handleDeleteAsset}
                onSelectAnalysisAsset={handleSelectAnalysisAsset}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="prices">
          <PriceManagement assets={assets} prices={prices} onAddPrice={addPrice} />
        </TabsContent>

        <TabsContent value="dividends">
          <DividendOverview
            assets={assets}
            transactions={transactions}
            reportingCurrency={settings?.reporting_currency || 'CZK'}
          />
        </TabsContent>

        <TabsContent value="rates">
          <ExchangeRateManagement exchangeRates={exchangeRates} onAddExchangeRate={addExchangeRate} />
        </TabsContent>

        <TabsContent value="imports" className="space-y-4">
          <ImportHistory batches={importBatches} onUndoImport={undoImport} />
        </TabsContent>
      </Tabs>
    ),
  } satisfies Parameters<typeof InvestmentWorkspacePanels>[0]['panels'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-[95vw] md:p-6">
        <SheetHeader className="pb-4">
          <SheetTitle>Investice</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 md:space-y-6">
          {showDashboardTip ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-primary">Investicni pracovni prostor</p>
                  <p className="text-muted-foreground">
                    Alt + 1 az 4 prepina rychle pohledy. Alt + R obnovi ceny, Alt + I otevre import a Alt + N novou rucni transakci.
                    Ulozene pohledy si pamatuji aktivni sekci i stav panelu.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={dismissDashboardTip}>
                  Rozumim
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/70 bg-card/80">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    Pohledy investic
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pouzij rychle pohledy nebo si uloz vlastni pracovni rozlozeni dashboardu.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleSaveCurrentView}>
                  <ListFilter className="mr-2 h-4 w-4" />
                  Ulozit aktualni pohled
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {DEFAULT_INVESTMENT_VIEWS.map((view, index) => (
                  <Button key={view.id} type="button" variant="outline" size="sm" onClick={() => applySavedView(view)}>
                    {index + 1}. {view.name}
                  </Button>
                ))}
              </div>

              {savedViews.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {savedViews.map((view) => (
                    <div key={view.id} className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2 py-1 text-sm">
                      <button type="button" className="px-1 text-left" onClick={() => applySavedView(view)}>
                        {view.name}
                      </button>
                      <button
                        type="button"
                        className="rounded-full px-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => handleDeleteSavedView(view.id)}
                        aria-label={`Smazat pohled ${view.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <InvestmentWorkspacePanels panels={investmentPanels} editing={isLayoutEditing} />

          {LEGACY_INVESTMENT_LAYOUT_ENABLED ? (
            <>

          <SectionToggle
            title="Investicni workflow a zdroje dat"
            description="Doporuceny postup prace s importy, cenami a analytikou."
            collapsed={isWorkflowCollapsed}
            onToggle={() => setIsWorkflowCollapsed((value) => !value)}
          />

          {isWorkflowCollapsed ? null : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4 text-primary" />
                    Doporuceny investicni workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 1</p>
                    <p className="font-medium">Nacist data z brokera</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Idealne importem exportu brokera. Sablonu pouzij jen tehdy, kdyz broker nema vhodny export.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 2</p>
                    <p className="font-medium">Doplnit ceny a kurzy</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Portfolio pak spravne prepocita hodnotu, ziskovost i menove prepočty.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 3</p>
                    <p className="font-medium">Vyhodnotit titul v externi AI</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pro detailni analyzu vyber ticker, zkopiruj prompt a otevri ho v ChatGPT nebo Claude.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Zdroje dat</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="font-medium">Export brokera</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Preferovana cesta pro Trading 212, IBKR a dalsi brokery s dostupnym exportem obchodu.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="font-medium">Univerzalni sablona FIGR</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Zalozni cesta pro rucni doplneni nebo jednorazove cisteni dat pred importem.
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                    <p className="flex items-center gap-2 font-medium">
                      <Link2 className="h-4 w-4 text-primary" />
                      Online ceny a audit
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Aktualni ceny nacitame server-side. Validace dat a audit bezne ukazuji, co chybi nebo co je zastarale.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <SectionToggle
            title="Broker konektory"
            description="Pripravene konektory pro napojeni brokeru a budoucí synchronizaci."
            collapsed={isConnectorsCollapsed}
            onToggle={() => setIsConnectorsCollapsed((value) => !value)}
          />

          {isConnectorsCollapsed ? null : (
            <BrokerConnectionsPanel connectors={connectors} onMarkConfigured={markConnectorConfigured} />
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void calculatePortfolio()} disabled={calculatingPortfolio}>
              <RefreshCw className={`mr-2 h-4 w-4 ${calculatingPortfolio ? 'animate-spin' : ''}`} />
              Prepocitat portfolio
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleRefreshPrices()} disabled={updatingPrices}>
              <RefreshCw className={`mr-2 h-4 w-4 ${updatingPrices ? 'animate-spin' : ''}`} />
              Aktualizovat ceny
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import brokera / sablony
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Nastaveni
            </Button>
            <Button size="sm" onClick={() => setIsAddTransactionOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Pridat rucni transakci
            </Button>
          </div>

          <div ref={auditSectionRef}>
            <InvestmentAuditPanel
              syncStatus={syncStatus}
              validationIssues={validationIssues}
              auditLog={auditLog}
              onRefreshAudit={refreshValidationIssues}
              onExportBackup={exportAccountBackup}
              lastPriceRefreshReport={lastPriceRefreshReport}
            />
          </div>

          <div ref={portfolioSectionRef}>
            <PortfolioOverview portfolioSummary={portfolioSummary} loading={calculatingPortfolio} />
          </div>

          <div ref={trackedSectionRef}>
            <TrackedInvestmentsPanel
              trackedInvestments={trackedInvestments}
              reportingCurrency={settings?.reporting_currency || 'CZK'}
              onAddTrackedInvestment={addTrackedInvestment}
              onUpdateTrackedInvestment={updateTrackedInvestment}
              onDeleteTrackedInvestment={deleteTrackedInvestment}
            />
          </div>

          <div ref={creditSectionRef}>
            <CreditInvestmentsPanel
              creditInvestments={creditInvestments}
              creditRepayments={creditRepayments}
              reportingCurrency={settings?.reporting_currency || 'CZK'}
              creditCurrentValue={portfolioSummary?.creditCurrentValue || 0}
              onAddCreditInvestment={addCreditInvestment}
              onUpdateCreditInvestment={updateCreditInvestment}
              onDeleteCreditInvestment={deleteCreditInvestment}
              onAddCreditRepayment={addCreditRepayment}
              onDeleteCreditRepayment={deleteCreditRepayment}
            />
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InvestmentTabKey)} className="space-y-4">
            <TabsList className="flex h-auto flex-wrap gap-1">
              <TabsTrigger value="assets" className="text-xs md:text-sm">Aktiva</TabsTrigger>
              <TabsTrigger value="prices" className="text-xs md:text-sm">Ceny</TabsTrigger>
              <TabsTrigger value="dividends" className="text-xs md:text-sm">Dividendy</TabsTrigger>
              <TabsTrigger value="rates" className="text-xs md:text-sm">Smenne kurzy</TabsTrigger>
              <TabsTrigger value="imports" className="text-xs md:text-sm">Historie importu</TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="space-y-4">
              <div ref={assetsSectionRef} />
              {selectedAsset ? (
                <AssetDetail
                  asset={selectedAsset}
                  transactions={assetTransactions}
                  prices={prices.filter((price) => price.asset_id === selectedAssetId)}
                  reportingCurrency={settings?.reporting_currency || 'CZK'}
                  onBack={() => setSelectedAssetId(null)}
                  onDeleteAsset={handleDeleteAsset}
                  onDeleteTransaction={deleteTransaction}
                  onAddPrice={addPrice}
                />
              ) : (
                <>
                  <Card className="border-border/70 bg-card/80">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <CardTitle className="text-base">Prompt pro externi AI analyzu</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Vyber ticker, prompt zkopiruj do schranky a otevri ho v ChatGPT nebo Claude.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleCopyAnalysisPrompt()}
                            disabled={!selectedAnalysisAsset}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Zkopirovat prompt
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpenExternalAnalysis('chatgpt')}
                            disabled={!selectedAnalysisAsset}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Otevrit ChatGPT
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpenExternalAnalysis('claude')}
                            disabled={!selectedAnalysisAsset}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Otevrit Claude
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm">
                        {selectedAnalysisAsset ? (
                          <span>
                            Vybrany ticker:{' '}
                            <span className="font-semibold text-primary">
                              {selectedAnalysisAsset.ticker} · {selectedAnalysisAsset.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Zatim neni vybrany zadny ticker pro externi AI analyzu.
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Prompt pouziva ticker, dostupna trzni data a kontext tve pozice. Vysledek se zobrazi primo v otevrene AI sluzbe.
                      </p>
                    </CardContent>
                  </Card>

                  <AssetTable
                    assets={portfolioSummary?.assets || []}
                    assetsByType={portfolioSummary?.assetsByType || {}}
                    assetsByProvider={portfolioSummary?.assetsByProvider || {}}
                    assetsByCurrency={portfolioSummary?.assetsByCurrency || {}}
                    assetsBySector={portfolioSummary?.assetsBySector || {}}
                    reportingCurrency={settings?.reporting_currency || 'CZK'}
                    onSelectAsset={setSelectedAssetId}
                    selectedAnalysisAssetId={selectedAnalysisAssetId}
                    onDeleteAsset={handleDeleteAsset}
                    onSelectAnalysisAsset={handleSelectAnalysisAsset}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="prices">
              <PriceManagement assets={assets} prices={prices} onAddPrice={addPrice} />
            </TabsContent>

            <TabsContent value="dividends">
              <DividendOverview portfolioSummary={portfolioSummary} />
            </TabsContent>

            <TabsContent value="rates">
              <ExchangeRateManagement
                exchangeRates={exchangeRates}
                reportingCurrency={settings?.reporting_currency || 'CZK'}
                onAddRate={addExchangeRate}
              />
            </TabsContent>

            <TabsContent value="imports">
              <ImportHistory batches={importBatches} onUndoImport={undoImport} />
            </TabsContent>
          </Tabs>
            </>
          ) : null}
        </div>

        <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
          <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
            <DialogHeader>
              <DialogTitle>Pridat transakci</DialogTitle>
            </DialogHeader>
            <AddTransactionForm
              assets={assets}
              onAddAsset={addAsset}
              onAddTransaction={async (transaction) => {
                await addTransaction(transaction);
                setIsAddTransactionOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isAnalysisActionsOpen} onOpenChange={setIsAnalysisActionsOpen}>
          <DialogContent className="max-w-[calc(100vw-1.5rem)] p-4 sm:max-w-lg sm:p-6">
            <DialogHeader>
              <DialogTitle>Externi AI analyza</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-3 text-sm">
                {selectedAnalysisAsset ? (
                  <div className="space-y-1">
                    <p>
                      Vybrany ticker:{' '}
                      <span className="font-semibold text-primary">
                        {selectedAnalysisAsset.ticker} · {selectedAnalysisAsset.name}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Vyber cilovou AI sluzbu. Prompt se pred otevrenim zkopiruje do schranky.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nejdriv vyber ticker v seznamu aktiv.</p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopyAnalysisPrompt()}
                  disabled={!selectedAnalysisAsset}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Zkopirovat prompt
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleOpenExternalAnalysis('chatgpt')}
                  disabled={!selectedAnalysisAsset}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  ChatGPT
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleOpenExternalAnalysis('claude')}
                  disabled={!selectedAnalysisAsset}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Claude
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
            <DialogHeader>
              <DialogTitle>Import investicnich transakci</DialogTitle>
            </DialogHeader>
            <InvestmentCSVImport
              sourceAccounts={sourceAccounts}
              onImport={async (data) => {
                await importTransactions(data);
                setIsImportOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
            <DialogHeader>
              <DialogTitle>Nastaveni portfolia</DialogTitle>
            </DialogHeader>
            <SettingsPanel
              currentCurrency={settings?.reporting_currency || 'CZK'}
              onSave={async (currency) => {
                await updateSettings(currency);
                setIsSettingsOpen(false);
              }}
              isLayoutEditing={isLayoutEditing}
              onToggleLayoutEditing={() => setIsLayoutEditing((current) => !current)}
            />
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};
