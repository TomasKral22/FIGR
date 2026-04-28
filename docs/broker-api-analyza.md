# Analýza možností napojení brokerů na API

Datum ověření: 7. dubna 2026

## Shrnutí

### Doporučené pro API integraci

- `Interactive Brokers`
- `Trading 212`

### Doporučené jen pro import/export workflow

- `XTB`
- `DEGIRO`

## 1. Interactive Brokers

### Stav

Interactive Brokers má oficiální Web API a další oficiální integrační cesty.

### Co je dostupné

- `Client Portal / Web API`
- `TWS API`
- `Flex Web Service` pro automatizované reporty a activity exporty

### Důležité limity

- U individuálních účtů je pro chráněné endpointy potřeba lokální Java `Client Portal API Gateway`.
- Gateway běží lokálně na stejném zařízení a autentizace se neudělá zcela bez zásahu uživatele.
- Pro reporting a import historie je často praktičtější použít `Flex Web Service`, který vrací activity reporty a trade confirmations.

### Doporučení pro FIGR

- `Fáze 1`: podpora importu `Flex Query` / activity exportů
- `Fáze 2`: volitelný konektor na `Flex Web Service`
- `Fáze 3`: až pak živé API napojení přes Client Portal / Web API

### Oficiální zdroje

- [IBKR Web API v1](https://ibkrcampus.com/campus/ibkr-api-page/cpapi-v1/)
- [IBKR Account Management Web API](https://ibkrcampus.com/campus/ibkr-api-page/web-api-account-management/)
- [IBKR Flex Web Service](https://www.interactivebrokers.com/campus/ibkr-api-page/flex-web-service/)

## 2. Trading 212

### Stav

Trading 212 má oficiální `Public API`, ale je stále označené jako beta.

### Co je dostupné

- účty
- instrumenty
- pozice
- historické události
- objednávky

### Důležité limity

- API je dostupné jen pro `Invest` a `Stocks ISA`
- je v beta režimu
- multi-currency účty nejsou přes API plně podporované
- klíče se generují ručně v aplikaci

### Doporučení pro FIGR

- `Fáze 1`: import exportů z Trading 212
- `Fáze 2`: read-only API sync pro pozice, historii a dividendy
- `Fáze 3`: případně rozšířit i na order funkce, ale to pro FIGR není priorita

### Oficiální zdroje

- [Trading 212 Public API](https://docs.trading212.com/api)
- [Trading 212 API key](https://helpcentre.trading212.com/hc/en-us/articles/14584770928157-Trading-212-API-key)
- [Trading 212 export trading data](https://helpcentre.trading212.com/hc/en-us/articles/360016898917-Can-I-export-the-trading-data-from-my-account)

## 3. XTB

### Stav

XTB oficiální API už nenabízí.

### Důležité omezení

- podle oficiálního help centra bylo API vypnuto 14. března 2025

### Doporučení pro FIGR

- neplánovat API konektor
- stavět čistě na export/import workflow

### Oficiální zdroj

- [XTB: Do you offer API?](https://www.xtb.com/en/help-center/our-platforms/do-you-offer-api)

## 4. DEGIRO

### Stav

DEGIRO oficiálně API nenabízí.

### Důležité omezení

- oficiální help centrum přímo říká, že účet nejde připojit k jiné aplikaci přes API

### Doporučení pro FIGR

- neplánovat API konektor
- stavět čistě na export/import workflow

### Oficiální zdroj

- [DEGIRO: Does DEGIRO offer an API?](https://www.degiro.com/uk/helpdesk/trading-platform/does-degiro-offer-api)

## Doporučené pořadí implementace

1. `Trading 212` export import
2. `Interactive Brokers` Flex export / Flex Web Service
3. `Trading 212` read-only API sync
4. `Interactive Brokers` Web API sync
5. `XTB` a `DEGIRO` nechat pouze na exportních profilech

## Doporučený technický směr pro FIGR

- V jádru aplikace ponechat broker-neutral importní pipeline.
- Nad ní přidat `broker profily`, které určují:
  - typ zdroje
  - mapování sloupců
  - režim deduplikace
  - případnou autentizaci
- API sync řešit jen jako další typ zdroje, ne jako zvláštní paralelní architekturu.

To znamená:

- `broker_export` bude fungovat hned
- `manual_template` zůstane fallback
- `api_sync` se jen zasune do stejného importního workflow, batch historie a deduplikace
