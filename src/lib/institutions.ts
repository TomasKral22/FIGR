export type InstitutionKind = 'bank' | 'broker';

export interface InstitutionDefinition {
  id: string;
  name: string;
  shortName: string;
  kind: InstitutionKind;
  primaryColor: string;
  accentColor: string;
}

export const INSTITUTIONS: InstitutionDefinition[] = [
  { id: 'csas', name: 'Ceska sporitelna', shortName: 'CS', kind: 'bank', primaryColor: '#0057B8', accentColor: '#0EA5E9' },
  { id: 'kb', name: 'Komercni banka', shortName: 'KB', kind: 'bank', primaryColor: '#111827', accentColor: '#EF4444' },
  { id: 'rb', name: 'Raiffeisenbank', shortName: 'RB', kind: 'bank', primaryColor: '#FACC15', accentColor: '#111827' },
  { id: 'moneta', name: 'Moneta Money Bank', shortName: 'M', kind: 'bank', primaryColor: '#DC2626', accentColor: '#F97316' },
  { id: 'fio', name: 'Fio banka', shortName: 'FIO', kind: 'bank', primaryColor: '#16A34A', accentColor: '#84CC16' },
  { id: 'csob', name: 'CSOB', shortName: 'CSOB', kind: 'bank', primaryColor: '#1D4ED8', accentColor: '#38BDF8' },
  { id: 'airbank', name: 'Air Bank', shortName: 'AIR', kind: 'bank', primaryColor: '#84CC16', accentColor: '#166534' },
  { id: 'revolut', name: 'Revolut', shortName: 'R', kind: 'bank', primaryColor: '#111827', accentColor: '#A855F7' },
  { id: 'ibkr', name: 'Interactive Brokers', shortName: 'IB', kind: 'broker', primaryColor: '#B91C1C', accentColor: '#111827' },
  { id: 't212', name: 'Trading 212', shortName: 'T212', kind: 'broker', primaryColor: '#0F172A', accentColor: '#10B981' },
  { id: 'degiro', name: 'DEGIRO', shortName: 'DG', kind: 'broker', primaryColor: '#2563EB', accentColor: '#F97316' },
  { id: 'xtb', name: 'XTB', shortName: 'XTB', kind: 'broker', primaryColor: '#DC2626', accentColor: '#111827' },
];

export const getInstitution = (institutionId?: string | null) =>
  INSTITUTIONS.find((institution) => institution.id === institutionId);

export const getInstitutionsByKind = (kind: InstitutionKind) =>
  INSTITUTIONS.filter((institution) => institution.kind === kind);
