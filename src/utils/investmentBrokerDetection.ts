import { InvestmentProvider } from '@/types/investment';

export type BrokerProfileKey = 'figr_template' | 'trading212' | 'ibkr' | 'degiro' | 'xtb' | 'generic';

export interface DetectedBrokerProfile {
  key: BrokerProfileKey;
  name: string;
  provider: InvestmentProvider;
  confidence: number;
  sourceKind: 'manual_template' | 'broker_export';
  reasons: string[];
}

const PROFILE_DEFINITIONS: Array<{
  key: BrokerProfileKey;
  name: string;
  provider: InvestmentProvider;
  sourceKind: 'manual_template' | 'broker_export';
  filePatterns: RegExp[];
  requiredHeaderGroups: string[][];
}> = [
  {
    key: 'figr_template',
    name: 'FIGR šablona',
    provider: 'broker',
    sourceKind: 'manual_template',
    filePatterns: [/figr/i, /sablona/i, /šablona/i],
    requiredHeaderGroups: [['ticker'], ['assettype'], ['transactiontype'], ['priceperunit']],
  },
  {
    key: 'trading212',
    name: 'Trading 212',
    provider: 'broker',
    sourceKind: 'broker_export',
    filePatterns: [/trading[\s_-]?212/i, /\bt212\b/i],
    requiredHeaderGroups: [['action', 'type'], ['ticker', 'symbol'], ['noofshares', 'quantity'], ['price']],
  },
  {
    key: 'ibkr',
    name: 'Interactive Brokers',
    provider: 'broker',
    sourceKind: 'broker_export',
    filePatterns: [/interactive[\s_-]?brokers/i, /\bibkr\b/i, /flex/i],
    requiredHeaderGroups: [['symbol', 'underlyingsymbol'], ['date', 'tradedate'], ['quantity'], ['proceeds', 'tradeprice', 'price']],
  },
  {
    key: 'degiro',
    name: 'DEGIRO',
    provider: 'broker',
    sourceKind: 'broker_export',
    filePatterns: [/degiro/i],
    requiredHeaderGroups: [['product', 'description'], ['isin', 'symbol'], ['date'], ['quantity']],
  },
  {
    key: 'xtb',
    name: 'XTB',
    provider: 'broker',
    sourceKind: 'broker_export',
    filePatterns: [/\bxtb\b/i],
    requiredHeaderGroups: [['symbol'], ['volume', 'quantity'], ['opentime', 'date'], ['openprice', 'price']],
  },
];

const matchesHeaderGroup = (headers: string[], group: string[]) => group.some((item) => headers.includes(item));

export const detectBrokerProfile = (fileName: string, headers: string[]): DetectedBrokerProfile => {
  const normalizedFileName = fileName.toLowerCase();
  let bestMatch: DetectedBrokerProfile | null = null;

  for (const profile of PROFILE_DEFINITIONS) {
    const fileMatches = profile.filePatterns.filter((pattern) => pattern.test(normalizedFileName)).length;
    const headerMatches = profile.requiredHeaderGroups.filter((group) => matchesHeaderGroup(headers, group)).length;
    const confidence = fileMatches * 0.35 + (headerMatches / profile.requiredHeaderGroups.length) * 0.65;

    if (confidence <= 0) continue;

    const candidate: DetectedBrokerProfile = {
      key: profile.key,
      name: profile.name,
      provider: profile.provider,
      sourceKind: profile.sourceKind,
      confidence: Math.min(1, Number(confidence.toFixed(2))),
      reasons: [
        ...(fileMatches > 0 ? [`soubor odpovídá vzoru ${profile.name}`] : []),
        ...(headerMatches > 0 ? [`sedí ${headerMatches}/${profile.requiredHeaderGroups.length} skupin hlaviček`] : []),
      ],
    };

    if (!bestMatch || candidate.confidence > bestMatch.confidence) {
      bestMatch = candidate;
    }
  }

  return (
    bestMatch || {
      key: 'generic',
      name: 'Obecný broker export',
      provider: 'broker',
      sourceKind: headers.includes('assettype') || headers.includes('transactiontype') ? 'manual_template' : 'broker_export',
      confidence: 0.25,
      reasons: ['použita obecná detekce podle dostupných sloupců'],
    }
  );
};
