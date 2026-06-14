# FIGR Portfolio-First PWA Roadmap

## Produktový směr

- Primární use case: retail správa portfolia
- Sekundární vrstva: osobní finance a měsíční workflow
- Preferovaná platforma: PWA jako hlavní mobilní cesta

## Co je připravené

- Persistence je oddělená od `useFinanceData` a `useInvestmentData` do repository vrstvy.
- Web build je připravený jako PWA (`manifest.webmanifest`, `sw.js`, registrace service workeru).
- Investiční import umí rozpoznat základní profil souboru:
  - FIGR šablona
  - Trading 212
  - Interactive Brokers
  - DEGIRO
  - XTB

## Další implementační priority

### 1. Portfolio-first domovská obrazovka

- Výchozí dashboard přepnout na portfolio souhrn.
- Rozdělit přehled na:
  - tržní aktiva,
  - evidované pozice,
  - úvěrové investice (P2P/B2B),
  - watchlist.
- Ukázat hned nahoře:
  - aktuální hodnotu portfolia v CZK,
  - denní / měsíční změnu,
  - co chybí k plné valuaci,
  - co potřebuje kontrolu.

### 2. Mobilní režim

- Připravit mobilní layout investic mobile-first.
- Asset tabulku převést na:
  - stack karet na mobilu,
  - sticky akce,
  - rychlý filtr podle typu a poskytovatele.
- Přidat install CTA pro PWA:
  - „Přidat na plochu“
  - „Zapnout offline režim“

### 3. Přehled „kolik zbývá našetřit“

- Nad cíli a složkami zobrazit:
  - cílovou částku,
  - aktuální stav,
  - zbývá dospořit,
  - odhad termínu při současném tempu.
- Napojit na existující `goals` a budget limity bez změny finanční logiky.

### 4. Investiční analytika

- Nepokračovat zatím přes embedded AI API ve frontendu.
- Udělat dvě vrstvy:
  - lokální datový panel nad tickerem,
  - export promptu do externí AI.
- Datový panel má ukázat:
  - poslední cenu,
  - měnu,
  - stale/missing cenu,
  - provider,
  - sektor,
  - poslední dividendu / známý termín.

### 5. Efektivní importy brokerů

- Rozšířit autodetekci o provider-specific mapping.
- Další cílové brokery:
  - Portu
  - XTB detailnější mapping
  - Revolut
  - eToro
- Přidat import wizard:
  - rozpoznaný broker,
  - rozpoznaný formát,
  - preview mapování,
  - import warningy.

## Architektonické zásady

- Hooky mají orchestrace, ne parsing storage.
- Storage klíče a JSON serializace držet v repository vrstvách.
- Broker parsing rozšiřovat přes samostatné profily, ne přes větvení v UI komponentě.
- Portfolio obrazovky dělit lazy-loadem kvůli velikosti bundle.

## Bezprostřední další krok

1. Udělat portfolio-first dashboard a mobilní investiční layout.
2. Potom přidat panel „zbývá našetřit“ nad cíli a složkami.
3. Následně rozšířit broker autodetekci na konkrétní mappingy exportů.
