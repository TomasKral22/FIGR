import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AssetPrice,
  ASSET_TYPE_LABELS,
  INVESTMENT_PROVIDER_LABELS,
  InvestmentTransaction,
  PortfolioAsset,
} from '@/types/investment';
import { ArrowLeft, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrencySafe } from '@/utils/currency';

interface AssetDetailProps {
  asset: PortfolioAsset;
  transactions: InvestmentTransaction[];
  prices: AssetPrice[];
  reportingCurrency: string;
  onBack: () => void;
  onDeleteAsset: (id: string) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onAddPrice: (price: { asset_id: string; price: number; currency: string; price_date: string }) => Promise<void>;
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

export const AssetDetail = ({
  asset,
  transactions,
  prices,
  reportingCurrency,
  onBack,
  onDeleteAsset,
  onDeleteTransaction,
  onAddPrice,
}: AssetDetailProps) => {
  const [addingPrice, setAddingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [newPriceDate, setNewPriceDate] = useState(new Date().toISOString().split('T')[0]);

  const isProfit = (asset.profitLossInReportingCurrency ?? 0) >= 0;
  const sortedPrices = [...prices].sort((a, b) => a.price_date.localeCompare(b.price_date));
  const priceChartData = sortedPrices.map((price) => ({
    date: price.price_date,
    price: price.price,
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
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zpět
        </Button>
        <div>
          <h3 className="text-xl font-bold">{asset.ticker}</h3>
          <p className="text-muted-foreground">{asset.name}</p>
        </div>
        <div className="ml-auto">
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await onDeleteAsset(asset.id);
              onBack();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat aktivum
          </Button>
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
              {INVESTMENT_PROVIDER_LABELS[asset.provider] || asset.provider}
            </div>
            {asset.sector ? <div className="text-sm text-muted-foreground">{asset.sector}</div> : null}
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
                <div
                  className={`flex items-center gap-2 text-lg font-bold ${
                    isProfit ? 'text-success' : 'text-destructive'
                  }`}
                >
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
                <Plus className="mr-2 h-4 w-4" />
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
                    onChange={(event) => setNewPrice(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={newPriceDate}
                    onChange={(event) => setNewPriceDate(event.target.value)}
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
                        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
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
            <p className="py-8 text-center text-muted-foreground">
              {priceChartData.length === 1
                ? 'Pro zobrazení grafu je potřeba alespoň 2 ceny.'
                : 'Zatím žádné ceny. Přidej aktuální cenu pro výpočet hodnoty.'}
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
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.transaction_date).toLocaleDateString('cs-CZ')}</TableCell>
                    <TableCell>
                      <span
                        className={
                          transaction.transaction_type === 'buy'
                            ? 'text-success'
                            : transaction.transaction_type === 'sell'
                              ? 'text-destructive'
                              : 'text-primary'
                        }
                      >
                        {transaction.transaction_type === 'buy'
                          ? 'Nákup'
                          : transaction.transaction_type === 'sell'
                            ? 'Prodej'
                            : 'Dividenda'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatQuantity(transaction.quantity)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.price_per_unit, transaction.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transaction.total_value, transaction.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{transaction.notes || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteTransaction(transaction.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Žádné transakce</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
