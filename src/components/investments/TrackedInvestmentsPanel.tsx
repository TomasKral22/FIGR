import { useMemo, useState } from 'react';
import { Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ASSET_TYPE_LABELS, INVESTMENT_PROVIDER_LABELS, TrackedInvestment } from '@/types/investment';
import { formatCurrencySafe } from '@/utils/currency';
import { TrackedInvestmentForm } from './TrackedInvestmentForm';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrackedInvestmentsPanelProps {
  trackedInvestments: TrackedInvestment[];
  reportingCurrency: string;
  onAddTrackedInvestment: (payload: {
    ticker: string;
    name: string;
    asset_type: TrackedInvestment['asset_type'];
    provider: TrackedInvestment['provider'];
    sector?: string;
    currency: string;
    current_value: number;
    quantity?: number | null;
    current_price?: number | null;
    include_in_portfolio: boolean;
    is_watchlist: boolean;
    note?: string;
  }) => Promise<void>;
  onUpdateTrackedInvestment: (
    id: string,
    updates: Partial<Omit<TrackedInvestment, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  onDeleteTrackedInvestment: (id: string) => Promise<void>;
}

export const TrackedInvestmentsPanel = ({
  trackedInvestments,
  reportingCurrency,
  onAddTrackedInvestment,
  onUpdateTrackedInvestment,
  onDeleteTrackedInvestment,
}: TrackedInvestmentsPanelProps) => {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<'tracked' | 'watchlist'>('tracked');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<TrackedInvestment | null>(null);

  const filteredInvestments = useMemo(
    () => trackedInvestments.filter((investment) => investment.is_watchlist === (filter === 'watchlist')),
    [filter, trackedInvestments]
  );

  const trackedValue = useMemo(
    () =>
      trackedInvestments
        .filter((investment) => !investment.is_watchlist && investment.include_in_portfolio)
        .reduce((sum, investment) => sum + investment.current_value, 0),
    [trackedInvestments]
  );

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">Evidovane portfolio a watchlist</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Rucne vedene pozice bez historie obchodu a oddeleny watchlist pro sledovane tituly.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Pridat polozku
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova evidovana polozka</DialogTitle>
            </DialogHeader>
            <TrackedInvestmentForm
              onSave={async (payload) => {
                await onAddTrackedInvestment(payload);
                setIsCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidovana hodnota</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrencySafe(trackedValue, reportingCurrency)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidovane pozice</p>
            <p className="mt-2 text-lg font-semibold">
              {trackedInvestments.filter((investment) => !investment.is_watchlist).length}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Watchlist</p>
            <p className="mt-2 text-lg font-semibold">
              {trackedInvestments.filter((investment) => investment.is_watchlist).length}
            </p>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList>
            <TabsTrigger value="tracked">Evidovane portfolio</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredInvestments.length > 0 ? (
          isMobile ? (
            <div className="space-y-3">
              {filteredInvestments.map((investment) => (
                <div key={investment.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{investment.ticker}</p>
                      <p className="text-sm text-muted-foreground">{investment.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setEditingInvestment(investment)}>
                        {investment.is_watchlist ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => void onDeleteTrackedInvestment(investment.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Typ</p>
                      <p>{ASSET_TYPE_LABELS[investment.asset_type] || investment.asset_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Poskytovatel</p>
                      <p>{INVESTMENT_PROVIDER_LABELS[investment.provider] || investment.provider}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hodnota</p>
                      <p>{formatCurrencySafe(investment.current_value, investment.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cena</p>
                      <p>{investment.current_price != null ? formatCurrencySafe(investment.current_price, investment.currency) : '—'}</p>
                    </div>
                  </div>
                  {investment.note ? <p className="mt-3 text-sm text-muted-foreground">{investment.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Nazev</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Poskytovatel</TableHead>
                <TableHead className="text-right">Hodnota</TableHead>
                <TableHead className="text-right">Cena</TableHead>
                <TableHead className="text-right">Mnozstvi</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvestments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell className="font-medium">{investment.ticker}</TableCell>
                  <TableCell>
                    <div>
                      <p>{investment.name}</p>
                      {investment.note ? <p className="text-xs text-muted-foreground">{investment.note}</p> : null}
                    </div>
                  </TableCell>
                  <TableCell>{ASSET_TYPE_LABELS[investment.asset_type] || investment.asset_type}</TableCell>
                  <TableCell>{INVESTMENT_PROVIDER_LABELS[investment.provider] || investment.provider}</TableCell>
                  <TableCell className="text-right">{formatCurrencySafe(investment.current_value, investment.currency)}</TableCell>
                  <TableCell className="text-right">
                    {investment.current_price != null ? formatCurrencySafe(investment.current_price, investment.currency) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {investment.quantity != null ? investment.quantity.toLocaleString('cs-CZ', { maximumFractionDigits: 8 }) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setEditingInvestment(investment)}>
                        {investment.is_watchlist ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => void onDeleteTrackedInvestment(investment.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-6 text-center text-sm text-muted-foreground">
            Pro tento pohled zatim nejsou zadne polozky.
          </div>
        )}

        <Dialog open={Boolean(editingInvestment)} onOpenChange={(open) => !open && setEditingInvestment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upravit evidovanou polozku</DialogTitle>
            </DialogHeader>
            {editingInvestment ? (
              <TrackedInvestmentForm
                initialValue={editingInvestment}
                onSave={async (payload) => {
                  await onUpdateTrackedInvestment(editingInvestment.id, payload);
                  setEditingInvestment(null);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
