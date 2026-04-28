import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ImportBatch } from '@/types/investment';
import { Undo2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ImportHistoryProps {
  batches: ImportBatch[];
  onUndoImport: (batchId: string) => Promise<void>;
}

export const ImportHistory = ({ batches, onUndoImport }: ImportHistoryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historie importů</CardTitle>
      </CardHeader>
      <CardContent>
        {batches.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum importu</TableHead>
                <TableHead>Zdroj</TableHead>
                <TableHead className="text-right">Počet transakcí</TableHead>
                <TableHead>Poznámka</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{new Date(batch.imported_at).toLocaleString('cs-CZ')}</TableCell>
                  <TableCell>{batch.source_label || batch.source_kind || 'Neuvedeno'}</TableCell>
                  <TableCell className="text-right">{batch.transaction_count}</TableCell>
                  <TableCell className="text-muted-foreground">{batch.notes || '-'}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Undo2 className="mr-2 h-4 w-4" />
                          Vrátit zpět
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Vrátit import zpět?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tato akce smaže všech {batch.transaction_count} transakcí z tohoto importu.
                            Tuto akci nelze vrátit zpět.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onUndoImport(batch.id)}>
                            Vrátit import
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-muted-foreground">Zatím žádné importy.</p>
        )}
      </CardContent>
    </Card>
  );
};
