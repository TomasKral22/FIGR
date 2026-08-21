import { useMemo, useState } from 'react';
import { Building2, CalendarClock, Database, MinusCircle, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  COMMON_CURRENCIES,
  INVESTMENT_PROVIDER_LABELS,
  INVESTMENT_SOURCE_ACCOUNT_TYPE_LABELS,
  INVESTMENT_SOURCE_SYNC_MODE_LABELS,
  InvestmentProvider,
  InvestmentSourceAccount,
  InvestmentSourceAccountType,
  InvestmentSourceSyncMode,
  InvestmentSourceValuationMode,
  InvestmentValueSnapshot,
} from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';

interface InvestmentSourcesPanelProps {
  sourceAccounts: InvestmentSourceAccount[];
  valueSnapshots: InvestmentValueSnapshot[];
  onAddSourceAccount: (
    account: Omit<InvestmentSourceAccount, 'id' | 'last_synced_at' | 'created_at' | 'updated_at'>
  ) => Promise<unknown>;
  onUpdateSourceAccount: (
    id: string,
    updates: Partial<Omit<InvestmentSourceAccount, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  onAddValueSnapshot: (snapshot: Omit<InvestmentValueSnapshot, 'id' | 'created_at'>) => Promise<unknown>;
}

const today = () => new Date().toISOString().slice(0, 10);

const SourceAccountForm = ({ onSave }: { onSave: InvestmentSourcesPanelProps['onAddSourceAccount'] }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<InvestmentProvider>('investown');
  const [accountType, setAccountType] = useState<InvestmentSourceAccountType>('crowdfunding');
  const [currency, setCurrency] = useState('CZK');
  const [syncMode, setSyncMode] = useState<InvestmentSourceSyncMode>('file_import');
  const [valuationMode, setValuationMode] = useState<InvestmentSourceValuationMode>('snapshot');
  const [coversUnassignedPositions, setCoversUnassignedPositions] = useState(false);
  const [excludedAmount, setExcludedAmount] = useState('0');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const applyProviderDefaults = (nextProvider: InvestmentProvider) => {
    setProvider(nextProvider);
    if (nextProvider === 'alocano') {
      setAccountType('managed_portfolio');
      setCurrency('CZK');
      setSyncMode('manual');
      setValuationMode('snapshot');
      setCoversUnassignedPositions(true);
    } else if (nextProvider === 'investown' || nextProvider === 'fingood') {
      setAccountType('crowdfunding');
      setCurrency('CZK');
      setValuationMode('snapshot');
      setCoversUnassignedPositions(false);
    } else if (nextProvider === 'edward' || nextProvider === 'conseq') {
      setAccountType('managed_portfolio');
      setCurrency('CZK');
      setValuationMode('snapshot');
      setCoversUnassignedPositions(false);
    } else {
      setAccountType('brokerage');
      setValuationMode('positions');
      setCoversUnassignedPositions(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await onSave({
            name: name.trim(),
            provider,
            account_type: accountType,
            currency,
            sync_mode: syncMode,
            valuation_mode: valuationMode,
            covers_unassigned_positions: coversUnassignedPositions,
            excluded_amount: Math.max(0, Number(excludedAmount) || 0),
            is_active: true,
            note: note.trim() || null,
          });
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="source-name">Název účtu</Label>
        <Input id="source-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Např. Investown – hlavní účet" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Poskytovatel</Label>
          <Select value={provider} onValueChange={(value) => applyProviderDefaults(value as InvestmentProvider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(INVESTMENT_PROVIDER_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Typ účtu</Label>
          <Select value={accountType} onValueChange={(value) => setAccountType(value as InvestmentSourceAccountType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(INVESTMENT_SOURCE_ACCOUNT_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Měna</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COMMON_CURRENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Aktualizace</Label>
          <Select value={syncMode} onValueChange={(value) => setSyncMode(value as InvestmentSourceSyncMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(INVESTMENT_SOURCE_SYNC_MODE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Způsob ocenění</Label>
          <Select value={valuationMode} onValueChange={(value) => setValuationMode(value as InvestmentSourceValuationMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="snapshot">Celkový snapshot</SelectItem>
              <SelectItem value="positions">Součet pozic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 p-3">
        <div>
          <Label htmlFor="source-covers-unassigned">Nahradit pozice bez přiřazeného účtu</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Zapni, pokud je tato celková hodnota už obsahuje. U Alocana je volba přednastavená, aby se portfolio nezapočítalo dvakrát.
          </p>
        </div>
        <Switch
          id="source-covers-unassigned"
          checked={coversUnassignedPositions}
          onCheckedChange={setCoversUnassignedPositions}
          aria-label="Nahradit pozice bez přiřazeného účtu"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="source-excluded-amount">Cizí prostředky – nezapočítávat ({currency})</Label>
        <Input
          id="source-excluded-amount"
          type="number"
          step="any"
          min="0"
          value={excludedAmount}
          onChange={(event) => setExcludedAmount(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Například peníze rodičů, které na účtu pouze spravuješ. Ve zdroji zůstanou viditelné, ale odečtou se z tvého majetku.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="source-note">Poznámka</Label>
        <Textarea id="source-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
      </div>
      <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Přidat zdroj'}</Button>
    </form>
  );
};

const ExcludedAmountForm = ({
  account,
  onSave,
}: {
  account: InvestmentSourceAccount;
  onSave: InvestmentSourcesPanelProps['onUpdateSourceAccount'];
}) => {
  const [excludedAmount, setExcludedAmount] = useState(String(account.excluded_amount || 0));
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await onSave(account.id, { excluded_amount: Math.max(0, Number(excludedAmount) || 0) });
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
        Zadej část účtu, která nepatří do tvého osobního majetku. Částka se odečte ze souhrnů i historie tohoto zdroje.
      </div>
      <div className="space-y-2">
        <Label htmlFor="excluded-amount">Nezapočítávat ({account.currency})</Label>
        <Input
          id="excluded-amount"
          type="number"
          step="any"
          min="0"
          value={excludedAmount}
          onChange={(event) => setExcludedAmount(event.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Uložit částku'}</Button>
    </form>
  );
};

const SnapshotForm = ({ account, onSave }: { account: InvestmentSourceAccount; onSave: InvestmentSourcesPanelProps['onAddValueSnapshot'] }) => {
  const [snapshotDate, setSnapshotDate] = useState(today());
  const [totalValue, setTotalValue] = useState('');
  const [cashBalance, setCashBalance] = useState('0');
  const [investedValue, setInvestedValue] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await onSave({
            source_account_id: account.id,
            snapshot_date: snapshotDate,
            total_value: Number(totalValue),
            cash_balance: Number(cashBalance || 0),
            invested_value: investedValue ? Number(investedValue) : null,
            currency: account.currency,
            source_kind: account.sync_mode === 'api_sync' ? 'api_sync' : account.sync_mode === 'file_import' ? 'file_import' : 'manual',
            note: note.trim() || null,
          });
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
        {account.provider === 'alocano'
          ? 'Z Alocana opiš pouze Celkovou hodnotu. Datum je předvyplněné dneškem a tato hodnota nahradí jednotlivé pozice bez přiřazeného účtu.'
          : 'Snapshot je aktuální celková hodnota účtu. U Investownu zahrň i peněženku; u Edwarda součet všech kyblíků.'}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="snapshot-date">Datum</Label><Input id="snapshot-date" type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="snapshot-total-value">Celková hodnota ({account.currency})</Label><Input id="snapshot-total-value" type="number" step="any" min="0" value={totalValue} onChange={(event) => setTotalValue(event.target.value)} required /></div>
        {account.provider !== 'alocano' ? <>
          <div className="space-y-2"><Label htmlFor="snapshot-cash-balance">Z toho hotovost</Label><Input id="snapshot-cash-balance" type="number" step="any" min="0" value={cashBalance} onChange={(event) => setCashBalance(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="snapshot-invested-value">Celkem vloženo</Label><Input id="snapshot-invested-value" type="number" step="any" min="0" value={investedValue} onChange={(event) => setInvestedValue(event.target.value)} placeholder="Nutné pro celkový výnos" /></div>
        </> : null}
      </div>
      <div className="space-y-2"><Label htmlFor="snapshot-note">Poznámka</Label><Textarea id="snapshot-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} /></div>
      <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Uložit snapshot'}</Button>
    </form>
  );
};

export const InvestmentSourcesPanel = ({ sourceAccounts, valueSnapshots, onAddSourceAccount, onUpdateSourceAccount, onAddValueSnapshot }: InvestmentSourcesPanelProps) => {
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [snapshotAccount, setSnapshotAccount] = useState<InvestmentSourceAccount | null>(null);
  const [excludedAmountAccount, setExcludedAmountAccount] = useState<InvestmentSourceAccount | null>(null);
  const latestSnapshots = useMemo(() => {
    const result = new Map<string, InvestmentValueSnapshot>();
    [...valueSnapshots].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date)).forEach((snapshot) => {
      if (!result.has(snapshot.source_account_id)) result.set(snapshot.source_account_id, snapshot);
    });
    return result;
  }, [valueSnapshots]);

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4 text-primary" />Investiční účty a zdroje</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Alocano jako ruční celková hodnota, Edward, Conseq, Investown a další platformy jako samostatné zdroje.</p>
          </div>
          <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Přidat zdroj</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Nový investiční zdroj</DialogTitle></DialogHeader><SourceAccountForm onSave={async (payload) => { await onAddSourceAccount(payload); setAccountDialogOpen(false); }} /></DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sourceAccounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-6 w-6" />Začni přidáním Alocana jako celkové hodnoty portfolia.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sourceAccounts.map((account) => {
              const snapshot = latestSnapshots.get(account.id);
              return (
                <div key={account.id} className={`rounded-xl border p-4 ${account.is_active ? 'border-border/70 bg-background/50' : 'border-dashed opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{account.name}</p><Badge variant="secondary">{INVESTMENT_PROVIDER_LABELS[account.provider]}</Badge></div>
                      <p className="mt-1 text-sm text-muted-foreground">{INVESTMENT_SOURCE_ACCOUNT_TYPE_LABELS[account.account_type]} · {account.valuation_mode === 'snapshot' ? 'celkový snapshot' : 'součet pozic'}</p>
                    </div>
                    <Switch checked={account.is_active} onCheckedChange={(checked) => void onUpdateSourceAccount(account.id, { is_active: checked })} aria-label={`Aktivovat ${account.name}`} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Poslední hodnota</p><p className="font-medium">{snapshot ? formatCurrencySafe(snapshot.total_value, snapshot.currency) : 'Chybí snapshot'}</p></div>
                    <div><p className="text-muted-foreground">Aktualizováno</p><p className="font-medium">{snapshot?.snapshot_date || account.last_synced_at?.slice(0, 10) || 'Nikdy'}</p></div>
                    <div><p className="text-muted-foreground">Cizí prostředky</p><p className="font-medium">{formatCurrencySafe(account.excluded_amount || 0, account.currency)}</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {account.valuation_mode === 'snapshot' ? <Button variant="outline" size="sm" onClick={() => setSnapshotAccount(account)}><CalendarClock className="mr-2 h-4 w-4" />Nový snapshot</Button> : null}
                    <Button variant="outline" size="sm" onClick={() => setExcludedAmountAccount(account)}><MinusCircle className="mr-2 h-4 w-4" />Cizí prostředky</Button>
                    <Badge variant="outline" className="h-8"><RefreshCw className="mr-2 h-3.5 w-3.5" />{INVESTMENT_SOURCE_SYNC_MODE_LABELS[account.sync_mode]}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={Boolean(snapshotAccount)} onOpenChange={(open) => !open && setSnapshotAccount(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Aktualizovat {snapshotAccount?.name}</DialogTitle></DialogHeader>{snapshotAccount ? <SnapshotForm account={snapshotAccount} onSave={async (payload) => { await onAddValueSnapshot(payload); setSnapshotAccount(null); }} /> : null}</DialogContent>
      </Dialog>
      <Dialog open={Boolean(excludedAmountAccount)} onOpenChange={(open) => !open && setExcludedAmountAccount(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Cizí prostředky – {excludedAmountAccount?.name}</DialogTitle></DialogHeader>
          {excludedAmountAccount ? (
            <ExcludedAmountForm
              account={excludedAmountAccount}
              onSave={async (id, updates) => {
                await onUpdateSourceAccount(id, updates);
                setExcludedAmountAccount(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
