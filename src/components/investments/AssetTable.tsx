import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ASSET_TYPE_LABELS, INVESTMENT_PROVIDER_LABELS, PortfolioAsset } from '@/types/investment';
import { Button } from '@/components/ui/button';
import { ChevronRight, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrencySafe } from '@/utils/currency';
import { useIsMobile } from '@/hooks/use-mobile';

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

const formatCurrency = (value: number | null | undefined, currency: string): string =>
  formatCurrencySafe(value, currency);

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
  const isMobile = useIsMobile();

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
              Vyber ticker pro externí AI analýzu a přes šipku otevři detail aktiva.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
            {selectedAnalysisAssetId ? (
              <span>
                Vybraný ticker:{' '}
                <span className="font-semibold text-primary">
                  {assets.find((asset) => asset.id === selectedAnalysisAssetId)?.ticker || 'N/A'}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Zatím není vybraný žádný ticker pro externí AI analýzu.</span>
            )}
          </div>

          {assets.length > 0 ? (
            isMobile ? (
              <div className="space-y-3">
                {assets.map((asset) => {
                  const isProfit = (asset.profitLossInReportingCurrency ?? 0) >= 0;
                  const isSelected = selectedAnalysisAssetId === asset.id;

                  return (
                    <div
                      key={asset.id}
                      className={`rounded-2xl border p-4 ${isSelected ? 'border-primary bg-primary/5' : 'border-border/70 bg-background/50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{asset.ticker}</p>
                          <p className="text-sm text-muted-foreground">{asset.name}</p>
                        </div>
                        <Button type="button" variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => onSelectAnalysisAsset(asset.id)}>
                          {isSelected ? 'Vybráno' : 'Vybrat'}
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground">Typ</p>
                          <p>{ASSET_TYPE_LABELS[asset.asset_type as keyof typeof ASSET_TYPE_LABELS] || asset.asset_type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Poskytovatel</p>
                          <p>{INVESTMENT_PROVIDER_LABELS[asset.provider] || asset.provider}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Množství</p>
                          <p>{formatQuantity(asset.quantity)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Akt. cena</p>
                          <p>{asset.currentPriceInReportingCurrency !== null ? formatCurrency(asset.currentPriceInReportingCurrency, reportingCurrency) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hodnota</p>
                          <p>{asset.currentValueInReportingCurrency !== null ? formatCurrency(asset.currentValueInReportingCurrency, reportingCurrency) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Zisk / ztráta</p>
                          <p className={isProfit ? 'text-success' : 'text-destructive'}>
                            {asset.profitLossInReportingCurrency !== null
                              ? `${formatCurrency(asset.profitLossInReportingCurrency, reportingCurrency)} (${formatPercent(asset.profitLossPercent || 0)})`
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => onSelectAsset(asset.id)} aria-label={`Otevřít detail ${asset.ticker}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={async () => onDeleteAsset(asset.id)} aria-label={`Smazat ${asset.ticker}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Prompt</TableHead>
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
                      className={isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''}
                    >
                      <TableCell>
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background/60 text-muted-foreground hover:border-primary/50'
                          }`}
                          onClick={(event) => {
                            event.preventDefault();
                            onSelectAnalysisAsset(asset.id);
                          }}
                        >
                          <span
                            className={`h-4 w-4 rounded-full border ${
                              isSelected ? 'border-primary bg-primary ring-2 ring-primary/25' : 'border-border'
                            }`}
                          />
                          <span>{isSelected ? 'Vybráno' : 'Vybrat'}</span>
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
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Otevřít detail aktiva ${asset.ticker}`}
                            onClick={() => onSelectAsset(asset.id)}
                          >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            )
          ) : (
            <p className="py-8 text-center text-muted-foreground">Zatím žádná aktiva. Přidej transakci pro začátek.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
