import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { HiddenPanelsBar, ReorderablePanel } from '@/components/ReorderablePanel';
import { usePanelLayout } from '@/hooks/usePanelLayout';

export type MainDashboardPanelId =
  | 'gettingStarted'
  | 'backupReminder'
  | 'supportPanels'
  | 'wealthOverview'
  | 'decisionDashboard'
  | 'yearSelector'
  | 'monthWorkflow';

const PANEL_LABELS: Record<MainDashboardPanelId, string> = {
  gettingStarted: 'Začínáme',
  backupReminder: 'Připomínka zálohy',
  supportPanels: 'Rychlé akce a chytré souvislosti',
  wealthOverview: 'Celkový majetek',
  decisionDashboard: 'Rozhodovací dashboard',
  yearSelector: 'Pohled po letech',
  monthWorkflow: 'Měsíční workflow',
};

const PANEL_DESCRIPTIONS: Record<MainDashboardPanelId, string> = {
  gettingStarted: 'První kroky a základní rozcestník',
  backupReminder: 'Upozornění na zálohy a bezpečí dat',
  supportPanels: 'Rychlé akce, tipy a chytré souvislosti',
  wealthOverview: 'Souhrn majetku včetně měnových přepočtů',
  decisionDashboard: 'Signály pro kontrolu, limity a změny',
  yearSelector: 'Přepínání mezi roky a měsíčním pohledem',
  monthWorkflow: 'Transakce, uzávěrka a checklist měsíce',
};

interface MainDashboardPanelsProps {
  editing?: boolean;
  panels: Record<MainDashboardPanelId, ReactNode>;
}

export const MainDashboardPanels = ({ panels, editing = false }: MainDashboardPanelsProps) => {
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
  } = usePanelLayout<MainDashboardPanelId>('finance_dashboard_panels_v2', [
    'gettingStarted',
    'backupReminder',
    'supportPanels',
    'wealthOverview',
    'decisionDashboard',
    'yearSelector',
    'monthWorkflow',
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
