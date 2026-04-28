import { CheckCircle2, Link2, TimerReset } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrokerConnector } from '@/types/investment';

interface BrokerConnectionsPanelProps {
  connectors: BrokerConnector[];
  onMarkConfigured: (connectorId: string) => Promise<void>;
}

const STATUS_LABELS: Record<BrokerConnector['status'], string> = {
  planned: 'Naplánováno',
  configured: 'Připraveno',
  ready: 'Aktivní',
};

export const BrokerConnectionsPanel = ({
  connectors,
  onMarkConfigured,
}: BrokerConnectionsPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-primary" />
          Broker konektory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connectors.map((connector) => (
          <div key={connector.id} className="rounded-lg border border-border/60 bg-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{connector.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{connector.description}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {STATUS_LABELS[connector.status]}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <p>Typ zdroje: {connector.source_kind === 'api_sync' ? 'API synchronizace' : connector.source_kind}</p>
              <p>Autentizace: {connector.auth_type === 'api_key' ? 'API klíč' : 'Flex token'}</p>
              <p>{connector.config_hint}</p>
              {connector.last_sync_at ? (
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Poslední synchronizace: {new Date(connector.last_sync_at).toLocaleString('cs-CZ')}
                </p>
              ) : (
                <p className="flex items-center gap-2">
                  <TimerReset className="h-4 w-4" />
                  Synchronizace zatím nebyla spuštěna.
                </p>
              )}
            </div>

            {connector.status === 'planned' && (
              <Button className="mt-3" variant="outline" size="sm" onClick={() => void onMarkConfigured(connector.id)}>
                Označit jako připravené
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
