# Dokumentace projektu FIGR

## Shrnutí
Tento dokument slouží jako rozcestník do kompletní dokumentace aplikace FIGR. Najdeš zde odkazy na uživatelskou dokumentaci, technickou dokumentaci pro správce a vývojáře, architekturu, tok dat i popis komponent.

## Pro koho je dokument určen
- Pro uživatele, kteří chtějí pochopit, jak aplikaci používat.
- Pro správce a vývojáře, kteří chtějí aplikaci provozovat, upravovat a rozšiřovat.

---

## O aplikaci
FIGR je desktop-first finanční dashboard postavený na Reactu a Electronu. Aplikace slouží ke správě osobních financí a majetku:

- evidence příjmů, výdajů a převodů
- správa bankovních a brokerských účtů
- měsíční přehledy stavu účtů
- grafy a reporty
- investiční portfolio, dividendy a importy investic
- trvalé příkazy
- finanční cíle
- audit změn
- lokální zálohování dat

Hlavní vstupní body aplikace:

- frontend: `/src/App.tsx`, `/src/pages/Index.tsx`
- desktop shell: `/electron/main.cjs`, `/electron/preload.cjs`
- lokální databáze a zálohy: `/electron/db.cjs`

---

## Hlavní funkce

| Oblast | Popis | Klíčové soubory |
|---|---|---|
| Finance | Transakce, účty, měsíční workflow, snapshoty | `/src/hooks/useFinanceData.ts`, `/src/components/TransactionForm.tsx`, `/src/components/TransactionList.tsx` |
| Přehled | Dashboard, majetek, rychlé akce, souvislosti | `/src/components/WealthOverview.tsx`, `/src/components/QuickActionsPanel.tsx`, `/src/components/SmartInsightsPanel.tsx` |
| Investice | Portfolio, aktiva, dividendy, importy, konektory | `/src/hooks/useInvestmentData.ts`, `/src/components/investments/InvestmentDashboard.tsx` |
| Reporty | Roční reporty a vývoj majetku | `/src/components/reports/AnnualReports.tsx`, `/src/components/Charts.tsx` |
| Import/export | Finanční a investiční šablony XLSX/CSV | `/src/components/CSVImport.tsx`, `/src/utils/importTemplate.ts`, `/src/components/investments/InvestmentCSVImport.tsx`, `/src/utils/investmentImportTemplate.ts` |
| Zálohy | Lokální SQLite snapshoty a obnova | `/src/components/BackupManager.tsx`, `/electron/db.cjs` |

---

## Jak projekt spustit

### Instalace
```bash
npm install
```

### Web vývoj
```bash
npm run dev
```

### Desktop vývoj
```bash
npm run desktop:dev
```

### Produkční build frontendu
```bash
npm run build
```

### Lokální desktop běh nad buildem
```bash
npm run desktop
```

### E2E testy
```bash
npm run test:e2e
```

Konfigurace skriptů je v `/package.json`.

---

## Navigace dokumentací

- [USER_GUIDE.md](./USER_GUIDE.md)  
  Uživatelská dokumentace k ovládání aplikace.

- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)  
  Technická dokumentace pro správu, provoz a rozšiřování.

- [ARCHITECTURE.md](./ARCHITECTURE.md)  
  Architektura aplikace, rozdělení na frontend a desktop/backend část.

- [API.md](./API.md)  
  Přehled integrační vrstvy. Projekt nepoužívá HTTP backend API, ale Electron IPC.

- [COMPONENTS.md](./COMPONENTS.md)  
  Přehled hlavních komponent a jejich odpovědností.

- [DATA_FLOW.md](./DATA_FLOW.md)  
  Tok dat aplikací od UI po perzistenci.

---

## Související interní dokumenty
Ve složce `/docs` už jsou i další existující dokumenty vytvořené v průběhu návrhu:

- `/docs/business-analysis-brd.md`
- `/docs/broker-api-analyza.md`
- `/docs/investment-import-workflow.md`
- `/docs/test-checklist.md`
- `/docs/test-scenarios.md`
- `/docs/testovaci-scenare.md`

Tyto soubory doplňují tuto dokumentaci, ale nenahrazují ji.

---

## TODO
- Doplnit průběžně změny při přidání nových modulů.
- Udržovat mapování komponent a datových toků při refaktorech.

## Možná rozšíření
- Samostatná dokumentace testování.
- Samostatná dokumentace pro investiční importní profily.
- Diagram release procesu a build pipeline.
