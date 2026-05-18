import { KeyboardEvent, useMemo, useRef, useState } from 'react';
import { CopyPlus, Paperclip, Plus, Rows3, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  BulkTransactionRow,
  ExpenseCategory,
  Subcategory,
  TouchedFields,
  TransactionDraft,
  TransactionSuggestion,
  TransferCategory,
} from '@/types/finance';
import { getSubcategoriesForCategory } from '@/utils/categoryAutomation';
import {
  applySuggestionToDraft,
  createBulkRow,
  getTransactionSuggestions,
  normalizeSearchString,
  parseAmount,
  parseBulkPaste,
  validateBulkRows,
} from '@/utils/transactionWorkflow';

interface AccountOption {
  id: string;
  label: string;
}

interface BulkTransactionTableProps {
  month: string;
  rows: BulkTransactionRow[];
  onRowsChange: (rows: BulkTransactionRow[]) => void;
  accountOptions: AccountOption[];
  suggestionsMap: Map<string, TransactionSuggestion>;
  subcategories: Subcategory[];
  enrichDraft: (draft: TransactionDraft, touchedFields?: TouchedFields) => TransactionDraft;
  onSaveRows: (rows: BulkTransactionRow[]) => void;
}

const GRID_TEMPLATE =
  'minmax(220px,2.2fr) minmax(110px,1fr) minmax(130px,1fr) minmax(170px,1.2fr) minmax(170px,1.2fr) minmax(150px,1fr) minmax(150px,1fr) minmax(120px,0.9fr) minmax(170px,1.2fr) minmax(110px,0.8fr) 96px';

const HEADER_LABELS = [
  'Název transakce',
  'Částka',
  'Typ',
  'Zdrojový účet',
  'Cílový účet',
  'Druh / Kategorie',
  'Podkategorie',
  'Datum',
  'Poznámka',
  'Příloha',
  'Akce',
];

const normalizeAmount = (value: string) => {
  const amount = parseAmount(value);
  return Number.isFinite(amount) ? amount : null;
};

const resolveAccountId = (value: string, accountOptions: AccountOption[]) => {
  if (!value) return '';
  const byId = accountOptions.find((option) => option.id === value);
  if (byId) return byId.id;
  const normalized = normalizeSearchString(value);
  return accountOptions.find((option) => normalizeSearchString(option.label) === normalized)?.id || value;
};

const getSourceValue = (draft: TransactionDraft) => {
  if (draft.type === 'expense') return draft.account || '';
  return draft.sourceAccount || '';
};

const getTargetValue = (draft: TransactionDraft) => {
  if (draft.type === 'income') return draft.account || '';
  if (draft.type === 'transfer') return draft.transferAccount || '';
  if (draft.type === 'investment') return draft.investmentAccount || '';
  return '';
};

const getEffectiveCategory = (draft: TransactionDraft): ExpenseCategory => {
  if (draft.type === 'investment') return 'investments';
  return draft.category || 'necessities';
};

export const BulkTransactionTable = ({
  month,
  rows,
  onRowsChange,
  accountOptions,
  suggestionsMap,
  subcategories,
  enrichDraft,
  onSaveRows,
}: BulkTransactionTableProps) => {
  const isMobile = useIsMobile();
  const [copyPrevious, setCopyPrevious] = useState(true);
  const [pasteText, setPasteText] = useState('');
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const visibleRows = useMemo(() => (rows.length > 0 ? rows : [createBulkRow(month)]), [month, rows]);
  const validatedRows = useMemo(() => validateBulkRows(visibleRows), [visibleRows]);
  const validCount = validatedRows.filter((row) => row.isValid).length;
  const invalidCount = validatedRows.length - validCount;

  const emitRows = (nextRows: BulkTransactionRow[]) => {
    onRowsChange(validateBulkRows(nextRows));
  };

  const focusCell = (rowIndex: number, columnIndex: number) => {
    const target = gridRef.current?.querySelector<HTMLElement>(`[data-row="${rowIndex}"][data-col="${columnIndex}"]`);
    target?.focus();
  };

  const updateRowDraft = (
    rowId: string,
    patch: Partial<TransactionDraft>,
    touchedFields: TouchedFields = {}
  ) => {
    emitRows(
      visibleRows.map((row) => {
        if (row.id !== rowId) return row;
        const nextDraft = enrichDraft(
          {
            ...row.draft,
            ...patch,
          },
          touchedFields
        );
        return {
          ...row,
          draft: nextDraft,
        };
      })
    );
  };

  const addRow = () => {
    const previousDraft = visibleRows.at(-1)?.draft;
    emitRows([...visibleRows, createBulkRow(previousDraft?.month || month, previousDraft, copyPrevious)]);
    requestAnimationFrame(() => focusCell(visibleRows.length, 0));
  };

  const duplicateRow = (index: number) => {
    const current = visibleRows[index];
    if (!current) return;

    const duplicated: BulkTransactionRow = {
      ...current,
      id: crypto.randomUUID(),
      draft: {
        ...current.draft,
        attachments: [],
      },
    };

    const nextRows = [...visibleRows];
    nextRows.splice(index + 1, 0, duplicated);
    emitRows(nextRows);
    requestAnimationFrame(() => focusCell(index + 1, 0));
  };

  const clearRow = (index: number) => {
    const previousDraft = visibleRows[index]?.draft;
    const nextRows = [...visibleRows];
    nextRows[index] = createBulkRow(previousDraft?.month || month, previousDraft, copyPrevious);
    emitRows(nextRows);
  };

  const applyPaste = async () => {
    const clipboardText = pasteText.trim() || (await navigator.clipboard.readText());
    const pastedDrafts = parseBulkPaste(clipboardText, month);
    if (pastedDrafts.length === 0) return;

    emitRows(
      pastedDrafts.map((draft) => {
        const topSuggestion = getTransactionSuggestions(draft.name, suggestionsMap)[0];
        const suggestedDraft = topSuggestion
          ? applySuggestionToDraft(draft, topSuggestion, { name: true, amount: !!draft.amount })
          : draft;
        const enrichedDraft = enrichDraft(suggestedDraft, { name: true, amount: !!draft.amount });

        return {
          id: crypto.randomUUID(),
          draft: {
            ...enrichedDraft,
            account: resolveAccountId(enrichedDraft.account || '', accountOptions) || undefined,
            sourceAccount: resolveAccountId(enrichedDraft.sourceAccount || '', accountOptions) || undefined,
            transferAccount: resolveAccountId(enrichedDraft.transferAccount || '', accountOptions) || undefined,
            investmentAccount: resolveAccountId(enrichedDraft.investmentAccount || '', accountOptions) || undefined,
          },
          errors: {},
          isValid: false,
        };
      })
    );
    setPasteText('');
  };

  const handleSourceChange = (row: BulkTransactionRow, value: string) => {
    const nextValue = value || undefined;
    if (row.draft.type === 'expense') {
      updateRowDraft(row.id, { account: nextValue }, { account: true });
      return;
    }
    updateRowDraft(row.id, { sourceAccount: nextValue }, { sourceAccount: true });
  };

  const handleTargetChange = (row: BulkTransactionRow, value: string) => {
    const nextValue = value || undefined;
    if (row.draft.type === 'income') {
      updateRowDraft(row.id, { account: nextValue }, { account: true });
      return;
    }
    if (row.draft.type === 'transfer') {
      updateRowDraft(row.id, { transferAccount: nextValue }, { transferAccount: true });
      return;
    }
    if (row.draft.type === 'investment') {
      updateRowDraft(row.id, { investmentAccount: nextValue }, { investmentAccount: true });
    }
  };

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    columnIndex: number
  ) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      onSaveRows(validatedRows);
      return;
    }

    if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
      event.preventDefault();
      duplicateRow(rowIndex);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setActiveCell(null);
      (event.currentTarget as HTMLElement).blur();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (rowIndex === visibleRows.length - 1) {
        addRow();
        return;
      }
      focusCell(rowIndex + 1, columnIndex);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusCell(Math.min(rowIndex + 1, visibleRows.length - 1), columnIndex);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusCell(Math.max(rowIndex - 1, 0), columnIndex);
    }
  };

  const cellClass = (rowIndex: number, columnIndex: number) =>
    activeCell?.row === rowIndex && activeCell?.col === columnIndex ? 'bulk-cell-active' : 'bulk-cell';

  const categoryValue = (draft: TransactionDraft) => {
    if (draft.type === 'transfer') return draft.transferCategory || 'transfer';
    if (draft.type === 'investment') return 'investments';
    return draft.category || 'necessities';
  };

  const renderActions = (rowIndex: number) => (
    <div className="flex items-center gap-1 bg-card px-2">
      <Button type="button" variant="ghost" size="icon" onClick={() => duplicateRow(rowIndex)} title="Duplikovat řádek">
        <CopyPlus className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => clearRow(rowIndex)} title="Vyčistit řádek">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Bulk paste z banky nebo poznámek</p>
            <p className="text-xs text-muted-foreground">
              Vlož více řádků textu nebo tabulku. Aplikace z nich vytvoří draft řádky.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void applyPaste()} disabled={!pasteText.trim()}>
            <Rows3 className="h-4 w-4" />
            Vytvořit řádky
          </Button>
        </div>
        <textarea
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
          className="min-h-28 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder={'Benzin 1549\nLidl 820\nNájem 12000'}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={copyPrevious} onChange={(event) => setCopyPrevious(event.target.checked)} />
          Kopírovat nastavení z předchozího řádku
        </label>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">Validní: {validCount}</span>
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">Nevalidní: {invalidCount}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card/70">
        {isMobile ? (
          <div className="space-y-3 p-3">
            {validatedRows.map((row, rowIndex) => {
              const draft = row.draft;
              const rowErrors = Object.values(row.errors).filter(Boolean);
              const currentCategory = getEffectiveCategory(draft);
              const currentSubcategories = getSubcategoriesForCategory(subcategories, currentCategory);

              return (
                <div key={row.id} className={`rounded-xl border p-3 ${row.isValid ? 'border-border bg-card/80' : 'border-destructive/40 bg-destructive/10'}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Řádek {rowIndex + 1}</p>
                      {!row.isValid && rowErrors[0] ? <p className="text-xs text-destructive">{rowErrors[0]}</p> : null}
                    </div>
                    {renderActions(rowIndex)}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Název transakce</label>
                      <Input value={draft.name} onChange={(event) => updateRowDraft(row.id, { name: event.target.value }, { name: true })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Částka</label>
                      <Input value={draft.amount ?? ''} onChange={(event) => updateRowDraft(row.id, { amount: normalizeAmount(event.target.value) }, { amount: true })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Typ</label>
                      <select
                        value={draft.type}
                        onChange={(event) => updateRowDraft(row.id, { type: event.target.value as TransactionDraft['type'] }, { type: true })}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm outline-none"
                      >
                        <option value="expense">Výdaj</option>
                        <option value="income">Příjem</option>
                        <option value="transfer">Převod</option>
                        <option value="investment">Investice</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Zdrojový účet</label>
                      <select
                        value={getSourceValue(draft)}
                        onChange={(event) => handleSourceChange(row, event.target.value)}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm outline-none"
                      >
                        <option value="">—</option>
                        {accountOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Cílový účet</label>
                      <select
                        value={getTargetValue(draft)}
                        onChange={(event) => handleTargetChange(row, event.target.value)}
                        className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm outline-none"
                      >
                        <option value="">—</option>
                        {accountOptions.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Druh / Kategorie</label>
                      {draft.type === 'transfer' ? (
                        <select
                          value={categoryValue(draft)}
                          onChange={(event) => updateRowDraft(row.id, { transferCategory: event.target.value as TransferCategory }, { transferCategory: true })}
                          className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm outline-none"
                        >
                          <option value="transfer">Převod mezi účty</option>
                          <option value="savings">Spoření</option>
                        </select>
                      ) : (
                        <select
                          value={categoryValue(draft)}
                          onChange={(event) =>
                            updateRowDraft(
                              row.id,
                              {
                                category: event.target.value as ExpenseCategory,
                                subcategoryId: undefined,
                                autoAssigned: false,
                                ruleId: undefined,
                              },
                              { category: true }
                            )
                          }
                          disabled={draft.type === 'investment'}
                          className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm outline-none"
                        >
                          <option value="necessities">Nutnosti</option>
                          <option value="investments">Investice</option>
                          <option value="savings">Spoření</option>
                          <option value="whims">Rozmary</option>
                          <option value="selfInvestment">Investice do sebe</option>
                        </select>
                      )}
                    </div>
                    {(draft.type === 'expense' || draft.type === 'investment') && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Podkategorie</label>
                        <select
                          value={draft.subcategoryId || ''}
                          onChange={(event) =>
                            updateRowDraft(
                              row.id,
                              {
                                subcategoryId: event.target.value || undefined,
                                autoAssigned: false,
                                ruleId: undefined,
                              },
                              { subcategoryId: true }
                            )
                          }
                          className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm outline-none"
                        >
                          <option value="">Bez podkategorie</option>
                          {currentSubcategories.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Datum / měsíc</label>
                      <Input value={draft.month || month} onChange={(event) => updateRowDraft(row.id, { month: event.target.value }, { month: true })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Poznámka</label>
                      <Input value={draft.note || ''} onChange={(event) => updateRowDraft(row.id, { note: event.target.value }, { note: true })} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="thin-scrollbar overflow-x-auto">
            <div ref={gridRef} className="min-w-[1710px]">
              <div
                data-testid="bulk-table-header"
                className="grid gap-px bg-border/60 text-xs font-semibold text-muted-foreground"
                style={{ gridTemplateColumns: GRID_TEMPLATE }}
              >
                {HEADER_LABELS.map((label) => (
                  <div key={label} className="bg-card px-3 py-2">
                    {label}
                  </div>
                ))}
              </div>

              <div className="divide-y divide-border/60">
                {validatedRows.map((row, rowIndex) => {
                  const rowErrors = Object.values(row.errors).filter(Boolean);
                  const draft = row.draft;
                  const currentCategory = getEffectiveCategory(draft);
                  const currentSubcategories = getSubcategoriesForCategory(subcategories, currentCategory);

                  return (
                    <div key={row.id} className="border-t border-border/60 first:border-t-0">
                      <div className={`grid gap-px ${row.isValid ? 'bg-border/20' : 'bg-destructive/15'}`} style={{ gridTemplateColumns: GRID_TEMPLATE }}>
                        <Input data-row={rowIndex} data-col={0} value={draft.name} onFocus={() => setActiveCell({ row: rowIndex, col: 0 })} onChange={(event) => updateRowDraft(row.id, { name: event.target.value }, { name: true })} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 0)} className={cellClass(rowIndex, 0)} />
                        <Input data-row={rowIndex} data-col={1} value={draft.amount ?? ''} onFocus={() => setActiveCell({ row: rowIndex, col: 1 })} onChange={(event) => updateRowDraft(row.id, { amount: normalizeAmount(event.target.value) }, { amount: true })} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 1)} className={cellClass(rowIndex, 1)} />
                        <select data-row={rowIndex} data-col={2} value={draft.type} onFocus={() => setActiveCell({ row: rowIndex, col: 2 })} onChange={(event) => updateRowDraft(row.id, { type: event.target.value as TransactionDraft['type'] }, { type: true })} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 2)} className={`h-10 bg-card px-3 text-sm outline-none ${cellClass(rowIndex, 2)}`}>
                          <option value="expense">Výdaj</option>
                          <option value="income">Příjem</option>
                          <option value="transfer">Převod</option>
                          <option value="investment">Investice</option>
                        </select>
                        <select data-row={rowIndex} data-col={3} value={getSourceValue(draft)} onFocus={() => setActiveCell({ row: rowIndex, col: 3 })} onChange={(event) => handleSourceChange(row, event.target.value)} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 3)} className={`h-10 bg-card px-3 text-sm outline-none ${cellClass(rowIndex, 3)}`}>
                          <option value="">—</option>
                          {accountOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        <select data-row={rowIndex} data-col={4} value={getTargetValue(draft)} onFocus={() => setActiveCell({ row: rowIndex, col: 4 })} onChange={(event) => handleTargetChange(row, event.target.value)} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 4)} className={`h-10 bg-card px-3 text-sm outline-none ${cellClass(rowIndex, 4)}`}>
                          <option value="">—</option>
                          {accountOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        {draft.type === 'transfer' ? (
                          <select data-row={rowIndex} data-col={5} value={categoryValue(draft)} onFocus={() => setActiveCell({ row: rowIndex, col: 5 })} onChange={(event) => updateRowDraft(row.id, { transferCategory: event.target.value as TransferCategory }, { transferCategory: true })} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 5)} className={`h-10 bg-card px-3 text-sm outline-none ${cellClass(rowIndex, 5)}`}>
                            <option value="transfer">Převod mezi účty</option>
                            <option value="savings">Spoření</option>
                          </select>
                        ) : (
                          <select
                            data-row={rowIndex}
                            data-col={5}
                            value={categoryValue(draft)}
                            onFocus={() => setActiveCell({ row: rowIndex, col: 5 })}
                            onChange={(event) =>
                              updateRowDraft(
                                row.id,
                                {
                                  category: event.target.value as ExpenseCategory,
                                  subcategoryId: undefined,
                                  autoAssigned: false,
                                  ruleId: undefined,
                                },
                                { category: true }
                              )
                            }
                            onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 5)}
                            disabled={draft.type === 'investment'}
                            className={`h-10 bg-card px-3 text-sm outline-none ${cellClass(rowIndex, 5)}`}
                          >
                            <option value="necessities">Nutnosti</option>
                            <option value="investments">Investice</option>
                            <option value="savings">Spoření</option>
                            <option value="whims">Rozmary</option>
                            <option value="selfInvestment">Investice do sebe</option>
                          </select>
                        )}
                        <select
                          data-row={rowIndex}
                          data-col={6}
                          value={draft.subcategoryId || ''}
                          onFocus={() => setActiveCell({ row: rowIndex, col: 6 })}
                          onChange={(event) =>
                            updateRowDraft(
                              row.id,
                              {
                                subcategoryId: event.target.value || undefined,
                                autoAssigned: false,
                                ruleId: undefined,
                              },
                              { subcategoryId: true }
                            )
                          }
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 6)}
                          disabled={draft.type === 'income' || draft.type === 'transfer'}
                          className={`h-10 bg-card px-3 text-sm outline-none ${cellClass(rowIndex, 6)}`}
                        >
                          <option value="">Bez podkategorie</option>
                          {currentSubcategories.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </option>
                          ))}
                        </select>
                        <Input data-row={rowIndex} data-col={7} value={draft.month || month} onFocus={() => setActiveCell({ row: rowIndex, col: 7 })} onChange={(event) => updateRowDraft(row.id, { month: event.target.value }, { month: true })} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 7)} className={cellClass(rowIndex, 7)} />
                        <Input data-row={rowIndex} data-col={8} value={draft.note || ''} onFocus={() => setActiveCell({ row: rowIndex, col: 8 })} onChange={(event) => updateRowDraft(row.id, { note: event.target.value }, { note: true })} onKeyDown={(event) => handleCellKeyDown(event, rowIndex, 8)} className={cellClass(rowIndex, 8)} />
                        <div className={`flex items-center justify-center bg-card px-3 ${activeCell?.row === rowIndex && activeCell?.col === 9 ? 'bulk-cell-active' : 'bulk-cell'}`}>
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {renderActions(rowIndex)}
                      </div>

                      {rowErrors.length > 0 && (
                        <div className="border-t border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                          {rowErrors[0]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {validatedRows.some((row) => !row.isValid) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Některé řádky nejsou validní. Nejdřív oprav chybějící název, částku nebo účty.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Přidat řádek
        </Button>
        <Button type="button" onClick={() => onSaveRows(validatedRows)}>
          <Save className="h-4 w-4" />
          Uložit vše
        </Button>
      </div>
    </div>
  );
};
