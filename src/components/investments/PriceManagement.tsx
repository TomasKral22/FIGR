import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvestmentAsset, AssetPrice } from '@/types/investment';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrencySafe } from '@/utils/currency';

interface PriceManagementProps {
  assets: InvestmentAsset[];
  prices: AssetPrice[];
  onAddPrice: (price: { asset_id: string; price: number; currency: string; price_date: string }) => Promise<void>;
}

const formatCurrency = (value: number, currency: string): string => {
  return formatCurrencySafe(value, currency);
};

export const PriceManagement = ({ assets, prices, onAddPrice }: PriceManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [price, setPrice] = useState('');
  const [priceDate, setPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Get latest price for each asset
  const latestPrices = assets.map(asset => {
    const assetPrices = prices.filter(p => p.asset_id === asset.id);
    const sortedPrices = assetPrices.sort((a, b) => b.price_date.localeCompare(a.price_date));
    return {
      asset,
      latestPrice: sortedPrices[0] || null,
    };
  });

  const handleSubmit = async () => {
    if (!selectedAssetId || !price) return;

    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    setSubmitting(true);
    try {
      await onAddPrice({
        asset_id: selectedAssetId,
        price: parseFloat(price),
        currency: asset.currency,
        price_date: priceDate,
      });
      setIsDialogOpen(false);
      setSelectedAssetId('');
      setPrice('');
      setPriceDate(new Date().toISOString().split('T')[0]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Správa cen</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Přidat cenu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Přidat cenu aktiva</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Aktivum</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte aktivum" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.ticker} - {asset.name} ({asset.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cena</Label>
                <Input
                  type="number"
                  step="any"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={priceDate}
                  onChange={e => setPriceDate(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedAssetId || !price}
                className="w-full"
              >
                {submitting ? 'Ukládám...' : 'Přidat cenu'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {latestPrices.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Název</TableHead>
                <TableHead>Měna</TableHead>
                <TableHead className="text-right">Poslední cena</TableHead>
                <TableHead>Datum ceny</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestPrices.map(({ asset, latestPrice }) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.ticker}</TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.currency}</TableCell>
                  <TableCell className="text-right">
                    {latestPrice
                      ? formatCurrency(latestPrice.price, latestPrice.currency)
                      : <span className="text-muted-foreground">Chybí</span>}
                  </TableCell>
                  <TableCell>
                    {latestPrice
                      ? new Date(latestPrice.price_date).toLocaleDateString('cs-CZ')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Zatím žádná aktiva. Přidejte transakci pro začátek.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
