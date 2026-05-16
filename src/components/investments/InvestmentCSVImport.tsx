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
import { exportInvestmentImportTemplate, readInvestmentImportFile } from '@/utils/investmentImportTemplate';

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
  valid: boolean;
  errors: string[];
}

interface InvestmentCSVImportProps {
  onImport: (data: ImportRow[]) => Promise<void>;
}

export const InvestmentCSVImport = ({ onImport }: InvestmentCSVImportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [defaultAssetType, setDefaultAssetType] = useState<InvestmentAssetType>('stock');
  const [defaultProvider, setDefaultProvider] = useState<InvestmentProvider>('broker');

  const parseRows = (sourceRows: Record<string, unknown>[]) => {
    const parseErrors: string[] = [];
    const parsedRows: ImportRow[] = [];

    sourceRows.forEach((values, index) => {
      const rowErrors: string[] = [];
      const ticker = String(values.ticker || values.symbol || '').trim().toUpperCase();
      const name = String(values.name || values.nazev || values.název || ticker).trim();
      const quantity = parseFloat(
        String(values.quantity || values.amount || values.mnozstvi || values.množství || '0').replace(',', '.')
      );
      const pricePerUnit = parseFloat(String(values.price_per_unit || values.price || values.cena || '0').replace(',', '.'));
      const currency = String(values.currency || values.mena || values.měna || 'USD').trim().toUpperCase();
      const sector = String(values.sector || values.sektor || '').trim() || undefined;
      const exDividendDate = String(values.ex_dividend_date || values.exdividenddate || values.ex_dividend || '').trim() || undefined;
      const payDate = String(values.pay_date || values.dividend_pay_date || values.paydate || '').trim() || undefined;
      const expectedDividendAmountRaw = String(
        values.expected_dividend_amount || values.expecteddividendamount || values.expected_amount || ''
      ).trim();
      const expectedDividendAmount = expectedDividendAmountRaw
        ? parseFloat(expectedDividendAmountRaw.replace(',', '.'))
        : undefined;

      let transactionDate = new Date().toISOString().split('T')[0];
      const sourceDate = String(values.transaction_date || values.date || values.datum || '').trim();
      if (sourceDate) {
        const dateMatch = sourceDate.match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
        if (dateMatch) {
          const [, a, b, c] = dateMatch;
          transactionDate =
            a.length === 4
              ? `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
              : `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        } else {
          transactionDate = sourceDate;
        }
      }

      let transactionType: InvestmentTransactionType = 'buy';
      const transactionTypeValue = String(values.transaction_type || values.type || values.typ || '').toLowerCase();
      if (transactionTypeValue.includes('sell') || transactionTypeValue.includes('prodej')) transactionType = 'sell';
      if (transactionTypeValue.includes('dividend') || transactionTypeValue.includes('dividenda')) transactionType = 'dividend';

      let assetType: InvestmentAssetType = defaultAssetType;
      const assetTypeValue = String(values.asset_type || values.druh || '').toLowerCase();
      if (assetTypeValue.includes('etf')) assetType = 'etf';
      else if (assetTypeValue.includes('crypto') || assetTypeValue.includes('krypto')) assetType = 'crypto';
      else if (assetTypeValue.includes('bond') || assetTypeValue.includes('dluhopis')) assetType = 'bond';
      else if (assetTypeValue.includes('commodity') || assetTypeValue.includes('komodit')) assetType = 'commodity';
      else if (assetTypeValue.includes('p2p')) assetType = 'p2p';
      else if (assetTypeValue.includes('private_credit') || assetTypeValue.includes('soukrom')) assetType = 'private_credit';
      else if (assetTypeValue.includes('real_estate') || assetTypeValue.includes('realit') || assetTypeValue.includes('nemovit')) assetType = 'real_estate';
      else if (assetTypeValue.includes('managed_portfolio') || assetTypeValue.includes('rizen') || assetTypeValue.includes('řízen')) assetType = 'managed_portfolio';
      else if (assetTypeValue.includes('fund') || assetTypeValue.includes('fond')) assetType = 'fund';
      else if (assetTypeValue.includes('other') || assetTypeValue.includes('ostat')) assetType = 'other';
      else if (assetTypeValue.includes('stock') || assetTypeValue.includes('akci')) assetType = 'stock';

      let provider: InvestmentProvider = defaultProvider;
      const providerValue = String(values.provider || values.platform || values.poskytovatel || '').toLowerCase();
      if (providerValue.includes('investown')) provider = 'investown';
      else if (providerValue.includes('fingood')) provider = 'fingood';
      else if (providerValue.includes('edward')) provider = 'edward';
      else if (providerValue.includes('conseq')) provider = 'conseq';
      else if (providerValue.includes('broker')) provider = 'broker';
      else if (providerValue.includes('other') || providerValue.includes('jin')) provider = 'other';

      if (!ticker) rowErrors.push('Chybí ticker');
      if (Number.isNaN(quantity) || quantity <= 0) rowErrors.push('Neplatné množství');
      if (Number.isNaN(pricePerUnit) || pricePerUnit < 0) rowErrors.push('Neplatná cena');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) rowErrors.push('Neplatné datum');

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
        expected_dividend_amount: expectedDividendAmount,
        valid: rowErrors.length === 0,
        errors: rowErrors,
      });

      if (rowErrors.length > 0) {
        parseErrors.push(`Řádek ${index + 2}: ${rowErrors.join(', ')}`);
      }
    });

    setRows(parsedRows);
    setErrors(parseErrors);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rawRows = await readInvestmentImportFile(file);
    if (rawRows.length === 0) {
      setErrors(['Soubor musí obsahovat alespoň jeden řádek dat.']);
      return;
    }

    parseRows(rawRows);
  };

  const handleImport = async () => {
    const validRows = rows.filter((row) => row.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      await onImport(validRows);
      setRows([]);
      setErrors([]);
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
            Můžeš importovat CSV i XLSX. Pro akcie a ETF zkus nejdřív export brokera. Pro
            Investown, Fingood, Edward, Conseq nebo ručně vedené alternativní investice použij
            šablonu FIGR a vyplň poskytovatele i typ aktiva.
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
              <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">{invalidCount} neplatných</span>
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
                        {row.valid ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
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
