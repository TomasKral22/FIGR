# Uživatelská dokumentace FIGR

## Shrnutí
Tento dokument vysvětluje práci s aplikací FIGR z pohledu běžného uživatele. Popisuje hlavní obrazovky, význam jednotlivých přehledů a běžné scénáře použití krok za krokem.

## Pro koho je dokument určen
- Pro koncového uživatele aplikace.
- Pro testera nebo analytika, který potřebuje ověřit funkce z pohledu uživatele.

---

## 1. Přehled aplikace
FIGR je aplikace pro osobní správu financí a majetku. Umožňuje:

- vést bankovní a brokerské účty
- zapisovat příjmy, výdaje a převody
- sledovat čistý majetek v čase
- evidovat investice a dividendy
- vytvářet finanční cíle
- pracovat s měsíčními snapshoty účtů
- vytvářet lokální zálohy

Hlavní stránka aplikace je složená z:

- levého navigačního panelu
- horní akční lišty
- hlavního dashboardu
- modálních oken pro konkrétní funkce

Hlavní obrazovka je sestavena v `/src/pages/Index.tsx`.

---

## 2. Navigace

### Levý panel
Levý panel slouží pouze pro navigaci mezi hlavními oblastmi aplikace.

Relevantní soubor:
- `/src/components/Sidebar.tsx`

Najdeš zde odkazy na:

- Přehled
- Měsíční workflow
- Investice
- Cíle
- Trvalé příkazy
- Reporty
- Grafy
- Audit log

### Horní lišta
Horní lišta slouží pouze pro akce, ne pro zobrazení finančních hodnot.

Relevantní soubor:
- `/src/components/Header.tsx`

Typické akce:

- otevření formuláře nové transakce
- import dat
- export dat
- správa účtů
- výběr vizuálního stylu

---

## 3. Dashboard

### Čistý majetek
Hlavní KPI panel je komponenta:
- `/src/components/WealthOverview.tsx`

Obsahuje:

- `Čistý majetek`
- `Měsíční změna`
- `Likvidita`
- `Investováno`
- přehled bankovních účtů
- přehled brokerských účtů

### Význam pojmů

| Pojem | Význam |
|---|---|
| Likvidita | Součet prostředků na bankovních účtech, které jsou k dispozici okamžitě. |
| Investovaná část | Prostředky vedené na brokerských účtech nebo investičních účtech v rámci portfolia. |
| Čistý majetek | Součet bankovních a brokerských aktiv v rámci aktuálních snapshotů. |
| Měsíční změna | Rozdíl čistého majetku mezi posledním a předchozím snapshotem. |

### Rychlé akce
Komponenta:
- `/src/components/QuickActionsPanel.tsx`

Slouží pro otevření nejčastějších akcí bez nutnosti procházet celou aplikaci.

### Chytré souvislosti
Komponenta:
- `/src/components/SmartInsightsPanel.tsx`

Ukazuje jednoduché shrnutí, například:

- největší poslední výdaj
- nejsilnější účet
- otevřené měsíce
- možné duplicity

---

## 4. Práce s transakcemi

### Přidání nové transakce
Formulář je v:
- `/src/components/TransactionForm.tsx`

Podporované typy:

- příjem
- výdaj
- převod

Uživatel může zadat:

- měsíc
- název
- částku
- účet
- kategorii
- cílový investiční účet
- vazbu na finanční cíl

### Úprava transakce
Úprava se otevírá ze seznamu transakcí.

Seznam je v:
- `/src/components/TransactionList.tsx`

Po úpravě aplikace přepočítá související zůstatky účtů a snapshoty.

### Smazání transakce
Mazání probíhá také v seznamu transakcí.

Po smazání se automaticky:

- přepočítají zůstatky
- upraví snapshoty
- zapíše auditní záznam

### Seznam transakcí
Komponenta:
- `/src/components/TransactionList.tsx`

Obsahuje:

- filtrování
- kompaktní výpis
- možnost editace
- možnost mazání
- měsíční snapshoty účtů
- uzávěrku měsíce

---

## 5. Práce s účty

### Typy účtů
V aplikaci existují 2 hlavní skupiny:

- bankovní účty
- brokerské účty

Správa účtů je v:
- `/src/components/AccountSetup.tsx`

### Bankovní účet
Bankovní účet může být:

- běžný účet
- spořicí účet (`s.ú.`)

### Brokerský účet
Brokerské účty slouží pro správu investičních prostředků a vazbu na investiční část aplikace.

### Ikony institucí
Přiřazení instituce a avataru řeší:

- `/src/lib/institutions.ts`
- `/src/components/InstitutionAvatar.tsx`

---

## 6. Trvalé příkazy
Komponenta:
- `/src/components/RecurringTransactions.tsx`

Trvalé příkazy umožňují:

- předdefinovat pravidelné příjmy
- předdefinovat pravidelné výdaje
- předdefinovat pravidelné převody

Lze nastavit:

- částku
- účet
- zdrojový a cílový účet
- den v měsíci
- aktivní / neaktivní stav

Trvalé příkazy se pak dají hromadně propsat do vybraného měsíce.

---

## 7. Finanční cíle
Komponenta:
- `/src/components/GoalsPanel.tsx`

Cíle slouží k evidenci plánovaných rezerv nebo jiných finančních met.

Každý cíl má:

- název
- cílovou částku
- aktuální částku
- volitelně navázaný účet
- stav `aktivní` nebo `splněný`

Na cíle lze navázat transakce. Aplikace pak sleduje:

- vklady do cíle
- výběry z cíle
- poslední pohyby cíle

---

## 8. Investice
Hlavní investiční modul je:
- `/src/components/investments/InvestmentDashboard.tsx`

### Co zde najdeš

- hlavní přehled portfolia
- rozložení aktiv
- detail konkrétního aktiva
- dividendový přehled
- směnné kurzy
- historii importů
- budoucí konektory na brokery

### Typy investic
Aplikace podporuje nejen klasické broker investice, ale i alternativní formy.

Aktuálně lze evidovat:

- akcie
- ETF
- kryptoměny
- dluhopisy
- komodity
- P2P půjčky
- soukromé úvěry
- nemovitostní podíly
- řízená portfolia
- fondy
- ostatní

### Poskytovatelé investic
Lze přiřadit:

- Broker
- Investown
- Fingood
- Edward
- Conseq
- Jiný poskytovatel

Tato data se používají v reálném rozložení portfolia.

### Dividendy
Dividendový přehled je v:
- `/src/components/investments/DividendOverview.tsx`

U dividend lze sledovat:

- datum ex-dividend
- datum výplaty
- očekávanou výši výplaty

---

## 9. Grafy a reporty

### Grafy
Komponenta:
- `/src/components/Charts.tsx`

Slouží k doplňkovému grafickému pohledu na finance.

### Reporty
Komponenta:
- `/src/components/reports/AnnualReports.tsx`

Obsahuje:

- roční souhrny
- vývoj majetku po měsících
- historii čistého majetku ze snapshotů

---

## 10. Import a export dat

### Finanční import
Komponenta:
- `/src/components/CSVImport.tsx`

Šablona a parser:
- `/src/utils/importTemplate.ts`

Lze importovat:

- transakce
- měsíční stavy účtů

### Investiční import
Komponenta:
- `/src/components/investments/InvestmentCSVImport.tsx`

Šablona a parser:
- `/src/utils/investmentImportTemplate.ts`

Lze importovat:

- nákupy
- prodeje
- dividendy
- alternativní investice podle poskytovatele

---

## 11. Typické scénáře použití

### Scénář A: Začínám od nuly
1. Otevři správu účtů.
2. Založ bankovní a případně brokerské účty.
3. Přidej první transakce.
4. Zkontroluj dashboard a přehled majetku.
5. Volitelně nastav finanční cíle.

### Scénář B: Import historických dat
1. Otevři import dat.
2. Exportuj šablonu.
3. Vyplň transakce a měsíční stavy účtů.
4. Nahraj soubor zpět.
5. Zkontroluj přehled transakcí a snapshoty.

### Scénář C: Evidence investic přes alternativní platformy
1. Otevři Investice.
2. Přidej nové aktivum.
3. Vyber typ aktiva a poskytovatele, například `Investown` nebo `Fingood`.
4. Zapiš nákup nebo výnos.
5. Sleduj rozložení portfolia podle poskytovatele.

### Scénář D: Uzávěrka měsíce
1. Zkontroluj transakce v daném měsíci.
2. Ověř snapshoty účtů.
3. Ručně uprav měsíční stav účtu, pokud je třeba.
4. Uzavři měsíc.

---

## 12. Časté chyby a řešení

| Problém | Pravděpodobná příčina | Řešení |
|---|---|---|
| Import přeskočil řádky | Chybí účet, typ nebo částka | Otevři šablonu a zkontroluj povinné sloupce |
| Stav účtu nesedí | Chybí importovaný měsíční stav nebo transakce | Zkontroluj snapshoty v přehledu měsíce |
| Investice nejdou správně dopočítat | Chybí ceny nebo směnné kurzy | Doplň ceny v modulu investic |
| Dividendy nejsou vidět správně | Chybí data ex-dividend / pay date / expected amount | Uprav záznam dividendy nebo importní šablonu |
| Zálohy nejsou dostupné | Aplikace neběží v desktop režimu | Otevři aplikaci přes Electron desktop běh |

---

## TODO
- Dopsat uživatelské screenshoty jednotlivých obrazovek.
- Doplnit samostatnou sekci pro práci s alternativními investicemi.

## Možná rozšíření
- Uživatelský onboarding krok za krokem.
- Nápověda přímo v aplikaci.
- Video návody k importům.
