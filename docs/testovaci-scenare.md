# Testovací scénáře

Projekt: FIGR  
Datum: 2026-04-07

## Účel

Tento dokument slouží jako základní testovací specifikace pro průběžné ruční testování aplikace. Zaměřuje se na:

- UX a layout
- hlavní funkce aplikace
- češtinu a konzistenci textů
- správné dopočítávání stavů účtů
- importy a investiční workflow

## Kritéria kvality

### Kritérium 1: UX

- vzhled odpovídá aktuálnímu návrhu aplikace
- aplikace podporuje světlý i tmavý režim
- aplikace podporuje změnu vizuálního stylu pozadí
- horní panel je přehledný a kompaktní
- panel s účty je v jednom řádku podle návrhu
- žádné tlačítko nepřesahuje přes popup nebo dialog

### Kritérium 2: Funkčnost

- všechny hlavní oblasti aplikace se otevřou bez chyby
- data se ukládají a po restartu zůstávají zachovaná
- stav účtů a majetku se po změnách přepočítává správně

### Kritérium 3: Čeština

- všechny viditelné popisky jsou v češtině
- české texty obsahují správnou diakritiku
- v UI nejsou zbytky angličtiny, pokud nejsou záměrně technické
- v UI se nevyskytuje rozbitá znaková sada

### Kritérium 4: Účetní logika

- každá transakce ovlivní správný účet
- smazání transakce vrátí stav účtu do správného stavu
- měsíční snapshoty odpovídají historii
- importované měsíční stavy účtů mají prioritu pro daný měsíc a účet

## Testovací balíčky

### 1. Smoke test

Ověřit:

- spuštění aplikace
- otevření hlavních sekcí
- vytvoření účtu
- přidání transakce
- otevření reportů
- přepnutí dark/light režimu

### 2. Účetní logika

Ověřit:

- příjem
- výdaj
- převod
- investiční výdaj
- smazání transakce
- přepočet snapshotů
- import měsíčních stavů účtů

### 3. UX a jazyk

Ověřit:

- layout desktop/mobile
- popupy a dialogy
- přetečení obsahu
- konzistenci textů
- češtinu s diakritikou

### 4. Investice a importy

Ověřit:

- import šablon
- ruční zadání investice
- přepočet portfolia
- ceny, kurzy, dividendy
- historii importu

## Detailní scénáře

## A. UX a layout

### A1. Přepnutí světlého a tmavého režimu

Postup:

1. Spustit aplikaci.
2. Kliknout na přepínač režimu v hlavičce.
3. Přepnout několikrát mezi tmavým a světlým režimem.
4. Restartovat aplikaci.

Očekávaný výsledek:

- režim se přepne bez rozbití layoutu
- kontrast zůstane čitelný
- zvolený režim se po restartu zachová

### A2. Přepnutí vizuálního stylu pozadí

Postup:

1. Otevřít `Vizuální styly`.
2. Vyzkoušet `Classic`, `Studio`, `Metal`, `Neon`, `Sunset`.
3. Zavřít panel a znovu otevřít aplikaci.

Očekávaný výsledek:

- pozadí se mění bez pádu aplikace
- obsah zůstává čitelný
- vybraný styl se po restartu zachová

### A3. Hlavička a panel účtů

Postup:

1. Mít alespoň dva bankovní a jeden brokerský účet.
2. Zkontrolovat hlavičku v desktopu.
3. Zmenšovat šířku okna.

Očekávaný výsledek:

- logo je celé viditelné
- bloky `Účty banky` a `Účty brokerů` jsou ve správném rozložení
- spořicí účet je označen `s.ú.`
- tlačítka zůstávají vpravo a nepřekrývají obsah

### A4. Popupy a dialogy

Postup:

1. Otevřít všechny hlavní dialogy: transakce, účty, cíle, importy, investice, reporty.
2. Zkontrolovat je na běžné i menší šířce.

Očekávaný výsledek:

- žádné tlačítko nepřesahuje dialog
- obsah je scrollovatelný
- nic se nepřekrývá

## B. Účty

### B1. Založení bankovního účtu

Postup:

1. Otevřít nastavení účtů.
2. Přidat bankovní účet.
3. Uložit.

Očekávaný výsledek:

- účet se zobrazí v hlavičce
- účet se zobrazí v seznamu účtů
- audit log zachytí vytvoření

### B2. Spořicí účet

Postup:

1. Vytvořit nebo upravit bankovní účet a označit jej jako spořicí.
2. Nastavit úrok.
3. Uložit.

Očekávaný výsledek:

- účet je v přehledech označen `s.ú.`
- v nastavení účtů je vidět, že jde o spořicí účet
- měsíční přehledy a hlavička označení zobrazují

### B3. Úprava a smazání účtu

Postup:

1. Upravit název, zůstatek nebo instituci účtu.
2. Uložit.
3. Zkusit účet smazat.

Očekávaný výsledek:

- změny se okamžitě propíšou
- smazání proběhne bez pádu
- audit log změnu zachytí

## C. Transakce

### C1. Přidání příjmu

Postup:

1. Otevřít `Nová transakce`.
2. Vybrat `Příjem`.
3. Vyplnit účet, měsíc, název a částku.
4. Uložit.

Očekávaný výsledek:

- transakce se zobrazí v přehledu měsíce
- stav účtu se zvýší
- bilance měsíce se přepočítá

### C2. Přidání výdaje

Postup:

1. Otevřít `Nová transakce`.
2. Vybrat `Výdaj`.
3. Vyplnit kategorii, účet a částku.
4. Uložit.

Očekávaný výsledek:

- transakce se zobrazí v přehledu
- stav účtu se sníží
- výdaj se propíše do správné kategorie

### C3. Přidání převodu

Postup:

1. Otevřít `Nová transakce`.
2. Vybrat `Převod`.
3. Vyplnit zdrojový a cílový účet.
4. Uložit.

Očekávaný výsledek:

- zdrojový účet se sníží
- cílový účet se zvýší
- přehled převodů zobrazí položku

### C4. Smazání transakce

Postup:

1. Přidat transakci.
2. Smazat ji z měsíčního přehledu.

Očekávaný výsledek:

- transakce zmizí
- účetní stav se vrátí zpět
- snapshot měsíce se přepočítá

## D. Automatické dopočítávání stavů účtů

### D1. Příjem mění stav účtu

Očekávaný výsledek:

- po přidání příjmu je na cílovém účtu vyšší stav

### D2. Výdaj mění stav účtu

Očekávaný výsledek:

- po přidání výdaje je na účtu nižší stav

### D3. Převod mění oba účty

Očekávaný výsledek:

- zdroj se sníží
- cíl se zvýší

### D4. Změna minulého měsíce

Postup:

1. Přidat nebo smazat transakci ve starším měsíci.

Očekávaný výsledek:

- změna se promítne do snapshotu daného měsíce
- navazující vývoj majetku dává smysl

### D5. Import měsíčních stavů účtů

Postup:

1. Exportovat šablonu.
2. Vyplnit jen list `StavyUctu`.
3. Importovat soubor.

Očekávaný výsledek:

- import proběhne i bez transakcí
- pod konkrétním měsícem jsou vidět importované stavy
- reporty je použijí pro daný měsíc

## E. Trvalé příkazy

### E1. Založení trvalého příjmu

Očekávaný výsledek:

- příkaz se uloží
- po vyplnění měsíce vytvoří transakci

### E2. Založení trvalého výdaje

Očekávaný výsledek:

- po vyplnění měsíce se správně sníží účet

### E3. Založení trvalého převodu

Očekávaný výsledek:

- po vyplnění měsíce se změní oba účty

### E4. Anti-duplicita trvalých příkazů

Postup:

1. Vyplnit trvalé příkazy do měsíce dvakrát.

Očekávaný výsledek:

- druhé spuštění nevytvoří duplicity

## F. Finanční cíle

### F1. Založení cíle

Postup:

1. Otevřít `Finanční cíle`.
2. Přidat nový cíl s cílovou částkou.

Očekávaný výsledek:

- cíl se objeví mezi aktivními

### F2. Vklad do cíle přes transakci

Postup:

1. Vytvořit cíl.
2. Přidat transakci a vybrat `Finanční cíl`.
3. Zvolit `Vklad do cíle`.

Očekávaný výsledek:

- u cíle naroste aktuální stav
- v cíli se zobrazí poslední pohyb

### F3. Výběr z cíle přes transakci

Očekávaný výsledek:

- u cíle se sníží aktuální stav

### F4. Splněný cíl

Postup:

1. Přidávat vklady, dokud cíl nedosáhne nebo nepřekročí cílovou částku.

Očekávaný výsledek:

- cíl se přesune do sekce `Splněné cíle`

### F5. Smazání cíle

Očekávaný výsledek:

- cíl zmizí ze seznamu
- historické transakce nezpůsobí pád aplikace

## G. Import a export financí

### G1. Export šablony

Očekávaný výsledek:

- vznikne validní `xlsx`
- obsahuje listy `Import`, `Napoveda`, `Ucty`, `StavyUctu`, `Ciselniky`

### G2. Import jen transakcí

Očekávaný výsledek:

- načtou se transakce
- přepočtou se účty

### G3. Import jen měsíčních stavů účtů

Očekávaný výsledek:

- načtou se snapshoty
- nevyžadují současně transakce

### G4. Import kombinace transakcí a stavů

Očekávaný výsledek:

- načtou se obě vrstvy dat
- toast správně ukáže počty

### G5. Chybné řádky při importu

Postup:

1. Záměrně ponechat chybný účet nebo neplatný měsíc.

Očekávaný výsledek:

- řádek se přeskočí
- uživatel dostane srozumitelnou chybu
- platná data se zpracují

## H. Reporty a grafy

### H1. Roční reporty

Očekávaný výsledek:

- roční souhrny odpovídají transakcím

### H2. Graf vývoje majetku

Očekávaný výsledek:

- graf se mění po přidání nebo smazání transakce
- graf respektuje importované stavy účtů

### H3. Přehled kategorií

Očekávaný výsledek:

- výdaje jsou správně rozdělené dle kategorií

## I. Investice

### I1. Otevření investičního dashboardu

Očekávaný výsledek:

- dashboard se načte bez chyby
- rychlé akce jsou funkční

### I2. Export investiční šablony

Očekávaný výsledek:

- stáhne se `xlsx` šablona s validacemi

### I3. Import investic z XLSX/CSV

Očekávaný výsledek:

- načtou se validní řádky
- nevalidní řádky jsou označené
- import se zapíše do historie importu

### I4. Ruční přidání investiční transakce

Očekávaný výsledek:

- transakce se uloží
- portfolio se přepočítá

### I5. Ceny a kurzy

Očekávaný výsledek:

- po doplnění cen a kurzů se aktualizuje přehled portfolia

### I6. Dividendy

Očekávaný výsledek:

- dividendové transakce se zobrazí v dividendovém přehledu

## J. Audit log

### J1. Audit po běžných akcích

Očekávaný výsledek:

- vytvoření účtu, transakce, cíle, importu a trvalého příkazu se zapisuje do auditu

## K. Zálohy

### K1. Správce záloh

Očekávaný výsledek:

- správce záloh se otevře
- jde vytvořit záloha
- jde obnovit záloha

## L. Čeština a diakritika

### L1. UI popisky

Očekávaný výsledek:

- všechny viditelné texty v hlavních sekcích jsou česky
- mají správnou diakritiku

### L2. Toasty a chybové hlášky

Očekávaný výsledek:

- chybové hlášky jsou česky
- nejsou rozbité znaky typu mojibake

### L3. Importní a investiční dialogy

Očekávaný výsledek:

- popisky jsou česky
- šablony mají srozumitelnou češtinu tam, kde je to určeno pro uživatele

## Doporučené priority

### P1

- přidání/smazání transakcí
- automatické přepočty účtů
- import transakcí a stavů účtů
- cíle navázané na transakce
- popupy bez přetékání

### P2

- reporty a grafy
- trvalé příkazy
- investiční importy
- audit log

### P3

- úplné dočištění češtiny ve všech vedlejších obrazovkách
- jemné vizuální odladění
