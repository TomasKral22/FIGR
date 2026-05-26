import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { BankAccount, ExpenseCategory, Transaction, TransactionType, TransferCategory } from '@/types/finance';

const validTypes: TransactionType[] = ['income', 'expense', 'transfer'];
const validCategories: ExpenseCategory[] = ['necessities', 'whims', 'investments', 'savings', 'selfInvestment'];
const validTransferCategories: TransferCategory[] = ['savings', 'transfer'];

const typeLabels: Record<TransactionType, string> = {
  income: 'Příjem',
  expense: 'Výdaj',
  transfer: 'Převod',
};

const categoryLabels: Record<ExpenseCategory, string> = {
  necessities: 'Nutnosti',
  whims: 'Rozmary',
  investments: 'Investice',
  savings: 'Spoření',
  selfInvestment: 'Vlastní rozvoj',
};

const transferTypeLabels: Record<TransferCategory, string> = {
  savings: 'Spoření',
  transfer: 'Převod',
};

const typeAliases: Record<string, TransactionType> = {
  income: 'income',
  prijem: 'income',
  'příjem': 'income',
  expense: 'expense',
  vydaj: 'expense',
  'výdaj': 'expense',
  transfer: 'transfer',
  prevod: 'transfer',
  'převod': 'transfer',
};

const categoryAliases: Record<string, ExpenseCategory> = {
  necessities: 'necessities',
  nutnosti: 'necessities',
  whims: 'whims',
  rozmary: 'whims',
  investments: 'investments',
  investice: 'investments',
  savings: 'savings',
  sporeni: 'savings',
  'spoření': 'savings',
  selfinvestment: 'selfInvestment',
  vlastnirozvoj: 'selfInvestment',
  'vlastnírozvoj': 'selfInvestment',
};

const transferTypeAliases: Record<string, TransferCategory> = {
  transfer: 'transfer',
  prevod: 'transfer',
  'převod': 'transfer',
  savings: 'savings',
  sporeni: 'savings',
  'spoření': 'savings',
};

type ImportableTransaction = Omit<Transaction, 'id' | 'createdAt'>;

const normalize = (value: unknown) => String(value ?? '').trim();
const normalizeLower = (value: unknown) => normalize(value).toLowerCase();

const normalizeHeaderKey = (value: unknown) =>
  normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const resolveType = (value: unknown) => typeAliases[normalizeHeaderKey(value)] ?? null;

const resolveCategory = (value: unknown) => categoryAliases[normalizeHeaderKey(value)] ?? null;

const resolveTransferType = (value: unknown) => transferTypeAliases[normalizeHeaderKey(value)] ?? null;

const toBool = (value: unknown) => {
  const normalized = normalizeLower(value);
  return normalized === 'true' || normalized === 'ano' || normalized === '1' || normalized === 'yes';
};

const parseAmount = (value: unknown) => {
  const normalized = normalize(value);
  if (!normalized) return Number.NaN;

  const amount = Number.parseFloat(
    normalized
      .replace(/[^\d.,-]/g, '')
      .replace(/\.(?=\d{3}\b)/g, '')
      .replace(/,(?=\d{3}\b)/g, '')
      .replace(',', '.')
  );

  return Number.isFinite(amount) ? amount : Number.NaN;
};

const getAccountTypeLabel = (account: BankAccount) => (account.isSavings ? 'spořicí účet' : 'běžný účet');

const buildImportAccountLabels = (accounts: BankAccount[]) => {
  const baseLabels = accounts.map((account) => `${account.name} (${getAccountTypeLabel(account)})`);
  const counts = baseLabels.reduce<Record<string, number>>((acc, label) => {
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  return new Map(
    accounts.map((account, index) => {
      const baseLabel = baseLabels[index];
      const uniqueLabel =
        (counts[baseLabel] ?? 0) > 1 ? `${baseLabel} · ${account.id.slice(0, 6)}` : baseLabel;
      return [account.id, uniqueLabel];
    })
  );
};

const resolveAccountId = (value: unknown, accounts: BankAccount[]) => {
  const raw = normalize(value);
  if (!raw) return undefined;

  const normalizedRaw = raw.toLowerCase();
  const labelMap = buildImportAccountLabels(accounts);

  const exactId = accounts.find((account) => account.id === raw);
  if (exactId) return exactId.id;

  const byImportLabel = accounts.find((account) => labelMap.get(account.id)?.toLowerCase() === normalizedRaw);
  if (byImportLabel) return byImportLabel.id;

  const byName = accounts.find((account) => account.name.trim().toLowerCase() === normalizedRaw);
  return byName?.id;
};

const getCell = (row: Record<string, unknown>, ...keys: string[]) => {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value])
  );

  for (const key of keys) {
    const normalizedKey = normalizeHeaderKey(key);
    if (normalizedKey in normalizedRow) {
      return normalizedRow[normalizedKey];
    }
  }

  return '';
};

const isRowEmpty = (row: Record<string, unknown>) =>
  Object.values(row).every((value) => normalize(value) === '');

const triggerDownload = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportImportTemplate = async (
  bankAccounts: BankAccount[],
  brokerAccounts: BankAccount[],
  filename = 'figr-import-sablona.xlsx'
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FIGR';
  workbook.created = new Date();

  const importSheet = workbook.addWorksheet('Import');
  const helpSheet = workbook.addWorksheet('Nápověda');
  const accountsSheet = workbook.addWorksheet('Účty');
  const balancesSheet = workbook.addWorksheet('StavyÚčtů');
  const listsSheet = workbook.addWorksheet('Číselníky');
  const allAccounts = [...bankAccounts, ...brokerAccounts];
  const accountLabelMap = buildImportAccountLabels(allAccounts);

  listsSheet.state = 'veryHidden';

  const headers = [
    'Měsíc',
    'Typ',
    'Název',
    'Částka',
    'Účet',
    'Kategorie',
    'Zdrojový účet',
    'Cílový účet',
    'Typ převodu',
    'Investiční účet',
    'Zahrnout do investic',
  ];

  importSheet.addRow(headers);
  importSheet.getRow(1).font = { bold: true };
  importSheet.views = [{ state: 'frozen', ySplit: 1 }];
  importSheet.columns = [
    { key: 'month', width: 14 },
    { key: 'type', width: 16 },
    { key: 'name', width: 28 },
    { key: 'amount', width: 14 },
    { key: 'account', width: 32 },
    { key: 'category', width: 18 },
    { key: 'sourceAccount', width: 32 },
    { key: 'transferAccount', width: 32 },
    { key: 'transferCategory', width: 18 },
    { key: 'investmentAccount', width: 32 },
    { key: 'includeInInvestmentTotals', width: 24 },
  ];

  const firstBankLabel = bankAccounts[0] ? accountLabelMap.get(bankAccounts[0].id) || '' : '';
  const firstBrokerLabel = brokerAccounts[0] ? accountLabelMap.get(brokerAccounts[0].id) || '' : '';

  const templateRows = [
    ['2026-04', 'Příjem', 'Mzda', 45000, firstBankLabel, '', '', '', '', '', ''],
    [
      '2026-04',
      'Výdaj',
      'ETF investice',
      10000,
      firstBankLabel,
      'Investice',
      '',
      '',
      '',
      firstBrokerLabel,
      'Ano',
    ],
    ['2026-04', 'Převod', 'Přesun na brokera', 5000, '', '', firstBankLabel, firstBrokerLabel, 'Převod', '', ''],
  ];
  templateRows.forEach((row) => importSheet.addRow(row));

  const typeList = validTypes.map((type) => typeLabels[type]);
  const categoryList = ['', ...validCategories.map((category) => categoryLabels[category])];
  const transferList = ['', ...validTransferCategories.map((type) => transferTypeLabels[type])];
  const boolList = ['', 'Ano', 'Ne'];
  const accountNames = ['', ...allAccounts.map((account) => accountLabelMap.get(account.id) || account.name)];
  const brokerNames = ['', ...brokerAccounts.map((account) => accountLabelMap.get(account.id) || account.name)];

  [
    ['A', ['Měsíce', 'YYYY-MM, např. 2026-04']],
    ['B', ['Typy', ...typeList]],
    ['C', ['Kategorie', ...categoryList]],
    ['D', ['Převody', ...transferList]],
    ['E', ['AnoNe', ...boolList]],
    ['F', ['Účty', ...accountNames]],
    ['G', ['Brokerské účty', ...brokerNames]],
  ].forEach(([column, values]) => {
    (values as string[]).forEach((value, index) => {
      listsSheet.getCell(`${column}${index + 1}`).value = value;
    });
  });

  for (let row = 2; row <= 250; row += 1) {
    importSheet.getCell(`A${row}`).dataValidation = {
      type: 'textLength',
      operator: 'greaterThan',
      showErrorMessage: true,
      formulae: [6],
      errorTitle: 'Neplatný měsíc',
      error: 'Použij formát YYYY-MM.',
    };
    importSheet.getCell(`B${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ["='Číselníky'!$B$2:$B$4"],
    };
    importSheet.getCell(`E${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`='Číselníky'!$F$2:$F$${accountNames.length + 1}`],
    };
    importSheet.getCell(`F${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ["='Číselníky'!$C$2:$C$7"],
    };
    importSheet.getCell(`G${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`='Číselníky'!$F$2:$F$${accountNames.length + 1}`],
    };
    importSheet.getCell(`H${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`='Číselníky'!$F$2:$F$${accountNames.length + 1}`],
    };
    importSheet.getCell(`I${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ["='Číselníky'!$D$2:$D$4"],
    };
    importSheet.getCell(`J${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`='Číselníky'!$G$2:$G$${brokerNames.length + 1}`],
    };
    importSheet.getCell(`K${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ["='Číselníky'!$E$2:$E$4"],
    };
  }

  helpSheet.columns = [
    { width: 24 },
    { width: 42 },
    { width: 64 },
  ];
  [
    ['Sloupec', 'Popis', 'Povolené hodnoty / příklad'],
    ['Měsíc', 'Měsíc transakce', 'YYYY-MM, např. 2026-04'],
    ['Typ', 'Typ transakce', 'Příjem | Výdaj | Převod'],
    ['Název', 'Název transakce', 'např. Nájem, Mzda, ETF investice'],
    ['Částka', 'Částka se znaménkem', 'např. 1500, -1500 nebo 1500.50'],
    ['Účet', 'U příjmů a výdajů účet', 'Vyber z dropdownu podle importního označení účtu'],
    ['Kategorie', 'Kategorie výdaje', 'Nutnosti | Rozmary | Investice | Spoření | Vlastní rozvoj'],
    ['Zdrojový účet', 'Zdrojový účet u převodu', 'Vyber z dropdownu podle importního označení'],
    ['Cílový účet', 'Cílový účet u převodu', 'Vyber z dropdownu podle importního označení'],
    ['Typ převodu', 'Typ převodu', 'Převod | Spoření'],
    ['Investiční účet', 'Volitelný cílový investiční účet', 'Vyber z brokerských účtů'],
    ['Zahrnout do investic', 'Zahrnout do investované částky', 'Ano | Ne'],
    [],
    [
      'Poznámka',
      'Účty jsou exportované jednoznačně',
      'Např. "Komerční banka (běžný účet)" nebo "Komerční banka (spořicí účet)". Když by se některé názvy opakovaly, přidá se i krátký suffix s ID.',
    ],
  ].forEach((row) => helpSheet.addRow(row));
  helpSheet.getRow(1).font = { bold: true };

  accountsSheet.columns = [
    { width: 16 },
    { width: 18 },
    { width: 30 },
    { width: 38 },
    { width: 42 },
  ];
  [['Skupina', 'Typ účtu', 'Název účtu', 'Importní označení', 'ID účtu']]
    .concat(
      bankAccounts.map((account) => [
        'bank',
        getAccountTypeLabel(account),
        account.name,
        accountLabelMap.get(account.id) || account.name,
        account.id,
      ])
    )
    .concat(
      brokerAccounts.map((account) => [
        'broker',
        getAccountTypeLabel(account),
        account.name,
        accountLabelMap.get(account.id) || account.name,
        account.id,
      ])
    )
    .forEach((row) => accountsSheet.addRow(row));
  accountsSheet.getRow(1).font = { bold: true };

  balancesSheet.columns = [
    { width: 16 },
    { width: 38 },
    { width: 18 },
  ];
  [
    ['Měsíc', 'Účet', 'Zůstatek'],
    ['2026-04', firstBankLabel || firstBrokerLabel, 125000],
  ].forEach((row) => balancesSheet.addRow(row));
  balancesSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer as ArrayBuffer, filename);
};

export const parseImportedTransactionsFile = async (
  file: File,
  bankAccounts: BankAccount[],
  brokerAccounts: BankAccount[]
) => {
  const allAccounts = [...bankAccounts, ...brokerAccounts];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    return {
      transactions: [] as ImportableTransaction[],
      accountBalances: [] as { month: string; accountId: string; balance: number }[],
      errors: ['Soubor neobsahuje žádný list.'],
    };
  }

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const transactions: ImportableTransaction[] = [];
  const accountBalances: { month: string; accountId: string; balance: number }[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    if (isRowEmpty(row)) return;

    const line = index + 2;
    const month = normalize(getCell(row, 'month', 'mesic', 'měsíc'));
    const type = resolveType(getCell(row, 'type', 'typ'));
    const name = normalize(getCell(row, 'name', 'nazev', 'název'));
    const amount = parseAmount(getCell(row, 'amount', 'castka', 'částka'));

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      errors.push(`Řádek ${line}: neplatný měsíc.`);
      return;
    }
    if (!type || !validTypes.includes(type)) {
      errors.push(`Řádek ${line}: neplatný typ transakce.`);
      return;
    }
    if (!name) {
      errors.push(`Řádek ${line}: chybí název.`);
      return;
    }
    if (!Number.isFinite(amount) || amount === 0) {
      errors.push(`Řádek ${line}: neplatná částka.`);
      return;
    }

    const transaction: ImportableTransaction = { month, type, name, amount };

    if (type === 'income') {
      const account = resolveAccountId(getCell(row, 'account', 'ucet', 'účet'), allAccounts);
      if (!account) {
        errors.push(`Řádek ${line}: příjem musí mít platný účet.`);
        return;
      }
      transaction.account = account;
    }

    if (type === 'expense') {
      const account = resolveAccountId(getCell(row, 'account', 'ucet', 'účet'), allAccounts);
      if (!account) {
        errors.push(`Řádek ${line}: výdaj musí mít platný účet.`);
        return;
      }
      transaction.account = account;

      const category = resolveCategory(getCell(row, 'category', 'kategorie'));
      transaction.category = category && validCategories.includes(category) ? category : 'necessities';

      const investmentAccount = resolveAccountId(
        getCell(row, 'investmentAccount', 'investicniUcet', 'investiční účet'),
        brokerAccounts
      );
      if (investmentAccount) {
        transaction.investmentAccount = investmentAccount;
      }

      const includeInTotals = normalize(
        getCell(row, 'includeInInvestmentTotals', 'zahrnoutDoInvestic', 'zahrnout do investic')
      );
      if (includeInTotals) {
        transaction.includeInInvestmentTotals = toBool(includeInTotals);
      }
    }

    if (type === 'transfer') {
      const sourceAccount = resolveAccountId(
        getCell(row, 'sourceAccount', 'zdrojovyUcet', 'zdrojový účet'),
        allAccounts
      );
      const transferAccount = resolveAccountId(
        getCell(row, 'transferAccount', 'cilovyUcet', 'cílový účet'),
        allAccounts
      );
      if (!sourceAccount || !transferAccount) {
        errors.push(`Řádek ${line}: převod musí mít zdrojový i cílový účet.`);
        return;
      }
      transaction.sourceAccount = sourceAccount;
      transaction.transferAccount = transferAccount;
      const transferCategory = resolveTransferType(
        getCell(row, 'transferCategory', 'typPrevodu', 'typ převodu')
      );
      transaction.transferCategory = validTransferCategories.includes(transferCategory)
        ? transferCategory
        : 'transfer';
    }

    transactions.push(transaction);
  });

  const balancesSheetName = workbook.SheetNames.find(
    (name) => normalizeHeaderKey(name) === normalizeHeaderKey('StavyÚčtů')
  );

  if (balancesSheetName) {
    const balancesRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[balancesSheetName], {
      defval: '',
      raw: false,
    });

    balancesRows.forEach((row, index) => {
      if (isRowEmpty(row)) return;

      const line = index + 2;
      const month = normalize(getCell(row, 'month', 'mesic', 'měsíc'));
      const accountId = resolveAccountId(getCell(row, 'account', 'ucet', 'účet'), allAccounts);
      const balance = parseAmount(getCell(row, 'balance', 'zustatek', 'zůstatek', 'stav'));

      if (!month && !accountId && Number.isNaN(balance)) return;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        errors.push(`Stavy účtů řádek ${line}: neplatný měsíc.`);
        return;
      }
      if (!accountId) {
        errors.push(`Stavy účtů řádek ${line}: neplatný účet.`);
        return;
      }
      if (!Number.isFinite(balance)) {
        errors.push(`Stavy účtů řádek ${line}: neplatný zůstatek.`);
        return;
      }

      accountBalances.push({ month, accountId, balance });
    });
  }

  return { transactions, accountBalances, errors };
};
