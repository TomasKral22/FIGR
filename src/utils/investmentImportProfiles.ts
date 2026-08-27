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
  totalValue: string[];
  externalId: string[];
}

export type InvestmentImportMapping = Partial<Record<keyof InvestmentImportProfileConfig, string>>;

const GENERIC_PROFILE: InvestmentImportProfileConfig = {
  ticker: ['ticker', 'symbol', 'instrument', 'instrumentticker', 'product', 'asset', 'code'],
  name: ['name', 'nazev', 'název', 'instrumentname', 'productname', 'description', 'product'],
  quantity: ['quantity', 'qty', 'shares', 'units', 'amount', 'mnozstvi', 'množství', 'noofshares', 'executedquantity', 'volume'],
  price: ['priceperunit', 'cenazajednotku', 'price', 'priceunit', 'fillprice', 'unitprice', 'cena', 'tradeprice', 'executionprice', 'openprice'],
  currency: ['currency', 'currencycode', 'currencyprimary', 'mena', 'měna'],
  transactionDate: ['transactiondate', 'datumtransakce', 'date', 'datum', 'executiondate', 'tradetime', 'time', 'tradedate', 'opentime'],
  transactionType: ['transactiontype', 'typtransakce', 'type', 'typ', 'side', 'action'],
  sector: ['sector', 'sektor', 'group', 'assetgroup'],
  exDividendDate: ['exdividenddate', 'exdividend', 'exdividenddateutc', 'exdividenddatum', 'datumexdividendy'],
  payDate: ['paydate', 'dividendpaydate', 'paymentdate', 'datumvyplaty'],
  expectedDividendAmount: ['expecteddividendamount', 'expectedamount', 'dividendamount', 'grossdividend', 'ocekavanadividenda'],
  totalValue: ['totalvalue', 'amount', 'castka', 'hodnota', 'value', 'netamount', 'grossamount'],
  externalId: ['externalid', 'transactionid', 'idtransakce', 'id', 'reference', 'referencniid'],
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
  portu: {
    ticker: ['ticker', 'symbol', 'isin'],
    name: ['name', 'nazev', 'description'],
    quantity: ['mnozstvi', 'množství', 'quantity'],
    price: ['cena', 'price', 'priceperunit'],
    transactionDate: ['datum', 'date', 'transactiondate'],
    transactionType: ['typ', 'type', 'transactiontype'],
  },
  investown: {
    ticker: ['idprojektu', 'projectid', 'projekt', 'nazevprojektu'],
    name: ['nazevprojektu', 'projekt', 'project', 'name'],
    quantity: ['mnozstvi', 'quantity', 'podil'],
    price: ['cenajednotky', 'price', 'urok'],
    totalValue: ['castka', 'hodnota', 'amount', 'vyse'],
    transactionDate: ['datumtransakce', 'datum', 'date'],
    transactionType: ['typtransakce', 'typ', 'type'],
    externalId: ['idtransakce', 'transactionid', 'reference'],
  },
  edward: {
    ticker: ['isin', 'ticker', 'portfolio', 'kyblik', 'strategie'],
    name: ['nazev', 'instrument', 'portfolio', 'kyblik', 'strategie'],
    quantity: ['mnozstvi', 'quantity', 'pocet'],
    price: ['cena', 'price', 'kurz'],
    totalValue: ['castka', 'hodnota', 'amount', 'value'],
    transactionDate: ['datum', 'date', 'valutadate'],
    transactionType: ['typpohybu', 'typtransakce', 'typ', 'type'],
    externalId: ['idtransakce', 'transactionid', 'reference'],
  },
  revolut: {
    ticker: ['ticker', 'symbol'],
    name: ['name', 'description'],
    quantity: ['shares', 'quantity', 'qty'],
    price: ['price', 'priceperunit'],
    transactionDate: ['completeddate', 'date', 'transactiondate'],
    transactionType: ['type', 'action'],
  },
  etoro: {
    ticker: ['ticker', 'symbol', 'positionid'],
    name: ['name', 'description'],
    quantity: ['units', 'quantity'],
    price: ['openrate', 'price', 'priceperunit'],
    transactionDate: ['opendate', 'date', 'transactiondate'],
    transactionType: ['type', 'action'],
  },
  binance: {
    ticker: ['symbol', 'market', 'ticker'],
    name: ['symbol', 'name', 'description'],
    quantity: ['executedquantity', 'amount', 'quantity'],
    price: ['price', 'avgprice', 'priceperunit'],
    transactionDate: ['time', 'date', 'transactiondate'],
    transactionType: ['side', 'type', 'action'],
  },
};

export const getInvestmentImportProfileConfig = (
  profileKey: BrokerProfileKey,
  mapping: InvestmentImportMapping = {}
): InvestmentImportProfileConfig => {
  const profile = PROFILE_CONFIGS[profileKey] || {};

  const aliases = (key: keyof InvestmentImportProfileConfig) => [
    ...(mapping[key] ? [mapping[key] as string] : []),
    ...(profile[key] || []),
    ...GENERIC_PROFILE[key],
  ];

  return {
    ticker: aliases('ticker'),
    name: aliases('name'),
    quantity: aliases('quantity'),
    price: aliases('price'),
    currency: aliases('currency'),
    transactionDate: aliases('transactionDate'),
    transactionType: aliases('transactionType'),
    sector: aliases('sector'),
    exDividendDate: aliases('exDividendDate'),
    payDate: aliases('payDate'),
    expectedDividendAmount: aliases('expectedDividendAmount'),
    totalValue: aliases('totalValue'),
    externalId: aliases('externalId'),
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

  if (profileKey === 'revolut' || profileKey === 'etoro' || profileKey === 'binance' || profileKey === 'portu') {
    if (value.includes('dividend')) return 'dividend';
    if (value.includes('sell') || value.includes('prodej')) return 'sell';
    if (value.includes('buy') || value.includes('nakup')) return 'buy';
  }

  if (profileKey === 'investown') {
    if (value.includes('urok') || value.includes('vynos')) return 'interest';
    if (value.includes('splaceni') || value.includes('jistina') || value.includes('vraceni')) return 'principal_repayment';
    if (value.includes('poplatek')) return 'fee';
    if (value.includes('vyber')) return 'withdrawal';
    if (value.includes('vklad') || value.includes('dobiti')) return 'deposit';
    if (value.includes('prodej')) return 'sell';
    if (value.includes('investice') || value.includes('nakup')) return 'buy';
  }

  if (profileKey === 'edward') {
    if (value.includes('dividend')) return 'dividend';
    if (value.includes('poplatek')) return 'fee';
    if (value.includes('dan')) return 'tax';
    if (value.includes('vyber') || value.includes('odchozi')) return 'withdrawal';
    if (value.includes('vklad') || value.includes('prichozi')) return 'deposit';
    if (value.includes('prodej')) return 'sell';
    if (value.includes('nakup')) return 'buy';
  }

  return null;
};
