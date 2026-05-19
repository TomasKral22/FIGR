import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ASSET_TYPE_LABELS, INVESTMENT_PROVIDER_LABELS, PortfolioAsset } from '@/types/investment';
import { CheckCircle2, ChevronRight, Circle, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
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
              <TabsList>
                <TabsTrigger value="type">Typ</TabsTrigger>
                <TabsTrigger value="provider">Poskytovatel</TabsTrigger>
                <TabsTrigger value="currency">Měna</TabsTrigger>
                <TabsTrigger value="sector">Sektor</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Investováno: {formatCurrency(data.invested, reportingCurrency)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Hodnota: {formatCurrency(data.value, reportingCurrency)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Zatím žádná aktiva</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Přehled aktiv</CardTitle>
            <p className="text-sm text-muted-foreground">
              Vyber jeden ticker pro AI analýzu a kliknutím na řádek otevři detail aktiva.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {assets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">AI</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Poskytovatel</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Množství</TableHead>
                  <TableHead className="text-right">Akt. cena</TableHead>
                  <TableHead className="text-right">Hodnota</TableHead>
                  <TableHead className="text-right">Investováno</TableHead>
                  <TableHead className="text-right">Zisk / ztráta</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const isProfit = (asset.profitLossInReportingCurrency ?? 0) >= 0;
                  const isSelected = selectedAnalysisAssetId === asset.id;

                  return (
                    <TableRow
                      key={asset.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''
                      }`}
                      onClick={() => onSelectAsset(asset.id)}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background/60 text-muted-foreground hover:border-primary/50'
                          }`}
                          aria-label={`Vybrat ${asset.ticker} pro AI analýzu`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectAnalysisAsset(asset.id);
                          }}
                        >
                          {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">{asset.ticker}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{INVESTMENT_PROVIDER_LABELS[asset.provider] || asset.provider}</TableCell>
                      <TableCell>
                        {ASSET_TYPE_LABELS[asset.asset_type as keyof typeof ASSET_TYPE_LABELS] || asset.asset_type}
                      </TableCell>
                      <TableCell className="text-right">{formatQuantity(asset.quantity)}</TableCell>
                      <TableCell className="text-right">
                        {asset.currentPriceInReportingCurrency !== null
                          ? formatCurrency(asset.currentPriceInReportingCurrency, reportingCurrency)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {asset.currentValueInReportingCurrency !== null
                          ? formatCurrency(asset.currentValueInReportingCurrency, reportingCurrency)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(asset.totalInvestedInReportingCurrency, reportingCurrency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {asset.profitLossInReportingCurrency !== null ? (
                          <div
                            className={`flex items-center justify-end gap-1 ${
                              isProfit ? 'text-success' : 'text-destructive'
                            }`}
                          >
                            {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            <span>{formatCurrency(asset.profitLossInReportingCurrency, reportingCurrency)}</span>
                            <span className="text-xs">({formatPercent(asset.profitLossPercent || 0)})</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Smazat aktivum ${asset.ticker}`}
                            onClick={async () => {
                              await onDeleteAsset(asset.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Zatím žádná aktiva. Přidej transakci pro začátek.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
