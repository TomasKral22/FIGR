import { useState } from 'react';
import { Link2, Plus, RefreshCw, Settings, Sparkles, Upload } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InvestmentDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvestmentDashboard = ({ isOpen, onClose }: InvestmentDashboardProps) => {
  const {
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
  } = useInvestmentData();

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const selectedAsset = selectedAssetId
    ? portfolioSummary?.assets.find((asset) => asset.id === selectedAssetId)
    : null;

  const assetTransactions = selectedAssetId
    ? transactions.filter((transaction) => transaction.asset_id === selectedAssetId)
    : [];

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
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Doporučený investiční workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 bg-card p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Krok 1</p>
                  <p className="font-medium">Načíst data z brokera</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ideálně importem exportu brokera. Šablonu použij jen tehdy, když broker nemá
                    vhodný export.
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
                  <p className="font-medium">Sledovat dividendy a výkon</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Jakmile jsou data nahraná, přehled se dopočítá automaticky a zůstává průběžně
                    aktualizovaný.
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
                    Preferovaná cesta pro Trading 212, IBKR a další brokery s dostupným exportem
                    obchodů.
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
                    API synchronizace
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Připravujeme jen pro brokery s oficiálním a stabilním API. U ostatních zůstává
                    doporučený import exportů.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <BrokerConnectionsPanel connectors={connectors} onMarkConfigured={markConnectorConfigured} />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => calculatePortfolio()} disabled={calculatingPortfolio}>
              <RefreshCw className={`mr-2 h-4 w-4 ${calculatingPortfolio ? 'animate-spin' : ''}`} />
              Přepočítat
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

          <Tabs defaultValue="assets" className="space-y-4">
            <TabsList className="flex h-auto flex-wrap gap-1">
              <TabsTrigger value="assets" className="text-xs md:text-sm">Aktiva</TabsTrigger>
              <TabsTrigger value="prices" className="text-xs md:text-sm">Ceny</TabsTrigger>
              <TabsTrigger value="dividends" className="text-xs md:text-sm">Dividendy</TabsTrigger>
              <TabsTrigger value="rates" className="text-xs md:text-sm">Směnné kurzy</TabsTrigger>
              <TabsTrigger value="imports" className="text-xs md:text-sm">Historie importu</TabsTrigger>
            </TabsList>

            <TabsContent value="assets" className="space-y-4">
              {selectedAsset ? (
                <AssetDetail
                  asset={selectedAsset}
                  transactions={assetTransactions}
                  prices={prices.filter((price) => price.asset_id === selectedAssetId)}
                  reportingCurrency={settings?.reporting_currency || 'CZK'}
                  onBack={() => setSelectedAssetId(null)}
                  onDeleteTransaction={deleteTransaction}
                  onAddPrice={addPrice}
                />
              ) : (
                <AssetTable
                  assets={portfolioSummary?.assets || []}
                  assetsByType={portfolioSummary?.assetsByType || {}}
                  assetsByProvider={portfolioSummary?.assetsByProvider || {}}
                  assetsByCurrency={portfolioSummary?.assetsByCurrency || {}}
                  assetsBySector={portfolioSummary?.assetsBySector || {}}
                  reportingCurrency={settings?.reporting_currency || 'CZK'}
                  onSelectAsset={setSelectedAssetId}
                />
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
