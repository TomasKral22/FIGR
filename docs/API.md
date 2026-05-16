# API a integrační rozhraní FIGR

## Shrnutí
Tento dokument popisuje integrační rozhraní aplikace. Projekt nepoužívá klasické HTTP API, ale lokální desktop rozhraní přes Electron IPC. Dokument proto mapuje dostupné IPC operace a způsob jejich použití z frontendu.

## Pro koho je dokument určen
- Pro vývojáře rozšiřující desktop vrstvu.
- Pro správce, kteří potřebují pochopit hranici mezi frontendem a lokální backend částí.

---

## 1. Důležitý kontext
FIGR aktuálně nemá:

- REST API
- GraphQL API
- samostatný backend server

Místo toho používá:

- Electron `ipcMain.handle(...)`
- `contextBridge.exposeInMainWorld(...)`
- frontendové volání přes `window.desktopApp`

Hlavní soubory:
- `/electron/main.cjs`
- `/electron/preload.cjs`
- `/src/lib/appStorage.ts`

---

## 2. Přehled IPC rozhraní

### Storage API
Registrace v:
- `/electron/main.cjs`

Bridge v:
- `/electron/preload.cjs`

#### `storage:getMany`
Vrací více uložených hodnot podle seznamu klíčů.

Main handler:
```js
ipcMain.handle('storage:getMany', async (_event, keys) => getMany(keys));
```

Bridge:
```js
storage: {
  getMany: (keys) => ipcRenderer.invoke('storage:getMany', keys),
}
```

Použití:
- `/src/lib/appStorage.ts`
- `/src/hooks/useFinanceData.ts`
- `/src/hooks/useInvestmentData.ts`

Vstup:
```ts
string[]
```

Výstup:
```ts
Record<string, string | null>
```

#### `storage:setMany`
Uloží více klíčů najednou.

Main handler:
```js
ipcMain.handle('storage:setMany', async (_event, entries) => setMany(entries));
```

Vstup:
```ts
Record<string, string>
```

Výstup:
```ts
true
```

#### `storage:getDbPath`
Vrací absolutní cestu k lokální SQLite databázi.

Použití:
- `/src/components/BackupManager.tsx`
- `/src/lib/appStorage.ts`

---

## 3. Backup API

### `backup:list`
Vrací seznam dostupných záloh.

Main:
```js
ipcMain.handle('backup:list', async () => listBackups());
```

Výstup:
```ts
{
  fileName: string;
  fullPath: string;
  createdAt: string;
  size: number;
  kind: 'auto' | 'manual';
}[]
```

### `backup:create`
Vytvoří ruční zálohu databáze.

Main:
```js
ipcMain.handle('backup:create', async () => createBackup('manual'));
```

### `backup:getPaths`
Vrací cesty používané backup systémem.

Výstup:
```ts
{
  dbPath: string;
  backupDir: string;
}
```

### `backup:openFolder`
Otevře složku záloh v systému.

### `backup:restore`
Obnoví vybranou zálohu a restartuje aplikaci.

Main:
```js
ipcMain.handle('backup:restore', async (_event, fileName) => {
  restoreBackup(fileName);
  app.relaunch();
  setTimeout(() => app.exit(0), 300);
  return { relaunching: true };
});
```

---

## 4. Frontend wrapper

Soubor:
- `/src/lib/appStorage.ts`

Tato vrstva abstrahuje rozdíl mezi desktopem a browser fallbackem.

Chování:
- pokud existuje `window.desktopApp.storage`, použije IPC
- jinak použije `localStorage`

Příklad:
```ts
const desktopStorage = getDesktopStorage();
if (desktopStorage) {
  return desktopStorage.getMany(keys);
}
return Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
```

---

## 5. Autentizace
Aktuálně neexistuje:

- uživatelská autentizace
- session management
- token-based API auth

Desktop IPC běží lokálně v rámci jedné aplikace.

---

## 6. HTTP endpointy
V aktuální implementaci nejsou žádné produkční HTTP endpointy.

Proto:
- neexistuje OpenAPI
- neexistují request/response schémata pro REST

---

## 7. Mapování na soubory

| Soubor | Role |
|---|---|
| `/electron/main.cjs` | registrace IPC handlerů |
| `/electron/preload.cjs` | bridge do `window.desktopApp` |
| `/electron/db.cjs` | implementace storage a backup operací |
| `/src/lib/appStorage.ts` | frontend wrapper nad storage API |

---

## TODO
- Pokud vznikne online synchronizace brokerů, doplnit sem její API rozhraní.

## Možná rozšíření
- Zavést samostatnou typed IPC client vrstvu.
- Zavést validační schémata requestů a response objektů.
