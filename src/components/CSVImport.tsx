import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BankAccount, Transaction } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import { exportImportTemplate, parseImportedTransactionsFile } from '@/utils/importTemplate';

interface CSVImportProps {
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  onImport: (payload: {
    transactions: Omit<Transaction, 'id' | 'createdAt'>[];
    accountBalances?: { month: string; accountId: string; balance: number }[];
  }) => void;
  triggerClassName?: string;
  triggerVariant?: 'default' | 'secondary' | 'ghost' | 'outline';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
  triggerLabel?: string;
}

export const CSVImport = ({
  bankAccounts,
  brokerAccounts,
  onImport,
  triggerClassName,
  triggerVariant = 'ghost',
  triggerSize = 'sm',
  triggerLabel = 'Import dat',
}: CSVImportProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { transactions, accountBalances, errors } = await parseImportedTransactionsFile(
        file,
        bankAccounts,
        brokerAccounts
      );

      if (transactions.length === 0 && accountBalances.length === 0) {
        toast({
          title: 'Chyba importu',
          description: errors[0] || 'V souboru nebyla nalezena žádná platná data.',
          variant: 'destructive',
        });
        return;
      }

      onImport({ transactions, accountBalances });
      setIsOpen(false);

      toast({
        title: 'Import dokončen',
        description: `Načteno ${transactions.length} transakcí a ${accountBalances.length} měsíčních stavů účtů${
          errors.length ? `, ${errors.length} řádků přeskočeno.` : '.'
        }`,
      });
    } catch {
      toast({
        title: 'Chyba importu',
        description: 'Soubor se nepodařilo zpracovat.',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportTemplate = async () => {
    await exportImportTemplate(bankAccounts, brokerAccounts);
    setIsOpen(false);
    toast({
      title: 'Šablona exportována',
      description: 'Připravená XLSX šablona byla uložena do stažených souborů.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={cn('w-full justify-start gap-2', triggerClassName)}
        >
          <Upload className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent data-testid="import-dialog" className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import dat</DialogTitle>
          <DialogDescription>
            Můžeš si stáhnout připravenou šablonu XLSX, vyplnit transakce i měsíční stavy účtů
            a potom ji nahrát zpět do aplikace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 overflow-hidden p-4 text-left"
            onClick={handleExportTemplate}
          >
            <Download className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Export šablony</span>
              <span className="block break-words text-sm text-muted-foreground">
                Stáhne se připravený XLSX soubor s listem pro transakce, listem pro měsíční
                stavy účtů, nápovědou a seznamem účtů.
              </span>
            </span>
          </Button>

          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-3 overflow-hidden p-4 text-left"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Import dat</span>
              <span className="block break-words text-sm text-muted-foreground">
                Nahraj vyplněnou XLSX šablonu nebo kompatibilní CSV soubor a data se propíšou
                do aplikace.
              </span>
            </span>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Zavřít
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
