import { useMemo, useState } from 'react';
import { Check, Landmark, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstitutionAvatar } from '@/components/InstitutionAvatar';
import { getInstitution, getInstitutionsByKind } from '@/lib/institutions';
import { BankAccount } from '@/types/finance';
import { formatCurrency } from '@/utils/calculations';

interface AccountSetupProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  brokerAccounts: BankAccount[];
  onAddBankAccount: (name: string, balance: number, isSavings?: boolean, interestRate?: number, institutionId?: string) => void;
  onUpdateBankAccount: (id: string, name: string, balance: number, isSavings?: boolean, interestRate?: number, institutionId?: string) => void;
  onDeleteBankAccount: (id: string) => void;
  onAddBrokerAccount: (name: string, balance: number, institutionId?: string) => void;
  onUpdateBrokerAccount: (id: string, name: string, balance: number, institutionId?: string) => void;
  onDeleteBrokerAccount: (id: string) => void;
}

const bankInstitutions = getInstitutionsByKind('bank');
const brokerInstitutions = getInstitutionsByKind('broker');

export const AccountSetup = ({
  isOpen,
  onClose,
  bankAccounts,
  brokerAccounts,
  onAddBankAccount,
  onUpdateBankAccount,
  onDeleteBankAccount,
  onAddBrokerAccount,
  onUpdateBrokerAccount,
  onDeleteBrokerAccount,
}: AccountSetupProps) => {
  const [bankName, setBankName] = useState('');
  const [bankInstitutionId, setBankInstitutionId] = useState('custom');
  const [bankBalance, setBankBalance] = useState('');
  const [bankIsSavings, setBankIsSavings] = useState(false);
  const [bankInterestRate, setBankInterestRate] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [brokerInstitutionId, setBrokerInstitutionId] = useState('custom');
  const [brokerBalance, setBrokerBalance] = useState('');
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editingBrokerId, setEditingBrokerId] = useState<string | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editBankInstitutionId, setEditBankInstitutionId] = useState('custom');
  const [editBankBalance, setEditBankBalance] = useState('');
  const [editBankIsSavings, setEditBankIsSavings] = useState(false);
  const [editBankInterestRate, setEditBankInterestRate] = useState('');
  const [editBrokerName, setEditBrokerName] = useState('');
  const [editBrokerInstitutionId, setEditBrokerInstitutionId] = useState('custom');
  const [editBrokerBalance, setEditBrokerBalance] = useState('');

  const resolvedBankName = useMemo(() => {
    if (bankInstitutionId === 'custom') return bankName;
    return getInstitution(bankInstitutionId)?.name || bankName;
  }, [bankInstitutionId, bankName]);

  const resolvedBrokerName = useMemo(() => {
    if (brokerInstitutionId === 'custom') return brokerName;
    return getInstitution(brokerInstitutionId)?.name || brokerName;
  }, [brokerInstitutionId, brokerName]);

  const handleAddBank = () => {
    if (!resolvedBankName || !bankBalance) return;
    onAddBankAccount(
      resolvedBankName,
      parseFloat(bankBalance),
      bankIsSavings,
      bankIsSavings ? parseFloat(bankInterestRate) || 0 : 0,
      bankInstitutionId === 'custom' ? undefined : bankInstitutionId
    );
    setBankName('');
    setBankInstitutionId('custom');
    setBankBalance('');
    setBankIsSavings(false);
    setBankInterestRate('');
  };

  const handleAddBroker = () => {
    if (!resolvedBrokerName || !brokerBalance) return;
    onAddBrokerAccount(
      resolvedBrokerName,
      parseFloat(brokerBalance),
      brokerInstitutionId === 'custom' ? undefined : brokerInstitutionId
    );
    setBrokerName('');
    setBrokerInstitutionId('custom');
    setBrokerBalance('');
  };

  const startEditBank = (account: BankAccount) => {
    setEditingBankId(account.id);
    setEditBankName(account.name);
    setEditBankInstitutionId(account.institutionId || 'custom');
    setEditBankBalance(account.currentBalance.toString());
    setEditBankIsSavings(account.isSavings || false);
    setEditBankInterestRate((account.interestRate || 0).toString());
  };

  const saveEditBank = () => {
    if (!editingBankId || !editBankName || !editBankBalance) return;
    const institutionName =
      editBankInstitutionId === 'custom'
        ? editBankName
        : getInstitution(editBankInstitutionId)?.name || editBankName;
    onUpdateBankAccount(
      editingBankId,
      institutionName,
      parseFloat(editBankBalance),
      editBankIsSavings,
      editBankIsSavings ? parseFloat(editBankInterestRate) || 0 : 0,
      editBankInstitutionId === 'custom' ? undefined : editBankInstitutionId
    );
    setEditingBankId(null);
  };

  const startEditBroker = (account: BankAccount) => {
    setEditingBrokerId(account.id);
    setEditBrokerName(account.name);
    setEditBrokerInstitutionId(account.institutionId || 'custom');
    setEditBrokerBalance(account.currentBalance.toString());
  };

  const saveEditBroker = () => {
    if (!editingBrokerId || !editBrokerName || !editBrokerBalance) return;
    const institutionName =
      editBrokerInstitutionId === 'custom'
        ? editBrokerName
        : getInstitution(editBrokerInstitutionId)?.name || editBrokerName;
    onUpdateBrokerAccount(
      editingBrokerId,
      institutionName,
      parseFloat(editBrokerBalance),
      editBrokerInstitutionId === 'custom' ? undefined : editBrokerInstitutionId
    );
    setEditingBrokerId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between rounded-t-lg border-b border-border bg-card px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold sm:text-xl">Nastaveni uctu</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-8 p-4 sm:p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bankovní účty</h3>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label>Instituce</Label>
                  <Select value={bankInstitutionId} onValueChange={setBankInstitutionId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Vlastní název</SelectItem>
                      {bankInstitutions.map((institution) => (
                        <SelectItem key={institution.id} value={institution.id}>
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Název účtu</Label>
                  <Input
                    value={bankInstitutionId === 'custom' ? bankName : resolvedBankName}
                    onChange={(event) => setBankName(event.target.value)}
                    disabled={bankInstitutionId !== 'custom'}
                    placeholder="např. Moje banka"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Počáteční zůstatek (Kč)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={bankBalance}
                    onChange={(event) => setBankBalance(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddBank} size="icon" className="w-full xl:w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bankIsSavings}
                    onChange={(event) => setBankIsSavings(event.target.checked)}
                    className="rounded"
                  />
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Spořicí účet</span>
                </label>
                {bankIsSavings && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="interestRate" className="whitespace-nowrap text-sm">Úrok (% p.a.)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      value={bankInterestRate}
                      onChange={(event) => setBankInterestRate(event.target.value)}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {bankAccounts.map((account) => (
                <div key={account.id} className="w-full rounded-lg bg-muted/50 p-3 md:w-[calc(50%-0.375rem)]">
                  {editingBankId === account.id ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_auto]">
                        <Select value={editBankInstitutionId} onValueChange={setEditBankInstitutionId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="custom">Vlastní název</SelectItem>
                            {bankInstitutions.map((institution) => (
                              <SelectItem key={institution.id} value={institution.id}>
                                {institution.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={editBankInstitutionId === 'custom' ? editBankName : getInstitution(editBankInstitutionId)?.name || editBankName}
                          onChange={(event) => setEditBankName(event.target.value)}
                          disabled={editBankInstitutionId !== 'custom'}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={editBankBalance}
                          onChange={(event) => setEditBankBalance(event.target.value)}
                        />
                        <Button onClick={saveEditBank} size="icon" variant="ghost" className="w-full xl:w-10">
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editBankIsSavings}
                            onChange={(event) => setEditBankIsSavings(event.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Spořicí účet</span>
                        </label>
                        {editBankIsSavings && (
                          <Input
                            type="number"
                            step="0.01"
                            value={editBankInterestRate}
                            onChange={(event) => setEditBankInterestRate(event.target.value)}
                            className="w-24"
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <InstitutionAvatar institutionId={account.institutionId} fallback={account.name} />
                        <div className="min-w-0">
                          <p className="break-words font-medium">
                            {account.name}
                            {account.isSavings && (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                Spořicí {account.interestRate}% p.a.
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Aktuální: {formatCurrency(account.currentBalance)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 self-end sm:self-auto">
                        <Button variant="ghost" size="icon" onClick={() => startEditBank(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteBankAccount(account.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Brokerské účty</h3>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label>Instituce</Label>
                  <Select value={brokerInstitutionId} onValueChange={setBrokerInstitutionId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Vlastní název</SelectItem>
                      {brokerInstitutions.map((institution) => (
                        <SelectItem key={institution.id} value={institution.id}>
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Název účtu</Label>
                  <Input
                    value={brokerInstitutionId === 'custom' ? brokerName : resolvedBrokerName}
                    onChange={(event) => setBrokerName(event.target.value)}
                    disabled={brokerInstitutionId !== 'custom'}
                    placeholder="např. Můj broker"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Počáteční zůstatek (Kč)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={brokerBalance}
                    onChange={(event) => setBrokerBalance(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddBroker} size="icon" className="w-full xl:w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {brokerAccounts.map((account) => (
                <div key={account.id} className="w-full rounded-lg bg-muted/50 p-3 md:w-[calc(50%-0.375rem)]">
                  {editingBrokerId === account.id ? (
                    <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_auto]">
                      <Select value={editBrokerInstitutionId} onValueChange={setEditBrokerInstitutionId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Vlastní název</SelectItem>
                          {brokerInstitutions.map((institution) => (
                            <SelectItem key={institution.id} value={institution.id}>
                              {institution.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={editBrokerInstitutionId === 'custom' ? editBrokerName : getInstitution(editBrokerInstitutionId)?.name || editBrokerName}
                        onChange={(event) => setEditBrokerName(event.target.value)}
                        disabled={editBrokerInstitutionId !== 'custom'}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={editBrokerBalance}
                        onChange={(event) => setEditBrokerBalance(event.target.value)}
                      />
                      <Button onClick={saveEditBroker} size="icon" variant="ghost" className="w-full xl:w-10">
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <InstitutionAvatar institutionId={account.institutionId} fallback={account.name} />
                        <div className="min-w-0">
                          <p className="break-words font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Aktuální: {formatCurrency(account.currentBalance)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 self-end sm:self-auto">
                        <Button variant="ghost" size="icon" onClick={() => startEditBroker(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteBrokerAccount(account.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-4 sm:px-6">
          <Button onClick={onClose} className="w-full">
            Hotovo
          </Button>
        </div>
      </div>
    </div>
  );
};
