# FogLabs / VYBEX — Guest-only routing fix 1.6.2

Questa build corregge la struttura multipagina di Cloudflare Pages e mette temporaneamente fuori uso l’accesso email/password/VIP, come richiesto, così l’accesso potrà essere ricostruito da zero più avanti.

## Correzioni incluse

- `public/index.html` è la home FogLabs; `public/vybex.html` è l’app VYBEX.
- Neutralizzate le regole di `public/_redirects` (file comment-only): le vecchie riscritture `200` verso file `.html` potevano entrare in conflitto con i clean URL automatici di Cloudflare Pages.
- Aggiunto `public/_routes.json` nella cartella di output corretta, con Pages Functions limitate a `/api/*`, `/auth/*`, `/audio/*` e `/health`.
- L’archivio contiene una sola cartella `public`; se nel repository GitHub è rimasta una vecchia `public/public`, va eliminata manualmente dopo aver verificato che contenga solo duplicati obsoleti.
- `/auth/guest` restituisce `200` JSON e imposta il cookie di sessione; non usa più un redirect HTTP.
- Rimossi dalla UI VYBEX i campi email/password/registrazione/VIP e rimosse le chiamate frontend di login/registrazione/VIP.
- Disabilitate lato backend le vecchie API di login, registrazione e VIP (`410 account_features_disabled`).
- Aggiunta una pagina `404.html` per evitare il fallback generico SPA su URL inesistenti.
- Il codice VIP non è presente in questo pacchetto; la variabile `VIP_EMAIL_CODE` è stata tolta dagli esempi e da `render.yaml`.

## Struttura da mantenere in GitHub

Estrai lo ZIP e carica **il contenuto interno direttamente nella radice del repository**, non la cartella che contiene tutto. Deve esserci una sola cartella `public` e `functions` deve restare a fianco di `public`:

```text
repository/
├── functions/
│   └── _middleware.js
├── public/
│   ├── index.html        # home FogLabs
│   ├── vybex.html        # app VYBEX
│   ├── _routes.json
│   ├── _headers
│   ├── app.js
│   └── ...
├── server.js
├── package.json
└── render.yaml
```

Non creare `public/public`.

## Cloudflare Pages

- Repository collegato: quello che pubblica `foglabs-web`.
- Production branch: `main` (se è il ramo usato dal progetto).
- Root directory: vuota.
- Build command: `npm run check`.
- Build output directory: `public`.
- `BACKEND_URL`: URL HTTPS del servizio Render; non deve essere un dominio `pages.dev`.
- Aspetta una nuova distribuzione `Success`, poi prova prima l’URL di anteprima.

`public/_routes.json` è già incluso nell’output `public`. Non aggiungere un altro `_routes.json` sotto `public/public`. Il file `public/_redirects` incluso contiene solo un commento e non attiva alcuna riscrittura.

## Render/backend

Il backend continua a gestire sessioni ospite, suoni predefiniti, radio/voice API e contenuti compatibili. L’endpoint `/auth/guest` non redirige più. Le route di account/VIP rispondono `410` e non sono disponibili in questa build. I vecchi record del database non vengono cancellati automaticamente.

Per avvio locale: Node.js 20+, `npm install`, `npm run check`, `npm test`, `npm start`. Se la produzione usa PostgreSQL, mantenere `DATABASE_URL` configurato come variabile segreta del servizio.

## Test svolti

- controllo sintassi di `server.js`, `app.js`, `nametag.js`, `randomizer.js` e middleware;
- controllo JSON di `_routes.json`;
- verifica che non esistano `public/public` e `_redirects` ricorsivi;
- smoke test su home, `/index.html`, `/foglabs`, `/vybex`, sessione ospite e route account disabilitate.

Questi test coprono il progetto locale. Il ciclo live `ERR_TOO_MANY_REDIRECTS` va confermato dopo aver pubblicato questa build sul progetto Cloudflare corretto; questo archivio non modifica direttamente gli account Cloudflare o GitHub.
