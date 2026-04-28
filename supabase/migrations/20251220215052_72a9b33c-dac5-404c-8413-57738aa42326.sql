-- Create enum for transaction types
CREATE TYPE public.investment_transaction_type AS ENUM ('buy', 'sell');

-- Create enum for asset types
CREATE TYPE public.investment_asset_type AS ENUM ('stock', 'etf', 'crypto', 'bond', 'commodity', 'other');

-- Table for investment assets (stocks, ETFs, crypto, etc.)
CREATE TABLE public.investment_assets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    asset_type public.investment_asset_type NOT NULL DEFAULT 'stock',
    sector TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for investment transactions
CREATE TABLE public.investment_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
    transaction_type public.investment_transaction_type NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    price_per_unit NUMERIC(20, 8) NOT NULL,
    total_value NUMERIC(20, 8) NOT NULL,
    currency TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    notes TEXT,
    import_batch_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for asset prices (historical and current)
CREATE TABLE public.asset_prices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
    price NUMERIC(20, 8) NOT NULL,
    currency TEXT NOT NULL,
    price_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(asset_id, price_date)
);

-- Table for exchange rates
CREATE TABLE public.exchange_rates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(20, 8) NOT NULL,
    rate_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(from_currency, to_currency, rate_date)
);

-- Table for import batches (to allow undo)
CREATE TABLE public.investment_import_batches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_count INTEGER NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT
);

-- Table for portfolio settings
CREATE TABLE public.portfolio_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reporting_currency TEXT NOT NULL DEFAULT 'CZK',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default portfolio settings
INSERT INTO public.portfolio_settings (reporting_currency) VALUES ('CZK');

-- Enable RLS on all tables
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a personal finance app without auth currently)
CREATE POLICY "Allow all operations on investment_assets" ON public.investment_assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on investment_transactions" ON public.investment_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on asset_prices" ON public.asset_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on exchange_rates" ON public.exchange_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on investment_import_batches" ON public.investment_import_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on portfolio_settings" ON public.portfolio_settings FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_investment_transactions_asset_id ON public.investment_transactions(asset_id);
CREATE INDEX idx_investment_transactions_date ON public.investment_transactions(transaction_date);
CREATE INDEX idx_asset_prices_asset_date ON public.asset_prices(asset_id, price_date);
CREATE INDEX idx_exchange_rates_currencies_date ON public.exchange_rates(from_currency, to_currency, rate_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_investment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_investment_assets_updated_at
BEFORE UPDATE ON public.investment_assets
FOR EACH ROW EXECUTE FUNCTION public.update_investment_updated_at();

CREATE TRIGGER update_portfolio_settings_updated_at
BEFORE UPDATE ON public.portfolio_settings
FOR EACH ROW EXECUTE FUNCTION public.update_investment_updated_at();