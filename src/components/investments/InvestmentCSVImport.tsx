import { useRef, useState } from 'react';
import { AlertCircle, Check, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ASSET_TYPE_LABELS,
  INVESTMENT_PROVIDER_LABELS,
  InvestmentAssetType,
  InvestmentProvider,
  InvestmentTransactionType,
} from '@/types/investment';
import {
  exportInvestmentImportTemplate,
  ParsedInvestmentImportFile,
  readInvestmentImportFile,
} from '@/utils/investmentImportTemplate';

interface ImportRow {
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
  source_label?: string;
  source_kind?: 'manual_template' | 'broker_export';
  valid: boolean;
  errors: string[];
}

interface InvestmentCSVImportProps {
  onImport: (data: ImportRow[]) => Promise<void>;
}

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const firstNonEmpty = (row: Record<string, unknown>, aliases: string[]) => {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const parseAmount = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  const input = String(value || '').trim();
  if (!input) return Number.NaN;

  const normalized = input
    .replace(/\s/g, '')
    .replace(/Kč|CZK|USD|EUR|GBP|CHF/gi, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');

  return Number.parseFloat(normalized);
};

const excelSerialToDate = (serial: number) => {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const result = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return result.toISOString().slice(0, 10);
};

const parseDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return excelSerialToDate(value);
  }

  const source = String(value || '').trim();
  if (!source) return new Date().toISOString().split('T')[0];

  const normalized = source.replace(/\s+/g, '');
  const dateMatch = normalized.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/);
  if (dateMatch) {
    const [, a, b, c] = dateMatch;
    if (a.length === 4) {
      return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    }
    return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  }

  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return source;
};

export const InvestmentCSVImport = ({ onImport }: InvestmentCSVImportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [defaultAssetType, setDefaultAssetType] = useState<InvestmentAssetType>('stock');
  const [defaultProvider, setDefaultProvider] = useState<InvestmentProvider>('broker');
  const [sourceInfo, setSourceInfo] = useState<ParsedInvestmentImportFile | null>(null);

  const parseRows = (parsedFile: ParsedInvestmentImportFile) => {
    const parseErrors: string[] = [];
    const parsedRows: ImportRow[] = [];

    parsedFile.rows.forEach((values, index) => {
      const rowErrors: string[] = [];
      const ticker = String(
        firstNonEmpty(values, ['ticker', 'symbol', 'instrument', 'instrumentticker', 'product', 'asset'])
      )
        .trim()
        .toUpperCase();
      const name = String(
        firstNonEmpty(values, ['name', 'nazev', 'název', 'instrumentname', 'productname', 'description']) || ticker
      ).trim();
      const quantity = parseAmount(
        firstNonEmpty(values, ['quantity', 'qty', 'shares', 'units', 'amount', 'mnozstvi', 'množství'])
      );
      const pricePerUnit = parseAmount(
        firstNonEmpty(values, ['priceperunit', 'price', 'priceunit', 'fillprice', 'unitprice', 'cena'])
      );
      const currency = String(
        firstNonEmpty(values, ['currency', 'currencycode', 'mena', 'měna']) || 'USD'
      )
        .trim()
        .toUpperCase();
      const sector = String(firstNonEmpty(values, ['sector', 'sektor', 'group', 'assetgroup']) || '').trim() || undefined;
      const exDividendDate = String(
        firstNonEmpty(values, ['exdividenddate', 'exdividend', 'exdividenddateutc', 'exdividenddatum', 'datumexdividendy']) || ''
      ).trim() || undefined;
      const payDate = String(firstNonEmpty(values, ['paydate', 'dividendpaydate', 'paymentdate', 'datumvyplaty']) || '').trim() || undefined;
      const expectedDividendAmountRaw = firstNonEmpty(
        values,
        ['expecteddividendamount', 'expectedamount', 'dividendamount', 'grossdividend', 'ocekavanadividenda']
      );
      const expectedDividendAmount =
        expectedDividendAmountRaw !== '' ? parseAmount(expectedDividendAmountRaw) : undefined;

      const transactionDate = parseDate(
        firstNonEmpty(values, ['transactiondate', 'date', 'datum', 'executiondate', 'tradetime', 'time'])
      );

      let transactionType: InvestmentTransactionType = 'buy';
      const transactionTypeValue = normalizeText(
        String(firstNonEmpty(values, ['transactiontype', 'type', 'typ', 'side', 'action']) || '')
      );
      if (
        transactionTypeValue.includes('sell') ||
        transactionTypeValue.includes('prodej') ||
        transactionTypeValue.includes('vyber')
      ) {
        transactionType = 'sell';
      } else if (
        transactionTypeValue.includes('dividend') ||
        transactionTypeValue.includes('dividenda')
      ) {
        transactionType = 'dividend';
      }

      let assetType: InvestmentAssetType = defaultAssetType;
      const assetTypeValue = normalizeText(String(firstNonEmpty(values, ['assettype', 'druh', 'category']) || ''));
      if (assetTypeValue.includes('etf')) assetType = 'etf';
      else if (assetTypeValue.includes('crypto') || assetTypeValue.includes('krypto')) assetType = 'crypto';
      else if (assetTypeValue.includes('bond') || assetTypeValue.includes('dluhopis')) assetType = 'bond';
      else if (assetTypeValue.includes('commodity') || assetTypeValue.includes('komodit')) assetType = 'commodity';
      else if (assetTypeValue.includes('p2p')) assetType = 'p2p';
      else if (assetTypeValue.includes('privatecredit') || assetTypeValue.includes('soukrom')) assetType = 'private_credit';
      else if (assetTypeValue.includes('realestate') || assetTypeValue.includes('realit') || assetTypeValue.includes('nemovit')) assetType = 'real_estate';
      else if (assetTypeValue.includes('managedportfolio') || assetTypeValue.includes('rizen')) assetType = 'managed_portfolio';
      else if (assetTypeValue.includes('fund') || assetTypeValue.includes('fond')) assetType = 'fund';
      else if (assetTypeValue.includes('other') || assetTypeValue.includes('ostat')) assetType = 'other';
      else if (assetTypeValue.includes('stock') || assetTypeValue.includes('akci')) assetType = 'stock';

      let provider: InvestmentProvider = defaultProvider;
      const providerValue = normalizeText(
        String(firstNonEmpty(values, ['provider', 'platform', 'broker', 'brokername', 'poskytovatel']) || '')
      );
      if (providerValue.includes('investown')) provider = 'investown';
      else if (providerValue.includes('fingood')) provider = 'fingood';
      else if (providerValue.includes('edward')) provider = 'edward';
      else if (providerValue.includes('conseq')) provider = 'conseq';
      else if (providerValue.includes('trading212') || providerValue.includes('interactivebrokers') || providerValue.includes('ibkr') || providerValue.includes('xtb') || providerValue.includes('degiro') || providerValue.includes('broker')) provider = 'broker';
      else if (providerValue.includes('other') || providerValue.includes('jin')) provider = 'other';

      if (!ticker) rowErrors.push('Chybí ticker');
      if (Number.isNaN(quantity) || quantity <= 0) rowErrors.push('Neplatné množství');
      if (Number.isNaN(pricePerUnit) || pricePerUnit < 0) rowErrors.push('Neplatná cena');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) rowErrors.push('Neplatné datum');
      if (expectedDividendAmountRaw !== '' && Number.isNaN(expectedDividendAmount)) {
        rowErrors.push('Neplatná očekávaná dividenda');
      }

      parsedRows.push({
        ticker,
        name,
        asset_type: assetType,
        provider,
        transaction_type: transactionType,
        quantity: quantity || 0,
        price_per_unit: pricePerUnit || 0,
        currency,
        transaction_date: transactionDate,
        sector,
        ex_dividend_date: exDividendDate,
        pay_date: payDate,
        expected_dividend_amount: Number.isNaN(expectedDividendAmount) ? undefined : expectedDividendAmount,
        source_label: parsedFile.sourceLabel,
        source_kind: parsedFile.sourceKind,
        valid: rowErrors.length === 0,
        errors: rowErrors,
      });

      if (rowErrors.length > 0) {
        parseErrors.push(`Řádek ${index + 2}: ${rowErrors.join(', ')}`);
      }
    });

    setRows(parsedRows);
    setErrors(parseErrors);
    setSourceInfo(parsedFile);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const parsedFile = await readInvestmentImportFile(file);
    if (parsedFile.rows.length === 0) {
      setErrors(['Soubor musí obsahovat alespoň jeden řádek dat.']);
      setRows([]);
      setSourceInfo(parsedFile);
      return;
    }

    parseRows(parsedFile);
  };

  const handleImport = async () => {
    const validRows = rows.filter((row) => row.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      await onImport(validRows);
      setRows([]);
      setErrors([]);
      setSourceInfo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.filter((row) => row.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Můžeš importovat CSV i XLSX. FIGR umí svou šablonu i běžné broker exporty. Parser teď
            toleruje rozdílné názvy sloupců, formáty datumu i částky s mezerami.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full lg:w-auto" onClick={() => void exportInvestmentImportTemplate()}>
          <Download className="mr-2 h-4 w-4" />
          Export šablony
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 md:items-end">
        <div className="space-y-2">
          <Label>Výchozí typ aktiva</Label>
          <Select value={defaultAssetType} onValueChange={(value) => setDefaultAssetType(value as InvestmentAssetType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Výchozí poskytovatel</Label>
          <Select value={defaultProvider} onValueChange={(value) => setDefaultProvider(value as InvestmentProvider)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INVESTMENT_PROVIDER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Soubor pro import</Label>
          <Input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} />
        </div>
      </div>

      {sourceInfo ? (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Zdroj: <span className="font-medium text-foreground">{sourceInfo.sourceLabel}</span> · Režim:{' '}
          {sourceInfo.sourceKind === 'manual_template' ? 'šablona FIGR' : 'export brokera'}
        </div>
      ) : null}

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-5">
              {errors.slice(0, 8).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Náhled importu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-success/10 px-3 py-1 text-success">{validCount} platných</span>
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">
                {invalidCount} neplatných
              </span>
            </div>

            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">OK</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Poskytovatel</TableHead>
                    <TableHead>Typ aktiva</TableHead>
                    <TableHead>Operace</TableHead>
                    <TableHead className="text-right">Množství</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                    <TableHead>Měna</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row, index) => (
                    <TableRow key={`${row.ticker}-${index}`} className={!row.valid ? 'bg-destructive/10' : ''}>
                      <TableCell>
                        {row.valid ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell>{row.transaction_date}</TableCell>
                      <TableCell className="font-medium">{row.ticker}</TableCell>
                      <TableCell>{INVESTMENT_PROVIDER_LABELS[row.provider]}</TableCell>
                      <TableCell>{ASSET_TYPE_LABELS[row.asset_type]}</TableCell>
                      <TableCell>{row.transaction_type}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="text-right">{row.price_per_unit}</TableCell>
                      <TableCell>{row.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleImport} disabled={importing || validCount === 0} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {importing ? 'Importuji…' : `Importovat ${validCount} transakcí`}
            </Button>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          <FileSpreadsheet className="mx-auto mb-3 h-6 w-6" />
          Stáhni si šablonu nebo export z brokera, zkontroluj nákupy, prodeje a dividendy a potom
          soubor nahraj sem.
        </div>
      )}
    </div>
  );
};

