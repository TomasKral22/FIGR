# Kalkulačky

Samostatná sekce v levé i mobilní navigaci FIGR. Přehled podporuje hledání a filtry Plánování / Ocenění. Přímý odkaz: `/#/?view=calculators`; konkrétní model například `/#/?view=calculators&calculator=planner`.

## Rozsah

| Kalkulačka | Co počítá |
| --- | --- |
| Investiční plánovač | Měsíční vklady, tři scénáře výnosu, inflaci, průběžné náklady a milníky |
| Složené úročení | Vývoj hodnoty a vkladů při nominální nebo efektivní roční sazbě |
| Spoření na cíl | Potřebný měsíční vklad pro danou cílovou částku a horizont |
| FIRE | Cílový kapitál, čas do cíle, modelový výběr a Coast FIRE |
| DCF | Ocenění FCFE na akcii a citlivost na diskont a terminální růst |
| P/E | Implikovanou cenu při ručně zadaném EPS a násobku zisku |

Kalkulačky nemění finanční data. Počáteční částku lze jednorázově převzít z aktuálního přehledu účtů v CZK (včetně jeho vyloučení cizího majetku). Další změny modelu zůstávají oddělené od účtů a portfolia. Převzetí dat není automatické.

Vstupy jsou v paměti komponenty a zůstávají při přepínání kalkulaček. Opuštění sekce nebo obnovení stránky je vrátí na ilustrativní příklady. Vstupy se neposílají žádnému poskytovateli ani neukládají do finanční databáze. Odkazy na metodiku vedou na externí weby.

Historické backtesty, pravděpodobnost úspěchu FIRE, živé ceny a fundamenty, daňové, dividendové a ostatní kalkulačky z referenčního katalogu nejsou součástí této verze. Ceny, FCFE a EPS zadává uživatel; měnový přepínač mění označení jednotek, neprovádí konverzi kurzem.

## Výpočetní konvence

Všechny sazby ve vzorcích níže jsou desetinné (7 % = 0,07). Výpočty používají nezaokrouhlená čísla, zaokrouhluje se až zobrazení. Vklady přicházejí na konci měsíce.

- Efektivní roční sazba `r` se převádí na měsíční `m = (1 + r)^(1/12) − 1`. Složené úročení navíc nabízí nominální sazbu s měsíčním připisováním `m = r / 12`. Efektivní režim není simulací jednorázového připisování úroků na konci roku: modeluje rovnoměrný měsíční průběh.
- Plánovač: `hodnota_t = hodnota_(t−1) × (1 + m) × (1 − roční_náklady)^(1/12) + měsíční_vklad`. Reálná konečná hodnota je nominální hodnota dělená `(1 + inflace)^roky`. Vklady zůstávají nominálně stejné. Scénáře používají výnos ±3 procentní body; nejsou intervalem pravděpodobnosti. Dopad poplatků zahrnuje i ušlé zhodnocení; skutečně stržené modelové náklady jsou uvedené zvlášť.
- Cílová částka: `vklad = max(0, (cíl − počátek × (1 + m)^n) / (((1 + m)^n − 1) / m))`. Při nulové sazbě je jmenovatelem počet měsíců `n`. Záporné sazby jsou podporované. Model ignoruje daně, inflaci a poplatky.
- FIRE: `cíl = roční_výdaje / roční_míra_výběru`. Reálný výnos `(1 + nominální_výnos) / (1 + inflace) − 1`. Měsíční vklady jsou konstantní v reálných korunách, tedy nominálně rostou s inflací. Čas do cíle hledáme po měsících do 100 let. `Coast FIRE = cíl / (1 + reálný_výnos)^roky_do_penze`. Nezohledňujeme volatilitu, pořadí výnosů, daně ani poplatky; sazba 4 % je příklad, nikoliv záruka bezpečného výběru.
- DCF: růst `FCFE_t = FCFE_0 × (1 + růst)^t`; hodnota = součet `FCFE_t / (1 + diskont)^t` plus diskontovaná terminální hodnota `FCFE_N × (1 + g) / (diskont − g)`. Vstupem je FCFE pro akcionáře na akcii, diskontem cena vlastního kapitálu, nikoliv firemní WACC. Počet akcií je konstantní. Musí platit kladné FCFE a `diskont > g`. Rozdíl vůči ceně = `hodnota / cena − 1`; bezpečnostní polštář = `1 − cena / hodnota` (různé jmenovatele).
- P/E: `P/E = cena / EPS`; implikovaná cena = `EPS × cílové_P/E`. Kladné EPS je podmínkou tohoto modelu. Násobky 15 a 25 jsou ilustrativní porovnání.

Česká desetinná čárka a mezery v číslech jsou podporované. Prázdné, nečíselné, nekonečné, mimorozsahové vstupy a neplatné vazby zobrazí chybu místo zavádějícího výsledku. Horizont je celé číslo; plánovač a složené úročení podporují i 0 let, cíl a DCF nejméně 1 rok.

## Podklady

- [Investor.gov – složené úročení](https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator)
- [Aswath Damodaran, NYU – model FCFE](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/fcfe.html)
- [Investor.gov – P/E](https://www.investor.gov/introduction-investing/investing-basics/glossary/price-earnings-pe-ratio)

## Ověření

`npm run test:calculators` ověřuje čisté výpočty proti nezávislým vzorcům, nulové i záporné výnosy, náklady, inflaci, milníky, nesplnitelné / dosažené cíle, DCF perpetuity a validační hranice.

`npm run test:e2e -- calculators` ověřuje navigaci, hledání, scénáře, vstupy, zachování finančních dat, převzetí vlastního majetku, mobilní viewport, světlý motiv a migraci pořadí menu.

Před Windows sestavením běží testy výpočtů také v `npm run desktop:dist`.
