import {
  AutoCategorizationRule,
  BudgetLimit,
  ExpenseCategory,
  FinanceFeatureToggles,
  Subcategory,
  TouchedFields,
  Transaction,
  TransactionDraft,
} from '@/types/finance';
import { normalizeSearchString } from '@/utils/transactionWorkflow';

export const DEFAULT_FINANCE_FEATURE_TOGGLES: FinanceFeatureToggles = {
  autoCategorization: true,
  userRules: true,
  budgetLimits: false,
  pushNotifications: false,
  smartSuggestions: true,
};

export const SYSTEM_SUBCATEGORIES: Subcategory[] = [
  { id: 'necessities-food', name: 'Jídlo', parentCategory: 'necessities', icon: 'utensils', color: '#22c55e', isSystem: true, isArchived: false },
  { id: 'necessities-drugstore', name: 'Drogerie', parentCategory: 'necessities', icon: 'sparkles', color: '#38bdf8', isSystem: true, isArchived: false },
  { id: 'necessities-car', name: 'Auto', parentCategory: 'necessities', icon: 'car', color: '#f59e0b', isSystem: true, isArchived: false },
  { id: 'necessities-housing', name: 'Bydlení', parentCategory: 'necessities', icon: 'home', color: '#8b5cf6', isSystem: true, isArchived: false },
  { id: 'necessities-energy', name: 'Energie', parentCategory: 'necessities', icon: 'bolt', color: '#f97316', isSystem: true, isArchived: false },
  { id: 'necessities-health', name: 'Léky', parentCategory: 'necessities', icon: 'pill', color: '#ef4444', isSystem: true, isArchived: false },
  { id: 'whims-gaming', name: 'Gaming', parentCategory: 'whims', icon: 'gamepad-2', color: '#f43f5e', isSystem: true, isArchived: false },
  { id: 'whims-entertainment', name: 'Zábava', parentCategory: 'whims', icon: 'tickets', color: '#ec4899', isSystem: true, isArchived: false },
  { id: 'whims-restaurants', name: 'Restaurace', parentCategory: 'whims', icon: 'utensils-crossed', color: '#fb7185', isSystem: true, isArchived: false },
  { id: 'whims-clothing', name: 'Oblečení', parentCategory: 'whims', icon: 'shirt', color: '#a855f7', isSystem: true, isArchived: false },
  { id: 'investments-etf', name: 'ETF', parentCategory: 'investments', icon: 'chart-line', color: '#0ea5e9', isSystem: true, isArchived: false },
  { id: 'investments-stocks', name: 'Akcie', parentCategory: 'investments', icon: 'line-chart', color: '#14b8a6', isSystem: true, isArchived: false },
  { id: 'investments-crypto', name: 'Crypto', parentCategory: 'investments', icon: 'bitcoin', color: '#f59e0b', isSystem: true, isArchived: false },
  { id: 'investments-reserve', name: 'Rezerva', parentCategory: 'investments', icon: 'shield', color: '#10b981', isSystem: true, isArchived: false },
  { id: 'savings-holiday', name: 'Dovolená', parentCategory: 'savings', icon: 'plane', color: '#06b6d4', isSystem: true, isArchived: false },
  { id: 'savings-car', name: 'Auto', parentCategory: 'savings', icon: 'car-front', color: '#84cc16', isSystem: true, isArchived: false },
  { id: 'savings-emergency', name: 'Nouzový fond', parentCategory: 'savings', icon: 'shield-alert', color: '#22c55e', isSystem: true, isArchived: false },
  { id: 'self-investment-education', name: 'Vzdělávání', parentCategory: 'selfInvestment', icon: 'graduation-cap', color: '#6366f1', isSystem: true, isArchived: false },
];

export const SYSTEM_AUTOCATEGORIZATION_RULES: AutoCategorizationRule[] = [
  createSystemRule('system-billa-food', 'Billa → Jídlo', 'contains', 'billa', 'necessities', 'necessities-food', 90),
  createSystemRule('system-lidl-food', 'Lidl → Jídlo', 'contains', 'lidl', 'necessities', 'necessities-food', 90),
  createSystemRule('system-kaufland-food', 'Kaufland → Jídlo', 'contains', 'kaufland', 'necessities', 'necessities-food', 88),
  createSystemRule('system-albert-food', 'Albert → Jídlo', 'contains', 'albert', 'necessities', 'necessities-food', 88),
  createSystemRule('system-dm-drugstore', 'DM → Drogerie', 'contains', 'dm', 'necessities', 'necessities-drugstore', 92),
  createSystemRule('system-rossmann-drugstore', 'Rossmann → Drogerie', 'contains', 'rossmann', 'necessities', 'necessities-drugstore', 88),
  createSystemRule('system-shell-car', 'Shell → Auto', 'contains', 'shell', 'necessities', 'necessities-car', 90),
  createSystemRule('system-omv-car', 'OMV → Auto', 'contains', 'omv', 'necessities', 'necessities-car', 90),
  createSystemRule('system-cez-energy', 'ČEZ → Energie', 'contains', 'cez', 'necessities', 'necessities-energy', 95),
  createSystemRule('system-innogy-energy', 'Innogy → Energie', 'contains', 'innogy', 'necessities', 'necessities-energy', 92),
  createSystemRule('system-portu-etf', 'Portu → ETF', 'contains', 'portu', 'investments', 'investments-etf', 96),
  createSystemRule('system-trading212-stocks', 'Trading 212 → Akcie', 'contains', 'trading212', 'investments', 'investments-stocks', 95),
  createSystemRule('system-xtb-stocks', 'XTB → Akcie', 'contains', 'xtb', 'investments', 'investments-stocks', 95),
  createSystemRule('system-binance-crypto', 'Binance → Crypto', 'contains', 'binance', 'investments', 'investments-crypto', 95),
  createSystemRule('system-steam-gaming', 'Steam → Gaming', 'contains', 'steam', 'whims', 'whims-gaming', 90),
  createSystemRule('system-netflix-entertainment', 'Netflix → Zábava', 'contains', 'netflix', 'whims', 'whims-entertainment', 88),
  createSystemRule('system-spotify-entertainment', 'Spotify → Zábava', 'contains', 'spotify', 'whims', 'whims-entertainment', 88),
  createSystemRule('system-mcd-restaurants', 'McDonald’s → Restaurace', 'contains', 'mcd', 'whims', 'whims-restaurants', 86),
];

interface CategorizationContext {
  rules: AutoCategorizationRule[];
  featureToggles: FinanceFeatureToggles;
  touchedFields?: TouchedFields;
}

export interface CategorizationMatch {
  category: ExpenseCategory;
  subcategoryId?: string;
  ruleId?: string;
  autoAssigned: boolean;
}

export interface BudgetLimitUsage {
  limit: BudgetLimit;
  spent: number;
  ratio: number;
  month: string;
  categoryLabel: string;
  subcategoryLabel?: string;
}

export interface BudgetAlert extends BudgetLimitUsage {
  level: 'warning' | 'exceeded' | 'critical';
  threshold: number;
}

function createSystemRule(
  id: string,
  name: string,
  matchType: AutoCategorizationRule['matchType'],
  matchValue: string,
  targetCategory: ExpenseCategory,
  targetSubcategoryId: string,
  priority: number
): AutoCategorizationRule {
  return {
    id,
    name,
    matchType,
    matchValue,
    targetCategory,
    targetSubcategoryId,
    priority,
    isEnabled: true,
    isSystem: true,
  };
}

const scoreRule = (haystack: string, rule: AutoCategorizationRule) => {
  const normalizedValue = normalizeSearchString(rule.matchValue);
  if (!normalizedValue) return 0;

  if (rule.matchType === 'equals') {
    return haystack === normalizedValue ? 1000 + normalizedValue.length + rule.priority : 0;
  }

  if (rule.matchType === 'startsWith') {
    return haystack.startsWith(normalizedValue) ? 800 + normalizedValue.length + rule.priority : 0;
  }

  return haystack.includes(normalizedValue) ? 600 + normalizedValue.length + rule.priority : 0;
};

export const mergeSubcategories = (source: Subcategory[] = []) => {
  const map = new Map<string, Subcategory>();

  SYSTEM_SUBCATEGORIES.forEach((subcategory) => {
    map.set(subcategory.id, subcategory);
  });

  source.forEach((subcategory) => {
    map.set(subcategory.id, {
      ...map.get(subcategory.id),
      ...subcategory,
    });
  });

  return Array.from(map.values()).sort((left, right) => {
    if (left.parentCategory !== right.parentCategory) {
      return left.parentCategory.localeCompare(right.parentCategory);
    }
    return left.name.localeCompare(right.name, 'cs');
  });
};

export const mergeAutoCategorizationRules = (source: AutoCategorizationRule[] = []) => {
  const map = new Map<string, AutoCategorizationRule>();

  SYSTEM_AUTOCATEGORIZATION_RULES.forEach((rule) => {
    map.set(rule.id, rule);
  });

  source.forEach((rule) => {
    map.set(rule.id, {
      ...map.get(rule.id),
      ...rule,
    });
  });

  return Array.from(map.values()).sort((left, right) => {
    const systemWeight = Number(!!right.isSystem) - Number(!!left.isSystem);
    if (systemWeight !== 0) return systemWeight;
    return right.priority - left.priority;
  });
};

export const getSubcategoriesForCategory = (
  subcategories: Subcategory[],
  category?: ExpenseCategory,
  includeArchived = false
) =>
  subcategories.filter(
    (subcategory) =>
      subcategory.parentCategory === category && (includeArchived || !subcategory.isArchived)
  );

export const getSubcategoryLabel = (subcategories: Subcategory[], subcategoryId?: string) =>
  subcategories.find((subcategory) => subcategory.id === subcategoryId)?.name || '';

export const findMatchingCategorizationRule = (
  input: { name?: string; note?: string },
  rules: AutoCategorizationRule[],
  featureToggles: FinanceFeatureToggles
) => {
  if (!featureToggles.autoCategorization) return null;

  const haystack = normalizeSearchString([input.name, input.note].filter(Boolean).join(' '));
  if (!haystack) return null;

  const candidates = rules
    .filter((rule) => rule.isEnabled)
    .map((rule) => ({
      rule,
      score: scoreRule(haystack, rule),
      userPriority: rule.isSystem ? 0 : 10000,
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.userPriority !== left.userPriority) return right.userPriority - left.userPriority;
      if (right.score !== left.score) return right.score - left.score;
      return right.rule.priority - left.rule.priority;
    });

  return candidates[0]?.rule || null;
};

export const applyRuleToDraft = (
  draft: TransactionDraft,
  rule: AutoCategorizationRule | null,
  touchedFields: TouchedFields = {}
) => {
  if (!rule) return draft;
  if (draft.type !== 'expense' && draft.type !== 'investment') return draft;

  const nextDraft = { ...draft };
  let applied = false;

  if (!touchedFields.category) {
    nextDraft.category = rule.targetCategory;
    applied = true;
  }

  if (applied) {
    nextDraft.autoAssigned = true;
    nextDraft.ruleId = rule.id;
  }

  return nextDraft;
};

export const autoCategorizeDraft = (draft: TransactionDraft, context: CategorizationContext) => {
  const { rules, featureToggles, touchedFields } = context;
  const matchedRule = findMatchingCategorizationRule(
    { name: draft.name, note: draft.note },
    rules,
    featureToggles
  );

  return applyRuleToDraft(draft, matchedRule, touchedFields);
};

export const clearInvalidSubcategory = (draft: TransactionDraft, subcategories: Subcategory[]) => {
  if (!draft.subcategoryId || !draft.category) return draft;

  const isValid = subcategories.some(
    (subcategory) =>
      subcategory.id === draft.subcategoryId &&
      subcategory.parentCategory === draft.category &&
      !subcategory.isArchived
  );

  if (isValid) return draft;

  return {
    ...draft,
    subcategoryId: undefined,
  };
};

export const createRuleFromDraftAssignment = (
  draft: TransactionDraft,
  ruleName?: string
): AutoCategorizationRule | null => {
  if (!draft.name.trim() || !draft.category) return null;

  return {
    id: crypto.randomUUID(),
    name: ruleName || `${draft.name.trim()} → ${draft.category}`,
    matchType: 'contains',
    matchValue: draft.name.trim(),
    targetCategory: draft.category,
    targetSubcategoryId: draft.subcategoryId,
    priority: 100,
    isEnabled: true,
    isSystem: false,
  };
};

export const computeBudgetLimitUsage = (
  limit: BudgetLimit,
  transactions: Transaction[],
  subcategories: Subcategory[],
  month: string
): BudgetLimitUsage => {
  const spent = transactions
    .filter((transaction) => {
      if (transaction.month !== month) return false;
      if (transaction.type !== 'expense') return false;
      if (limit.category && transaction.category !== limit.category) return false;
      if (limit.subcategoryId && transaction.subcategoryId !== limit.subcategoryId) return false;
      return true;
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const ratio = limit.monthlyLimit > 0 ? spent / limit.monthlyLimit : 0;
  const subcategoryLabel = getSubcategoryLabel(subcategories, limit.subcategoryId);

  return {
    limit,
    spent,
    ratio,
    month,
    categoryLabel: limit.category ? getCategoryLabel(limit.category) : 'Celkový limit',
    subcategoryLabel: subcategoryLabel || undefined,
  };
};

export const getBudgetAlerts = (
  limits: BudgetLimit[],
  transactions: Transaction[],
  subcategories: Subcategory[],
  month: string
) => {
  return limits
    .filter((limit) => limit.isEnabled)
    .map((limit) => computeBudgetLimitUsage(limit, transactions, subcategories, month))
    .map<BudgetAlert | null>((usage) => {
      if (usage.ratio >= 1.2) {
        return { ...usage, level: 'critical', threshold: 1.2 };
      }
      if (usage.ratio >= 1) {
        return { ...usage, level: 'exceeded', threshold: 1 };
      }
      if (usage.ratio >= (usage.limit.warningThreshold || 0.8)) {
        return { ...usage, level: 'warning', threshold: usage.limit.warningThreshold || 0.8 };
      }
      return null;
    })
    .filter(Boolean) as BudgetAlert[];
};

function getCategoryLabel(category: ExpenseCategory) {
  switch (category) {
    case 'necessities':
      return 'Nutnosti';
    case 'whims':
      return 'Rozmary';
    case 'investments':
      return 'Investice';
    case 'savings':
      return 'Spoření';
    case 'selfInvestment':
      return 'Investice do sebe';
    default:
      return category;
  }
}
