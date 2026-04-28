import { Transaction } from '@/types/finance';

export const exportToCSV = (transactions: Transaction[], filename: string = 'transactions.csv') => {
  const headers = ['Datum', 'Typ', 'Název', 'Částka', 'Účet/Kategorie'];
  const rows = transactions.map((t) => [
    t.month,
    t.type === 'income' ? 'Příjem' : t.type === 'expense' ? 'Výdaj' : 'Převod',
    t.name,
    t.amount.toFixed(2),
    t.account || t.category || t.transferCategory || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export const exportToXLSX = (transactions: Transaction[], filename: string = 'transactions.xlsx') => {
  // Basic XLSX export using data URI
  // In production, consider using a library like xlsx or exceljs
  
  const headers = ['Datum', 'Typ', 'Název', 'Částka', 'Účet/Kategorie'];
  const rows = transactions.map((t) => [
    t.month,
    t.type === 'income' ? 'Příjem' : t.type === 'expense' ? 'Výdaj' : 'Převod',
    t.name,
    t.amount.toFixed(2),
    t.account || t.category || t.transferCategory || '',
  ]);

  const htmlTable = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Transakce</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table>
          <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
