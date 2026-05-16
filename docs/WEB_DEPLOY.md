# Web Deployment

## Shrnutí

Tento dokument popisuje nejkratší cestu, jak FIGR nasadit na web tak, aby:

- šlo aplikaci otevřít z více zařízení,
- fungovalo přihlášení přes Supabase,
- bylo možné později připojit vlastní doménu.

Dokument je určený pro správce projektu.

## Doporučené řešení

Pro aktuální architekturu projektu je nejjednodušší nasazení přes Vercel:

- frontend je Vite aplikace,
- build výstup je statický `dist`,
- přihlášení řeší Supabase Auth,
- cloudová data jdou přes Supabase.

Projekt používá `HashRouter` v [App.tsx](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/src/App.tsx), takže není nutné řešit server-side SPA rewrites.

## Co musí být připravené

### 1. GitHub repository

Repo musí být pushnuté na GitHub.

### 2. Supabase projekt

V Supabase musí být:

- zapnutý `Email provider`,
- spuštěná migrace [20260514090000_add_auth_state_and_attachments.sql](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/supabase/migrations/20260514090000_add_auth_state_and_attachments.sql),
- známé hodnoty:
  - `Project URL`
  - `Publishable key`

### 3. Vercel účet

Na Vercelu musíš mít přístup k importu GitHub repozitáře.

### 4. DNS přístup k doméně

Pokud chceš vlastní doménu, musíš mít přístup ke správě DNS záznamů.

## Nasazení na Vercel

### 1. Import projektu

Ve Vercelu:

1. `Add New -> Project`
2. vyber GitHub repository `FIGR`
3. potvrď import

### 2. Build nastavení

Repo už obsahuje [vercel.json](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/vercel.json), takže není potřeba ručně nastavovat build output.

Použité hodnoty:

| Položka | Hodnota |
| --- | --- |
| Framework | `vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 3. Environment variables

Ve Vercelu nastav stejné veřejné proměnné jako lokálně:

| Proměnná | Význam |
| --- | --- |
| `VITE_SUPABASE_URL` | URL Supabase projektu |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | veřejný publishable key |

Nevkládej sem `service_role` klíč.

### 4. Deploy

Po prvním deploy dostaneš URL ve stylu:

`https://figr-xyz.vercel.app`

Tu použij pro první test přihlášení.

## Nastavení Supabase pro web

V Supabase je potřeba upravit Auth redirecty.

### Site URL

Do `Authentication -> URL Configuration` nastav:

- `Site URL` = produkční web, například:
  - `https://figr.cz`
  - nebo dočasně `https://figr-xyz.vercel.app`

### Redirect URLs

Přidej alespoň:

- lokální vývoj:
  - `http://localhost:8080/**`
- Vercel produkce:
  - `https://figr-xyz.vercel.app/**`
- vlastní doména:
  - `https://figr.cz/**`
  - `https://www.figr.cz/**`, pokud budeš používat `www`

Pokud chceš povolit i preview deploymenty Vercelu, přidej i wildcard podle pravidel Supabase.

## Vlastní doména

### 1. Připojení domény ve Vercelu

Ve Vercelu:

1. otevři projekt
2. `Settings -> Domains`
3. přidej svou doménu

Vercel ukáže, jaké DNS záznamy nastavit.

### 2. Aktualizace Supabase

Po zprovoznění domény aktualizuj v Supabase:

- `Site URL`
- `Redirect URLs`

tak, aby hlavní produkční URL odpovídala nové doméně.

## Co ve webu funguje jinak než v desktopu

Webová verze nepoužívá Electron API. To znamená:

- lokální SQLite databáze není zdroj pravdy,
- desktop zálohy přes Electron nejsou dostupné,
- cloudová data jdou přes Supabase,
- přílohy se ukládají do Supabase Storage.

Komponenty, které jsou desktop-only, už mají v UI fallback nebo jsou podmíněné podle dostupnosti `window.desktopApp`.

## Doporučený rollout

1. Nasadit na dočasnou `vercel.app` URL.
2. Otestovat:
   - registraci,
   - přihlášení,
   - uložení dat,
   - odhlášení,
   - otevření z druhého zařízení.
3. Připojit vlastní doménu.
4. Přepsat `Site URL` a `Redirect URLs` v Supabase.

## Kontrolní checklist

- [ ] Repo je na GitHubu
- [ ] Vercel má nastavené `VITE_SUPABASE_URL`
- [ ] Vercel má nastavené `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] V Supabase je zapnutý Email provider
- [ ] V Supabase běží migrace `user_app_state` a storage bucket
- [ ] `Site URL` odpovídá webové adrese
- [ ] `Redirect URLs` obsahují lokál, Vercel a produkční doménu
- [ ] Přihlášení funguje z jiného zařízení

## TODO

- Přidat UI indikaci stavu synchronizace mezi lokální cache a cloudem.
- Rozdělit cloud persistence z `user_app_state` do normalizovaných tabulek po entitách.
- Přidat produkční monitoring auth a storage chyb.
