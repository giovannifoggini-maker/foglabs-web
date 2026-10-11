# VYBEX / FogLabs — GitHub + Cloudflare Pages

Questo progetto usa **Cloudflare Pages per il frontend** e una funzione Pages (`functions/_middleware.js`) per inoltrare le API verso il **backend Node.js**. Il backend continua a usare `server.js` e PostgreSQL: Pages non esegue automaticamente questo server Node.

## Architettura

- GitHub: sorgente del progetto.
- Backend Node.js: pubblica `server.js`, `package.json` e `render.yaml` su un host Node.js compatibile. Il blueprint incluso è per Render.
- Cloudflare Pages: pubblica `public/` e applica il proxy alle richieste `/api/*`, `/auth/*`, `/audio/*` e `/health`.
- Browser: usa sempre URL relativi (`/api/...`), quindi cookie di sessione e richieste restano sul dominio Cloudflare.

## Pubblicazione

1. Crea un repository GitHub e carica **il contenuto di questa cartella alla radice** del repository. Non caricare `.env`, `.dev.vars`, database, credenziali o dati runtime.
2. Distribuisci il backend Node usando `render.yaml` oppure un host Node.js equivalente. Configura `DATABASE_URL` e `NODE_ENV=production`.
3. **Persistenza:** il `render.yaml` incluso crea una PostgreSQL del piano gratuito, utile solo per test. Secondo la documentazione Render, i database Free scadono dopo 30 giorni; prima di usarlo per account reali, passa a un database persistente oppure collega un PostgreSQL con conservazione e backup adeguati ([limiti del piano gratuito](https://render.com/docs/free)).
4. Nelle variabili ambiente/segreti del backend, imposta `VIP_EMAIL_CODE` al codice privato desiderato. Il valore non va aggiunto a `server.js`, `public/app.js`, README o GitHub. Configura anche `DISCORD_REDIRECT_URI` solo se abiliti Discord OAuth.
5. Nel dashboard Cloudflare crea un progetto Pages collegato al repository GitHub, branch `main`.
6. Impostazioni Pages: **Root directory** vuota (se i file sono alla radice), **Build command** `exit 0`, **Build output directory** `public`. La cartella `functions/` deve rimanere alla radice del repository, non dentro `public/`.
7. In **Settings → Variables and Secrets**, crea la variabile `BACKEND_URL` con l'URL HTTPS pubblico del backend Node, ad esempio `https://nome-servizio.onrender.com` (senza percorso finale). Impostala sia per Production sia per Preview se vuoi usare le anteprime.
8. Avvia un nuovo deploy Pages dopo aver configurato la variabile.

Per provare localmente il proxy Pages, avvia prima `npm start`, copia `.dev.vars.example` in `.dev.vars` e poi esegui `npx wrangler pages dev public`. Non caricare `.dev.vars` su GitHub.

## Verifica

- Apri `https://IL-TUO-BACKEND/health`: deve rispondere `ok: true`; `database: true` indica una connessione PostgreSQL.
- Apri `https://IL-TUO-SITO-PAGES/health`: Pages deve inoltrare al backend e mostrare lo stesso risultato.
- Apri `/vybex`, crea un account con email, username, password e conferma. Per un account esistente bastano email e password; username e conferma sono richiesti solo alla registrazione.
- Prova il codice VIP nel campo di accesso e premi **Sblocca VIP**. Il codice è confrontato solo lato server tramite `VIP_EMAIL_CODE`.
- Controlla in DevTools → Network che `/api/account`, `/api/vip/unlock` e `/api/me` rispondano senza 404/502 e che il browser conservi il cookie `dsb_session`.

## Limiti da conoscere

- Il codice VIP è un codice condiviso che abilita l'account VIP comune `gio`, non un abbonamento individuale.
- La schermata usa l'email come identificativo account, ma questa build **non invia email di verifica** e non offre recupero password.
- Il backend conserva le sessioni in memoria: un riavvio richiede agli utenti di accedere di nuovo. I dati degli account devono avere un database persistente e backup.
- Il proxy Pages non sostituisce il backend: se `BACKEND_URL` non è configurato o il server Node è inattivo, login e VIP restituiscono un errore esplicito invece di sembrare credenziali errate.
- Prima di un lancio pubblico, aggiungi verifica email, recupero account, privacy policy, termini, protezioni anti-abuso e test con più browser.
