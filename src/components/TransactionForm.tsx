import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Maximize2, Minimize2, PanelRightOpen, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AccountGoal,
  AutoCategorizationRule,
  BankAccount,
  BulkTransactionRow,
  ExpenseCategory,
  FinanceFeatureToggles,
  Subcategory,
  Transaction,
  TransactionDraft,
  TransactionSuggestion,
  TransactionType,
  TouchedFields,
  TransferCategory,
} from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { getCategoryName } from '@/utils/categoryNames';
import {
  autoCategorizeDraft,
  clearInvalidSubcategory,
  createRuleFromDraftAssignment,
  getSubcategoriesForCategory,
} from '@/utils/categoryAutomation';
import {
  applySuggestionToDraft,
  buildTransactionHistoryIndex,
  createBulkRow,
  draftToTransactionInput,
  duplicateTransaction,
  formatCurrencyCZK,
  getTransactionSuggestions,
  parseAmount,
  transactionToDraft,
  validateBulkRows,
  validateTransactionDraft,
} from '@/utils/transactionWorkflow';
import { TransactionAutocomplete } from '@/components/transactions/TransactionAutocomplete';
import { BulkTransactionTable } from '@/components/transactions/BulkTransactionTable';
import { QuickAddInput } from '@/components/transactions/QuickAddInput';
import { TransactionAttachmentInput } from '@/components/transactions/TransactionAttachmentInput';
import { useIsMobile } from '@/hooks/use-mobile';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: {
    month: string;
    type: TransactionType;
    name: string;
    amount: number;
    account?: string;
    category?: ExpenseCategory;
    transferCategory?: TransferCategory;
    sourceAccount?: string;
    transferAccount?: string;
    investmentAccount?: string;
    includeInInvestmentTotals?: boolean;
    goalId?: string;
    goalImpact?: 'deposit' | 'withdrawal';
    note?: string;
    attachments?: Transaction['attachments'];
    subcategoryId?: string;
    autoAssigned?: boolean;
    ruleId?: string;
  }) => void;
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  goals: AccountGoal[];
  subcategories: Subcategory[];
  autoCategorizationRules: AutoCategorizationRule[];
  featureToggles: FinanceFeatureToggles;
  onCreateAutoCategorizationRule: (rule: Omit<AutoCategorizationRule, 'id' | 'isSystem'>) => AutoCategorizationRule;
  transactions: Transaction[];
  getLastTransaction: () => {
    month?: string;
    type: TransactionType;
    category?: ExpenseCategory;
    account?: string;
    sourceAccount?: string;
    transferAccount?: string;
    transferCategory?: TransferCategory;
    investmentAccount?: string;
    subcategoryId?: string;
    includeInInvestmentTotals?: boolean;
    goalId?: string;
    goalImpact?: 'deposit' | 'withdrawal';
    autoAssigned?: boolean;
    ruleId?: string;
    note?: string;
    attachments?: Transaction['attachments'];
  } | null;
  onFillRecurringForMonth: (month: string) => number;
  initialTransaction?: Transaction | null;
  initialDraft?: TransactionDraft | null;
  initialMode?: 'single' | 'bulk' | 'quick';
  isMonthClosed: (month: string) => boolean;
}

const currentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const emptyDraft = (month = currentMonthValue()): TransactionDraft => ({
  month,
  type: 'expense',
  name: '',
  amount: null,
  category: 'necessities',
  transferCategory: 'transfer',
  includeInInvestmentTotals: true,
  attachments: [],
  note: '',
});

export const TransactionForm = ({
  isOpen,
  onClose,
  onSubmit,
  bankAccounts,
  brokerAccounts,
  goals,
  subcategories,
  autoCategorizationRules,
  featureToggles,
  onCreateAutoCategorizationRule,
  transactions,
  getLastTransaction,
  onFillRecurringForMonth,
  initialTransaction = null,
  initialDraft = null,
  initialMode = 'single',
  isMonthClosed,
}: TransactionFormProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isEditing = !!initialTransaction && !initialDraft;
  const allAccounts = useMemo(() => [...bankAccounts, ...brokerAccounts], [bankAccounts, brokerAccounts]);
  const accountOptions = useMemo(
    () =>
      allAccounts.map((account) => ({
        id: account.id,
        label: `${account.name}${account.isSavings ? ' · s.ú.' : ''}`,
      })),
    [allAccounts]
  );
  const historyIndex = useMemo(() => buildTransactionHistoryIndex(transactions), [transactions]);

  const [mode, setMode] = useState<'single' | 'bulk' | 'quick'>(initialMode);
  const [draft, setDraft] = useState<TransactionDraft>(emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<TouchedFields>({});
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [bulkRows, setBulkRows] = useState<BulkTransactionRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [panelSize, setPanelSize] = useState<'default' | 'wide' | 'full'>('default');
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const nameFieldRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(
    () => getTransactionSuggestions(draft.name, historyIndex).slice(0, 6),
    [draft.name, historyIndex]
  );
  const effectiveCategory = draft.type === 'investment' ? 'investments' : draft.category;
  const availableSubcategories = useMemo(
    () => getSubcategoriesForCategory(subcategories, effectiveCategory),
    [effectiveCategory, subcategories]
  );
  const monthLocked = draft.month ? isMonthClosed(draft.month) : false;
  const existingUserRuleForDraft = useMemo(() => {
    const normalizedName = draft.name.trim().toLowerCase();
    if (!normalizedName || !effectiveCategory) return null;

    return autoCategorizationRules.find(
      (rule) =>
        !rule.isSystem &&
        rule.matchValue.trim().toLowerCase() === normalizedName &&
        rule.targetCategory === effectiveCategory &&
        (rule.targetSubcategoryId || '') === (draft.subcategoryId || '')
    );
  }, [autoCategorizationRules, draft.name, draft.subcategoryId, effectiveCategory]);

  const resolveAccountLabel = (accountId?: string) =>
    accountOptions.find((option) => option.id === accountId)?.label || '';
  const resolveSubcategoryLabel = (subcategoryId?: string) =>
    subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name || '';

  const createBaseDraft = useCallback(() => {
    if (initialDraft) {
      return {
        ...emptyDraft(initialDraft.month || currentMonthValue()),
        ...initialDraft,
        attachments: initialDraft.attachments || [],
      };
    }

    if (initialTransaction) {
      return {
        ...emptyDraft(initialTransaction.month),
        ...transactionToDraft(initialTransaction),
      };
    }

    const lastTransaction = getLastTransaction();
    const nextMonth = lastTransaction?.month || currentMonthValue();
    return {
      ...emptyDraft(nextMonth),
      ...(lastTransaction
        ? {
            type:
              lastTransaction.type === 'expense' && lastTransaction.category === 'investments'
                ? 'investment'
                : lastTransaction.type,
            category: lastTransaction.category || 'necessities',
            account: lastTransaction.account,
            sourceAccount: lastTransaction.sourceAccount,
            transferAccount: lastTransaction.transferAccount,
            transferCategory: lastTransaction.transferCategory || 'transfer',
            investmentAccount: lastTransaction.investmentAccount,
            includeInInvestmentTotals: lastTransaction.includeInInvestmentTotals ?? true,
            goalId: lastTransaction.goalId,
            goalImpact: lastTransaction.goalImpact,
            note: lastTransaction.note || '',
          }
        : {}),
      attachments: [],
    } satisfies TransactionDraft;
  }, [getLastTransaction, initialDraft, initialTransaction]);

  useEffect(() => {
    if (!isOpen) return;

    const baseDraft = createBaseDraft();
    setDraft(baseDraft);
    setErrors({});
    setTouchedFields({});
    setAutocompleteIndex(0);
    setMode(initialMode);
    setBulkRows([createBulkRow(baseDraft.month || currentMonthValue())]);
    setIsDirty(false);
    setIsAutocompleteOpen(false);
    setPanelSize(initialMode === 'bulk' ? 'wide' : 'default');

    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
  }, [createBaseDraft, initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen || isEditing || draft.name.trim().length < 2 || suggestions.length === 0) return;
    setDraft((current) => clearInvalidSubcategory(applySuggestionToDraft(current, suggestions[0], touchedFields), subcategories));
  }, [draft.name, isEditing, isOpen, subcategories, suggestions, touchedFields]);

  useEffect(() => {
    if (!isOpen) return;

    setDraft((current) => {
      const withAutoCategory = autoCategorizeDraft(current, {
        rules: autoCategorizationRules,
        featureToggles,
        touchedFields,
      });
      const sanitized = clearInvalidSubcategory(withAutoCategory, subcategories);

      if (
        sanitized.category === current.category &&
        sanitized.subcategoryId === current.subcategoryId &&
        sanitized.autoAssigned === current.autoAssigned &&
        sanitized.ruleId === current.ruleId
      ) {
        return current;
      }

      return sanitized;
    });
  }, [autoCategorizationRules, draft.name, draft.note, draft.type, featureToggles, isOpen, subcategories, touchedFields]);

  useEffect(() => {
    if (mode === 'bulk' && panelSize === 'default') {
      setPanelSize('wide');
    }
  }, [mode, panelSize]);

  useEffect(() => {
    if (!isOpen || !isAutocompleteOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!nameFieldRef.current?.contains(event.target)) {
        setIsAutocompleteOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isAutocompleteOpen, isOpen]);

  const markTouched = (field: keyof TouchedFields) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const updateDraft = (patch: Partial<TransactionDraft>, touchedField?: keyof TouchedFields) => {
    setDraft((current) => clearInvalidSubcategory({ ...current, ...patch }, subcategories));
    setIsDirty(true);
    if (touchedField) markTouched(touchedField);
  };

  const enrichDraft = useCallback(
    (candidate: TransactionDraft, localTouchedFields: TouchedFields = {}) => {
      const mergedTouchedFields = {
        ...touchedFields,
        ...localTouchedFields,
      };

      let nextDraft = candidate;

      if (featureToggles.smartSuggestions && candidate.name.trim().length > 1) {
        const topSuggestion = getTransactionSuggestions(candidate.name, historyIndex)[0];
        if (topSuggestion) {
          nextDraft = applySuggestionToDraft(nextDraft, topSuggestion, mergedTouchedFields);
        }
      }

      nextDraft = autoCategorizeDraft(nextDraft, {
        rules: autoCategorizationRules,
        featureToggles,
        touchedFields: mergedTouchedFields,
      });

      return clearInvalidSubcategory(nextDraft, subcategories);
    },
    [autoCategorizationRules, featureToggles, historyIndex, subcategories, touchedFields]
  );

  const handleFillRecurring = () => {
    if (!draft.month) return;
    if (monthLocked) {
      toast({
        title: 'Měsíc je uzavřený',
        description: 'Nejdřív ho znovu otevři, teprve potom doplň trvalé příkazy.',
        variant: 'destructive',
      });
      return;
    }

    const added = onFillRecurringForMonth(draft.month);
    toast({
      title: added > 0 ? 'Trvalé příkazy doplněny' : 'Bez změn',
      description:
        added > 0
          ? `Do měsíce ${draft.month} bylo přidáno ${added} trvalých transakcí.`
          : `Pro měsíc ${draft.month} už jsou všechny aktivní trvalé příkazy vyplněné.`,
    });
  };

  const persistDraft = (currentDraft: TransactionDraft) => {
    const nextErrors = validateTransactionDraft(currentDraft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: 'Formulář není kompletní',
        description: 'Oprav vyznačená pole a uložení zopakuj.',
        variant: 'destructive',
      });
      return false;
    }

    if (isMonthClosed(currentDraft.month)) {
      toast({
        title: 'Měsíc je uzavřený',
        description: 'Tento měsíc je označený jako zkontrolovaný. Pro úpravy ho nejdřív otevři v detailu měsíce.',
        variant: 'destructive',
      });
      return false;
    }

    onSubmit(draftToTransactionInput(currentDraft));
    setIsDirty(false);
    setIsAutocompleteOpen(false);
    toast({
      title: isEditing ? 'Transakce upravena' : 'Transakce přidána',
      description: `${currentDraft.name} · ${currentDraft.amount ? formatCurrencyCZK(currentDraft.amount) : ''}`,
    });
    return true;
  };

  const handleSaveAndAddAnother = () => {
    if (!persistDraft(draft)) return;

    const preservedDraft: TransactionDraft = {
      ...emptyDraft(draft.month),
      month: draft.month,
      type: draft.type,
      account: draft.account,
      sourceAccount: draft.sourceAccount,
      transferAccount: draft.transferAccount,
      transferCategory: draft.transferCategory,
      category: draft.category,
      investmentAccount: draft.investmentAccount,
      includeInInvestmentTotals: draft.includeInInvestmentTotals,
      goalId: draft.goalId,
      goalImpact: draft.goalImpact,
      attachments: [],
      note: '',
    };

    setDraft(preservedDraft);
    setErrors({});
    setTouchedFields({});
    setAutocompleteIndex(0);
    setIsAutocompleteOpen(false);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const handlePrimarySave = () => {
    if (!persistDraft(draft)) return;
    if (isEditing) {
      onClose();
    }
  };

  const handleSaveAndClose = () => {
    if (!persistDraft(draft)) return;
    onClose();
  };

  const handleClose = () => {
    if (isDirty && !window.confirm('Ve formuláři jsou neuložené změny. Opravdu zavřít?')) {
      return;
    }
    setIsAutocompleteOpen(false);
    onClose();
  };

  const handleSingleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      handleSaveAndAddAnother();
    }
  };

  const submitBulkRows = (rowsToSave: BulkTransactionRow[]) => {
    const validatedRows = validateBulkRows(rowsToSave);
    const validRows = validatedRows.filter((row) => row.isValid);
    const invalidRows = validatedRows.filter((row) => !row.isValid);

    if (validRows.length === 0) {
      setBulkRows(validatedRows);
      toast({
        title: 'Bulk zadání není validní',
        description: 'Nejdřív oprav chybějící názvy, částky nebo účty.',
        variant: 'destructive',
      });
      return;
    }

    validRows.forEach((row) => onSubmit(draftToTransactionInput(row.draft)));
    setBulkRows(
      invalidRows.length > 0 ? validatedRows : [createBulkRow(draft.month || currentMonthValue(), validRows.at(-1)?.draft, true)]
    );
    setIsDirty(false);
    toast({
      title: 'Bulk zadání uloženo',
      description:
        invalidRows.length > 0
          ? `Uloženo ${validRows.length} řádků. ${invalidRows.length} řádků je potřeba opravit.`
          : `Uloženo ${validRows.length} transakcí.`,
    });
  };

  const openDraftFromQuickAdd = (nextDraft: TransactionDraft) => {
    setMode('single');
    const mergedDraft = {
      ...draft,
      ...nextDraft,
      month: nextDraft.month || draft.month || currentMonthValue(),
    };
    setDraft((current) => ({
      ...current,
      ...nextDraft,
      month: nextDraft.month || current.month || currentMonthValue(),
    }));
    setTouchedFields({});
    setErrors(validateTransactionDraft(mergedDraft));
    setIsDirty(true);
    requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const applySuggestion = (suggestion: TransactionSuggestion) => {
    setDraft((current) => ({
      ...clearInvalidSubcategory(applySuggestionToDraft(current, suggestion, touchedFields), subcategories),
      name: suggestion.name,
    }));
    setTouchedFields((current) => ({ ...current, name: true }));
    setAutocompleteIndex(0);
    setIsAutocompleteOpen(false);
    requestAnimationFrame(() => {
      const amountInput = document.getElementById('transaction-amount') as HTMLInputElement | null;
      amountInput?.focus();
    });
  };

  const handleCreateRuleFromCurrentAssignment = () => {
    const nextRule = createRuleFromDraftAssignment(
      {
        ...draft,
        category: effectiveCategory,
      },
      `${draft.name.trim()} → ${getCategoryName(effectiveCategory || 'necessities')}`
    );

    if (!nextRule) return;

    const createdRule = onCreateAutoCategorizationRule({
      userId: nextRule.userId,
      name: nextRule.name,
      matchType: nextRule.matchType,
      matchValue: nextRule.matchValue,
      targetCategory: nextRule.targetCategory,
      targetSubcategoryId: nextRule.targetSubcategoryId,
      priority: nextRule.priority,
      isEnabled: nextRule.isEnabled,
    });

    setDraft((current) => ({
      ...current,
      autoAssigned: true,
      ruleId: createdRule.id,
    }));

    toast({
      title: 'Pravidlo uloženo',
      description: 'Toto zařazení se použije i příště.',
    });
  };

  const panelWidth = isMobile
    ? '100vw'
    : panelSize === 'full'
      ? 'min(96vw, 1680px)'
      : panelSize === 'wide'
        ? 'min(90vw, 1360px)'
        : 'min(90vw, 920px)';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-background/80 backdrop-blur-sm">
      <div
        data-testid="transaction-form-panel"
        className="flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden border-l border-border bg-card shadow-2xl md:h-[92vh] md:min-h-[720px] md:min-w-[720px] md:max-w-[96vw] md:resize-x md:rounded-l-2xl"
        style={{ width: panelWidth }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6 md:py-4">
          <div>
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Upravit transakci' : initialDraft ? 'Duplikace transakce' : 'Přidat transakci'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Jedna transakce, hromadné zadání i rychlé přidání používají stejná validační pravidla.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPanelSize((current) => (current === 'default' ? 'wide' : 'default'))}
              title="Přepnout na širší variantu"
              aria-label="Přepnout na širší variantu"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPanelSize((current) => (current === 'full' ? 'wide' : 'full'))}
              title={panelSize === 'full' ? 'Zmenšit' : 'Na celou šířku'}
              aria-label={panelSize === 'full' ? 'Zmenšit panel' : 'Na celou šířku'}
            >
              {panelSize === 'full' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 md:p-6">
          {!isEditing && (
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium">Předvyplnit trvalé příkazy</p>
                  <p className="text-xs text-muted-foreground">
                    Pokud zakládáš nový měsíc, můžeš nejdřív doplnit aktivní trvalé platby.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={handleFillRecurring}>
                  <Plus className="h-4 w-4" />
                  Vyplnit trvalé příkazy
                </Button>
              </div>
            </div>
          )}

          {monthLocked && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                <div>
                  <p className="font-medium text-warning">Měsíc je uzavřený</p>
                  <p className="text-muted-foreground">
                    Tento měsíc je označený jako zkontrolovaný. Pro nové změny ho nejdřív otevři v detailu měsíce.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
            <TabsList className="grid w-full grid-cols-1 gap-1 sm:grid-cols-3">
              <TabsTrigger value="single">Jedna transakce</TabsTrigger>
              <TabsTrigger value="bulk">Hromadné zadání</TabsTrigger>
              <TabsTrigger value="quick">Rychlé přidání</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-4">
              <form
                onSubmit={(event) => event.preventDefault()}
                onKeyDown={handleSingleKeyDown}
                onFocusCapture={(event) => {
                  if (!nameFieldRef.current?.contains(event.target as Node)) {
                    setIsAutocompleteOpen(false);
                  }
                }}
                className="space-y-5"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transaction-month">Měsíc</Label>
                    <Input
                      id="transaction-month"
                      type="month"
                      value={draft.month}
                      onChange={(event) => updateDraft({ month: event.target.value }, 'month')}
                    />
                    {errors.month ? <p className="text-xs text-destructive">{errors.month}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-type">Typ</Label>
                    <select
                      id="transaction-type"
                      value={draft.type}
                      onChange={(event) => updateDraft({ type: event.target.value as TransactionDraft['type'] }, 'type')}
                      className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                    >
                      <option value="expense">Výdaj</option>
                      <option value="income">Příjem</option>
                      <option value="transfer">Převod</option>
                      <option value="investment">Investice</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
                  <div
                    ref={nameFieldRef}
                    className="relative space-y-2"
                    onBlur={(event) => {
                      const nextTarget = event.relatedTarget as Node | null;
                      if (nextTarget && nameFieldRef.current?.contains(nextTarget)) return;
                      setIsAutocompleteOpen(false);
                    }}
                  >
                    <Label htmlFor="transaction-name">Název transakce</Label>
                    <Input
                      id="transaction-name"
                      ref={nameInputRef}
                      value={draft.name}
                      onChange={(event) => {
                        updateDraft({ name: event.target.value }, 'name');
                        setIsAutocompleteOpen(true);
                      }}
                      onFocus={() => {
                        if (draft.name.trim().length > 0) {
                          setIsAutocompleteOpen(true);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown' && suggestions.length > 0) {
                          event.preventDefault();
                          setAutocompleteIndex((current) => Math.min(current + 1, suggestions.length - 1));
                          setIsAutocompleteOpen(true);
                        } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
                          event.preventDefault();
                          setAutocompleteIndex((current) => Math.max(current - 1, 0));
                          setIsAutocompleteOpen(true);
                        } else if (event.key === 'Enter' && suggestions.length > 0 && !event.ctrlKey) {
                          event.preventDefault();
                          applySuggestion(suggestions[autocompleteIndex] || suggestions[0]);
                        } else if (event.key === 'Escape') {
                          setAutocompleteIndex(0);
                          setIsAutocompleteOpen(false);
                        }
                      }}
                      placeholder="Mzda, nájem, Lidl, Trading 212..."
                    />
                    {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
                    <TransactionAutocomplete
                      isOpen={isAutocompleteOpen && draft.name.trim().length > 0 && suggestions.length > 0}
                      suggestions={suggestions}
                      activeIndex={autocompleteIndex}
                      resolveAccountLabel={resolveAccountLabel}
                      resolveSubcategoryLabel={resolveSubcategoryLabel}
                      onHover={setAutocompleteIndex}
                      onSelect={applySuggestion}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction-amount">Částka</Label>
                    <Input
                      id="transaction-amount"
                      inputMode="decimal"
                      value={draft.amount ?? ''}
                      onFocus={() => setIsAutocompleteOpen(false)}
                      onChange={(event) => updateDraft({ amount: parseAmount(event.target.value) || null }, 'amount')}
                      placeholder="Např. 1549,30"
                    />
                    {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
                  </div>
                </div>

                {suggestions[0] && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2 font-medium text-primary">
                      <Sparkles className="h-4 w-4" />
                      Našli jsme podobnou starší transakci
                    </div>
                    <p className="text-muted-foreground">
                      Poslední podobný záznam byl {suggestions[0].lastUsedAt?.slice(0, 10)} a systém podle něj
                      doplňuje typ, účty a kategorii jen do netouched polí.
                    </p>
                  </div>
                )}

                {(draft.autoAssigned || draft.subcategoryId || existingUserRuleForDraft) && (
                  <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">Automatické zařazení</p>
                        <p className="text-muted-foreground">
                          {draft.autoAssigned
                            ? 'Transakce byla předvyplněna podle pravidla nebo historie. Ruční změna se nepřepíše.'
                            : 'Aktuální zařazení můžeš uložit jako nové pravidlo pro příště.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCreateRuleFromCurrentAssignment}
                        disabled={!draft.name.trim() || !effectiveCategory || !!existingUserRuleForDraft}
                      >
                        Používat toto zařazení příště
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  {(draft.type === 'income' || draft.type === 'expense') && (
                    <div className="space-y-2">
                      <Label htmlFor="transaction-account">
                        {draft.type === 'income' ? 'Cílový účet' : 'Zdrojový účet'}
                      </Label>
                      <select
                        id="transaction-account"
                        value={draft.account || ''}
                        onChange={(event) => updateDraft({ account: event.target.value || undefined }, 'account')}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                      >
                        <option value="">Vyber účet</option>
                        {accountOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                      {errors.account ? <p className="text-xs text-destructive">{errors.account}</p> : null}
                    </div>
                  )}

                  {draft.type === 'investment' && (
                    <div className="space-y-2">
                      <Label htmlFor="investment-source-account">Zdrojový účet</Label>
                      <select
                        id="investment-source-account"
                        value={draft.sourceAccount || ''}
                        onChange={(event) => updateDraft({ sourceAccount: event.target.value || undefined }, 'sourceAccount')}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                      >
                        <option value="">Vyber účet</option>
                        {accountOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                      {errors.sourceAccount ? <p className="text-xs text-destructive">{errors.sourceAccount}</p> : null}
                    </div>
                  )}

                  {draft.type === 'transfer' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="transaction-source-account">Zdrojový účet</Label>
                        <select
                          id="transaction-source-account"
                          value={draft.sourceAccount || ''}
                          onChange={(event) => updateDraft({ sourceAccount: event.target.value || undefined }, 'sourceAccount')}
                          className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                        >
                          <option value="">Vyber účet</option>
                          {accountOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        {errors.sourceAccount ? <p className="text-xs text-destructive">{errors.sourceAccount}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="transaction-transfer-account">Cílový účet</Label>
                        <select
                          id="transaction-transfer-account"
                          value={draft.transferAccount || ''}
                          onChange={(event) => updateDraft({ transferAccount: event.target.value || undefined }, 'transferAccount')}
                          className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                        >
                          <option value="">Vyber účet</option>
                          {accountOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        {errors.transferAccount ? <p className="text-xs text-destructive">{errors.transferAccount}</p> : null}
                      </div>
                    </>
                  )}

                  {(draft.type === 'expense' || draft.type === 'investment') && (
                    <div className="space-y-2">
                      <Label htmlFor="transaction-category">Druh / kategorie</Label>
                      <select
                        id="transaction-category"
                        value={draft.type === 'investment' ? 'investments' : draft.category || 'necessities'}
                        onChange={(event) =>
                          updateDraft(
                            {
                              category: event.target.value as ExpenseCategory,
                              subcategoryId: undefined,
                              autoAssigned: false,
                              ruleId: undefined,
                            },
                            'category'
                          )
                        }
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                        disabled={draft.type === 'investment'}
                      >
                        <option value="necessities">Nutnosti</option>
                        <option value="investments">Investice</option>
                        <option value="savings">Spoření</option>
                        <option value="whims">Kraviny</option>
                        <option value="selfInvestment">Investice do sebe</option>
                      </select>
                      {errors.category ? <p className="text-xs text-destructive">{errors.category}</p> : null}
                    </div>
                  )}

                  {(draft.type === 'expense' || draft.type === 'investment') && (
                    <div className="space-y-2">
                      <Label htmlFor="transaction-subcategory">Podkategorie</Label>
                      <select
                        id="transaction-subcategory"
                        value={draft.subcategoryId || ''}
                        onChange={(event) =>
                          updateDraft(
                            {
                              subcategoryId: event.target.value || undefined,
                              autoAssigned: false,
                              ruleId: undefined,
                            },
                            'subcategoryId'
                          )
                        }
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                      >
                        <option value="">Bez podkategorie</option>
                        {availableSubcategories.map((subcategory) => (
                          <option key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {draft.type === 'transfer' && (
                    <div className="space-y-2">
                      <Label htmlFor="transfer-category">Typ převodu</Label>
                      <select
                        id="transfer-category"
                        value={draft.transferCategory || 'transfer'}
                        onChange={(event) => updateDraft({ transferCategory: event.target.value as TransferCategory }, 'transferCategory')}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                      >
                        <option value="transfer">Převod mezi účty</option>
                        <option value="savings">Spoření</option>
                      </select>
                    </div>
                  )}

                  {(draft.type === 'investment' || (draft.type === 'expense' && draft.category === 'investments')) && (
                    <div className="space-y-2">
                      <Label htmlFor="investment-target-account">Cílový investiční účet</Label>
                      <select
                        id="investment-target-account"
                        value={draft.investmentAccount || ''}
                        onChange={(event) => updateDraft({ investmentAccount: event.target.value || undefined }, 'investmentAccount')}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                      >
                        <option value="">Bez cílového účtu</option>
                        {accountOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {(draft.type === 'investment' || (draft.type === 'expense' && draft.category === 'investments')) && (
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.includeInInvestmentTotals ?? true}
                      onChange={(event) => updateDraft({ includeInInvestmentTotals: event.target.checked }, 'includeInInvestmentTotals')}
                    />
                    Zahrnout do celkového ročního součtu investované částky
                  </label>
                )}

                {goals.length > 0 && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="goal-id">Finanční cíl</Label>
                      <select
                        id="goal-id"
                        value={draft.goalId || ''}
                        onChange={(event) => updateDraft({ goalId: event.target.value || undefined }, 'goalId')}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                      >
                        <option value="">Bez cíle</option>
                        {goals.map((goal) => (
                          <option key={goal.id} value={goal.id}>
                            {goal.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {draft.goalId && (
                      <div className="space-y-2">
                        <Label htmlFor="goal-impact">Pohyb vůči cíli</Label>
                        <select
                          id="goal-impact"
                          value={draft.goalImpact || 'deposit'}
                          onChange={(event) => updateDraft({ goalImpact: event.target.value as 'deposit' | 'withdrawal' }, 'goalImpact')}
                          className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                        >
                          <option value="deposit">Vklad do cíle</option>
                          <option value="withdrawal">Výběr z cíle</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="transaction-note">Poznámka</Label>
                  <textarea
                    id="transaction-note"
                    value={draft.note || ''}
                    onChange={(event) => updateDraft({ note: event.target.value }, 'note')}
                    className="min-h-24 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Volitelná poznámka k transakci"
                  />
                </div>

                <TransactionAttachmentInput
                  attachments={draft.attachments || []}
                  onChange={(attachments) => updateDraft({ attachments })}
                />

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Zavřít
                  </Button>
                  <Button type="button" variant="outline" onClick={handlePrimarySave} disabled={monthLocked}>
                    Uložit
                  </Button>
                  <Button type="button" variant="outline" onClick={handleSaveAndAddAnother} disabled={monthLocked}>
                    Uložit a přidat další
                  </Button>
                  <Button type="button" onClick={handleSaveAndClose} disabled={monthLocked}>
                    Uložit a zavřít
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Enter potvrzuje výběr návrhu, Ctrl + Enter uloží a připraví další transakci, Esc zavře panel.
                </div>
              </form>
            </TabsContent>

            <TabsContent value="bulk" className="mt-4">
              <BulkTransactionTable
                month={draft.month || currentMonthValue()}
                rows={bulkRows}
                onRowsChange={(rows) => {
                  setBulkRows(rows);
                  setIsDirty(true);
                }}
                accountOptions={accountOptions}
                suggestionsMap={historyIndex}
                subcategories={subcategories}
                enrichDraft={enrichDraft}
                onSaveRows={submitBulkRows}
              />
            </TabsContent>

            <TabsContent value="quick" className="mt-4">
              <QuickAddInput
                month={draft.month || currentMonthValue()}
                transactions={transactions}
                resolveAccountLabel={resolveAccountLabel}
                enrichDraft={enrichDraft}
                onCreateDraft={openDraftFromQuickAdd}
                onSaveDraft={(quickDraft) => {
                  if (persistDraft(quickDraft)) {
                    requestAnimationFrame(() => {
                      const quickInput = document.getElementById('quick-add-input') as HTMLInputElement | null;
                      quickInput?.focus();
                    });
                  }
                }}
              />
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};
