import {
  BulkTransactionRow,
  ExpenseCategory,
  Transaction,
  TransactionAttachment,
  TransactionDraft,
  TransactionDraftType,
  TransactionSuggestion,
  TransactionType,
  TransferCategory,
  TouchedFields,
} from '@/types/finance';

const CATEGORY_VALUES: ExpenseCategory[] = ['necessities', 'whims', 'investments', 'savings', 'selfInvestment'];
const TRANSFER_VALUES: TransferCategory[] = ['savings', 'transfer'];

const TRANSACTION_TYPE_LABELS: Record<TransactionDraftType, string> = {
  income: 'Příjem',
  expense: 'Výdaj',
  transfer: 'Převod',
  investment: 'Investice',
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  necessities: 'Nutnosti',
  whims: 'Kraviny',
  investments: 'Investice',
  savings: 'Spoření',
  selfInvestment: 'Investice do sebe',
};

const CATEGORY_LOOKUP = new Map<string, ExpenseCategory>(
  Object.entries(CATEGORY_LABELS).flatMap(([key, value]) => [
    [normalizeSearchString(key), key as ExpenseCategory],
    [normalizeSearchString(value), key as ExpenseCategory],
  ])
);

const TYPE_LOOKUP = new Map<string, TransactionDraftType>([
  ['prijem', 'income'],
  ['prijmy', 'income'],
  ['income', 'income'],
  ['vydaj', 'expense'],
  ['vydaje', 'expense'],
  ['expense', 'expense'],
  ['prevod', 'transfer'],
  ['prevody', 'transfer'],
  ['transfer', 'transfer'],
  ['investice', 'investment'],
  ['investment', 'investment'],
]);

const EMPTY_DRAFT: TransactionDraft = {
  month: '',
  type: 'expense',
  name: '',
  amount: null,
  category: 'necessities',
  transferCategory: 'transfer',
  includeInInvestmentTotals: true,
  attachments: [],
};

export const formatCurrencyCZK = (value: number) =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

export function normalizeSearchString(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function parseAmount(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : Number.NaN;
  }

  const normalized = String(input ?? '')
    .replace(/\s+/g, '')
    .replace(/Kč/gi, '')
    .replace(/[^\d,.-]/g, '');

  if (!normalized) return Number.NaN;

  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  let canonical = normalized;

  if (commaCount > 0 && dotCount > 0) {
    canonical =
      normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '');
  } else if (commaCount > 0) {
    canonical = normalized.replace(',', '.');
  }

  const value = Number.parseFloat(canonical);
  return Number.isFinite(value) ? value : Number.NaN;
}

function detectQuickAddAmount(text: string) {
  const amountMatches = [...text.matchAll(/-?\d[\d\s]*(?:[,.]\d{1,2})?\s*(?:Kč)?/giu)];
  if (amountMatches.length === 0) {
    return { amount: null as number | null, rawAmount: '', name: text.trim() };
  }

  const lastMatch = amountMatches[amountMatches.length - 1];
  const rawAmount = lastMatch[0];
  const amount = parseAmount(rawAmount);
  const name = `${text.slice(0, lastMatch.index)} ${text.slice((lastMatch.index || 0) + rawAmount.length)}`
    .replace(/\s+/g, ' ')
    .trim();

  return {
    amount: Number.isFinite(amount) ? amount : null,
    rawAmount,
    name,
  };
}

export function parseQuickAdd(input: string, month = '', defaultDate = ''): TransactionDraft {
  const trimmed = input.trim();
  const { amount, name } = detectQuickAddAmount(trimmed);

  return {
    ...EMPTY_DRAFT,
    month: month || defaultDate || '',
    name,
    amount,
  };
}

function resolvePastedType(rawValue: string) {
  return TYPE_LOOKUP.get(normalizeSearchString(rawValue));
}

function resolvePastedCategory(rawValue: string) {
  return CATEGORY_LOOKUP.get(normalizeSearchString(rawValue));
}

function parseDelimitedRow(parts: string[], defaultMonth = ''): TransactionDraft {
  const normalizedParts = parts.map((part) => part.trim());
  const [name = '', amountRaw = '', typeRaw = '', sourceAccount = '', targetAccount = '', categoryRaw = '', month = '', note = ''] =
    normalizedParts;

  const resolvedType = resolvePastedType(typeRaw);
  const resolvedCategory = resolvePastedCategory(categoryRaw);
  const type = resolvedType || 'expense';

  return {
    ...EMPTY_DRAFT,
    month: month || defaultMonth,
    name,
    amount: amountRaw ? parseAmount(amountRaw) : null,
    type,
    account: type === 'income' ? targetAccount || undefined : type === 'expense' ? sourceAccount || undefined : undefined,
    sourceAccount: type === 'transfer' || type === 'investment' ? sourceAccount || undefined : undefined,
    transferAccount: type === 'transfer' ? targetAccount || undefined : undefined,
    investmentAccount: type === 'investment' ? targetAccount || undefined : undefined,
    category: type === 'investment' ? 'investments' : resolvedCategory || 'necessities',
    note: note || undefined,
  };
}

export function parseBulkPaste(text: string, defaultMonth = ''): TransactionDraft[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes('\t')) {
        return parseDelimitedRow(line.split('\t'), defaultMonth);
      }

      if (line.includes(';')) {
        return parseDelimitedRow(line.split(';'), defaultMonth);
      }

      const quickDraft = parseQuickAdd(line, defaultMonth);
      return {
        ...quickDraft,
        category: 'necessities',
      };
    });
}

export function transactionToDraft(transaction?: Transaction | null): TransactionDraft {
  if (!transaction) {
    return { ...EMPTY_DRAFT };
  }

  const draftType: TransactionDraftType =
    transaction.type === 'expense' && transaction.category === 'investments' ? 'investment' : transaction.type;

  return {
    month: transaction.month,
    type: draftType,
    name: transaction.name,
    amount: transaction.amount,
    account:
      transaction.type === 'income' || (transaction.type === 'expense' && draftType !== 'investment')
        ? transaction.account
        : undefined,
    sourceAccount:
      transaction.type === 'transfer'
        ? transaction.sourceAccount
        : draftType === 'investment'
          ? transaction.account
          : undefined,
    transferAccount: transaction.transferAccount,
    transferCategory: transaction.transferCategory || 'transfer',
    category: transaction.category || 'necessities',
    investmentAccount: transaction.investmentAccount,
    includeInInvestmentTotals: transaction.includeInInvestmentTotals ?? true,
    goalId: transaction.goalId,
    goalImpact: transaction.goalImpact,
    note: transaction.note,
    attachments: transaction.attachments || [],
    subcategoryId: transaction.subcategoryId,
    autoAssigned: transaction.autoAssigned,
    ruleId: transaction.ruleId,
  };
}

export function duplicateTransaction(transaction: Transaction): TransactionDraft {
  return {
    ...transactionToDraft(transaction),
    attachments: [],
  };
}

export function draftToTransactionInput(draft: TransactionDraft) {
  const normalizedType: TransactionType = draft.type === 'investment' ? 'expense' : draft.type;
  const payload: Omit<Transaction, 'id' | 'createdAt'> = {
    month: draft.month,
    type: normalizedType,
    name: draft.name.trim(),
    amount: draft.amount ?? 0,
    goalId: draft.goalId || undefined,
    goalImpact: draft.goalId ? draft.goalImpact : undefined,
    note: draft.note?.trim() || undefined,
    attachments: draft.attachments?.map((attachment) => ({
      ...attachment,
      previewUrl: attachment.previewUrl,
    })),
    autoAssigned: draft.autoAssigned,
    ruleId: draft.ruleId || undefined,
  };

  if (draft.type === 'income') {
    payload.account = draft.account;
  } else if (draft.type === 'transfer') {
    payload.sourceAccount = draft.sourceAccount;
    payload.transferAccount = draft.transferAccount;
    payload.transferCategory = draft.transferCategory || 'transfer';
  } else if (draft.type === 'investment') {
    payload.account = draft.sourceAccount;
    payload.category = 'investments';
    payload.subcategoryId = draft.subcategoryId || undefined;
    payload.investmentAccount = draft.investmentAccount;
    payload.includeInInvestmentTotals = draft.includeInInvestmentTotals ?? true;
  } else {
    payload.account = draft.account;
    payload.category = draft.category;
    payload.subcategoryId = draft.subcategoryId || undefined;
    if (draft.category === 'investments') {
      payload.investmentAccount = draft.investmentAccount;
      payload.includeInInvestmentTotals = draft.includeInInvestmentTotals ?? true;
    }
  }

  return payload;
}

export function buildTransactionHistoryIndex(transactions: Transaction[]) {
  const index = new Map<string, TransactionSuggestion>();

  transactions.forEach((transaction) => {
    const normalizedName = normalizeSearchString(transaction.name);
    if (!normalizedName) return;

    const draft = transactionToDraft(transaction);
    const existing = index.get(normalizedName);
    const usageCount = (existing?.usageCount || 0) + 1;
    const lastUsedAt =
      !existing?.lastUsedAt || existing.lastUsedAt < transaction.createdAt ? transaction.createdAt : existing.lastUsedAt;

    index.set(normalizedName, {
      name: transaction.name,
      score: 0,
      type: draft.type,
      account: draft.account,
      sourceAccount: draft.sourceAccount,
      transferAccount: draft.transferAccount,
      category: draft.category,
      subcategoryId: draft.subcategoryId,
      transferCategory: draft.transferCategory,
      investmentAccount: draft.investmentAccount,
      includeInInvestmentTotals: draft.includeInInvestmentTotals,
      goalId: draft.goalId,
      goalImpact: draft.goalImpact,
      lastAmount: transaction.amount,
      usageCount,
      lastUsedAt,
      ruleId: transaction.ruleId,
    });
  });

  return index;
}

function scoreSuggestion(query: string, suggestion: TransactionSuggestion) {
  const normalizedQuery = normalizeSearchString(query);
  const normalizedName = normalizeSearchString(suggestion.name);
  if (!normalizedQuery || !normalizedName) return 0;

  let score = 0;

  if (normalizedName === normalizedQuery) score += 500;
  else if (normalizedName.startsWith(normalizedQuery)) score += 320;
  else if (normalizedName.includes(normalizedQuery)) score += 220;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  queryTokens.forEach((token) => {
    if (normalizedName.includes(token)) score += 25;
  });

  score += Math.min((suggestion.usageCount || 0) * 10, 120);

  if (suggestion.lastUsedAt) {
    const ageDays = Math.max(
      0,
      Math.round((Date.now() - new Date(suggestion.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    score += Math.max(0, 60 - Math.min(ageDays, 60));
  }

  return score;
}

export function getTransactionSuggestions(query: string, historyIndex: Map<string, TransactionSuggestion>) {
  if (!query.trim()) return [];

  return Array.from(historyIndex.values())
    .map((suggestion) => ({
      ...suggestion,
      score: scoreSuggestion(query, suggestion),
    }))
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if ((right.usageCount || 0) !== (left.usageCount || 0)) {
        return (right.usageCount || 0) - (left.usageCount || 0);
      }
      return (right.lastUsedAt || '').localeCompare(left.lastUsedAt || '');
    })
    .slice(0, 8);
}

export function applySuggestionToDraft(
  draft: TransactionDraft,
  suggestion: TransactionSuggestion,
  touchedFields: TouchedFields
): TransactionDraft {
  const nextDraft = { ...draft };

  if (!touchedFields.type && suggestion.type) nextDraft.type = suggestion.type;
  if (!touchedFields.amount && suggestion.lastAmount && !draft.amount) nextDraft.amount = suggestion.lastAmount;
  if (!touchedFields.account && suggestion.account && !draft.account) nextDraft.account = suggestion.account;
  if (!touchedFields.sourceAccount && suggestion.sourceAccount && !draft.sourceAccount) {
    nextDraft.sourceAccount = suggestion.sourceAccount;
  }
  if (!touchedFields.transferAccount && suggestion.transferAccount && !draft.transferAccount) {
    nextDraft.transferAccount = suggestion.transferAccount;
  }
  if (!touchedFields.category && suggestion.category && !draft.category) {
    nextDraft.category = suggestion.category;
  }
  if (!touchedFields.subcategoryId && suggestion.subcategoryId && !draft.subcategoryId) {
    nextDraft.subcategoryId = suggestion.subcategoryId;
  }
  if (!touchedFields.transferCategory && suggestion.transferCategory && !draft.transferCategory) {
    nextDraft.transferCategory = suggestion.transferCategory;
  }
  if (!touchedFields.investmentAccount && suggestion.investmentAccount && !draft.investmentAccount) {
    nextDraft.investmentAccount = suggestion.investmentAccount;
  }
  if (!touchedFields.goalId && suggestion.goalId && !draft.goalId) {
    nextDraft.goalId = suggestion.goalId;
  }
  if (!touchedFields.goalImpact && suggestion.goalImpact && !draft.goalImpact) {
    nextDraft.goalImpact = suggestion.goalImpact;
  }
  if (!touchedFields.includeInInvestmentTotals && typeof suggestion.includeInInvestmentTotals === 'boolean') {
    nextDraft.includeInInvestmentTotals = suggestion.includeInInvestmentTotals;
  }
  if (suggestion.ruleId && !draft.ruleId) {
    nextDraft.ruleId = suggestion.ruleId;
  }

  return nextDraft;
}

export function validateTransactionDraft(draft: TransactionDraft) {
  const errors: Record<string, string> = {};

  if (!draft.month) errors.month = 'Chybí měsíc.';
  if (!draft.name.trim()) errors.name = 'Chybí název.';
  if (!Number.isFinite(draft.amount) || (draft.amount ?? 0) === 0) errors.amount = 'Castka nesmi byt 0.';

  if (draft.type === 'income') {
    if (!draft.account) errors.account = 'Příjem musí mít cílový účet.';
  } else if (draft.type === 'expense') {
    if (!draft.account) errors.account = 'Výdaj musí mít zdrojový účet.';
    if (!draft.category || !CATEGORY_VALUES.includes(draft.category)) errors.category = 'Vyber druh transakce.';
  } else if (draft.type === 'investment') {
    if (!draft.sourceAccount) errors.sourceAccount = 'Investice musí mít zdrojový účet.';
  } else if (draft.type === 'transfer') {
    if (!draft.sourceAccount) errors.sourceAccount = 'Převod musí mít zdrojový účet.';
    if (!draft.transferAccount) errors.transferAccount = 'Převod musí mít cílový účet.';
    if (draft.sourceAccount && draft.transferAccount && draft.sourceAccount === draft.transferAccount) {
      errors.transferAccount = 'Neplatný převod. Zdrojový a cílový účet nesmí být stejný.';
    }
    if (draft.transferCategory && !TRANSFER_VALUES.includes(draft.transferCategory)) {
      errors.transferCategory = 'Vyber typ převodu.';
    }
  }

  return errors;
}

export function validateBulkRows(rows: BulkTransactionRow[]) {
  return rows.map((row) => {
    const errors = validateTransactionDraft(row.draft);
    return {
      ...row,
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  });
}

export function createBulkRow(
  month: string,
  previousDraft?: TransactionDraft,
  copyFromPrevious = true
): BulkTransactionRow {
  const inheritedDraft = copyFromPrevious && previousDraft
    ? {
        ...EMPTY_DRAFT,
        month: previousDraft.month || month,
        type: previousDraft.type,
        account: previousDraft.account,
        sourceAccount: previousDraft.sourceAccount,
        transferAccount: previousDraft.transferAccount,
        category: previousDraft.category,
        subcategoryId: previousDraft.subcategoryId,
        transferCategory: previousDraft.transferCategory,
        investmentAccount: previousDraft.investmentAccount,
        includeInInvestmentTotals: previousDraft.includeInInvestmentTotals,
        goalId: previousDraft.goalId,
        goalImpact: previousDraft.goalImpact,
      }
    : {
        ...EMPTY_DRAFT,
        month,
      };

  return {
    id: crypto.randomUUID(),
    draft: {
      ...inheritedDraft,
      name: '',
      amount: null,
      note: '',
      attachments: [],
    },
    errors: {},
    isValid: false,
  };
}

export function createAttachmentPreview(attachment: TransactionAttachment) {
  return attachment.previewUrl || attachment.storagePath || '';
}

export function getTransactionTypeLabel(type: TransactionDraftType) {
  return TRANSACTION_TYPE_LABELS[type];
}

export function getCategoryLabel(category?: ExpenseCategory) {
  return category ? CATEGORY_LABELS[category] || category : '';
}

