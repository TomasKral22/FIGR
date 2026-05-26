import { useEffect, useMemo, useState } from 'react';
import { appStorage } from '@/lib/appStorage';

const normalizeItems = <T extends string>(value: unknown, validIds: T[]) => {
  const ids = Array.isArray(value) ? value.filter((item): item is T => validIds.includes(item as T)) : [];
  const seen = new Set<T>();
  const ordered = ids.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });

  return [...ordered, ...validIds.filter((item) => !seen.has(item))];
};

const normalizeHidden = <T extends string>(value: unknown, validIds: T[]) =>
  Array.isArray(value) ? value.filter((item): item is T => validIds.includes(item as T)) : [];

export const usePanelLayout = <T extends string>(
  storageKey: string,
  defaultOrder: T[],
  defaultHidden: T[] = []
) => {
  const [panelOrder, setPanelOrder] = useState<T[]>(defaultOrder);

  const [hiddenPanels, setHiddenPanels] = useState<T[]>(defaultHidden);

  const [draggedPanelId, setDraggedPanelId] = useState<T | null>(null);
  const [dragOverPanelId, setDragOverPanelId] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const loaded = await appStorage.getMany([`${storageKey}:order`, `${storageKey}:hidden`]);
      if (cancelled) return;

      try {
        if (loaded[`${storageKey}:order`]) {
          setPanelOrder(normalizeItems(JSON.parse(loaded[`${storageKey}:order`] || '[]'), defaultOrder));
        }
        if (loaded[`${storageKey}:hidden`]) {
          setHiddenPanels(
            normalizeHidden(JSON.parse(loaded[`${storageKey}:hidden`] || JSON.stringify(defaultHidden)), defaultOrder)
          );
        }
      } catch {
        setPanelOrder(defaultOrder);
        setHiddenPanels(defaultHidden);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [defaultHidden, defaultOrder, storageKey]);

  useEffect(() => {
    void appStorage.setMany({
      [`${storageKey}:order`]: JSON.stringify(panelOrder),
      [`${storageKey}:hidden`]: JSON.stringify(hiddenPanels),
    });
  }, [hiddenPanels, panelOrder, storageKey]);

  const movePanel = (panelId: T, direction: 'up' | 'down') => {
    setPanelOrder((current) => {
      const index = current.indexOf(panelId);
      if (index === -1) return current;
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const reorderPanels = (sourceId: T, targetId: T) => {
    if (sourceId === targetId) return;

    setPanelOrder((current) => {
      const sourceIndex = current.indexOf(sourceId);
      const targetIndex = current.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const hidePanel = (panelId: T) => {
    setHiddenPanels((current) => (current.includes(panelId) ? current : [...current, panelId]));
  };

  const showPanel = (panelId: T) => {
    setHiddenPanels((current) => current.filter((item) => item !== panelId));
  };

  const startDrag = (panelId: T) => setDraggedPanelId(panelId);
  const enterDragTarget = (panelId: T) => {
    if (draggedPanelId && draggedPanelId !== panelId) {
      setDragOverPanelId(panelId);
    }
  };
  const leaveDragTarget = (panelId: T) => {
    if (dragOverPanelId === panelId) {
      setDragOverPanelId(null);
    }
  };
  const dropOnPanel = (panelId: T) => {
    if (draggedPanelId && draggedPanelId !== panelId) {
      reorderPanels(draggedPanelId, panelId);
    }
    setDraggedPanelId(null);
    setDragOverPanelId(null);
  };
  const endDrag = () => {
    setDraggedPanelId(null);
    setDragOverPanelId(null);
  };

  const visiblePanelOrder = useMemo(
    () => panelOrder.filter((panelId) => !hiddenPanels.includes(panelId)),
    [hiddenPanels, panelOrder]
  );

  return {
    panelOrder,
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
    draggedPanelId,
    dragOverPanelId,
  };
};
