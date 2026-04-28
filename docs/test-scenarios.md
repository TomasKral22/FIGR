# Testovací scénáře

Projekt: FIGR  
Datum: 2026-04-07

## 1. Cíl testů

Ověřit, že aplikace:

- má konzistentní UX a layout
- správně funguje v hlavních finančních a investičních tocích
- zobrazuje české texty s diakritikou
- automaticky správně dopočítává stavy účtů a majetku

## 2. Oblasti testování

- UX a layout
- účty
- transakce
- trvalé příkazy
- import a export financí
- finanční cíle
- reporty, grafy a majetek
- investice
- zálohy a obnova
- čeština
- účetní návaznosti a dopočty

## 3. Testovací scénáře

### UX a layout

`UX-01` Přepnutí světlého a tmavého režimu  
Kroky:
1. Otevřít aplikaci.
2. Přepnout režim v hlavičce.
Očekávání:
- režim se okamžitě změní
- po reloadu zůstane uložený
- texty, tlačítka a inputy zůstávají čitelné

`UX-02` Přepnutí vizuálního stylu pozadí  
Kroky:
1. Otevřít `Vizuální styly`.
2. Postupně přepnout všechny varianty.
Očekávání:
- styl se změní okamžitě
- po reloadu zůstane zvolený
- layout se nerozbije

`UX-03` Horní panel  
Kroky:
1. Otevřít aplikaci na desktopu.
2. Zkontrolovat hlavičku při různém počtu účtů.
Očekávání:
- logo a účty jsou vedle sebe
- panel s účty je jeden řádek bloků, ne přerostlá plocha
- tlačítka vpravo jsou zarovnaná a nepřekrývají obsah

`UX-04` Popup okna a dialogy  
Kroky:
1. Otevřít `Import dat`, `Nastavení účtů`, `Finanční cíle`, `Investice`.
Očekávání:
- tlačítka nepřesahují obsah dialogu
- na menším okně se nic neořezává
- obsah dialogů je scrollovatelný, pokud je delší

`UX-05` Responzivita  
Kroky:
1. Postupně zmenšovat a zvětšovat šířku okna.
Očekávání:
- panely a karty se skládají bez překryvů
- texty a čísla nevylézají z boxů
- mobilní menu funguje přes boční panel

### Účty

`ACC-01` Založení bankovního účtu  
Očekávání:
- účet se uloží
- objeví se v hlavičce, nastavení účtů i ve formulářích

`ACC-02` Založení brokerského účtu  
Očekávání:
- účet se uloží
- objeví se v hlavičce, investicích i výběrech účtů

`ACC-03` Editace účtu  
Očekávání:
- změna názvu, zůstatku a instituce se projeví všude

`ACC-04` Spořicí účet  
Kroky:
1. Založit účet jako spořicí.
Očekávání:
- účet je v přehledech označen `s.ú.`
- v nastavení účtů je vidět jako spořicí

`ACC-05` Smazání účtu  
Očekávání:
- účet zmizí z přehledů a výběrů
- nesmí rozbít layout ani formuláře

### Transakce

`TRX-01` Přidání příjmu  
Očekávání:
- transakce se uloží do správného měsíce
- částka se přičte k cílovému účtu

`TRX-02` Přidání výdaje  
Očekávání:
- transakce se uloží
- částka se odečte ze zdrojového účtu
- kategorie se promítne do měsíčního rozdělení

`TRX-03` Přidání převodu  
Očekávání:
- částka se odečte ze zdrojového účtu
- částka se přičte na cílový účet
- měsíční snapshoty se aktualizují

`TRX-04` Investiční výdaj  
Očekávání:
- lze nastavit cílový investiční účet
- z bankovního účtu odejde částka
- na investiční účet se připíše částka

`TRX-05` Smazání transakce  
Očekávání:
- zůstatky účtů se vrátí do předchozího stavu
- měsíční bilance se přepočítá

`TRX-06` Opakované otevření formuláře  
Očekávání:
- poslední použitý typ a relevantní pole se rozumně předvyplní

### Trvalé příkazy

`REC-01` Založení trvalého příkazu pro příjem  
`REC-02` Založení trvalého příkazu pro výdaj  
`REC-03` Založení trvalého příkazu pro převod`  
Očekávání:
- jsou dostupné správné volby účtů podle typu
- příkaz jde upravit, vypnout a smazat

`REC-04` Vyplnění trvalých příkazů do měsíce  
Očekávání:
- vytvoří se chybějící transakce
- nevznikají duplicity při opakovaném vyplnění
- účetní dopady se promítnou do zůstatků

### Import a export financí

`IMP-01` Otevření dialogu importu  
Očekávání:
- dialog nabízí `Export šablony` a `Import dat`

`IMP-02` Export šablony financí  
Očekávání:
- vygeneruje se XLSX
- obsahuje listy `Import`, `Napoveda`, `Ucty`, `StavyUctu`

`IMP-03` Import pouze transakcí  
Očekávání:
- validní řádky se načtou
- prázdné řádky se ignorují

`IMP-04` Import pouze měsíčních stavů účtů  
Očekávání:
- import projde i bez transakcí
- pod měsíci se zobrazí importované stavy účtů

`IMP-05` Import transakcí + měsíčních stavů účtů  
Očekávání:
- obě části se načtou v jednom běhu
- stavy účtů přepíší vypočtené snapshoty pro stejný měsíc a účet

`IMP-06` Import s chybami  
Očekávání:
- chybné řádky jsou přeskočené
- uživatel dostane srozumitelnou informaci o počtu přeskočených řádků

`IMP-07` Export do CSV a XLSX  
Očekávání:
- export proběhne bez chyby
- data odpovídají transakcím v aplikaci

### Finanční cíle

`GOAL-01` Založení cíle  
Očekávání:
- cíl se objeví v seznamu aktivních cílů

`GOAL-02` Navázání cíle na transakci  
Kroky:
1. Vytvořit cíl.
2. Přidat transakci s volbou `Finanční cíl`.
3. Zvolit `Vklad do cíle`.
Očekávání:
- cíl navýší svůj aktuální stav
- v cíli se objeví poslední pohyb

`GOAL-03` Výběr z cíle  
Očekávání:
- aktuální stav cíle se sníží

`GOAL-04` Splnění cíle  
Očekávání:
- po dosažení cílové částky se cíl přesune mezi splněné

`GOAL-05` Smazání cíle  
Očekávání:
- cíl zmizí ze seznamu
- aplikace zůstane stabilní i pokud na něj dříve vedly transakce

### Reporty, grafy a majetek

`REP-01` Roční přehled  
Očekávání:
- odpovídá transakcím v daném roce

`REP-02` Vývoj majetku měsíc po měsíci  
Očekávání:
- reaguje na změny účtů a snapshotů
- funguje pro celou historii i vybraný rozsah

`REP-03` Přehled pod jednotlivými měsíci  
Očekávání:
- zobrazuje správné stavy účtů
- pozná importované snapshoty i vypočtené snapshoty

### Investice

`INV-01` Otevření investičního dashboardu  
Očekávání:
- zobrazí se rychlé akce a doporučený workflow

`INV-02` Ruční přidání investiční transakce  
Očekávání:
- transakce se uloží
- přepočítá se portfolio

`INV-03` Import investic z CSV/XLSX  
Očekávání:
- zobrazí se náhled validních a nevalidních řádků
- import proběhne bez duplicit

`INV-04` Export investiční šablony  
Očekávání:
- vygeneruje se XLSX šablona s nápovědou a validacemi

`INV-05` Ceny aktiv  
Očekávání:
- po zadání ceny se přepočítá hodnota portfolia

`INV-06` Směnné kurzy  
Očekávání:
- přepočet do reporting měny funguje správně

`INV-07` Dividendy  
Očekávání:
- dividendové transakce se promítají do dividendového přehledu

`INV-08` Historie importů a undo importu  
Očekávání:
- batch je uložen v historii
- undo odstraní jen daný import

### Zálohy a obnova

`BCK-01` Otevření správce záloh  
`BCK-02` Ruční vytvoření zálohy  
`BCK-03` Obnova ze zálohy  
Očekávání:
- záloha vznikne
- obnova vrátí aplikaci do konzistentního stavu

### Čeština

`LOC-01` Hlavní navigace  
Očekávání:
- všechny viditelné popisky jsou česky a s diakritikou

`LOC-02` Formuláře a dialogy  
Očekávání:
- názvy polí, tlačítek, toastů a dialogů jsou česky

`LOC-03` Importy a investice  
Očekávání:
- popisky importů, šablon, nápověd a náhledů jsou česky

`LOC-04` Detekce regresí  
Očekávání:
- pokud se objeví angličtina nebo čeština bez diakritiky v uživatelském textu, test selže

### Automatické dopočítávání stavů účtů

`BAL-01` Přidání příjmu změní stav účtu  
`BAL-02` Přidání výdaje změní stav účtu  
`BAL-03` Přidání převodu změní oba účty  
`BAL-04` Smazání transakce vrátí stav účtu`  
`BAL-05` Vyplnění trvalých příkazů přepočítá stavy`  
`BAL-06` Import transakcí přepočítá stavy`  
`BAL-07` Import měsíčních stavů se projeví pod měsícem`  
Očekávání:
- pokud se po změně transakce nezmění správný účet nebo snapshot, je to chyba

## 4. Doporučené pořadí testování

1. UX a layout
2. účty a transakce
3. trvalé příkazy
4. import a export financí
5. finanční cíle
6. reporty a majetek
7. investice
8. zálohy
9. čeština
10. regresní kontrola automatických dopočtů
