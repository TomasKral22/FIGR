# FIGR

FIGR je desktopová aplikace pro osobní finance a investiční přehled.

## Lokální spuštění

```sh
npm install
npm run dev
```

Desktopová verze:

```sh
npm run desktop:dev
```

Produkční lokální build:

```sh
npm run desktop
```

## Technologie

- Vite
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Electron
- SQLite
- Supabase Auth / Postgres / Storage (volitelnĂ˝ cloud reĹľim)

## CloudovĂ© pĹ™ihlĂˇĹˇenĂ­ a databĂˇze

Pokud chceĹˇ zapnout pĹ™ihlĂˇĹˇenĂ­ pĹ™es e-mail a cloudovou persistenci:

1. zkopĂ­ruj [.env.example](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/.env.example) do `.env`
2. doplĹ Supabase URL a publishable key
3. spusĹĄ SQL migraci [20260514090000_add_auth_state_and_attachments.sql](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/supabase/migrations/20260514090000_add_auth_state_and_attachments.sql)
4. projdi [CLOUD_AUTH_SETUP.md](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/docs/CLOUD_AUTH_SETUP.md)
## Web deployment

Pro nasazení aplikace na web a přístup z více zařízení použij návod v [WEB_DEPLOY.md](C:/Users/rkali/Desktop/Apka/czech-language-helper-main/docs/WEB_DEPLOY.md).
