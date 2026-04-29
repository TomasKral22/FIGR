# FIGR

FIGR je aplikace pro osobní finance a investiční přehled. Běží ve dvou režimech:

- `desktop` přes Electron a lokální SQLite databázi
- `web demo` v prohlížeči pro prezentaci a rychlé testování UI

## Lokální spuštění

```sh
npm install
npm run dev
```

Desktopová verze:

```sh
npm run desktop:dev
```

## Demo web režim

Pro ukázku z jiného počítače stačí nasadit webovou část. V tomto režimu:

- data běží lokálně v prohlížeči
- funguje většina formulářů, přehledů a grafů
- desktopové zálohy a systémové složky nejsou dostupné

Build:

```sh
npm run build:demo
```

Lokální preview:

```sh
npm run preview:demo
```

## GitHub Pages odkaz

Repo je připravené na automatické nasazení přes GitHub Pages workflow.
Po pushi na `main` bude veřejná ukázka dostupná na:

`https://tomaskral22.github.io/FIGR/`

Pokud se odkaz hned neotevře, je potřeba v nastavení repozitáře na GitHubu povolit:

`Settings -> Pages -> Source: GitHub Actions`

## Nasazení na Vercel

Repo už obsahuje `vercel.json`, takže stačí:

1. importovat GitHub repozitář do Vercelu
2. nechat framework autodetekci na `Vite`
3. použít build command `npm run build:demo`
4. output directory nechat `dist`

## Technologie

- Vite
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Electron
- SQLite
