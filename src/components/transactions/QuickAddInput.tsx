import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Transaction, TransactionDraft } from '@/types/finance';
import {
  applySuggestionToDraft,
  buildTransactionHistoryIndex,
  getTransactionSuggestions,
  parseQuickAdd,
  validateTransactionDraft,
} from '@/utils/transactionWorkflow';
import { TransactionAutocomplete } from './TransactionAutocomplete';

interface QuickAddInputProps {
  month: string;
  transactions: Transaction[];
  resolveAccountLabel: (accountId?: string) => string;
  onCreateDraft: (draft: TransactionDraft) => void;
  onSaveDraft: (draft: TransactionDraft) => void;
}

export const QuickAddInput = ({ month, transactions, resolveAccountLabel, onCreateDraft, onSaveDraft }: QuickAddInputProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);

  const historyIndex = useMemo(() => buildTransactionHistoryIndex(transactions), [transactions]);
  const suggestions = useMemo(() => getTransactionSuggestions(value, historyIndex).slice(0, 5), [historyIndex, value]);

  useEffect(() => {
    if (!isAutocompleteOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!containerRef.current?.contains(event.target)) {
        setIsAutocompleteOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isAutocompleteOpen]);

  const submitDraft = (forceSave: boolean) => {
    const baseDraft = parseQuickAdd(value, month);
    const topSuggestion = suggestions[0];
    const enrichedDraft = topSuggestion
      ? applySuggestionToDraft(baseDraft, topSuggestion, {
          name: true,
        })
      : baseDraft;

    const errors = validateTransactionDraft(enrichedDraft);

    if (forceSave && Object.keys(errors).length === 0) {
      onSaveDraft(enrichedDraft);
      setValue('');
      setIsAutocompleteOpen(false);
      inputRef.current?.focus();
      return;
    }

    onCreateDraft(enrichedDraft);
    setValue('');
    setIsAutocompleteOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
      setIsAutocompleteOpen(true);
      return;
    }

    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      setIsAutocompleteOpen(true);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setValue('');
      setActiveIndex(0);
      setIsAutocompleteOpen(false);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (suggestions.length > 0 && isAutocompleteOpen && activeIndex >= 0 && !event.ctrlKey) {
        const suggestion = suggestions[activeIndex];
        const draft = applySuggestionToDraft(parseQuickAdd(value, month), suggestion, { name: true });
        onCreateDraft(draft);
        setValue('');
        setIsAutocompleteOpen(false);
        inputRef.current?.focus();
        return;
      }

      submitDraft(event.ctrlKey);
    }
  };

  return (
    <div ref={containerRef} className="rounded-2xl border border-border bg-card/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Rychlé přidání</p>
          <p className="text-xs text-muted-foreground">
            Např. „benzín 1500“, „Lidl 820“, „výplata 39316“, „xtb 5000“.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.focus()}>
          <Sparkles className="h-4 w-4" />
          Fokus
        </Button>
      </div>

      <div className="relative">
        <Input
          id="quick-add-input"
          ref={inputRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setActiveIndex(0);
            setIsAutocompleteOpen(event.target.value.trim().length > 0);
          }}
          onFocus={() => setIsAutocompleteOpen(value.trim().length > 0)}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget as Node | null;
            if (nextTarget && containerRef.current?.contains(nextTarget)) return;
            setIsAutocompleteOpen(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rychle přidat: např. benzin 1500, lidl 820, xtb 5000"
        />

        <TransactionAutocomplete
          isOpen={isAutocompleteOpen && suggestions.length > 0 && value.trim().length > 0}
          suggestions={suggestions}
          activeIndex={activeIndex}
          resolveAccountLabel={resolveAccountLabel}
          onHover={setActiveIndex}
          onSelect={(suggestion) => {
            const draft = applySuggestionToDraft(parseQuickAdd(value, month), suggestion, { name: true });
            onCreateDraft(draft);
            setValue('');
            setIsAutocompleteOpen(false);
            inputRef.current?.focus();
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Enter = návrh / draft</span>
        <span>Ctrl + Enter = rovnou uložit, pokud je návrh validní</span>
        <span>Esc = vyčistit vstup</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => submitDraft(false)} disabled={!value.trim()}>
          <WandSparkles className="h-4 w-4" />
          Vytvořit draft
        </Button>
        <Button type="button" onClick={() => submitDraft(true)} disabled={!value.trim()}>
          Uložit ihned
        </Button>
      </div>
    </div>
  );
};
