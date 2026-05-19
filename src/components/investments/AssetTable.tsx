import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ASSET_TYPE_LABELS, INVESTMENT_PROVIDER_LABELS, PortfolioAsset } from '@/types/investment';
import { Button } from '@/components/ui/button';
import { ChevronRight, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface AssetTableProps {
  assets: PortfolioAsset[];
  assetsByType: Record<string, { invested: number; value: number | null }>;
  assetsByProvider: Record<string, { invested: number; value: number | null }>;
  assetsByCurrency: Record<string, { invested: number; value: number | null }>;
  assetsBySector: Record<string, { invested: number; value: number | null }>;
  reportingCurrency: string;
  onSelectAsset: (id: string) => void;
  selectedAnalysisAssetId: string | null;
  onSelectAnalysisAsset: (id: string) => void;
  onDeleteAsset: (id: string) => Promise<void>;
}

const formatCurrency = (value: number, currency: string): string =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number): string =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);

const formatQuantity = (value: number): string => {
  if (value < 1) {
    return value.toFixed(8);
  }
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: 4 });
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(217 91% 70%)',
  'hsl(142 71% 55%)',
  'hsl(38 92% 60%)',
  'hsl(0 84% 70%)',
];

export const AssetTable = ({
  assets,
  assetsByType,
  assetsByProvider,
  assetsByCurrency,
  assetsBySector,
  reportingCurrency,
  onSelectAsset,
  selectedAnalysisAssetId,
  onSelectAnalysisAsset,
  onDeleteAsset,
}: AssetTableProps) => {
  const [breakdown, setBreakdown] = useState<'type' | 'provider' | 'currency' | 'sector'>('type');

  const getBreakdownData = () => {
    const data =
      breakdown === 'type'
        ? assetsByType
        : breakdown === 'provider'
          ? assetsByProvider
          : breakdown === 'currency'
            ? assetsByCurrency
            : assetsBySector;

    return Object.entries(data).map(([name, { invested, value }]) => ({
      name:
        breakdown === 'type'
          ? ASSET_TYPE_LABELS[name as keyof typeof ASSET_TYPE_LABELS] || name
          : breakdown === 'provider'
            ? INVESTMENT_PROVIDER_LABELS[name as keyof typeof INVESTMENT_PROVIDER_LABELS] || name
            : name,
      invested,
      value: value || invested,
    }));
  };

  const pieData = getBreakdownData();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Rozdělení portfolia</CardTitle>
            <Tabs value={breakdown} onValueChange={(value) => setBreakdown(value as typeof breakdown)}>
