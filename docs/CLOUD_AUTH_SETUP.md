# Cloud Auth Setup

Shrnutí:
- tento dokument popisuje, jak zapnout přihlášení přes e-mail a cloudovou persistenci přes Supabase
- je určený pro vývojáře nebo správce nasazení

## Co je hotové v aplikaci

Aplikace nově umí:
- přihlášení a registraci přes Supabase Auth
- reset hesla přes e-mail
- ukládat stav aplikace do tabulky `public.user_app_state`
- ukládat přílohy transakcí do bucketu `transaction-attachments`
- při přihlášení použít cloud jako hlavní zdroj dat a lokální data jako fallback / migrační most

Klíčové soubory:
- [client.ts](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/integrations/supabase/client.ts)
- [AuthContext.tsx](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/contexts/AuthContext.tsx)
- [appStorage.ts](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/lib/appStorage.ts)
- [cloudStorage.ts](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/lib/cloudStorage.ts)
- [AuthScreen.tsx](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/components/auth/AuthScreen.tsx)
- [20260514090000_add_auth_state_and_attachments.sql](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/supabase/migrations/20260514090000_add_auth_state_and_attachments.sql)

## Co je potřeba nastavit v Supabase

1. Vytvořit projekt v Supabase.
2. Zkopírovat URL projektu a publishable key.
3. V rootu projektu vytvořit `.env` podle [.env.example](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/.env.example).
4. Spustit SQL migraci ze souboru [20260514090000_add_auth_state_and_attachments.sql](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/supabase/migrations/20260514090000_add_auth_state_and_attachments.sql).
5. V Supabase Auth zapnout přihlášení přes e-mail a heslo.
6. Pro produkci nastavit vlastní SMTP.

## Chování persistence

Aktuální implementace nepřepisuje datový model aplikace do desítek tabulek. Místo toho ukládá jednotlivé stavy aplikace podle klíčů do tabulky:

- `finance_transactions`
- `finance_bank_accounts`
- `finance_broker_accounts`
- `investment_transactions`
- další stávající klíče persistence

To znamená:
- současné hooky [useFinanceData.ts](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/hooks/useFinanceData.ts) a [useInvestmentData.ts](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/hooks/useInvestmentData.ts) zůstávají funkční
- po přihlášení se cloud používá jako hlavní zdroj
- pokud nějaký klíč v cloudu ještě neexistuje, použije se lokální hodnota
- následný save už lokální hodnotu propíše i do cloudu

## Doporučení pro produkční fázi 2

Tato první cloudová vrstva je správná pro rychlé uvedení produktu do provozu. Pro další fázi doporučuji:

1. Rozdělit finance do normalizovaných tabulek:
   - `profiles`
   - `transactions`
   - `bank_accounts`
   - `broker_accounts`
   - `goals`
   - `recurring_transactions`
2. Přidat explicitní migraci lokálních dat do cloudu.
3. Přidat konfliktní strategii pro více zařízení.
4. Přidat audit na úrovni serveru.

## Produkční poznámky

- Supabase výchozí e-mail služba je vhodná jen na testování; pro produkci je potřeba vlastní SMTP.
- `service_role` klíč se nesmí dostat do frontendu ani desktop rendereru.
- Přístup k datům řeší RLS pravidla v migraci.
- Bucket pro přílohy je soukromý; aplikace otevírá soubory přes signed URL.
