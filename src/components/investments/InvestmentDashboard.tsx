import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Link2,
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
    portfolioSummary,
    calculatingPortfolio,
    calculatePortfolio,
    addAsset,
    deleteAsset,
    addTransaction,
    deleteTransaction,
    addPrice,
    addExchangeRate,
    addCreditInvestment,
    updateCreditInvestment,
    deleteCreditInvestment,
    importTransactions,
    undoImport,
    updateSettings,
    markConnectorConfigured,
  } = useInvestmentData();

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAnalysisAssetId, setSelectedAnalysisAssetId] = useState<string | null>(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [isWorkflowCollapsed, setIsWorkflowCollapsed] = useState(true);
  const [isConnectorsCollapsed, setIsConnectorsCollapsed] = useState(true);
  const autoRefreshGuardRef = useRef<string | null>(null);

  const selectedAsset = selectedAssetId
    ? portfolioSummary?.assets.find((asset) => asset.id === selectedAssetId) || null
    : null;

  const selectedAnalysisAsset = useMemo(() => {
    if (!selectedAnalysisAssetId) return null;

    const summarizedAsset = portfolioSummary?.assets.find((asset) => asset.id === selectedAnalysisAssetId);
    if (summarizedAsset) {
      return summarizedAsset;
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
  }, [assets, portfolioSummary?.assets, selectedAnalysisAssetId]);

  const selectedAnalysisPrompt = useMemo(() => {
    if (!selectedAnalysisAsset) {
      return '';
    }

    return buildTickerAnalysisPrompt(selectedAnalysisAsset.ticker, selectedAnalysisAsset);
  }, [selectedAnalysisAsset]);

  const assetTransactions = selectedAssetId
    ? transactions.filter((transaction) => transaction.asset_id === selectedAssetId)
    : [];

  const todayIso = new Date().toISOString().slice(0, 10);
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
  };

  const copyPromptToClipboard = async () => {
    if (!selectedAnalysisAsset || !selectedAnalysisPrompt) {
      throw new Error('Nejdřív vyber jeden ticker v seznamu aktiv.');
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
        title: 'Prompt zkopírován',
        description: 'Prompt pro analýzu je ve schránce.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Prompt se nepodařilo zkopírovat.';
      toast({
        title: 'Kopírování selhalo',
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
        throw new Error('Prohlížeč zablokoval otevření nového okna.');
      }

      toast({
        title: target === 'chatgpt' ? 'Otevírám ChatGPT' : 'Otevírám Claude',
        description: 'Prompt je zkopírovaný do schránky. Vlož ho do nové konverzace.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Nepodařilo se otevřít externí AI.';
      toast({
        title: 'Externí AI se neotevřela',
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
    if (assets.length === 0) {
      if (!silent) {
        toast({
          title: 'Žádná aktiva',
          description: 'Nejdřív přidej alespoň jedno aktivum s tickerem.',
        });
      }
      return;
    }

    setUpdatingPrices(true);
    let updated = 0;
    let failed = 0;

    const targetAssets = onlyStale
      ? assets.filter((asset) => latestPriceDateByAsset.get(asset.id) !== todayIso)
      : assets;

    if (targetAssets.length === 0) {
      setUpdatingPrices(false);
      return;
    }

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
        failed += 1;
        console.error(`Price refresh failed for ${asset.ticker}`, error);
      }
    }

    setUpdatingPrices(false);

    if (!silent && updated > 0) {
      toast({
        title: 'Ceny aktualizovány',
        description:
          failed > 0
            ? `Aktualizováno ${updated} titulů, ${failed} se nepodařilo načíst.`
            : `Aktualizováno ${updated} titulů.`,
      });
    } else if (!silent) {
      toast({
        title: 'Aktualizace cen selhala',
        description: 'Nepodařilo se načíst žádnou aktuální cenu z internetu.',
        variant: 'destructive',
      });
    }
  }, [addPrice, assets, latestPriceDateByAsset, todayIso, toast]);

  const handleRefreshPrices = async () => {
    await refreshPrices({ silent: false, onlyStale: false });
  };

  useEffect(() => {
    if (!isOpen || assets.length === 0 || updatingPrices) return;

    const refreshKey = `${assets.length}-${todayIso}`;
    if (autoRefreshGuardRef.current === refreshKey) return;
    autoRefreshGuardRef.current = refreshKey;

    void refreshPrices({ silent: true, onlyStale: true });
  }, [isOpen, assets, todayIso, updatingPrices, refreshPrices]);

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
          <SectionToggle
            title="Investiční workflow a zdroje dat"
            description="Doporučený postup práce s importy, cenami a analytikou."
            collapsed={isWorkflowCollapsed}
            onToggle={() => setIsWorkflowCollapsed((value) => !value)}
          />

          {isWorkflowCollapsed ? null : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4 text-primary" />
                    Doporučený investiční workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 1</p>
                    <p className="font-medium">Načíst data z brokera</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ideálně importem exportu brokera. Šablonu použij jen tehdy, když broker nemá vhodný export.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 2</p>
                    <p className="font-medium">Doplnit ceny a kurzy</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Portfolio pak správně přepočítá hodnotu, ziskovost i měnové přepočty.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 3</p>
                    <p className="font-medium">Vyhodnotit titul v externí AI</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pro detailní analýzu vyber ticker, zkopíruj prompt a otevři ho v ChatGPT nebo Claude.
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
                      Preferovaná cesta pro Trading 212, IBKR a další brokery s dostupným exportem obchodů.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-3">
                    <p className="font-medium">Univerzální šablona FIGR</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Záložní cesta pro ruční doplnění nebo jednorázové čištění dat před importem.
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
                    <p className="flex items-center gap-2 font-medium">
                      <Link2 className="h-4 w-4 text-primary" />
                      Online ceny
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Aktuální ceny načítáme server-side. AI analýzu necháváme na externí službě přes prompt z aplikace.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <SectionToggle
            title="Broker konektory"
            description="Připravené konektory pro napojení brokerů a budoucí synchronizaci."
            collapsed={isConnectorsCollapsed}
            onToggle={() => setIsConnectorsCollapsed((value) => !value)}
          />

          {isConnectorsCollapsed ? null : (
            <BrokerConnectionsPanel connectors={connectors} onMarkConfigured={markConnectorConfigured} />
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void calculatePortfolio()} disabled={calculatingPortfolio}>
              <RefreshCw className={`mr-2 h-4 w-4 ${calculatingPortfolio ? 'animate-spin' : ''}`} />
              Přepočítat portfolio
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleRefreshPrices()} disabled={updatingPrices}>
              <RefreshCw className={`mr-2 h-4 w-4 ${updatingPrices ? 'animate-spin' : ''}`} />
              Aktualizovat ceny
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import brokera / šablony
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Nastavení
            </Button>
            <Button size="sm" onClick={() => setIsAddTransactionOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Přidat ruční transakci
            </Button>
          </div>

          <PortfolioOverview portfolioSummary={portfolioSummary} loading={calculatingPortfolio} />

          <CreditInvestmentsPanel
            creditInvestments={creditInvestments}
            reportingCurrency={settings?.reporting_currency || 'CZK'}
            creditCurrentValue={portfolioSummary?.creditCurrentValue || 0}
            onAddCreditInvestment={addCreditInvestment}
            onUpdateCreditInvestment={updateCreditInvestment}
            onDeleteCreditInvestment={deleteCreditInvestment}
          />

          <Tabs defaultValue="assets" className="space-y-4">
            <TabsList className="flex h-auto flex-wrap gap-1">
              <TabsTrigger value="assets" className="text-xs md:text-sm">
                Aktiva
              </TabsTrigger>
              <TabsTrigger value="prices" className="text-xs md:text-sm">
                Ceny
              </TabsTrigger>
              <TabsTrigger value="dividends" className="text-xs md:text-sm">
                Dividendy
              </TabsTrigger>
              <TabsTrigger value="rates" className="text-xs md:text-sm">
                Směnné kurzy
              </TabsTrigger>
              <TabsTrigger value="imports" className="text-xs md:text-sm">
                Historie importu
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="space-y-4">
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
                          <CardTitle className="text-base">Prompt pro externí AI analýzu</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Vyber ticker, prompt zkopíruj do schránky a otevři ho v ChatGPT nebo Claude.
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
                            Zkopírovat prompt
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpenExternalAnalysis('chatgpt')}
                            disabled={!selectedAnalysisAsset}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Otevřít ChatGPT
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpenExternalAnalysis('claude')}
                            disabled={!selectedAnalysisAsset}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Otevřít Claude
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm">
                        {selectedAnalysisAsset ? (
                          <span>
                            Vybraný ticker:{' '}
                            <span className="font-semibold text-primary">
                              {selectedAnalysisAsset.ticker} · {selectedAnalysisAsset.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Zatím není vybraný žádný ticker pro externí AI analýzu.
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Prompt používá ticker, dostupná tržní data a kontext tvé pozice. Výsledek se už nezobrazuje
                        v aplikaci, ale přímo v otevřené AI službě.
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
        </div>

        <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Přidat transakci</DialogTitle>
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

        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import investičních transakcí</DialogTitle>
            </DialogHeader>
            <InvestmentCSVImport
              onImport={async (data) => {
                await importTransactions(data);
                setIsImportOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nastavení portfolia</DialogTitle>
            </DialogHeader>
            <SettingsPanel
              currentCurrency={settings?.reporting_currency || 'CZK'}
              onSave={async (currency) => {
                await updateSettings(currency);
                setIsSettingsOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};
