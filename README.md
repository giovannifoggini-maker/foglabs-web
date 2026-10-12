# FogLabs / VYBEX — modalità ospite locale 1.6.3

Questa build permette di entrare in VYBEX senza account, email, password, codice VIP o backend. Il pulsante **Entra come ospite** apre il Soundboard nella stessa pagina e carica 15 suoni dimostrativi serviti come file statici da `public/sounds/`.

## Funziona senza backend

- Accesso ospite locale; nessuna chiamata a `/auth/guest` o `/api/me` per avviare l'app.
- Soundboard e deck DJ con 15 suoni WAV statici.
- Preferiti, code, scene, sondaggi, mini IA offline, generatore emoji/sticker e preferenze salvati in `localStorage`.
- Radio online quando il browser ha accesso a Internet e la stazione consente lo streaming/incorporamento.
- Menu “Torna al menu” locale: non richiede logout server.

## Funzioni che richiedono il backend

Le chiamate vocali tra dispositivi richiedono che il backend Node su Render sia attivo e che `BACKEND_URL` in Cloudflare Pages punti all'URL HTTPS corretto. Chat pubblica, caricamento/modifica e funzioni account/VIP restano disabilitati in questa build ospite. L'accesso base e il Soundboard non dipendono più dal backend.

## Struttura corretta

```text
repository/
├── functions/
│   └── _middleware.js
├── public/
│   ├── _routes.json
│   ├── _redirects
│   ├── index.html
│   ├── foglabs.html
│   ├── vybex.html
│   ├── app.js
│   ├── styles.css
│   └── sounds/       # 15 file WAV serviti staticamente
├── data/             # dati del backend locale
├── server.js
├── package.json
└── render.yaml
```

Non creare `public/public`. Il file `public/_routes.json` include soltanto `/api`, `/api/*`, `/auth/*`, `/audio/*` e `/health`; il percorso statico `/sounds/*` non passa dalla Function proxy. `public/_redirects` è intenzionalmente comment-only per evitare riscritture obsolete.

## Pubblicazione Cloudflare Pages

- Repository: quello collegato al progetto `foglabs-web`.
- Branch di produzione: `main`.
- Root directory: vuota.
- Build command: `npm run check`.
- Build output: `public`.
- Il Soundboard ospite funziona senza `BACKEND_URL`; aggiungilo soltanto se vuoi attivare endpoint che richiedono il backend.

Estrai lo ZIP e copia **il contenuto** nella radice del repository, sovrascrivendo i file. Controlla ed elimina manualmente eventuali duplicati obsoleti in `public/public`, dopo averne verificato il contenuto. Fai commit/push e attendi `Success` su Cloudflare.

## Test locali

Con Node.js 20 o superiore:

```bash
npm install
npm run check
npm test
npm start
```

Questa build è stata controllata localmente. Le chiamate vocali e gli endpoint server non possono essere certificati senza verificare il deployment reale e il valore di `BACKEND_URL`.
