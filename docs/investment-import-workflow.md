# Investiční Import Workflow

## Cíle

- Uživatel nebude ručně zapisovat každý obchod.
- Import musí umět opakované načítání bez duplicit.
- Data musí jít napojit na portfolio, dividendy i reporty.
- Workflow musí fungovat offline a bez externí databáze.
- API synchronizace se bude používat jen tam, kde existuje oficiální a stabilní broker API.

## Stav implementace

FIGR nyní rozlišuje dvě úrovně investičních dat:

- **investiční zdroj / účet** – například Alocano, Investown, Edward, XTB nebo IBKR,
- **ocenění** – buď součet jednotlivých pozic, nebo snapshot celkové hodnoty účtu.

Investown a Edward používají ve výchozím nastavení snapshot. To je spolehlivější než vyrábět fiktivní veřejně obchodované pozice a umožňuje zahrnout také hotovost, úroky a spravované „kyblíky“. U brokerů se naopak používá součet pozic a jejich tržních cen.

Alocano se používá jako ruční souhrnný snapshot hlavního portfolia. Uživatel opíše pouze aktuální celkovou hodnotu a datum. Výchozí volba **Nahradit pozice bez přiřazeného účtu** zajistí, že dříve importované broker pozice zůstanou dostupné pro historii a dividendy, ale v aktuálním majetku se vedle hodnoty z Alocana nezapočítají znovu. Edward, Conseq, Investown a další účty zůstávají samostatnými zdroji a přičítají se zvlášť.

Součástí implementace je:

- evidence zdrojů a jejich aktivace/deaktivace,
- ruční snapshot hodnoty, hotovosti a vložené částky,
- nastavení cizích prostředků spravovaných na účtu, které se nezapočítají do vlastního majetku,
- importní profily pro Investown a Edward,
- vazba importovaných transakcí na konkrétní zdroj,
- ochrana proti duplicitám mezi importy i uvnitř jednoho souboru,
- přímé načtení českých hlaviček z exportované FIGR šablony a převod excelových pořadových datumů,
- souhrn majetku podle zdroje,
- kontrola chybějících cen, kurzů, zastaralých zdrojů a neúplného výnosu,
- náhradní ocenění otevřené pozice poslední transakční cenou, pokud živá cena není dostupná,
- automatické doplnění potřebných měnových kurzů při aktualizaci cen,
- skutečná historie portfolia ze snapshotů a historických cen.

## Doporučený postup pro Investown a Edward

1. V investicích otevřít panel **Investiční účty a zdroje**.
2. Založit zdroj Investown nebo Edward; ponechat způsob ocenění **Celkový snapshot**.
3. Zapsat aktuální celkovou hodnotu účtu, hotovost a pokud možno také celkem vloženou částku.
4. Při dostupném CSV/XLSX exportu jej načíst přes import a přiřadit stejnému zdroji.
5. Snapshot aktualizovat pravidelně, ideálně jednou měsíčně. Po 45 dnech FIGR zdroj označí jako zastaralý.

Pokud účet obsahuje také peníze spravované pro jinou osobu, nastav u zdroje položku **Cizí prostředky**. FIGR zachová hrubou hodnotu pro kontrolu, ale z celkového majetku, rozdělení podle zdrojů a historie odečte zadanou částku. Výkonnost investované části se přepočítá poměrem vlastněné části účtu.

Exportní transakce slouží pro audit a budoucí analytiku; celková hodnota snapshotového účtu se do portfolia započítá právě jednou, takže nedochází k dvojímu započítání importovaných položek.

Pokud snapshotový účet ještě žádný snapshot nemá, FIGR dočasně použije součet jeho pozic, aby účet z celkového portfolia nezmizel. Jakmile je snapshot doplněn, přepne se ocenění zpět na snapshot bez dvojího započítání.

## Doporučený postup pro Alocano

1. V panelu **Investiční účty a zdroje** přidat poskytovatele **Alocano**.
2. Ponechat přednastavený ruční snapshot a volbu **Nahradit pozice bez přiřazeného účtu**.
3. V Alocanu najít údaj **Celková hodnota** a opsat jej do FIGR.
4. Snapshot průběžně aktualizovat; předchozí hodnoty zůstávají v historii.

## Omezení konektorů

Přímé přihlašování k Investownu nebo Edwardovi není součástí této fáze. Bez veřejného, stabilního a dokumentovaného read-only API by takové napojení bylo křehké a bezpečnostně problematické. Architektura má režim `api_sync` připravený, ale aktivuje se až pro oficiálně podporované konektory.

## Doporučený provozní model

### Priorita 1: Export brokera

- Uživatel si z brokera stáhne oficiální export obchodů.
- FIGR má pro daného brokera uložený importní profil.
- Importer přemapuje sloupce, vytvoří hash řádku a přeskočí duplicity.
- Portfolio, dividendy i reporty se přepočítají automaticky.

### Priorita 2: Univerzální šablona FIGR

- Uživatel stáhne XLSX šablonu.
- Vyplní obchody ručně nebo do ní vloží očištěná data z jiného exportu.
- Šablona slouží jako bezpečný fallback, když broker nemá vhodný export nebo je export potřeba upravit.
- Datum může být buď `YYYY-MM-DD`, nebo skutečná excelová datumová buňka; importér normalizuje oba formáty.

### Priorita 3: Ruční zadání

- Ruční transakce zůstává k dispozici jen pro výjimky.
- Není to doporučená hlavní cesta pro běžné dlouhodobé používání.

### Priorita 4: API synchronizace

- Nasadí se jen pro brokery, kteří mají oficiální API a rozumný model autentizace.
- U ostatních brokerů zůstane doporučená cesta import přes exportní soubory.

## Navržený datový model

### Import source

- `id`
- `name`
- `sourceKind`
  - `broker_export`
  - `manual_template`
  - `watched_folder`
  - `api_sync`
- `brokerLabel`
- `filePattern`
- `defaultCurrency`
- `isActive`
- `mapping`
  - mapování sloupců na interní pole
- `lastImportedAt`
- `lastCursor`

### Import batch

- `id`
- `sourceId`
- `sourceLabel`
- `sourceKind`
- `fileName`
- `importedAt`
- `transactionCount`
- `notes`

### Investment transaction

- `id`
- `assetId`
- `transactionType`
- `quantity`
- `pricePerUnit`
- `totalValue`
- `currency`
- `transactionDate`
- `notes`
- `importBatchId`
- `externalId`
- `sourceRowHash`
- `destinationAccountId`
- `includeInInvestedTotals`
- `createdAt`

## Workflow

1. Uživatel si založí importní profil pro brokera nebo zvolí univerzální šablonu.
2. Profil načte exportní CSV/XLSX nebo později sledovanou složku.
3. Každý řádek se převede na interní investiční transakci.
4. Nad řádkem se vytvoří stabilní hash z brokera, data, tickeru, množství a částky.
5. Pokud hash už existuje, řádek se přeskočí jako duplicita.
6. Nové transakce se uloží do historie importů.
7. Portfolio, dividendy a reporty se přepočítají automaticky.

## Fáze realizace

### Fáze 1

- ruční CSV/XLSX import
- uložené mapování sloupců
- anti-duplicitní hash
- historie importů
- preferovaný import oficiálních exportů brokerů

### Fáze 2

- sledovaná složka
- automatické načítání nových exportů
- označení zpracovaných souborů
- importní profily po brokerovi

### Fáze 3

- API sync tam, kde to broker dovolí
- kurzory poslední synchronizace
- obnova po chybě
- ruční reconnect účtu

## Co už aplikace umí připravit

- lokální uložiště
- historii importních batchů
- přepočet portfolia
- dividendový přehled
- vazbu investičních toků na účty ve financích

## Doporučení pro první brokery

- `Interactive Brokers`: vysoká priorita pro export i pozdější API sync
- `Trading 212`: vysoká priorita pro export, střední priorita pro API sync
- `XTB`: exportní workflow, API sync zatím neplánovat
- `DEGIRO`: exportní workflow, API sync neplánovat bez oficiální podpory
