import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all transactions sorted by date
    const { data: transactions, error: txError } = await supabase
      .from('investment_transactions')
      .select('*')
      .order('transaction_date', { ascending: true });

    if (txError) throw txError;

    // Get all asset prices sorted by date
    const { data: prices, error: pricesError } = await supabase
      .from('asset_prices')
      .select('*')
      .order('price_date', { ascending: true });

    if (pricesError) throw pricesError;

    // Get exchange rates
    const { data: exchangeRates, error: ratesError } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('rate_date', { ascending: false });

    if (ratesError) throw ratesError;

    // Get settings
    const { data: settings } = await supabase
      .from('portfolio_settings')
      .select('reporting_currency')
      .limit(1)
      .maybeSingle();

    const reportingCurrency = settings?.reporting_currency || 'CZK';

    // Helper: get exchange rate
    const getRate = (from: string, to: string, date?: string): number => {
      if (from === to) return 1;
      const relevant = exchangeRates?.filter(r => r.from_currency === from && r.to_currency === to) || [];
      if (date) {
        const before = relevant.filter(r => r.rate_date <= date);
        if (before.length > 0) return before[0].rate;
      }
      return relevant.length > 0 ? relevant[0].rate : 1;
    };

    // Determine all years from transactions
    const years = new Set<string>();
    transactions?.forEach(tx => {
      years.add(tx.transaction_date.substring(0, 4));
    });

    const yearlyData: Record<string, {
      year: string;
      totalDeposits: number;
      totalWithdrawals: number;
      netDeposits: number;
      portfolioValueStart: number;
      portfolioValueEnd: number;
      marketGrowth: number;
      marketGrowthPercent: number | null;
      reportingCurrency: string;
    }> = {};

    // For each year, calculate deposits and portfolio snapshots
    const sortedYears = Array.from(years).sort();

    // Build running portfolio state per date
    // Track positions: asset_id -> { quantity, totalCost }
    interface Position { quantity: number; totalCostReporting: number; }
    const positions: Record<string, Position> = {};
    let cumulativeInvested = 0;

    // Helper: calculate portfolio value at a given date using latest available prices
    const getPortfolioValue = (asDate: string, positionsSnapshot: Record<string, Position>): number => {
      let total = 0;
      for (const [assetId, pos] of Object.entries(positionsSnapshot)) {
        if (pos.quantity <= 0) continue;
        // Find latest price on or before asDate
        const assetPrices = prices?.filter(p => p.asset_id === assetId && p.price_date <= asDate) || [];
        if (assetPrices.length > 0) {
          const latestPrice = assetPrices[assetPrices.length - 1];
          const rate = getRate(latestPrice.currency, reportingCurrency, asDate);
          total += latestPrice.price * pos.quantity * rate;
        } else {
          // No price available, use cost basis
          total += pos.totalCostReporting;
        }
      }
      return total;
    };

    // Process transactions year by year
    for (const year of sortedYears) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      // Snapshot positions at start of year (before any transactions this year)
      const positionsAtStart = JSON.parse(JSON.stringify(positions)) as Record<string, Position>;
      const portfolioValueStart = getPortfolioValue(yearStart, positionsAtStart);

      let yearDeposits = 0;
      let yearWithdrawals = 0;

      // Process this year's transactions
      const yearTx = transactions?.filter(tx => tx.transaction_date.startsWith(year)) || [];
      for (const tx of yearTx) {
        const rate = getRate(tx.currency, reportingCurrency, tx.transaction_date);
        const valueReporting = tx.total_value * rate;

        if (!positions[tx.asset_id]) {
          positions[tx.asset_id] = { quantity: 0, totalCostReporting: 0 };
        }

        if (tx.transaction_type === 'buy') {
          positions[tx.asset_id].quantity += tx.quantity;
          positions[tx.asset_id].totalCostReporting += valueReporting;
          yearDeposits += valueReporting;
        } else {
          const pos = positions[tx.asset_id];
          const avgCost = pos.quantity > 0 ? pos.totalCostReporting / pos.quantity : 0;
          pos.quantity -= tx.quantity;
          pos.totalCostReporting -= avgCost * tx.quantity;
          yearWithdrawals += valueReporting;
        }
      }

      const portfolioValueEnd = getPortfolioValue(yearEnd, positions);
      const netDeposits = yearDeposits - yearWithdrawals;
      const marketGrowth = portfolioValueEnd - portfolioValueStart - netDeposits;
      const baseForPercent = portfolioValueStart + netDeposits / 2; // TWR approximation
      const marketGrowthPercent = baseForPercent > 0 ? (marketGrowth / baseForPercent) * 100 : null;

      yearlyData[year] = {
        year,
        totalDeposits: yearDeposits,
        totalWithdrawals: yearWithdrawals,
        netDeposits,
        portfolioValueStart,
        portfolioValueEnd,
        marketGrowth,
        marketGrowthPercent,
        reportingCurrency,
      };
    }

    // Also add cumulative net worth trajectory (monthly)
    const monthlyNetWorth: { date: string; value: number }[] = [];
    const positionsForHistory: Record<string, Position> = {};
    const allMonths = new Set<string>();
    transactions?.forEach(tx => {
      const m = tx.transaction_date.substring(0, 7);
      allMonths.add(m);
    });

    const sortedMonths = Array.from(allMonths).sort();
    let txIdx = 0;
    const sortedTx = transactions || [];

    for (const month of sortedMonths) {
      const monthEnd = `${month}-31`; // approximate
      // Process all transactions up to this month
      while (txIdx < sortedTx.length && sortedTx[txIdx].transaction_date.substring(0, 7) <= month) {
        const tx = sortedTx[txIdx];
        const rate = getRate(tx.currency, reportingCurrency, tx.transaction_date);
        const valueReporting = tx.total_value * rate;

        if (!positionsForHistory[tx.asset_id]) {
          positionsForHistory[tx.asset_id] = { quantity: 0, totalCostReporting: 0 };
        }

        if (tx.transaction_type === 'buy') {
          positionsForHistory[tx.asset_id].quantity += tx.quantity;
          positionsForHistory[tx.asset_id].totalCostReporting += valueReporting;
        } else {
          const pos = positionsForHistory[tx.asset_id];
          const avgCost = pos.quantity > 0 ? pos.totalCostReporting / pos.quantity : 0;
          pos.quantity -= tx.quantity;
          pos.totalCostReporting -= avgCost * tx.quantity;
        }
        txIdx++;
      }

      const value = getPortfolioValue(monthEnd, positionsForHistory);
      monthlyNetWorth.push({ date: month, value });
    }

    return new Response(JSON.stringify({
      yearlyData,
      monthlyNetWorth,
      reportingCurrency,
      availableYears: sortedYears,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
