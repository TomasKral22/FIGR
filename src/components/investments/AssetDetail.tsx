import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PortfolioAsset,
  InvestmentTransaction,
  AssetPrice,
  ASSET_TYPE_LABELS,
  INVESTMENT_PROVIDER_LABELS,
} from '@/types/investment';
import { ArrowLeft, Trash2, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AssetDetailProps {
  asset: PortfolioAsset;
  transactions: InvestmentTransaction[];
  prices: AssetPrice[];
  reportingCurrency: string;
  onBack: () => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onAddPrice: (price: { asset_id: string; price: number; currency: string; price_date: string }) => Promise<void>;
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

export const AssetDetail = ({
  asset,
  transactions,
  prices,
  reportingCurrency,
  onBack,
  onDeleteTransaction,
  onAddPrice,
}: AssetDetailProps) => {
  const [addingPrice, setAddingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [newPriceDate, setNewPriceDate] = useState(new Date().toISOString().split('T')[0]);

  const isProfit = (asset.profitLossInReportingCurrency ?? 0) >= 0;

  const sortedPrices = [...prices].sort((a, b) => a.price_date.localeCompare(b.price_date));
  const priceChartData = sortedPrices.map((p) => ({
    date: p.price_date,
    price: p.price,
  }));

  const handleAddPrice = async () => {
    if (!newPrice || !newPriceDate) return;

    await onAddPrice({
      asset_id: asset.id,
      price: parseFloat(newPrice),
      currency: asset.currency,
      price_date: newPriceDate,
    });

    setAddingPrice(false);
    setNewPrice('');
    setNewPriceDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět
        </Button>
        <div>
          <h3 className="text-xl font-bold">{asset.ticker}</h3>
          <p className="text-muted-foreground">{asset.name}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Typ a poskytovatel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {ASSET_TYPE_LABELS[asset.asset_type as keyof typeof ASSET_TYPE_LABELS] || asset.asset_type}
            </div>
            <div className="text-sm text-muted-foreground">
              {INVESTMENT_PROVIDER_LABELS[asset.provider as keyof typeof INVESTMENT_PROVIDER_LABELS] || asset.provider}
            </div>
            {asset.sector && <div className="text-sm text-muted-foreground">{asset.sector}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pozice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatQuantity(asset.quantity)}</div>
            <div className="text-sm text-muted-foreground">
              Prům. cena: {formatCurrency(asset.avgBuyPrice, asset.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hodnota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {asset.currentValueInReportingCurrency !== null
                ? formatCurrency(asset.currentValueInReportingCurrency, reportingCurrency)
                : 'Chybí cena'}
            </div>
            <div className="text-sm text-muted-foreground">
              Investováno: {formatCurrency(asset.totalInvestedInReportingCurrency, reportingCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zisk / ztráta</CardTitle>
          </CardHeader>
          <CardContent>
            {asset.profitLossInReportingCurrency !== null ? (
              <>
                <div className={`text-lg font-bold flex items-center gap-2 ${isProfit ? 'text-success' : 'text-destructive'}`}>
                  {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {formatCurrency(asset.profitLossInReportingCurrency, reportingCurrency)}
                </div>
                <div className={`text-sm ${isProfit ? 'text-success' : 'text-destructive'}`}>
                  {formatPercent(asset.profitLossPercent || 0)}
                </div>
              </>
            ) : (
              <div className="text-lg font-bold">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vývoj ceny</CardTitle>
          <Dialog open={addingPrice} onOpenChange={setAddingPrice}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Přidat cenu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Přidat cenu pro {asset.ticker}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cena ({asset.currency})</Label>
                  <Input
                    type="number"
                    step="any"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={newPriceDate}
                    onChange={(e) => setNewPriceDate(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddPrice} className="w-full">
                  Přidat cenu
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {priceChartData.length > 1 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
                    }
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value, asset.currency)}
                    className="text-muted-foreground"
                    width={100}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-sm text-muted-foreground">
                            {new Date(label).toLocaleDateString('cs-CZ')}
                          </p>
                          <p className="text-lg font-bold">
                            {formatCurrency(payload[0].value as number, asset.currency)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {priceChartData.length === 1
                ? 'Pro zobrazení grafu je potřeba alespoň 2 ceny.'
                : 'Zatím žádné ceny. Přidejte aktuální cenu pro výpočet hodnoty.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transakce</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Množství</TableHead>
                  <TableHead className="text-right">Cena / ks</TableHead>
                  <TableHead className="text-right">Celkem</TableHead>
                  <TableHead>Poznámka</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.transaction_date).toLocaleDateString('cs-CZ')}</TableCell>
                    <TableCell>
                      <span
                        className={
                          tx.transaction_type === 'buy'
                            ? 'text-success'
                            : tx.transaction_type === 'sell'
                              ? 'text-destructive'
                              : 'text-primary'
                        }
                      >
                        {tx.transaction_type === 'buy'
                          ? 'Nákup'
                          : tx.transaction_type === 'sell'
                            ? 'Prodej'
                            : 'Dividenda'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatQuantity(tx.quantity)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(tx.price_per_unit, tx.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(tx.total_value, tx.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tx.notes || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteTransaction(tx.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Žádné transakce</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
