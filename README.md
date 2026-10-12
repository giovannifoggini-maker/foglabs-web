# FogLabs / VYBEX — Community ospite 1.6.4

Questa versione mantiene l'ingresso ospite: non chiede email, password o codice VIP. Il Soundboard ha 15 suoni WAV inclusi nel sito e può essere usato anche se il backend non è raggiungibile.

## Funzioni disponibili

### Senza backend
- Ingresso ospite locale, Soundboard e deck DJ con 15 suoni WAV.
- Preferiti, coda, scene, Mini IA offline, creatore emoji/sticker e preferenze salvati nel browser.
- Radio online, se il browser raggiunge lo stream o il sito ufficiale dell'emittente.

### Con backend online
- **Chat pubbliche condivise:** gli ospiti possono creare chat e inviare messaggi. Il rendering usa testo semplice per evitare che messaggi HTML vengano eseguiti.
- **Sondaggi pubblici condivisi:** creazione, risultati e voti visibili agli altri ospiti; ciascuna sessione può cambiare il proprio voto.
- **Chiamate vocali WebRTC:** stanze temporanee fino a due partecipanti. Richiedono HTTPS, autorizzazione microfono, backend raggiungibile e una rete che consenta WebRTC. È configurato STUN, ma non un relay TURN: alcune reti/NAT/firewall possono impedire la chiamata.

Per la chat e i sondaggi serve PostgreSQL attivo per conservare i dati tra riavvii. I dati delle stanze vocali sono temporanei e vengono persi se il backend si riavvia. Usa un nickname pubblico e non condividere informazioni personali.

### Ancora disattivato in questa build
- Login, registrazione, password e VIP.
- Caricamento/modifica globale dei suoni da parte degli ospiti: il Soundboard resta in sola lettura per impedire agli utenti anonimi di modificare i contenuti condivisi.
- Moderazione avanzata e strumenti di amministrazione chat per utenti registrati.

## Struttura

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
│   └── sounds/       # 15 file WAV statici
├── data/
├── server.js
├── package.json
├── render.yaml
└── tests/
```

C'è una sola cartella `public`: non deve esistere `public/public`. `public/_routes.json` limita le Pages Functions ai percorsi API/auth/audio/health; `public/_redirects` non contiene vecchie riscritture. Non aggiungere regole di redirect verso URL `.html` senza testare la catena.

## Configurazione e pubblicazione

### 1. Render (backend)
1. Distribuisci `server.js` come servizio Node usando `render.yaml` (`npm install`, `npm start`).
2. Verifica che il servizio abbia PostgreSQL attivo e la variabile `DATABASE_URL` correttamente valorizzata.
3. Copia l'URL HTTPS pubblico del servizio Render. Apri `https://IL-TUO-BACKEND/health`: deve rispondere JSON con `ok: true` e `database: true`.

### 2. Cloudflare Pages (frontend)
- Repository: quello collegato al progetto `foglabs-web`.
- Branch di produzione: `main` (se è il ramo collegato).
- Root directory: vuota.
- Build command: `npm run check`.
- Build output directory: `public`.
- In **Settings → Variables and secrets**, crea `BACKEND_URL` con l'URL HTTPS effettivo di Render (non un URL `pages.dev`). Salva e pubblica di nuovo.

### 3. Test dopo la distribuzione
1. Apri l'URL dell'ultima distribuzione Cloudflare.
2. Entra in VYBEX come ospite.
3. Apri **Chat pubbliche** e crea una chat. Da una seconda finestra/dispositivo crea o usa un altro ospite e verifica che veda la stessa chat e i messaggi.
4. Crea un sondaggio e verifica che l'altro ospite possa votare.
5. Per la chiamata vocale, apri il sito in HTTPS su due dispositivi, autorizza il microfono, crea una stanza su uno e inserisci il codice sull'altro.

Se chat/sondaggi segnalano servizio non raggiungibile, controlla `BACKEND_URL`, `/health` e i log Render. Se `/health` risponde `database: false`, non considerare affidabili i dati condivisi a lungo termine.

## Test locali

Richiede Node.js 20 o superiore:

```bash
npm install
npm run check
npm test
npm start
```

I controlli locali verificano routing, accesso ospite, chat tra sessioni diverse, sondaggi condivisi, signaling vocale e assenza di segreti nel repository. Non sostituiscono il test del deployment online.
