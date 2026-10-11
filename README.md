# VYBEX / FogLabs — versione corretta per Cloudflare Pages + backend Node

Questa versione separa chiaramente **Accedi**, **Crea account** e **Sblocca VIP**. Il codice VIP ha un campo dedicato e viene verificato soltanto dal backend; email e password usano endpoint distinti.

## Requisiti

- Node.js 20 o superiore
- Un servizio backend Node.js (ad esempio Render)
- Un database PostgreSQL persistente in produzione
- Cloudflare Pages collegato al repository Git, con Pages Functions abilitate

## Avvio locale

1. Copia `.env.example` in `.env`.
2. In `.env`, imposta `NODE_ENV=development`, `PORT=3100` e `VIP_EMAIL_CODE` con un codice di prova scelto da te.
3. Esegui `npm install`, poi `npm start`.
4. Apri `http://localhost:3100/vybex`.

**Non caricare mai `.env` su GitHub.** `.gitignore` lo esclude già.

## Pubblicazione su GitHub e Render

1. Pubblica i file di questo progetto in un repository GitHub.
2. Crea un Web Service Render usando `render.yaml`.
3. Nelle variabili ambiente del servizio Render configura `VIP_EMAIL_CODE` con il codice VIP scelto. Configura `DATABASE_URL` collegandolo al database PostgreSQL del servizio.
4. Verifica `https://URL-DEL-BACKEND/health`: deve rispondere JSON con `ok: true` e `database: true`.

Il codice VIP non è scritto in `public/app.js`, `server.js`, nei README o nei file di esempio: resta un segreto del backend. Se cambi il codice, modifica la variabile su Render e ridistribuisci/riavvia il servizio.

## Pubblicazione su Cloudflare Pages

1. Collega a Cloudflare Pages lo stesso repository GitHub.
2. Imposta **Build command** su `npm run check` e **Build output directory** su `public`.
3. Mantieni `functions/_middleware.js` nella cartella `functions/` alla radice del repository e `public/_redirects` dentro `public/`.
4. In **Settings → Variables and Secrets**, imposta `BACKEND_URL` all'origine HTTPS del backend Render, ad esempio `https://nome-servizio.onrender.com`, senza slash o percorso finale. Configura la variabile per Production e per Preview se vuoi usare anche le anteprime.
5. Avvia una nuova distribuzione e controlla `https://TUO-DOMINIO/health`.

Il middleware inoltra `/api/*`, `/auth/*`, `/audio/*` e `/health` al backend; le pagine e gli altri asset statici restano su Cloudflare Pages. `VIP_EMAIL_CODE` va su Render, non su Cloudflare Pages e non nel frontend.

## Flussi di accesso

- **Accedi:** email + password tramite `POST /api/login`.
- **Crea account:** email + username + password + conferma tramite `POST /api/register`.
- **Sblocca VIP:** codice nel campo dedicato, inviato a `POST /api/vip/unlock`.
- **Diagnostica:** `GET /health` verifica backend e stato del database.

Le password vengono memorizzate con derivazione crittografica lato server. Le sessioni correnti sono mantenute in memoria dal backend e vengono invalidate quando il processo si riavvia; per una distribuzione con requisiti più elevati, sposta anche le sessioni su uno store condiviso e persistente.

## Controlli

- `npm run check` controlla la sintassi degli script e del middleware.
- `npm test` esegue test HTTP isolati per registrazione, login, password errata e codice VIP corretto/errato.
