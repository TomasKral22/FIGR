import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { InvestmentAssetType, InvestmentProvider, InvestmentTransactionType } from '@/types/investment';

export interface InvestmentImportRow {
  ticker: string;
  name: string;
  asset_type: InvestmentAssetType;
  provider: InvestmentProvider;
  transaction_type: InvestmentTransactionType;
  quantity: number;
  price_per_unit: number;
  currency: string;
  transaction_date: string;
  sector?: string;
  ex_dividend_date?: string;
  pay_date?: string;
  expected_dividend_amount?: number;
}

export interface ParsedInvestmentImportFile {
  rows: Record<string, unknown>[];
  fileName: string;
  sourceLabel: string;
  sourceKind: 'manual_template' | 'broker_export';
}

const assetTypes: InvestmentAssetType[] = [
  'stock',
  'etf',
  'crypto',
  'bond',
  'commodity',
  'p2p',
  'private_credit',
  'real_estate',
  'managed_portfolio',
  'fund',
  'other',
];

const providers: InvestmentProvider[] = ['broker', 'investown', 'fingood', 'edward', 'conseq', 'other'];
const transactionTypes: InvestmentTransactionType[] = ['buy', 'sell', 'dividend'];
const currencies = ['CZK', 'USD', 'EUR', 'GBP', 'CHF'];

const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const downloadXlsx = (buffer: ArrayBuffer, filename: string) => {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportInvestmentImportTemplate = async (filename = 'figr-investice-sablona.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const importSheet = workbook.addWorksheet('Import');
  const helpSheet = workbook.addWorksheet('Nápověda');
  const listSheet = workbook.addWorksheet('Číselníky');
  listSheet.state = 'veryHidden';

  const headers = [
    'ticker',
    'name',
    'asset_type',
    'provider',
    'transaction_type',
    'quantity',
    'price_per_unit',
    'currency',
    'transaction_date',
    'sector',
    'ex_dividend_date',
    'pay_date',
    'expected_dividend_amount',
  ];

  importSheet.addRow(headers);
  importSheet.getRow(1).font = { bold: true };
  importSheet.views = [{ state: 'frozen', ySplit: 1 }];
  importSheet.columns = [
    { width: 14 },
    { width: 24 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 22 },
  ];

  [
    ['A', ['AssetTypes', ...assetTypes]],
    ['B', ['Providers', ...providers]],
    ['C', ['TransactionTypes', ...transactionTypes]],
    ['D', ['Currencies', ...currencies]],
  ].forEach(([column, values]) => {
    (values as string[]).forEach((value, index) => {
      listSheet.getCell(`${column}${index + 1}`).value = value;
    });
  });

  [
    ['CEZ', 'ČEZ', 'stock', 'broker', 'buy', 10, 1080, 'CZK', '2026-04-02', 'Energie', '', '', ''],
    ['INVTOWN-01', 'Investown byty', 'real_estate', 'investown', 'buy', 1, 5000, 'CZK', '2026-04-03', 'Reality', '', '', ''],
    ['FINGOOD-01', 'Fingood úvěr', 'private_credit', 'fingood', 'buy', 1, 10000, 'CZK', '2026-04-04', 'Soukromý úvěr', '', '', ''],
    ['AAPL', 'Apple', 'stock', 'broker', 'dividend', 25, 0.26, 'USD', '2026-04-05', 'Technologie', '2026-05-10', '2026-05-16', 6.5],
  ].forEach((row) => importSheet.addRow(row));

  for (let row = 2; row <= 300; row += 1) {
    importSheet.getCell(`C${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['=Číselníky!$A$2:$A$12'],
    };
    importSheet.getCell(`D${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['=Číselníky!$B$2:$B$7'],
    };
    importSheet.getCell(`E${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['=Číselníky!$C$2:$C$4'],
    };
    importSheet.getCell(`H${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['=Číselníky!$D$2:$D$6'],
    };
  }

  [
    ['Sloupec', 'Popis', 'Příklad'],
    ['ticker', 'Ticker nebo interní označení aktiva', 'VWCE, AAPL, INVESTOWN-BYT-1'],
    ['name', 'Název aktiva', 'Vanguard FTSE All-World'],
    ['asset_type', 'Typ aktiva', 'stock | etf | crypto | bond | commodity | p2p | private_credit | real_estate | managed_portfolio | fund | other'],
    ['provider', 'Poskytovatel investice', 'broker | investown | fingood | edward | conseq | other'],
    ['transaction_type', 'Typ transakce', 'buy | sell | dividend'],
    ['quantity', 'Množství kusů / podílů / jednotek', 'u dividend počet kusů pro odhad'],
    ['price_per_unit', 'Cena za jednotku nebo dividenda na kus', '121.5 nebo 0.26'],
    ['currency', 'Měna transakce', 'CZK | USD | EUR | GBP | CHF'],
    ['transaction_date', 'Datum transakce', 'YYYY-MM-DD'],
    ['sector', 'Volitelný sektor nebo skupina', 'Technologie, Reality, Soukromý úvěr'],
    ['ex_dividend_date', 'Ex-dividend date', 'YYYY-MM-DD'],
    ['pay_date', 'Dividend pay date', 'YYYY-MM-DD'],
    ['expected_dividend_amount', 'Předpokládaná výplata dividendy', 'Volitelné přepsání dopočtu'],
  ].forEach((row) => helpSheet.addRow(row));
  helpSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadXlsx(buffer as ArrayBuffer, filename);
};

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += char;
  }

  result.push(current.trim());
  return result;
};

const normalizeObjectKeys = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));

const inferSourceKind = (fileName: string, firstRowKeys: string[]): 'manual_template' | 'broker_export' => {
  const normalizedName = fileName.toLowerCase();
  if (normalizedName.includes('figr') || normalizedName.includes('sablona') || normalizedName.includes('šablona')) {
    return 'manual_template';
  }

  const isTemplateLike =
    firstRowKeys.includes('assettype') ||
    firstRowKeys.includes('transactiontype') ||
    firstRowKeys.includes('priceperunit') ||
    firstRowKeys.includes('expecteddividendamount');

  return isTemplateLike ? 'manual_template' : 'broker_export';
};

export const readInvestmentImportFile = async (file: File): Promise<ParsedInvestmentImportFile> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let rows: Record<string, unknown>[] = [];

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const firstSheet = workbook.SheetNames[0];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
      defval: '',
      raw: true,
    }).map(normalizeObjectKeys);
  } else {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const header = parseCsvLine(lines[0]).map((item) => normalizeKey(item));
    rows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(header.map((key, index) => [key, values[index] || '']));
    });
  }

  const firstRowKeys = rows[0] ? Object.keys(rows[0]) : [];
  const sourceKind = inferSourceKind(file.name, firstRowKeys);

  return {
    rows,
    fileName: file.name,
    sourceLabel: file.name.replace(/\.[^.]+$/, ''),
    sourceKind,
  };
};
