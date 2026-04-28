# Testovací checklist

Projekt: FIGR  
Datum: 2026-04-07

## 1. Rychlý smoke test

- Aplikace se otevře bez chyb v konzoli a bez rozpadlého layoutu.
- Hlavička obsahuje logo, účty a pravá akční tlačítka bez překryvů.
- Přepnutí světlého a tmavého režimu funguje a po reloadu zůstane zachované.
- Přepnutí vizuálního stylu pozadí funguje a po reloadu zůstane zachované.
- Importní dialog se otevře a tlačítka nepřesahují dialog.
- V hlavní navigaci a formulářích jsou české popisky s diakritikou.

## 2. Účty a transakce

- Lze přidat bankovní účet a zobrazí se v hlavičce i formulářích.
- Lze přidat brokerský účet a zobrazí se v hlavičce i investicích.
- Spořicí účet je v přehledech označen jako `s.ú.`.
- Příjem zvýší zůstatek cílového účtu.
- Výdaj sníží zůstatek zdrojového účtu.
- Převod sníží zdrojový účet a zvýší cílový účet.
- Smazání transakce vrátí zůstatky do původního stavu.
- Pod každým měsícem se zobrazí přehled stavů účtů.

## 3. Trvalé příkazy

- Lze založit trvalý příjem, výdaj i převod.
- U trvalého příjmu se vybírá cílový účet.
- U trvalého výdaje se vybírá zdrojový účet.
- U trvalého převodu se vybírá zdrojový i cílový účet.
- Trvalý příkaz lze upravit, vypnout a smazat.
- Vyplnění trvalých příkazů do měsíce nevytváří duplicity.

## 4. Import a export financí

- Dialog `Import dat` nabízí `Export šablony` a `Import dat`.
- Export šablony vygeneruje XLSX se sekcemi pro transakce i měsíční stavy účtů.
- Import prázdných řádků nehlásí falešné chyby.
- Import transakcí načte validní řádky a chybné přehledně nahlásí.
- Import měsíčních stavů účtů funguje i bez transakcí.
- Importované měsíční stavy jsou vidět pod odpovídajícím měsícem.
- Export do CSV a XLSX odpovídá datům v aplikaci.

## 5. Finanční cíle

- Lze založit nový finanční cíl.
- U transakce lze vybrat finanční cíl.
- U cíle lze označit `Vklad do cíle` nebo `Výběr z cíle`.
- Pohyb přes transakci upraví aktuální stav cíle.
- Splněný cíl se přesune do seznamu splněných cílů.

## 6. Reporty a majetek

- Roční report odpovídá transakcím ve zvoleném roce.
- Graf vývoje majetku reaguje na měsíční snapshoty účtů.
- Celkový majetek odpovídá součtu bankovních a brokerských účtů.

## 7. Investice

- Otevře se investiční dashboard a doporučený workflow.
- Lze přidat investiční transakci a přepočítá se portfolio.
- Import investic z CSV/XLSX zobrazí validní i nevalidní řádky.
- Export investiční šablony funguje.
- Ceny aktiv, kurzy a dividendy se promítají do přehledů.

## 8. Zálohy a obnova

- Lze otevřít správce záloh.
- Lze vytvořit ruční zálohu.
- Lze obnovit aplikaci ze zálohy bez nekonzistentních dat.

## 9. Lokalizace

- V navigaci nejsou anglické popisky.
- Formuláře, dialogy a toasty používají češtinu s diakritikou.
- Importy a investice nepoužívají anglické názvy akcí nebo stavů.
