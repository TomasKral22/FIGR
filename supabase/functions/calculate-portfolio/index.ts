import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortfolioAsset {
  id: string;
  ticker: string;
  name: string;
  asset_type: string;
  sector: string | null;
  currency: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  currentPrice: number | null;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  currentPriceInReportingCurrency: number | null;
  currentValueInReportingCurrency: number | null;
  totalInvestedInReportingCurrency: number;
  profitLossInReportingCurrency: number | null;
}

interface PortfolioSummary {
  totalInvested: number;
  currentValue: number | null;
  profitLoss: number | null;
  profitLossPercent: number | null;
  reportingCurrency: string;
  assets: PortfolioAsset[];
  assetsByType: Record<string, { invested: number; value: number | null }>;
  assetsByCurrency: Record<string, { invested: number; value: number | null }>;
  assetsBySector: Record<string, { invested: number; value: number | null }>;
  portfolioHistory: { date: string; value: number }[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting portfolio calculation...');

    // Get portfolio settings
    const { data: settings, error: settingsError } = await supabase
      .from('portfolio_settings')
      .select('reporting_currency')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    const reportingCurrency = settings?.reporting_currency || 'CZK';
    console.log('Reporting currency:', reportingCurrency);

    // Get all assets with their transactions
    const { data: assets, error: assetsError } = await supabase
      .from('investment_assets')
      .select('*');

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log('Found assets:', assets?.length || 0);

    // Get all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('investment_transactions')
      .select('*')
      .order('transaction_date', { ascending: true });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      throw transactionsError;
    }

    console.log('Found transactions:', transactions?.length || 0);

    // Get latest prices for all assets
    const { data: latestPrices, error: pricesError } = await supabase
      .from('asset_prices')
      .select('*')
      .order('price_date', { ascending: false });

    if (pricesError) {
      console.error('Error fetching prices:', pricesError);
      throw pricesError;
    }

    console.log('Found prices:', latestPrices?.length || 0);

    // Get exchange rates
    const { data: exchangeRates, error: ratesError } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('rate_date', { ascending: false });

    if (ratesError) {
      console.error('Error fetching exchange rates:', ratesError);
      throw ratesError;
    }

    console.log('Found exchange rates:', exchangeRates?.length || 0);

    // Helper function to get exchange rate
    const getExchangeRate = (fromCurrency: string, toCurrency: string, date?: string): number => {
      if (fromCurrency === toCurrency) return 1;

      const relevantRates = exchangeRates?.filter(r => 
        r.from_currency === fromCurrency && r.to_currency === toCurrency
      ) || [];

      if (date) {
        // Find rate closest to the date
        const ratesBeforeDate = relevantRates.filter(r => r.rate_date <= date);
        if (ratesBeforeDate.length > 0) {
          return ratesBeforeDate[0].rate;
        }
      }

      // Return latest rate or default to 1
      return relevantRates.length > 0 ? relevantRates[0].rate : 1;
    };

    // Helper function to get latest price for an asset
    const getLatestPrice = (assetId: string): { price: number; currency: string } | null => {
      const assetPrices = latestPrices?.filter(p => p.asset_id === assetId) || [];
      if (assetPrices.length > 0) {
        return { price: assetPrices[0].price, currency: assetPrices[0].currency };
      }
      return null;
    };

    // Calculate position for each asset
    const portfolioAssets: PortfolioAsset[] = [];
    const assetsByType: Record<string, { invested: number; value: number | null }> = {};
    const assetsByCurrency: Record<string, { invested: number; value: number | null }> = {};
    const assetsBySector: Record<string, { invested: number; value: number | null }> = {};

    for (const asset of assets || []) {
      const assetTransactions = transactions?.filter(t => t.asset_id === asset.id) || [];

      let quantity = 0;
      let totalCost = 0;
      let totalInvestedInReportingCurrency = 0;

      for (const tx of assetTransactions) {
        const rate = getExchangeRate(tx.currency, reportingCurrency, tx.transaction_date);
        const valueInReportingCurrency = tx.total_value * rate;

        if (tx.transaction_type === 'buy') {
          quantity += tx.quantity;
          totalCost += tx.total_value;
          totalInvestedInReportingCurrency += valueInReportingCurrency;
        } else if (tx.transaction_type === 'sell') {
          // Calculate proportional cost reduction
          const avgCost = quantity > 0 ? totalCost / quantity : 0;
          const avgCostInReporting = quantity > 0 ? totalInvestedInReportingCurrency / quantity : 0;
          quantity -= tx.quantity;
          totalCost -= avgCost * tx.quantity;
          totalInvestedInReportingCurrency -= avgCostInReporting * tx.quantity;
        }
      }

      // Skip assets with zero quantity
      if (quantity <= 0) continue;

      const avgBuyPrice = totalCost / quantity;
      const totalInvested = totalCost;

      // Get current price
      const priceInfo = getLatestPrice(asset.id);
      let currentPrice: number | null = null;
      let currentValue: number | null = null;
      let profitLoss: number | null = null;
      let profitLossPercent: number | null = null;
      let currentPriceInReportingCurrency: number | null = null;
      let currentValueInReportingCurrency: number | null = null;
      let profitLossInReportingCurrency: number | null = null;

      if (priceInfo) {
        currentPrice = priceInfo.price;
        currentValue = currentPrice * quantity;
        profitLoss = currentValue - totalInvested;
        profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

        // Convert to reporting currency
        const rate = getExchangeRate(priceInfo.currency, reportingCurrency);
        currentPriceInReportingCurrency = currentPrice * rate;
        currentValueInReportingCurrency = currentValue * rate;
        profitLossInReportingCurrency = currentValueInReportingCurrency - totalInvestedInReportingCurrency;
      }

      const portfolioAsset: PortfolioAsset = {
        id: asset.id,
        ticker: asset.ticker,
        name: asset.name,
        asset_type: asset.asset_type,
        sector: asset.sector,
        currency: asset.currency,
        quantity,
        avgBuyPrice,
        totalInvested,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPercent,
        currentPriceInReportingCurrency,
        currentValueInReportingCurrency,
        totalInvestedInReportingCurrency,
        profitLossInReportingCurrency,
      };

      portfolioAssets.push(portfolioAsset);

      // Aggregate by type
      if (!assetsByType[asset.asset_type]) {
        assetsByType[asset.asset_type] = { invested: 0, value: 0 };
      }
      assetsByType[asset.asset_type].invested += totalInvestedInReportingCurrency;
      if (currentValueInReportingCurrency !== null) {
        assetsByType[asset.asset_type].value = (assetsByType[asset.asset_type].value || 0) + currentValueInReportingCurrency;
      }

      // Aggregate by currency
      if (!assetsByCurrency[asset.currency]) {
        assetsByCurrency[asset.currency] = { invested: 0, value: 0 };
      }
      assetsByCurrency[asset.currency].invested += totalInvestedInReportingCurrency;
      if (currentValueInReportingCurrency !== null) {
        assetsByCurrency[asset.currency].value = (assetsByCurrency[asset.currency].value || 0) + currentValueInReportingCurrency;
      }

      // Aggregate by sector
      const sector = asset.sector || 'Nezařazeno';
      if (!assetsBySector[sector]) {
        assetsBySector[sector] = { invested: 0, value: 0 };
      }
      assetsBySector[sector].invested += totalInvestedInReportingCurrency;
      if (currentValueInReportingCurrency !== null) {
        assetsBySector[sector].value = (assetsBySector[sector].value || 0) + currentValueInReportingCurrency;
      }
    }

    // Calculate totals
    const totalInvested = portfolioAssets.reduce((sum, a) => sum + a.totalInvestedInReportingCurrency, 0);
    const hasAllPrices = portfolioAssets.every(a => a.currentValueInReportingCurrency !== null);
    const currentValue = hasAllPrices
      ? portfolioAssets.reduce((sum, a) => sum + (a.currentValueInReportingCurrency || 0), 0)
      : null;
    const profitLoss = currentValue !== null ? currentValue - totalInvested : null;
    const profitLossPercent = profitLoss !== null && totalInvested > 0
      ? (profitLoss / totalInvested) * 100
      : null;

    // Calculate portfolio history (simplified - based on transaction dates)
    const portfolioHistory: { date: string; value: number }[] = [];
    if (transactions && transactions.length > 0) {
      const sortedTx = [...transactions].sort((a, b) => 
        a.transaction_date.localeCompare(b.transaction_date)
      );

      let runningValue = 0;
      const valueByDate: Record<string, number> = {};

      for (const tx of sortedTx) {
        const rate = getExchangeRate(tx.currency, reportingCurrency, tx.transaction_date);
        const valueInReporting = tx.total_value * rate;

        if (tx.transaction_type === 'buy') {
          runningValue += valueInReporting;
        } else {
          runningValue -= valueInReporting;
        }

        valueByDate[tx.transaction_date] = runningValue;
      }

      for (const [date, value] of Object.entries(valueByDate)) {
        portfolioHistory.push({ date, value });
      }
    }

    const summary: PortfolioSummary = {
      totalInvested,
      currentValue,
      profitLoss,
      profitLossPercent,
      reportingCurrency,
      assets: portfolioAssets,
      assetsByType,
      assetsByCurrency,
      assetsBySector,
      portfolioHistory,
    };

    console.log('Portfolio calculation complete. Total invested:', totalInvested);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Error calculating portfolio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
