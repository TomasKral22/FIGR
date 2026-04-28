import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortfolioAsset, ASSET_TYPE_LABELS } from '@/types/investment';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AssetTableProps {
  assets: PortfolioAsset[];
  assetsByType: Record<string, { invested: number; value: number | null }>;
  assetsByCurrency: Record<string, { invested: number; value: number | null }>;
  assetsBySector: Record<string, { invested: number; value: number | null }>;
  reportingCurrency: string;
  onSelectAsset: (id: string) => void;
}

const formatCurrency = (value: number, currency: string): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

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
  assetsByCurrency,
  assetsBySector,
  reportingCurrency,
  onSelectAsset,
}: AssetTableProps) => {
  const [breakdown, setBreakdown] = useState<'type' | 'currency' | 'sector'>('type');

  const getBreakdownData = () => {
    const data = breakdown === 'type' ? assetsByType : breakdown === 'currency' ? assetsByCurrency : assetsBySector;
    return Object.entries(data).map(([name, { invested, value }]) => ({
      name: breakdown === 'type' ? (ASSET_TYPE_LABELS[name as keyof typeof ASSET_TYPE_LABELS] || name) : name,
      invested,
      value: value || invested,
    }));
  };

  const pieData = getBreakdownData();

  return (
    <div className="space-y-6">
      {/* Breakdown Charts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rozdělení portfolia</CardTitle>
            <Tabs value={breakdown} onValueChange={(v) => setBreakdown(v as typeof breakdown)}>
              <TabsList>
                <TabsTrigger value="type">Typ</TabsTrigger>
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
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
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
            <p className="text-center text-muted-foreground py-8">Zatím žádná aktiva</p>
          )}
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Přehled aktiv</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Název</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Množství</TableHead>
                  <TableHead className="text-right">Akt. cena</TableHead>
                  <TableHead className="text-right">Hodnota</TableHead>
                  <TableHead className="text-right">Investováno</TableHead>
                  <TableHead className="text-right">Zisk/Ztráta</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(asset => {
                  const isProfit = (asset.profitLossInReportingCurrency ?? 0) >= 0;
                  return (
                    <TableRow
                      key={asset.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectAsset(asset.id)}
                    >
                      <TableCell className="font-medium">{asset.ticker}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{ASSET_TYPE_LABELS[asset.asset_type as keyof typeof ASSET_TYPE_LABELS] || asset.asset_type}</TableCell>
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
                          <div className={`flex items-center justify-end gap-1 ${isProfit ? 'text-success' : 'text-destructive'}`}>
                            {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            <span>{formatCurrency(asset.profitLossInReportingCurrency, reportingCurrency)}</span>
                            <span className="text-xs">
                              ({formatPercent(asset.profitLossPercent || 0)})
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Zatím žádná aktiva. Přidejte transakci pro začátek.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
