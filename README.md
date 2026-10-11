# VYBEX — FogLabs

Sorgente del sito FogLabs/VYBEX. Stack: Node.js 20+, Pages Functions su Cloudflare Pages e backend Node.js su Render.

## Correzioni incluse

- Accesso account in un solo passaggio con email e password.
- Registrazione di un nuovo account guidata: username e conferma password vengono richiesti solo se l'email non è già registrata.
- Campo VIP separato dall'email; il browser invia il codice all'endpoint `/api/vip/unlock`.
- Verifica VIP esclusivamente sul backend, con confronto a tempo costante.
- Proxy Cloudflare Pages verso il backend tramite `functions/_middleware.js`.
- I file di documentazione duplicati sono stati rimossi; questa è la guida principale.

## Avvio locale

1. Installa Node.js 20 o successivo.
2. Copia `.env.example` in `.env` e imposta `VIP_EMAIL_CODE` al codice VIP che vuoi usare. Per il codice che hai scelto, inserisci il valore soltanto nel file `.env` locale. Non caricare mai `.env` su GitHub.
3. Esegui `npm install` e poi `npm start`.
4. Apri l'URL mostrato nel terminale e visita `/vybex`.
5. Verifica la sintassi con `npm run check`.

## Pubblicazione corretta: prima backend, poi frontend

### 1. GitHub

Carica la cartella `FOGLABS` nel repository. Il file `.gitignore` esclude `.env`, `.dev.vars` e i dati locali degli account. Non inserire credenziali o database esportati nel repository.

### 2. Backend su Render

Usa il `render.yaml` incluso per creare il servizio Node. In Render apri **foglabs-web → Environment** e imposta o aggiorna questa variabile con il valore esatto richiesto:

- `VIP_EMAIL_CODE` = il codice scelto, inserito esattamente senza spazi iniziali o finali

Se è già presente un valore precedente, sostituiscilo, salva le modifiche e fai un nuovo deploy. Il codice VIP non è hardcoded nel repository perché chiunque può leggerlo se il progetto GitHub è pubblico. Il backend deve avere anche `DATABASE_URL` configurato per conservare gli account in produzione.

Controlla prima che `https://IL-TUO-BACKEND/health` restituisca JSON con `ok: true`.

### 3. Cloudflare Pages

Collega lo stesso repository a Cloudflare Pages. Imposta la directory di output su `public` e un comando di build semplice come `exit 0` (il sito non richiede una build frontend). Nelle variabili di Pages configura:

- `BACKEND_URL` = URL HTTPS del servizio Render, senza slash finale.

La variabile VIP va nel backend Render, non in `public/` e non nel JavaScript client. Dopo il deploy, visita `/health` sul dominio Pages e prova l'accesso da `/vybex`.

## Login

- Account esistente: inserisci email e password e premi **Accedi / continua**.
- Nuovo account: inserisci email e password. Se l'email non è registrata, compaiono i campi per username e conferma password; completali e premi di nuovo il pulsante.
- VIP: inserisci il codice nel campo dedicato **Codice VIP** e premi **Sblocca VIP**.
- Ospite: continua senza email in modalità sola lettura.

## Note di sicurezza e persistenza

- `VIP_EMAIL_CODE` è un segreto di backend: non inserirlo in `public/app.js`, HTML, commit Git o screenshot condivisi.
- L'account email richiede una password; la registrazione impone almeno 8 caratteri.
- In produzione configura un database PostgreSQL persistente. Il database gratuito Render può avere limiti di durata/retention: verifica il piano prima di usarlo per dati importanti.
- Il pacchetto sorgente è stato controllato con i verificatori di sintassi JavaScript; dopo la pubblicazione, esegui anche i test sul dominio reale.
