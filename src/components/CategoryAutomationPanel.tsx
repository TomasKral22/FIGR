import { useMemo, useState } from 'react';
import { AlertTriangle, Archive, FolderTree, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  AutoCategorizationRule,
  BudgetLimit,
  CategoryMatchType,
  ExpenseCategory,
  FinanceFeatureToggles,
  Subcategory,
  Transaction,
} from '@/types/finance';
import { getCategoryName } from '@/utils/categoryNames';
import {
  computeBudgetLimitUsage,
  getBudgetAlerts,
  getSubcategoriesForCategory,
} from '@/utils/categoryAutomation';
import { formatCurrencyCZK } from '@/utils/transactionWorkflow';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CategoryAutomationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  subcategories: Subcategory[];
  rules: AutoCategorizationRule[];
  budgetLimits: BudgetLimit[];
  featureToggles: FinanceFeatureToggles;
  transactions: Transaction[];
  activeMonth: string;
  onAddSubcategory: (subcategory: Omit<Subcategory, 'id' | 'isSystem' | 'isArchived'>) => void;
  onUpdateSubcategory: (
    id: string,
    updates: Partial<Pick<Subcategory, 'name' | 'parentCategory' | 'icon' | 'color'>>
  ) => void;
  onArchiveSubcategory: (id: string, isArchived: boolean) => void;
  onDeleteSubcategory: (id: string) => void;
  onAddRule: (rule: Omit<AutoCategorizationRule, 'id' | 'isSystem'>) => AutoCategorizationRule;
  onUpdateRule: (id: string, updates: Partial<Omit<AutoCategorizationRule, 'id'>>) => void;
  onDeleteRule: (id: string) => void;
  onAddBudgetLimit: (limit: Omit<BudgetLimit, 'id'>) => BudgetLimit;
  onUpdateBudgetLimit: (id: string, updates: Partial<Omit<BudgetLimit, 'id'>>) => void;
  onDeleteBudgetLimit: (id: string) => void;
  onUpdateFeatureToggles: (updates: Partial<FinanceFeatureToggles>) => void;
}

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  'necessities',
  'whims',
  'investments',
  'savings',
  'selfInvestment',
];

const MATCH_TYPE_LABELS: Record<CategoryMatchType, string> = {
  contains: 'Obsahuje',
  equals: 'Přesná shoda',
  startsWith: 'Začíná na',
};

const createRuleForm = () => ({
  name: '',
  matchType: 'contains' as CategoryMatchType,
  matchValue: '',
  targetCategory: 'necessities' as ExpenseCategory,
  targetSubcategoryId: '',
  priority: '100',
});

const createBudgetForm = () => ({
  category: 'necessities' as ExpenseCategory,
  subcategoryId: '',
  monthlyLimit: '',
  warningThreshold: '0.8',
});

export const CategoryAutomationPanel = ({
  isOpen,
  onClose,
  subcategories,
  rules,
  budgetLimits,
  featureToggles,
  transactions,
  activeMonth,
  onAddSubcategory,
  onUpdateSubcategory,
  onArchiveSubcategory,
  onDeleteSubcategory,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onAddBudgetLimit,
  onUpdateBudgetLimit,
  onDeleteBudgetLimit,
  onUpdateFeatureToggles,
}: CategoryAutomationPanelProps) => {
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryCategory, setSubcategoryCategory] = useState<ExpenseCategory>('necessities');
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState('');
  const [editingSubcategoryCategory, setEditingSubcategoryCategory] = useState<ExpenseCategory>('necessities');
  const [ruleForm, setRuleForm] = useState(createRuleForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [budgetForm, setBudgetForm] = useState(createBudgetForm);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);

  const groupedSubcategories = useMemo(
    () =>
      CATEGORY_OPTIONS.map((category) => ({
        category,
        items: getSubcategoriesForCategory(subcategories, category, true),
      })),
    [subcategories]
  );

  const groupedRules = useMemo(
    () => ({
      user: rules.filter((rule) => !rule.isSystem),
      system: rules.filter((rule) => rule.isSystem),
    }),
    [rules]
  );

  const budgetAlerts = useMemo(
    () => getBudgetAlerts(budgetLimits, transactions, subcategories, activeMonth),
    [activeMonth, budgetLimits, subcategories, transactions]
  );

  const budgetUsages = useMemo(
    () => budgetLimits.map((limit) => computeBudgetLimitUsage(limit, transactions, subcategories, activeMonth)),
    [activeMonth, budgetLimits, subcategories, transactions]
  );

  const resetRuleForm = () => {
    setRuleForm(createRuleForm());
    setEditingRuleId(null);
  };

  const resetBudgetForm = () => {
    setBudgetForm(createBudgetForm());
    setEditingBudgetId(null);
  };

  const handleAddSubcategory = () => {
    if (!subcategoryName.trim()) return;
    onAddSubcategory({
      name: subcategoryName.trim(),
      parentCategory: subcategoryCategory,
      createdBy: 'user',
    });
    setSubcategoryName('');
    setSubcategoryCategory('necessities');
  };

  const handleStartSubcategoryEdit = (subcategory: Subcategory) => {
    setEditingSubcategoryId(subcategory.id);
    setEditingSubcategoryName(subcategory.name);
    setEditingSubcategoryCategory(subcategory.parentCategory);
  };

  const handleSaveSubcategory = () => {
    if (!editingSubcategoryId || !editingSubcategoryName.trim()) return;
    onUpdateSubcategory(editingSubcategoryId, {
      name: editingSubcategoryName.trim(),
      parentCategory: editingSubcategoryCategory,
    });
    setEditingSubcategoryId(null);
    setEditingSubcategoryName('');
    setEditingSubcategoryCategory('necessities');
  };

  const handleSubmitRule = () => {
    if (!ruleForm.matchValue.trim()) return;

    const payload = {
      userId: undefined,
      name:
        ruleForm.name.trim() ||
        `${ruleForm.matchValue.trim()} → ${getCategoryName(ruleForm.targetCategory)}`,
      matchType: ruleForm.matchType,
      matchValue: ruleForm.matchValue.trim(),
      targetCategory: ruleForm.targetCategory,
      targetSubcategoryId: ruleForm.targetSubcategoryId || undefined,
      priority: Number(ruleForm.priority) || 100,
      isEnabled: true,
    };

    if (editingRuleId) {
      onUpdateRule(editingRuleId, payload);
    } else {
      onAddRule(payload);
    }

    resetRuleForm();
  };

  const handleEditRule = (rule: AutoCategorizationRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name,
      matchType: rule.matchType,
      matchValue: rule.matchValue,
      targetCategory: rule.targetCategory,
      targetSubcategoryId: rule.targetSubcategoryId || '',
      priority: String(rule.priority),
    });
  };

  const handleSubmitBudgetLimit = () => {
    if (!budgetForm.monthlyLimit.trim()) return;

    const payload = {
      userId: undefined,
      category: budgetForm.category,
      subcategoryId: budgetForm.subcategoryId || undefined,
      monthlyLimit: Number(budgetForm.monthlyLimit) || 0,
      warningThreshold: Number(budgetForm.warningThreshold) || 0.8,
      isEnabled: true,
    };

    if (editingBudgetId) {
      onUpdateBudgetLimit(editingBudgetId, payload);
    } else {
      onAddBudgetLimit(payload);
    }

    resetBudgetForm();
  };

  const handleEditBudgetLimit = (limit: BudgetLimit) => {
    setEditingBudgetId(limit.id);
    setBudgetForm({
      category: limit.category || 'necessities',
      subcategoryId: limit.subcategoryId || '',
      monthlyLimit: String(limit.monthlyLimit),
      warningThreshold: String(limit.warningThreshold),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-6xl overflow-y-auto rounded-[var(--radius-card)] border border-border bg-card/96">
        <DialogHeader>
          <DialogTitle>Podkategorie a automatická kategorizace</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Chytré funkce</h3>
                <p className="text-sm text-muted-foreground">
                  Každou část můžeš zapnout nebo vypnout samostatně. Aplikace dál funguje i bez aktivního budgetingu.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                ['autoCategorization', 'Automatická kategorizace'],
                ['userRules', 'Uživatelská pravidla'],
                ['budgetLimits', 'Rozpočtové limity'],
                ['pushNotifications', 'Push upozornění'],
                ['smartSuggestions', 'Smart návrhy'],
              ].map(([key, label]) => (
                <label key={key} className="rounded-xl border border-border bg-background/60 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={featureToggles[key as keyof FinanceFeatureToggles]}
                      onChange={(event) =>
                        onUpdateFeatureToggles({
                          [key]: event.target.checked,
                        } as Partial<FinanceFeatureToggles>)
                      }
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <h3 className="font-semibold">Rozpočtové limity</h3>
                <p className="text-sm text-muted-foreground">
                  Limity slouží jako monitoring. Transakce neblokují a fungují i při zpětném zapisování výdajů.
                </p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budget-category">Kategorie</Label>
                    <select
                      id="budget-category"
                      value={budgetForm.category}
                      onChange={(event) =>
                        setBudgetForm((prev) => ({
                          ...prev,
                          category: event.target.value as ExpenseCategory,
                          subcategoryId: '',
                        }))
                      }
                      className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {getCategoryName(category)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-subcategory">Podkategorie</Label>
                    <select
                      id="budget-subcategory"
                      value={budgetForm.subcategoryId}
                      onChange={(event) =>
                        setBudgetForm((prev) => ({
                          ...prev,
                          subcategoryId: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                    >
                      <option value="">Celá kategorie</option>
                      {getSubcategoriesForCategory(subcategories, budgetForm.category).map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-limit">Měsíční limit</Label>
                    <Input
                      id="budget-limit"
                      inputMode="decimal"
                      value={budgetForm.monthlyLimit}
                      onChange={(event) =>
                        setBudgetForm((prev) => ({
                          ...prev,
                          monthlyLimit: event.target.value,
                        }))
                      }
                      placeholder="8000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-threshold">Upozornění od</Label>
                    <Input
                      id="budget-threshold"
                      inputMode="decimal"
                      value={budgetForm.warningThreshold}
                      onChange={(event) =>
                        setBudgetForm((prev) => ({
                          ...prev,
                          warningThreshold: event.target.value,
                        }))
                      }
                      placeholder="0.8"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleSubmitBudgetLimit}>
                    <Save className="mr-2 h-4 w-4" />
                    {editingBudgetId ? 'Uložit limit' : 'Přidat limit'}
                  </Button>
                  {editingBudgetId ? (
                    <Button type="button" variant="ghost" onClick={resetBudgetForm}>
                      Zrušit úpravu
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                  <h4 className="mb-3 font-medium">Aktuální čerpání pro {activeMonth}</h4>
                  {budgetUsages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Zatím nejsou nastavené žádné limity.</p>
                  ) : (
                    <div className="space-y-3">
                      {budgetUsages.map((usage) => (
                        <div key={usage.limit.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {usage.subcategoryLabel
                                  ? `${usage.categoryLabel} · ${usage.subcategoryLabel}`
                                  : usage.categoryLabel}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrencyCZK(usage.spent)} / {formatCurrencyCZK(usage.limit.monthlyLimit)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleEditBudgetLimit(usage.limit)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => onDeleteBudgetLimit(usage.limit.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-background/80">
                            <div
                              className={`h-full rounded-full ${
                                usage.ratio >= 1.2
                                  ? 'bg-destructive'
                                  : usage.ratio >= 1
                                    ? 'bg-warning'
                                    : usage.ratio >= usage.limit.warningThreshold
                                      ? 'bg-primary'
                                      : 'bg-success'
                              }`}
                              style={{ width: `${Math.min(usage.ratio, 1.4) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                  <h4 className="mb-3 font-medium">Upozornění</h4>
                  {budgetAlerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">V aktuálním měsíci nejsou žádné limity blízko překročení.</p>
                  ) : (
                    <div className="space-y-3">
                      {budgetAlerts.map((alert) => (
                        <div key={`${alert.limit.id}-${alert.level}`} className="rounded-xl border border-border/70 bg-card/70 p-3">
                          <p className="font-medium">
                            {alert.subcategoryLabel
                              ? `${alert.categoryLabel} · ${alert.subcategoryLabel}`
                              : alert.categoryLabel}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {alert.level === 'warning'
                              ? 'Blížíš se limitu.'
                              : alert.level === 'exceeded'
                                ? 'Limit byl překročen.'
                                : 'Limit je výrazně překročen.'}
                          </p>
                          <p className="mt-1 text-sm">
                            {formatCurrencyCZK(alert.spent)} / {formatCurrencyCZK(alert.limit.monthlyLimit)} ({Math.round(alert.ratio * 100)} %)
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Podkategorie</h3>
                <p className="text-sm text-muted-foreground">
                  Systémové podkategorie zůstávají jako základ. Uživatelské lze přidávat, upravovat i archivovat.
                </p>
              </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
              <Input
                value={subcategoryName}
                onChange={(event) => setSubcategoryName(event.target.value)}
                placeholder="Např. Motorka"
              />
              <select
                value={subcategoryCategory}
                onChange={(event) => setSubcategoryCategory(event.target.value as ExpenseCategory)}
                className="h-10 rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryName(category)}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={handleAddSubcategory}>
                <Plus className="mr-2 h-4 w-4" />
                Přidat
              </Button>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {groupedSubcategories.map(({ category, items }) => (
                <div key={category} className="rounded-xl border border-border/70 bg-background/50 p-4">
                  <h4 className="mb-3 font-medium">{getCategoryName(category)}</h4>
                  <div className="space-y-3">
                    {items.map((subcategory) => {
                      const isEditing = editingSubcategoryId === subcategory.id;
                      return (
                        <div key={subcategory.id} className="rounded-xl border border-border/60 bg-card/70 p-3">
                          {isEditing ? (
                            <div className="space-y-3">
                              <Input
                                value={editingSubcategoryName}
                                onChange={(event) => setEditingSubcategoryName(event.target.value)}
                              />
                              <select
                                value={editingSubcategoryCategory}
                                onChange={(event) => setEditingSubcategoryCategory(event.target.value as ExpenseCategory)}
                                className="h-10 rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                              >
                                {CATEGORY_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {getCategoryName(option)}
                                  </option>
                                ))}
                              </select>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={handleSaveSubcategory}>
                                  <Save className="mr-2 h-4 w-4" />
                                  Uložit
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSubcategoryId(null)}>
                                  Zrušit
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{subcategory.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {subcategory.isSystem ? 'Systémová' : 'Uživatelská'}
                                  {subcategory.isArchived ? ' · archivovaná' : ''}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleStartSubcategoryEdit(subcategory)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                {!subcategory.isSystem ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onArchiveSubcategory(subcategory.id, !subcategory.isArchived)}
                                    >
                                      <Archive className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => onDeleteSubcategory(subcategory.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Pravidla automatického přiřazení</h3>
                <p className="text-sm text-muted-foreground">
                  Uživatelská pravidla mají přednost před systémovými. Používají se pro formulář, rychlé přidání i bulk režim.
                </p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4 rounded-xl border border-border/70 bg-background/50 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="rule-name">Název pravidla</Label>
                    <Input
                      id="rule-name"
                      value={ruleForm.name}
                      onChange={(event) => setRuleForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Např. Billa → Jídlo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rule-match-type">Typ shody</Label>
                    <select
                      id="rule-match-type"
                      value={ruleForm.matchType}
                      onChange={(event) =>
                        setRuleForm((prev) => ({
                          ...prev,
                          matchType: event.target.value as CategoryMatchType,
                        }))
                      }
                      className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                    >
                      {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rule-match-value">Hledaný text</Label>
                    <Input
                      id="rule-match-value"
                      value={ruleForm.matchValue}
                      onChange={(event) => setRuleForm((prev) => ({ ...prev, matchValue: event.target.value }))}
                      placeholder="Např. billa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rule-category">Kategorie</Label>
                    <select
                      id="rule-category"
                      value={ruleForm.targetCategory}
                      onChange={(event) =>
                        setRuleForm((prev) => ({
                          ...prev,
                          targetCategory: event.target.value as ExpenseCategory,
                          targetSubcategoryId: '',
                        }))
                      }
                      className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {getCategoryName(category)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rule-subcategory">Podkategorie</Label>
                    <select
                      id="rule-subcategory"
                      value={ruleForm.targetSubcategoryId}
                      onChange={(event) =>
                        setRuleForm((prev) => ({
                          ...prev,
                          targetSubcategoryId: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-[var(--radius-control)] border border-input bg-card/70 px-3 text-sm"
                    >
                      <option value="">Bez podkategorie</option>
                      {getSubcategoriesForCategory(subcategories, ruleForm.targetCategory).map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rule-priority">Priorita</Label>
                    <Input
                      id="rule-priority"
                      inputMode="numeric"
                      value={ruleForm.priority}
                      onChange={(event) => setRuleForm((prev) => ({ ...prev, priority: event.target.value }))}
                      placeholder="100"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleSubmitRule}>
                    <Save className="mr-2 h-4 w-4" />
                    {editingRuleId ? 'Uložit pravidlo' : 'Přidat pravidlo'}
                  </Button>
                  {editingRuleId ? (
                    <Button type="button" variant="ghost" onClick={resetRuleForm}>
                      Zrušit úpravu
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                  <h4 className="mb-3 font-medium">Uživatelská pravidla</h4>
                  {groupedRules.user.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Zatím nemáš vlastní pravidla. Můžeš je vytvářet ručně nebo při přepsání automatického zařazení.</p>
                  ) : (
                    <div className="space-y-3">
                      {groupedRules.user.map((rule) => (
                        <div key={rule.id} className="rounded-xl border border-border/60 bg-card/70 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{rule.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {MATCH_TYPE_LABELS[rule.matchType]} „{rule.matchValue}“
                              </p>
                              <p className="mt-1 text-sm">
                                {getCategoryName(rule.targetCategory)}
                                {rule.targetSubcategoryId
                                  ? ` · ${subcategories.find((subcategory) => subcategory.id === rule.targetSubcategoryId)?.name || 'Podkategorie'}`
                                  : ''}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleEditRule(rule)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => onDeleteRule(rule.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/70 bg-background/50 p-4">
                  <h4 className="mb-3 font-medium">Systémová pravidla</h4>
                  <div className="space-y-3">
                    {groupedRules.system.map((rule) => (
                      <div key={rule.id} className="rounded-xl border border-border/60 bg-card/70 p-3">
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {MATCH_TYPE_LABELS[rule.matchType]} „{rule.matchValue}“
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
