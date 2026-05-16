# Administrátorská a technická dokumentace FIGR

## Shrnutí
Tento dokument popisuje, jak projekt nainstalovat, spustit, udržovat a rozšiřovat. Obsahuje i mapování klíčových částí systému na konkrétní soubory.

## Pro koho je dokument určen
- Pro správce lokálního desktop nasazení.
- Pro vývojáře, kteří budou aplikaci rozšiřovat.
- Pro technického reviewera projektu.

---

## 1. Instalace projektu

### Požadavky
- Node.js
- npm
- Windows desktop prostředí pro plný Electron režim

### Instalace závislostí
```bash
npm install
```

Závislosti jsou definovány v `/package.json`.

### Klíčové runtime knihovny
- React
- Vite
- Electron
- better-sqlite3
- Recharts
- ExcelJS
- xlsx
- Radix UI

---

## 2. Spuštění projektu

### Frontend vývoj
```bash
npm run dev
```

Použití:
- rychlý vývoj UI
- kontrola layoutu
- browser preview

### Desktop vývoj
```bash
npm run desktop:dev
```

Co dělá:
- spustí Vite dev server
- počká na `http://127.0.0.1:8080`
- otevře Electron

Skript je definovaný v `/package.json`:
- `electron:dev`
- `desktop:dev`

### Produkční build
```bash
npm run build
```

### Lokální desktop spuštění nad buildem
```bash
npm run desktop
```

---

## 3. Konfigurace a env proměnné

### Aktuální stav
Projekt prakticky nevyužívá klasické frontend env proměnné.

Reálně používaná proměnná z kódu:

| Proměnná | Kde | Účel |
|---|---|---|
| `VITE_DEV_SERVER_URL` | `/electron/main.cjs` | URL dev serveru pro Electron okno |

V Electron vývojovém režimu se nastavuje skriptem:
- `/package.json` -> `electron:dev`

### Důležitý závěr
Projekt je primárně navržen tak, aby běžel:

- bez externí databáze
- bez vzdáleného backend serveru
- bez nutné cloud konfigurace

---

## 4. Struktura projektu

### Hlavní složky

| Složka | Účel |
|---|---|
| `/src` | frontend aplikace |
| `/electron` | desktop backend vrstva a lokální perzistence |
| `/public` | veřejné assety |
| `/docs` | projektová dokumentace |
| `/tests/e2e` | Playwright end-to-end testy |
| `/supabase` | historická / pomocná integrace, aktuální finance běží lokálně |

### Detail `/src`

| Složka | Účel |
|---|---|
| `/src/components` | hlavní UI komponenty |
| `/src/components/investments` | investiční modul |
| `/src/components/reports` | reporty |
| `/src/hooks` | business logika ve formě custom hooků |
| `/src/lib` | pomocné vrstvy, storage, utility |
| `/src/pages` | routované stránky |
| `/src/types` | TypeScript typy |
| `/src/utils` | výpočty, import/export logika |

---

## 5. Kde se řeší hlavní logika

### Logika financí
Soubor:
- `/src/hooks/useFinanceData.ts`

Tato vrstva řeší:
- hydrataci dat
- perzistenci
- výpočty snapshotů
- import transakcí
- správu účtů
- trvalé příkazy
- cíle
- audit
- uzávěrky měsíců

### Logika investic
Soubor:
- `/src/hooks/useInvestmentData.ts`

Tato vrstva řeší:
- správu aktiv
- investiční transakce
- ceny
- směnné kurzy
- importy
- import batch historii
- konektory brokerů
- výpočet portfolia

### Výpočty
Soubory:
- `/src/utils/calculations.ts`
- `/src/utils/investmentPortfolio.ts`

Použití:
- seskupení transakcí po měsících
- výpočty kategorií
- formátování měny
- projekce portfolia
- rozpad investic podle typu, poskytovatele, měny a sektoru

### Validace dat
Validace je prováděna převážně ručně v importních a formulářových vrstvách:

- `/src/utils/importTemplate.ts`
- `/src/utils/investmentImportTemplate.ts`
- `/src/components/CSVImport.tsx`
- `/src/components/investments/InvestmentCSVImport.tsx`
- `/src/components/TransactionForm.tsx`
- `/src/components/investments/AddTransactionForm.tsx`

---

## 6. Desktop backend a lokální databáze

### Electron main proces
Soubor:
- `/electron/main.cjs`

Zodpovědnost:
- vytvoření hlavního okna
- registrace IPC handlerů
- přístup k backup funkcím
- načtení buildu nebo dev serveru

### Preload bridge
Soubor:
- `/electron/preload.cjs`

Zodpovědnost:
- bezpečné vystavení API do `window.desktopApp`

### Lokální databáze
Soubor:
- `/electron/db.cjs`

Implementace:
- SQLite přes `better-sqlite3`
- jedna tabulka `app_storage`
- key-value perzistence aplikačních dat

### Storage vrstva ve frontendu
Soubor:
- `/src/lib/appStorage.ts`

Chování:
- v desktopu používá `window.desktopApp.storage`
- bez desktopu fallbackuje na `localStorage`

---

## 7. Jak přidat novou funkci

### Doporučený postup
1. Přidej nebo uprav typy v `/src/types`.
2. Rozšiř business logiku v relevantním hooku:
   - finance: `/src/hooks/useFinanceData.ts`
   - investice: `/src/hooks/useInvestmentData.ts`
3. Doplň výpočty v `/src/utils`.
4. Přidej nebo uprav UI komponentu v `/src/components`.
5. Napoj komponentu v `/src/pages/Index.tsx`.
6. Ověř build a případně testy.

### Příklad: nová sekce v dashboardu
1. Vytvoř komponentu v `/src/components/NovaSekce.tsx`.
2. Předej jí data z `useFinanceData`.
3. Vlož ji do `/src/pages/Index.tsx`.

---

## 8. Jak přidat nový modul

### Příklad nového doménového modulu
Pokud vznikne nový modul, například `Pojištění`:

1. Přidej nové typy do `/src/types`.
2. Vytvoř hook, například `/src/hooks/useInsuranceData.ts`.
3. Přidej UI komponenty do `/src/components/insurance`.
4. Přidej navigaci do `/src/components/Sidebar.tsx`.
5. Přidej otevření modalu nebo sekce do `/src/pages/Index.tsx`.
6. Pokud potřebuje perzistenci, přidej nové storage klíče.

---

## 9. Jak přidat nový endpoint / API vrstvu

### Důležitý kontext
Projekt aktuálně nepoužívá HTTP backend API. Má lokální desktop backend přes Electron IPC.

Pokud chceš přidat novou backend operaci:

1. Přidej IPC handler do `/electron/main.cjs`
2. Přidej odpovídající bridge metodu do `/electron/preload.cjs`
3. Zavolej ji z frontendu přes `window.desktopApp`
4. Pokud jde o lokální data, udrž integraci přes `/src/lib/appStorage.ts` nebo samostatnou bridge vrstvu

### Příklad
```js
ipcMain.handle('example:getSomething', async () => {
  return { ok: true };
});
```

```js
contextBridge.exposeInMainWorld('desktopApp', {
  example: {
    getSomething: () => ipcRenderer.invoke('example:getSomething'),
  },
});
```

---

## 10. Grafy a integrace

### Grafy
Použitá knihovna:
- `recharts`

Klíčové soubory:
- `/src/components/Charts.tsx`
- `/src/components/reports/AnnualReports.tsx`
- `/src/components/investments/PortfolioOverview.tsx`
- `/src/components/investments/AssetTable.tsx`
- `/src/components/investments/AssetDetail.tsx`
- `/src/components/investments/DividendOverview.tsx`

Data pro grafy se nepřipravují v komponentách nahodile, ale jsou odvozována z hooků a utilit:
- finance: `/src/hooks/useFinanceData.ts`, `/src/utils/calculations.ts`
- investice: `/src/hooks/useInvestmentData.ts`, `/src/utils/investmentPortfolio.ts`

### Bankovní a brokerské integrace
Reálné externí synchronizace zatím nejsou implementované jako funkční produkční konektory.

Existující základ:
- `/src/hooks/useInvestmentData.ts`
- `/src/components/investments/BrokerConnectionsPanel.tsx`

V kódu jsou připravené konektory:
- `Trading 212 API`
- `IBKR Flex Web Service`

Aktuální stav:
- evidence konektoru
- stav konektoru
- importní workflow
- žádný aktivní online sync

---

## 11. Testování

### E2E testy
Složka:
- `/tests/e2e`

Hlavní testy:
- `/tests/e2e/balances-and-localization.spec.ts`
- `/tests/e2e/import-dialog.spec.ts`
- `/tests/e2e/ux.spec.ts`

Spuštění:
```bash
npm run test:e2e
```

---

## 12. Mapování důležitých souborů

| Soubor | Co obsahuje | Vazba na zbytek |
|---|---|---|
| `/src/pages/Index.tsx` | hlavní kompozice dashboardu | spojuje finance, UI a moduly |
| `/src/hooks/useFinanceData.ts` | logika financí | dodává data většině hlavních komponent |
| `/src/hooks/useInvestmentData.ts` | logika investic | obsluhuje investiční dashboard |
| `/src/lib/appStorage.ts` | storage abstrakce | propojuje frontend s Electron backendem |
| `/electron/main.cjs` | Electron main proces | registruje IPC a spouští okno |
| `/electron/preload.cjs` | bridge do rendereru | vystavuje desktop API do `window` |
| `/electron/db.cjs` | SQLite a zálohy | lokální perzistence a snapshoty DB |

---

## TODO
- Dopsat deployment proces pro distribuovatelnou `.exe` variantu.
- Dopsat přesný release checklist.

## Možná rozšíření
- Přidat samostatnou service vrstvu pro IPC.
- Přidat unit testy pro výpočty financí a investic.
- Zavést centralizovanou i18n vrstvu pro texty.
