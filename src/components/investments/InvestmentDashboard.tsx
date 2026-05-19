import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Link2,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
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
import { TickerAnalysisPanel } from './TickerAnalysisPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketSnapshot, TickerAnalysisResult, TickerAnalysisStatus } from '@/types/investment';
import { generateTickerAnalysis } from '@/services/aiAnalysis';
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
    portfolioSummary,
    calculatingPortfolio,
    calculatePortfolio,
    addAsset,
    deleteAsset,
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
  const [selectedAnalysisAssetId, setSelectedAnalysisAssetId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<TickerAnalysisStatus>('idle');
  const [analysisResult, setAnalysisResult] = useState<TickerAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisMarketSnapshot, setAnalysisMarketSnapshot] = useState<MarketSnapshot | null>(null);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [isWorkflowCollapsed, setIsWorkflowCollapsed] = useState(true);
