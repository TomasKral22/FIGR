# FIGR 0.1.0 – stabilita dat a Windows aplikace

Stav k 27. 8. 2026. Tento dokument popisuje dokončenou stabilizační část, nikoliv dokončení celé produktové roadmapy.

Ověřené vydání: `release/2026-08-27T17-56-09-796Z`. Oba balíčky mají přibližně 122 MiB a stav podpisu `NotSigned`. Finální kontrola prošla: 18/18 testů synchronizace, 3/3 nativních testů záloh, 16/16 prohlížečových testů, integrita 11 798 zabalených souborů a spuštění skutečné desktopové aplikace v izolovaném profilu. Kontrolní součty jsou u EXE v `SHA256SUMS.txt`.

## Co řeší tato verze

- Změny se nejprve atomicky ukládají do lokální fronty konkrétního účtu; teprve potom do cloudu. Fronta přežije restart a opakuje odeslání po obnovení spojení.
- Neúspěšné první načtení bez úplné lokální kopie zablokuje editaci. Aplikace neuloží prázdný výchozí stav místo nenačtených dat.
- Zápis do cloudu podmiňuje verze načteného záznamu. Souběžné změny na dvou zařízeních vyvolají konflikt, nikoliv tiché přepsání.
- Detail synchronizace umožňuje porovnat obě varianty, exportovat záchrannou kopii a zvolit lokální nebo cloudovou verzi. Před volbou se obě varianty archivují.
- Zmizení dříve známého cloudového řádku zachová lokální data a vyžádá rozhodnutí. Předchozí lokální verze se archivuje i při přijetí běžné změny z jiného zařízení.
- Přepnutí účtu zastaví rozpracované operace předchozího účtu. Stará data bez doloženého vlastníka se automaticky nepřiřazují novému účtu ani nemažou.
- Chyba lokálního zápisu se nezamaskuje jako úspěšná synchronizace. Rozpracované změny lze exportovat z paměti; při plném disku aplikaci nezavírejte, dokud nejsou zachráněné.
- Desktop vytváří automatickou SQLite zálohu nejvýše jednou za 24 hodin, uchovává 14 automatických kopií a samostatné ruční zálohy. Obnova nejprve validuje soubor a vytvoří bezpečnostní kopii současného stavu.
- Obnovená cloudová cache vyžaduje kontrolu případných rozdílů. Obnova SQLite není nevratné přepsání cloudu.
- Audit investic pracuje se skutečným stavem synchronizace a otevře řešení konfliktu.

## Instalace a data

Použijte pouze nejnovější artefakty uvedené v `release/latest-build.json`, které mají úspěšný odpovídající záznam v `release/desktop-smoke-result.json`. K dispozici jsou instalační a přenosné EXE pro Windows x64. Přenosná verze nevyžaduje instalaci, ale data ukládá do stejného uživatelského profilu, nikoliv vedle EXE.

Profil zůstává `%APPDATA%\vite_react_shadcn_ts`; přejmenování aplikace na FIGR nevytváří novou prázdnou databázi. Přesnou cestu databáze a záloh ukazuje panel záloh. Výchozí zálohy jsou v systémové složce Dokumenty pod `FIGR\Backups` (její fyzická cesta může být přesměrovaná do OneDrive).

Při prvním spuštění se přihlaste stejným Supabase účtem jako ve webu. Přihlášení prohlížeče se samo nepřenáší do desktopu. Před prvním větším importem vytvořte ruční zálohu. Tato verze neprovádí migraci ani mazání produkčních cloudových dat.

Balíčky nemají podpis vydavatelským certifikátem. Windows proto může zobrazit upozornění na neznámého vydavatele. K podpisu a důvěryhodné veřejné distribuci bude potřeba dodat certifikát / nastavit podepisování.

## Ověření a opakovatelný build

Vývojové prostředí: Node.js 24, npm 11, Windows x64. Nativní SQLite používá Node-API prebuild; lokální překlad v C++ není nutný.

```sh
npm ci
npm run typecheck
npm run test:storage
npm run test:backup
npm run test:e2e
npm run desktop:dist
npm run test:desktop
```

Pokud správce balíčků zablokuje instalační skript Electronu, je nutné schválit jeho instalační skript a doinstalovat oficiální runtime příkazem `node node_modules/electron/install.js`.

`desktop:dist` provede kontrolu typů, testy synchronizace a SQLite, Vite build a oba Windows balíčky. Balení probíhá v nové dočasné složce mimo OneDrive; výsledky se kopírují do nového časově označeného adresáře `release`. Během balení neupravujte vstupní soubory aplikace. Kontrola integrity odmítne poškozený archiv nebo balíček neodpovídající zdrojům.

`test:desktop` kontroluje zabalené soubory, spouští skutečný zabalený program s novým izolovaným profilem, ověřuje produkční přihlášení, izolaci rendereru, zápis do SQLite a vytvoření zálohy. Neinstaluje aplikaci do uživatelského profilu a nepracuje se skutečnými finančními daty. Instalace na čistém druhém počítači a přihlášení skutečným účtem nejsou součástí tohoto automatického testu.

Regresní sada zahrnuje 18 testů synchronizace, 3 nativní testy zálohování a 16 prohlížečových scénářů. Prohlížečové cloudové testy používají mockované API, nikoliv produkční účet. Veřejné metadata existující databáze byla ověřena pouze čtením (RLS, vlastnictví řádků, aktualizační trigger).

Celorepozitářový lint má starší nález konstantní podmínky v odložené části `Index.tsx`; kontrola typů a cílený lint stabilizačních souborů procházejí. Vite upozorňuje na velikost hlavního JS balíčku; další rozdělení bundlu zůstává optimalizací.

## Důležitá omezení

- Konflikty se řeší po datových sadách, nikoliv automatickým sloučením jednotlivých transakcí. Před potvrzením vždy porovnejte obě kopie.
- Ochrana podmíněného zápisu musí být nasazena na všech používaných klientech; starší verze může stále zapisovat původním způsobem.
- Záchranný JSON obsahuje finanční data a historii; uchovávejte jej soukromě. Při chybě disku nezachrání zavření aplikace data, která zůstala pouze v paměti.
- SQLite záloha obsahuje databázi/cache, ne samotné soubory příloh ani serverovou historii Supabase. Přílohy a serverové zálohy je třeba zálohovat zvlášť.
- Vymazání dat prohlížeče smaže i jeho lokální cache a frontu. Před čištěním použijte export a zkontrolujte synchronizaci.
- Automatická záloha na stejném disku nenahrazuje nezávislou zálohu pro případ poruchy nebo ztráty počítače.

## Co zůstává z produktového plánu

- Dokončit automatizované importy ze sledovaných složek včetně uživatelského workflow; samotné IPC rozhraní není hotový automatický konektor.
- Dotáhnout a samostatně ověřit opakovaně použitelné mapování brokerových exportů.
- Implementovat a ověřit oficiální read-only konektory, například Trading 212 / IBKR.
- Investown, Edward a Alocano nadále využívají podporované importy / ruční snapshoty; přímé přihlášení a automatická synchronizace jejich účtů nejsou hotové.
- Portfolio-first domovská obrazovka, mobilní investiční layout a instalační výzva PWA zůstávají další etapou.

Podrobnosti směru: [portfolio-pwa-roadmap.md](portfolio-pwa-roadmap.md) a [investment-import-workflow.md](investment-import-workflow.md).
