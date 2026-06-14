import { BrokerProfileKey } from '@/utils/investmentBrokerDetection';

export interface InvestmentImportProfileConfig {
  ticker: string[];
  name: string[];
  quantity: string[];
  price: string[];
  currency: string[];
  transactionDate: string[];
  transactionType: string[];
  sector: string[];
  exDividendDate: string[];
  payDate: string[];
  expectedDividendAmount: string[];
}

const GENERIC_PROFILE: InvestmentImportProfileConfig = {
  ticker: ['ticker', 'symbol', 'instrument', 'instrumentticker', 'product', 'asset', 'code'],
  name: ['name', 'nazev', 'název', 'instrumentname', 'productname', 'description', 'product'],
  quantity: ['quantity', 'qty', 'shares', 'units', 'amount', 'mnozstvi', 'množství', 'noofshares', 'executedquantity', 'volume'],
  price: ['priceperunit', 'price', 'priceunit', 'fillprice', 'unitprice', 'cena', 'tradeprice', 'executionprice', 'openprice'],
  currency: ['currency', 'currencycode', 'currencyprimary', 'mena', 'měna'],
  transactionDate: ['transactiondate', 'date', 'datum', 'executiondate', 'tradetime', 'time', 'tradedate', 'opentime'],
  transactionType: ['transactiontype', 'type', 'typ', 'side', 'action'],
  sector: ['sector', 'sektor', 'group', 'assetgroup'],
  exDividendDate: ['exdividenddate', 'exdividend', 'exdividenddateutc', 'exdividenddatum', 'datumexdividendy'],
  payDate: ['paydate', 'dividendpaydate', 'paymentdate', 'datumvyplaty'],
  expectedDividendAmount: ['expecteddividendamount', 'expectedamount', 'dividendamount', 'grossdividend', 'ocekavanadividenda'],
};

const PROFILE_CONFIGS: Record<BrokerProfileKey, Partial<InvestmentImportProfileConfig>> = {
  figr_template: {},
  generic: {},
  trading212: {
    quantity: ['noofshares', 'quantity', 'shares'],
    price: ['price', 'fillprice', 'priceperunit'],
    transactionDate: ['time', 'date', 'transactiondate'],
    transactionType: ['action', 'type', 'transactiontype'],
    name: ['tickername', 'instrumentname', 'name', 'description'],
  },
  ibkr: {
    ticker: ['symbol', 'underlyingsymbol', 'ticker'],
    name: ['description', 'name', 'product'],
    quantity: ['quantity', 'qty'],
    price: ['tradeprice', 'price', 'priceperunit'],
    currency: ['currencyprimary', 'currency'],
    transactionDate: ['tradedate', 'date', 'transactiondate'],
    transactionType: ['buysell', 'side', 'action', 'type'],
  },
  degiro: {
    ticker: ['symbol', 'ticker', 'isin', 'product'],
    name: ['product', 'description', 'name'],
    quantity: ['quantity', 'aantal', 'qty'],
    price: ['price', 'prijs', 'tradeprice'],
    transactionDate: ['date', 'datum', 'transactiondate'],
    transactionType: ['type', 'action', 'transactiontype'],
  },
  xtb: {
    ticker: ['symbol', 'ticker'],
    name: ['symbol', 'description', 'name'],
    quantity: ['volume', 'quantity'],
    price: ['openprice', 'price', 'tradeprice'],
    transactionDate: ['opentime', 'date', 'transactiondate'],
    transactionType: ['cmd', 'type', 'action'],
  },
};

export const getInvestmentImportProfileConfig = (profileKey: BrokerProfileKey): InvestmentImportProfileConfig => {
  const profile = PROFILE_CONFIGS[profileKey] || {};

  return {
    ticker: [...(profile.ticker || []), ...GENERIC_PROFILE.ticker],
    name: [...(profile.name || []), ...GENERIC_PROFILE.name],
    quantity: [...(profile.quantity || []), ...GENERIC_PROFILE.quantity],
    price: [...(profile.price || []), ...GENERIC_PROFILE.price],
    currency: [...(profile.currency || []), ...GENERIC_PROFILE.currency],
    transactionDate: [...(profile.transactionDate || []), ...GENERIC_PROFILE.transactionDate],
    transactionType: [...(profile.transactionType || []), ...GENERIC_PROFILE.transactionType],
    sector: [...(profile.sector || []), ...GENERIC_PROFILE.sector],
    exDividendDate: [...(profile.exDividendDate || []), ...GENERIC_PROFILE.exDividendDate],
    payDate: [...(profile.payDate || []), ...GENERIC_PROFILE.payDate],
    expectedDividendAmount: [...(profile.expectedDividendAmount || []), ...GENERIC_PROFILE.expectedDividendAmount],
  };
};

export const normalizeBrokerTransactionType = (rawValue: string, profileKey: BrokerProfileKey) => {
  const value = rawValue.toLowerCase();

  if (profileKey === 'trading212') {
    if (value.includes('dividend')) return 'dividend';
    if (value.includes('sell')) return 'sell';
    if (value.includes('buy')) return 'buy';
  }

  if (profileKey === 'ibkr') {
    if (value.includes('dividend')) return 'dividend';
    if (value.includes('sell') || value === 's') return 'sell';
    if (value.includes('buy') || value === 'b') return 'buy';
  }

  if (profileKey === 'xtb') {
    if (value.includes('sell')) return 'sell';
    if (value.includes('buy')) return 'buy';
  }

  return null;
};
