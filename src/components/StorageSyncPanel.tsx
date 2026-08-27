import { useEffect, useState } from 'react';
import { appStorage } from '@/lib/appStorage';
import { useStorageSyncState } from '@/lib/storageSyncState';
import { type SyncJournal } from '@/lib/storageSyncEngine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const summarize = (value: string | null) => {
  if (value === null) return 'Žádná uložená data';
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return `${parsed.length} položek`;
    if (parsed && typeof parsed === 'object') return `${Object.keys(parsed).length} polí`;
  } catch { /* Plain-text preferences are valid values. */ }
  return `${value.length} znaků`;
};
const name = (key: string) => ({ finance_transactions: 'Finanční transakce',
  finance_bank_accounts: 'Bankovní účty', finance_broker_accounts: 'Brokerské účty',
  investment_transactions: 'Investiční transakce', investment_assets: 'Investiční aktiva',
  investment_source_accounts: 'Investiční platformy', investment_prices: 'Ceny aktiv',
  investment_exchange_rates: 'Měnové kurzy' }[key] ?? key);

export const StorageSyncPanel = () => {
  const state = useStorageSyncState();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<SyncJournal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (state.phase === 'error' || state.phase === 'saving') { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.phase]);
  const refresh = async () => {
    try { setSnapshot(await appStorage.exportRecovery()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Kopii nelze načíst.'); }
  };
  useEffect(() => {
    const show = () => { setOpen(true); void refresh(); };
    const retry = () => { void appStorage.retryCloudSync(); };
    window.addEventListener('figr:sync-details', show);
    window.addEventListener('online', retry);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && state.phase !== 'error') retry();
    }, 60000);
    return () => { window.removeEventListener('figr:sync-details', show);
      window.removeEventListener('online', retry); window.clearInterval(timer); };
  }, [state.phase]);

  const exportCopy = async () => {
    try {
      const data = await appStorage.exportRecovery();
      if (!data) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `FIGR-obnova-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Export selhal.'); }
  };
  const resolve = async (key: string, choice: 'local' | 'cloud') => {
    const conflict = snapshot?.entries[key]?.conflict;
    if (!conflict) return;
    if (!window.confirm(`Použít ${choice === 'local' ? 'verzi z tohoto zařízení' : 'cloudovou verzi'} pro „${name(key)}“? Obě kopie zůstanou v historii obnovy.`)) return;
    setBusy(true); setError(null);
    try { await appStorage.resolveConflict(key, choice, conflict); setResolved(true); window.location.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Vyřešení konfliktu selhalo.'); }
    finally { await refresh(); setBusy(false); }
  };
  const problem = state.phase === 'error' || state.phase === 'offline' || state.conflicts.length > 0;
  return <>
    {problem && <div role="status" className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
      <span>{state.conflicts.length ? `Rozdílné verze dat (${state.conflicts.length}). Nic se automaticky nepřepíše.`
        : state.phase === 'error' ? `Ukládání selhalo: ${state.lastError} Nezavírejte aplikaci.`
        : `Cloud nedostupný. V zařízení čeká ${state.pendingWrites} změn na odeslání.`}</span>
      <Button size="sm" variant="outline" onClick={() => { setOpen(true); void refresh(); }}>Podrobnosti uložení</Button>
    </div>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Uložení a obnova dat</DialogTitle>
          <DialogDescription>{state.mode === 'cloud'
            ? 'Cloudové změny se nepřepisují bez kontroly verze. Export obsahuje citlivá finanční data; uložte ho bezpečně.'
            : 'Data jsou uložená pouze v tomto zařízení. Správu databázových záloh najdete v nastavení desktopové aplikace.'}</DialogDescription>
        </DialogHeader>
        {state.lastError && <p className="break-words text-sm text-amber-600">{state.lastError}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <p className="text-sm">Čekající změny: {state.pendingWrites}. Konflikty: {state.conflicts.length}.</p>
        <div className="flex flex-wrap gap-2">
          {state.mode === 'cloud' && <Button variant="outline" onClick={() => void exportCopy()}>Exportovat záchrannou kopii</Button>}
          {state.mode === 'cloud' && <Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); await appStorage.retryCloudSync(); await refresh(); setBusy(false); }}>Zkusit synchronizaci</Button>}
          <Button variant="outline" disabled={busy} onClick={() => window.location.reload()}>Znovu načíst aplikaci</Button>
        </div>
        {resolved && <p className="text-sm">Výběr je uložen. Po vyřešení konfliktů znovu načtěte aplikaci, aby se promítl do přehledů.</p>}
        {Object.entries(snapshot?.entries ?? {}).filter(([, e]) => e.conflict).map(([key, entry]) => <section className="space-y-3 rounded-lg border p-4" key={key}>
          <h3 className="font-medium">{name(key)}</h3>
          <div className="grid gap-3 sm:grid-cols-2">{(['local', 'cloud'] as const).map(choice => <div key={choice} className="min-w-0 space-y-2">
            <p className="text-sm font-medium">{choice === 'local' ? 'Toto zařízení' : 'Cloud'} · {summarize(choice === 'local' ? entry.value : entry.conflict!.value)}</p>
            <details className="text-xs"><summary>Zobrazit obsah</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all">{choice === 'local' ? entry.value : entry.conflict!.value}</pre></details>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void resolve(key, choice)}>Použít {choice === 'local' ? 'tuto lokální kopii' : 'cloudovou kopii'}</Button>
          </div>)}</div>
        </section>)}
        {!!snapshot?.recoveries.length && <p className="text-xs text-muted-foreground">Historie obsahuje {snapshot.recoveries.length} zachovaných kopií. Jsou součástí exportu.</p>}
      </DialogContent>
    </Dialog>
  </>;
};
