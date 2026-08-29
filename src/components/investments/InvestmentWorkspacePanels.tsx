import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { HiddenPanelsBar, ReorderablePanel } from '@/components/ReorderablePanel';
import { usePanelLayout } from '@/hooks/usePanelLayout';

export type InvestmentWorkspacePanelId =
  | 'actions'
  | 'portfolio'
  | 'sources'
  | 'tracked'
  | 'credit'
  | 'marketAssets';

const PANEL_LABELS: Record<InvestmentWorkspacePanelId, string> = {
  actions: 'Akce a nástroje',
  portfolio: 'Souhrn portfolia',
  sources: 'Investiční účty a zdroje',
  tracked: 'Evidované pozice',
  credit: 'Úvěrové investice',
  marketAssets: 'Tržní aktiva a správa',
};

const PANEL_DESCRIPTIONS: Record<InvestmentWorkspacePanelId, string> = {
  actions: 'Import, přepočet a operace nad investicemi',
  portfolio: 'Vývoj, rozdělení a výkon portfolia',
  sources: 'Brokeři, Investown, Edward a další platformy',
  tracked: 'Watchlist a ručně evidované pozice',
  credit: 'P2P, B2B a další úvěrové investice',
  marketAssets: 'Tickerové pozice, ceny, dividendy a importy',
};

interface InvestmentWorkspacePanelsProps {
  editing?: boolean;
  panels: Record<InvestmentWorkspacePanelId, ReactNode>;
}

export const InvestmentWorkspacePanels = ({ panels, editing = false }: InvestmentWorkspacePanelsProps) => {
  const isMobile = useIsMobile();
  const {
    visiblePanelOrder,
    hiddenPanels,
    movePanel,
    hidePanel,
    showPanel,
    startDrag,
    enterDragTarget,
    leaveDragTarget,
    dropOnPanel,
    endDrag,
    dragOverPanelId,
  } = usePanelLayout<InvestmentWorkspacePanelId>('finance_investment_panels_v1', [
    'actions',
    'portfolio',
    'sources',
    'tracked',
    'credit',
    'marketAssets',
  ]);

  return (
    <>
      <HiddenPanelsBar visible={editing} hiddenPanels={hiddenPanels} labels={PANEL_LABELS} onShow={showPanel} />

      {visiblePanelOrder.map((panelId, index) => (
        <ReorderablePanel
          key={panelId}
          editable={editing}
          title={PANEL_LABELS[panelId]}
          description={PANEL_DESCRIPTIONS[panelId]}
          isMobile={isMobile}
          isFirst={index === 0}
          isLast={index === visiblePanelOrder.length - 1}
          isDragOver={dragOverPanelId === panelId}
          onMoveUp={() => movePanel(panelId, 'up')}
          onMoveDown={() => movePanel(panelId, 'down')}
          onHide={() => hidePanel(panelId)}
          onDragStart={() => startDrag(panelId)}
          onDragEnter={() => enterDragTarget(panelId)}
          onDragLeave={() => leaveDragTarget(panelId)}
          onDragEnd={endDrag}
          onDrop={() => dropOnPanel(panelId)}
        >
          {panels[panelId]}
        </ReorderablePanel>
      ))}
    </>
  );
};
