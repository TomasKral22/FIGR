import { cn } from '@/lib/utils';
import { formatCurrencyCZK, getCategoryLabel, getTransactionTypeLabel } from '@/utils/transactionWorkflow';
import { TransactionSuggestion } from '@/types/finance';

interface TransactionAutocompleteProps {
  isOpen: boolean;
  suggestions: TransactionSuggestion[];
  activeIndex: number;
  resolveAccountLabel: (accountId?: string) => string;
  onSelect: (suggestion: TransactionSuggestion) => void;
  onHover: (index: number) => void;
}

export const TransactionAutocomplete = ({
  isOpen,
  suggestions,
  activeIndex,
  resolveAccountLabel,
  onSelect,
  onHover,
}: TransactionAutocompleteProps) => {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      data-testid="transaction-autocomplete"
      className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-soft)]"
    >
      <div className="max-h-64 overflow-y-auto p-1">
        {suggestions.map((suggestion, index) => {
          const accountSummary =
            suggestion.type === 'transfer'
              ? [resolveAccountLabel(suggestion.sourceAccount), resolveAccountLabel(suggestion.transferAccount)]
                  .filter(Boolean)
                  .join(' → ')
              : resolveAccountLabel(suggestion.account || suggestion.sourceAccount || suggestion.investmentAccount);

          return (
            <button
              key={`${suggestion.name}-${suggestion.lastUsedAt}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              className={cn(
                'flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors',
                activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
              )}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(suggestion)}
            >
              <span className="text-sm font-medium">{suggestion.name}</span>
              <span className="text-xs text-muted-foreground">
                {getTransactionTypeLabel(suggestion.type || 'expense')}
                {suggestion.category ? ` · ${getCategoryLabel(suggestion.category)}` : ''}
                {accountSummary ? ` · ${accountSummary}` : ''}
                {suggestion.lastAmount ? ` · naposledy ${formatCurrencyCZK(suggestion.lastAmount)}` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
