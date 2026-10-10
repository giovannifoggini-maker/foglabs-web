# Pubblicare FogLabs (beta pubblica)

Questa cartella contiene l'applicazione Node.js: FogLabs, VYBEX, AI Nametag Creator, Randomizer e la pagina/download MineWiki.

## Prima di caricare su GitHub

1. Crea un repository **Private** chiamato `foglabs-web` su GitHub.
2. Estrai questo ZIP sul PC.
3. In GitHub apri il repository e usa **Code → Add file → Upload files**.
4. Carica i **contenuti dentro la cartella `FOGLABS`** (server.js, package.json, render.yaml e cartelle), in modo che `server.js`, `package.json` e `render.yaml` siano nella root del repository. Non caricare la cartella `FOGLABS` come livello aggiuntivo.
5. Commit changes. La sorgente può rimanere privata mentre il sito distribuito è pubblico.

## Deploy su Render usando render.yaml

1. Apri https://render.com/ e accedi con GitHub.
2. Nel dashboard scegli **New → Blueprint**.
3. Collega `foglabs-web` e lascia che Render legga `render.yaml`.
4. Il Blueprint crea un Web Service Node.js e un database PostgreSQL. Quando viene richiesto il segreto `VIP_EMAIL_CODE`, inserisci il codice che hai scelto per il VIP. Per mantenere il comportamento di test attuale puoi usare `ciaosonomariowahuu`; dato che chi lo conosce può entrare nel medesimo account condiviso `gio`, prima di aprire il sito a tutti è più sicuro sceglierne uno nuovo e non pubblicarlo.
5. Avvia il deploy e attendi lo stato **Live**.
6. Verifica `https://NOME-SERVIZIO.onrender.com/health`. La home FogLabs si apre in `/` o `/foglabs`; gli altri percorsi sono `/vybex`, `/nametag`, `/randomizer` e `/minewiki`.

## Variabili ambiente

Render imposta `NODE_ENV=production` e `DATABASE_URL` dal Blueprint. Imposta anche `VIP_EMAIL_CODE` nella sezione Environment del servizio. Discord OAuth rimane disattivato finché non inserisci, solo nelle variabili ambiente, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` e `DISCORD_REDIRECT_URI` HTTPS esatto, registrato nel portale Discord.

Non caricare mai `.env` con segreti. Questo pacchetto non contiene un file `.env`; `.env.example` contiene soltanto valori dimostrativi vuoti. `.gitignore` esclude `.env` e i JSON runtime.

## Limiti importanti del piano gratuito

Questa è una build per beta pubblica/test, non un lancio commerciale senza ulteriori verifiche:

- Il Web Service gratuito Render può sospendersi dopo 15 minuti senza traffico e può impiegare circa un minuto a riattivarsi.
- Il PostgreSQL gratuito Render scade dopo 30 giorni; organizza un piano di backup/migrazione oppure usa un database che garantisca conservazione prima di raccogliere dati importanti.
- Il codice VIP è un codice condiviso, non abbonamenti individuali. Chi conosce il codice accede allo stesso account `gio` con privilegi VIP.
- Le email non sono verificate e non c'è recupero password. Prima di un lancio aperto servono verifica email, informativa privacy, termini, moderazione e un processo di recupero account.
- Le chiamate vocali possono richiedere un server TURN su alcune reti; la segnalazione delle stanze è in memoria e le stanze si interrompono al riavvio.
- I sondaggi sono locali al browser e non sincronizzati tra utenti.
- Premium a 2 €/mese non è collegato a un sistema di pagamento in questa build; non attivare incassi finché il controllo abbonamento server-side non è implementato e testato.
- MineWiki è un eseguibile Windows scaricabile, non un programma eseguibile direttamente nel browser.

## Test locale

Serve Node.js 20 o superiore. Da questa cartella esegui `npm install` e poi `npm start`, oppure `start.bat` su Windows. Per provare localmente il VIP copia `.env.example` in `.env` e imposta `VIP_EMAIL_CODE`; non caricare `.env` su GitHub.
