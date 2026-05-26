import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ASSET_TYPE_LABELS,
  COMMON_CURRENCIES,
  INVESTMENT_PROVIDER_LABELS,
  InvestmentProvider,
  TrackedInvestment,
} from '@/types/investment';
import { useIsMobile } from '@/hooks/use-mobile';

const TRACKED_TYPES = Object.entries(ASSET_TYPE_LABELS).filter(
  ([value]) => value !== 'p2p' && value !== 'private_credit'
);

interface TrackedInvestmentFormProps {
  initialValue?: TrackedInvestment | null;
  onSave: (payload: {
    ticker: string;
    name: string;
    asset_type: TrackedInvestment['asset_type'];
    provider: InvestmentProvider;
    sector?: string;
    currency: string;
    current_value: number;
    quantity?: number | null;
    current_price?: number | null;
    include_in_portfolio: boolean;
    is_watchlist: boolean;
    note?: string;
  }) => Promise<void>;
}

export const TrackedInvestmentForm = ({ initialValue = null, onSave }: TrackedInvestmentFormProps) => {
  const isMobile = useIsMobile();
  const [ticker, setTicker] = useState(initialValue?.ticker || '');
  const [name, setName] = useState(initialValue?.name || '');
  const [assetType, setAssetType] = useState<TrackedInvestment['asset_type']>(initialValue?.asset_type || 'stock');
  const [provider, setProvider] = useState<InvestmentProvider>(initialValue?.provider || 'broker');
  const [sector, setSector] = useState(initialValue?.sector || '');
  const [currency, setCurrency] = useState(initialValue?.currency || 'USD');
  const [currentValue, setCurrentValue] = useState(initialValue ? String(initialValue.current_value) : '');
  const [quantity, setQuantity] = useState(initialValue?.quantity != null ? String(initialValue.quantity) : '');
  const [currentPrice, setCurrentPrice] = useState(initialValue?.current_price != null ? String(initialValue.current_price) : '');
  const [includeInPortfolio, setIncludeInPortfolio] = useState(initialValue?.include_in_portfolio ?? true);
  const [isWatchlist, setIsWatchlist] = useState(initialValue?.is_watchlist ?? false);
  const [note, setNote] = useState(initialValue?.note || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        asset_type: assetType,
        provider,
        sector: sector.trim() || undefined,
        currency,
        current_value: Number.parseFloat(currentValue || '0'),
        quantity: quantity ? Number.parseFloat(quantity) : null,
        current_price: currentPrice ? Number.parseFloat(currentPrice) : null,
        include_in_portfolio: isWatchlist ? false : includeInPortfolio,
        is_watchlist: isWatchlist,
        note: note.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isMobile ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-muted-foreground">
          Evidovane portfolio je vhodne pro pozice bez historie obchodu. Watchlist se do hodnoty portfolia nepocita.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tracked-ticker">Ticker</Label>
          <Input id="tracked-ticker" value={ticker} onChange={(event) => setTicker(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tracked-name">Nazev</Label>
          <Input id="tracked-name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Typ aktiva</Label>
          <Select value={assetType} onValueChange={(value) => setAssetType(value as TrackedInvestment['asset_type'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRACKED_TYPES.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Poskytovatel</Label>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Mena</Label>
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
          <Label htmlFor="tracked-sector">Sektor</Label>
          <Input id="tracked-sector" value={sector} onChange={(event) => setSector(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="tracked-value">Aktualni hodnota</Label>
          <Input id="tracked-value" type="number" step="any" value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tracked-quantity">Mnozstvi</Label>
          <Input id="tracked-quantity" type="number" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tracked-price">Aktualni cena</Label>
          <Input id="tracked-price" type="number" step="any" value={currentPrice} onChange={(event) => setCurrentPrice(event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3">
          <Checkbox checked={isWatchlist} onCheckedChange={(value) => setIsWatchlist(Boolean(value))} />
          <div>
            <p className="font-medium">Watchlist</p>
            <p className="text-xs text-muted-foreground">Polozka je sledovana, ale nezapocita se do hodnoty portfolia.</p>
          </div>
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3">
          <Checkbox
            checked={isWatchlist ? false : includeInPortfolio}
            onCheckedChange={(value) => setIncludeInPortfolio(Boolean(value))}
            disabled={isWatchlist}
          />
          <div>
            <p className="font-medium">Zahrnout do portfolia</p>
            <p className="text-xs text-muted-foreground">Vhodne pro evidovane portfolio bez historie obchodu.</p>
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tracked-note">Poznamka</Label>
        <Textarea id="tracked-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
        {saving ? 'Ukladam...' : initialValue ? 'Ulozit zmeny' : 'Pridat evidovanou pozici'}
      </Button>
    </form>
  );
};
