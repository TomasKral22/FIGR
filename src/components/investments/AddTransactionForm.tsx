import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ASSET_TYPE_LABELS,
  COMMON_CURRENCIES,
  INVESTMENT_PROVIDER_LABELS,
  InvestmentAsset,
  InvestmentAssetType,
  InvestmentProvider,
  InvestmentTransactionType,
} from '@/types/investment';

interface AddTransactionFormProps {
  assets: InvestmentAsset[];
  onAddAsset: (asset: {
    ticker: string;
    name: string;
    asset_type: InvestmentAssetType;
    provider: InvestmentProvider;
    sector?: string;
    currency: string;
  }) => Promise<InvestmentAsset | null>;
  onAddTransaction: (transaction: {
    asset_id: string;
    transaction_type: InvestmentTransactionType;
    quantity: number;
    price_per_unit: number;
    currency: string;
    transaction_date: string;
    notes?: string;
    ex_dividend_date?: string;
    pay_date?: string;
    expected_dividend_amount?: number;
  }) => Promise<unknown>;
}

export const AddTransactionForm = ({
  assets,
  onAddAsset,
  onAddTransaction,
}: AddTransactionFormProps) => {
  const [isNewAsset, setIsNewAsset] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<InvestmentAssetType>('stock');
  const [provider, setProvider] = useState<InvestmentProvider>('broker');
  const [sector, setSector] = useState('');
  const [assetCurrency, setAssetCurrency] = useState('USD');
  const [transactionType, setTransactionType] = useState<InvestmentTransactionType>('buy');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [exDividendDate, setExDividendDate] = useState('');
  const [payDate, setPayDate] = useState('');
  const [expectedDividendAmount, setExpectedDividendAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedQuantity = parseFloat(quantity || '0');
  const parsedPricePerUnit = parseFloat(pricePerUnit || '0');
  const totalValue =
    Number.isFinite(parsedQuantity) && Number.isFinite(parsedPricePerUnit)
      ? parsedQuantity * parsedPricePerUnit
      : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      let assetId = selectedAssetId;
      if (isNewAsset) {
        const newAsset = await onAddAsset({
          ticker: ticker.toUpperCase(),
          name,
          asset_type: assetType,
          provider,
          sector: sector || undefined,
          currency: assetCurrency,
        });
        if (!newAsset) return;
        assetId = newAsset.id;
      }

      await onAddTransaction({
        asset_id: assetId,
        transaction_type: transactionType,
        quantity: parseFloat(quantity),
        price_per_unit: parseFloat(pricePerUnit),
        currency,
        transaction_date: transactionDate,
        notes: notes || undefined,
        ex_dividend_date: exDividendDate || undefined,
        pay_date: payDate || undefined,
        expected_dividend_amount: expectedDividendAmount ? parseFloat(expectedDividendAmount) : undefined,
      });

      setIsNewAsset(false);
      setSelectedAssetId('');
      setTicker('');
      setName('');
      setSector('');
      setProvider('broker');
      setQuantity('');
      setPricePerUnit('');
      setExDividendDate('');
      setPayDate('');
      setExpectedDividendAmount('');
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Aktivum</Label>
        {!isNewAsset ? (
          <div className="space-y-2">
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger><SelectValue placeholder="Vyberte aktivum" /></SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.ticker} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewAsset(true)}>
              + Nové aktivum
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Nové aktivum</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsNewAsset(false)}>
                Zrušit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Ticker</Label>
                <Input value={ticker} onChange={(event) => setTicker(event.target.value)} placeholder="AAPL" required={isNewAsset} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Název</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Apple Inc." required={isNewAsset} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Typ aktiva</Label>
                <Select value={assetType} onValueChange={(value) => setAssetType(value as InvestmentAssetType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Poskytovatel</Label>
                <Select value={provider} onValueChange={(value) => setProvider(value as InvestmentProvider)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVESTMENT_PROVIDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Měna</Label>
                <Select value={assetCurrency} onValueChange={setAssetCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMMON_CURRENCIES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Sektor / skupina</Label>
                <Input value={sector} onChange={(event) => setSector(event.target.value)} placeholder="Technologie, P2P, Reality..." />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Typ transakce</Label>
        <Select value={transactionType} onValueChange={(value) => setTransactionType(value as InvestmentTransactionType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">Nákup</SelectItem>
            <SelectItem value="sell">Prodej</SelectItem>
            <SelectItem value="dividend">Dividenda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{transactionType === 'dividend' ? 'Počet kusů / podílů' : 'Množství'}</Label>
          <Input
            type="number"
            step="any"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="10"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>{transactionType === 'dividend' ? 'Dividenda na kus' : 'Cena za jednotku'}</Label>
          <Input
            type="number"
            step="any"
            value={pricePerUnit}
            onChange={(event) => setPricePerUnit(event.target.value)}
            placeholder={transactionType === 'dividend' ? '1.24' : '150.00'}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Měna transakce</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMMON_CURRENCIES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Datum transakce</Label>
          <Input type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required />
        </div>
      </div>

      {transactionType === 'dividend' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Ex-dividend date</Label>
              <Input type="date" value={exDividendDate} onChange={(event) => setExDividendDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dividend pay date</Label>
              <Input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Předpokládaná výplata</Label>
              <Input
                type="number"
                step="any"
                value={expectedDividendAmount}
                onChange={(event) => setExpectedDividendAmount(event.target.value)}
                placeholder="Volitelné"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
            Pokud je známá očekávaná výplata, FIGR ji zobrazí v dividendovém kalendáři.
            Když ji nevyplníš, použije se vypočtená částka z počtu kusů a dividendy na kus.
          </div>
        </>
      )}

      <div className="rounded-lg bg-muted p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {transactionType === 'dividend' ? 'Očekávaná / evidovaná hodnota:' : 'Celková hodnota:'}
          </span>
          <span className="text-xl font-bold">
            {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(totalValue)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Poznámka</Label>
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Volitelná poznámka..." rows={2} />
      </div>

      <Button type="submit" className="w-full" disabled={submitting || (!isNewAsset && !selectedAssetId)}>
        {submitting ? 'Ukládám...' : 'Přidat transakci'}
      </Button>
    </form>
  );
};
