export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionDraftType = TransactionType | 'investment';

export type ExpenseCategory = 'necessities' | 'whims' | 'investments' | 'savings' | 'selfInvestment';

export type TransferCategory = 'savings' | 'transfer';

export interface OcrResult {
  amount?: number;
  date?: string;
  merchantName?: string;
  text?: string;
  confidence?: number;
}

export interface TransactionAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath?: string;
  previewUrl?: string;
  createdAt: string;
  ocrStatus?: 'idle' | 'processing' | 'done' | 'failed';
  ocrResult?: OcrResult;
}

export interface TransactionDraft {
  month: string;
  type: TransactionDraftType;
  name: string;
  amount: number | null;
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
  attachments?: TransactionAttachment[];
}

export interface TouchedFields {
  month?: boolean;
  type?: boolean;
  name?: boolean;
  amount?: boolean;
  account?: boolean;
  category?: boolean;
  transferCategory?: boolean;
  sourceAccount?: boolean;
  transferAccount?: boolean;
  investmentAccount?: boolean;
  includeInInvestmentTotals?: boolean;
  goalId?: boolean;
  goalImpact?: boolean;
  note?: boolean;
}

export interface TransactionSuggestion {
  name: string;
  score: number;
  type?: TransactionDraftType;
  account?: string;
  category?: ExpenseCategory;
  transferCategory?: TransferCategory;
  sourceAccount?: string;
  transferAccount?: string;
  investmentAccount?: string;
  includeInInvestmentTotals?: boolean;
  goalId?: string;
  goalImpact?: 'deposit' | 'withdrawal';
  lastAmount?: number;
  usageCount?: number;
  lastUsedAt?: string;
}

export interface BulkTransactionRow {
  id: string;
  draft: TransactionDraft;
  errors: Record<string, string>;
  isValid: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  institutionId?: string;
  initialBalance: number;
  currentBalance: number;
  isSavings?: boolean;
  interestRate?: number; // annual % rate
}

export interface Transaction {
  id: string;
  month: string; // format: "YYYY-MM"
  type: TransactionType;
  name: string;
  amount: number;
  account?: string; // for income and expense
  category?: ExpenseCategory; // for expense
  transferCategory?: TransferCategory; // for transfer
  sourceAccount?: string; // for transfer - source account
  transferAccount?: string; // for transfer - target account
  investmentAccount?: string; // optional target account for investment expense
  includeInInvestmentTotals?: boolean; // include in yearly invested total
  goalId?: string;
  goalImpact?: 'deposit' | 'withdrawal';
  note?: string;
  attachments?: TransactionAttachment[];
  folder?: string; // custom folder for organization
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
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
  folder?: string;
  dayOfMonth: number; // 1-31
  isActive: boolean;
}

export interface AccountMonthlySnapshot {
  id: string;
  month: string;
  accountId: string;
  accountName: string;
  institutionId?: string;
  accountGroup: 'bank' | 'broker';
  balance: number;
  isSavings?: boolean;
  source?: 'computed' | 'import';
  createdAt: string;
}

export interface ImportedAccountMonthBalance {
  id: string;
  month: string;
  accountId: string;
  balance: number;
  createdAt: string;
}

export interface MonthlyData {
  month: string;
  income: Transaction[];
  expenses: Transaction[];
  transfers: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  totalTransfers: number;
  balance: number;
  categoryBreakdown: {
    necessities: number;
    whims: number;
    investments: number;
    savings: number;
    selfInvestment: number;
  };
}

export interface BudgetAllocation {
  necessities: number;
  investments: number;
  savings: number;
  whims: number;
}

export interface PortfolioSettings {
  annualReturn: number;
  currentAge: number;
}

export interface AccountGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  accountId?: string;
  status?: 'active' | 'completed';
  folder?: string;
  createdAt: string;
}

export interface WealthSnapshot {
  id: string;
  createdAt: string;
  bankAssets: number;
  brokerAssets: number;
  investedAssets: number;
  totalNetWorth: number;
}

export interface MonthClosure {
  month: string;
  closedAt: string;
  note?: string;
}

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  type: 'transaction' | 'account' | 'recurring' | 'goal' | 'investment' | 'system';
  action: string;
  detail: string;
}
