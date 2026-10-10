# FOGLABS — pubblicazione web beta

Questo progetto è un ecosistema web Node.js con home FogLabs, VYBEX, Nametag Creator, Randomizer e pagina MineWiki.

## Pubblicazione tramite Render Blueprint

1. Crea un repository **privato** GitHub chiamato `foglabs-web`.
2. Carica **i contenuti di questa cartella** alla radice del repository (così `server.js`, `package.json` e `render.yaml` sono alla radice). Non caricare mai `.env`, `node_modules`, credenziali o backup dei dati utenti.
3. In Render scegli `New` → `Blueprint` e collega il repository. Render leggerà `render.yaml` e proporrà il servizio web e il database.
4. Durante la configurazione aggiungi `VIP_EMAIL_CODE` nelle variabili d'ambiente del servizio: scegli un codice privato. Non inserire il codice nel JavaScript o nei file del repository. Tutti coloro che conoscono il codice configurato potranno ottenere l'account VIP condiviso `gio`, quindi non usare un codice che intendi mantenere riservato tra pochissime persone se verrà diffuso.
5. Avvia il deploy. Il servizio deve risultare `Live`; controlla `https://IL-TUO-SERVIZIO.onrender.com/health`. La home pubblica è `/` o `/foglabs`, VYBEX `/vybex`, Nametag Creator `/nametag`, Randomizer `/randomizer`, MineWiki `/minewiki`.

## Limiti del piano gratuito

Il Blueprint usa servizi gratuiti per una beta. Render può sospendere il web service dopo 15 minuti inattivo; la prima richiesta successiva può richiedere circa un minuto. La documentazione Render indica che il filesystem di un servizio gratuito è effimero e che un database PostgreSQL gratuito Render scade dopo 30 giorni. Pertanto questo è un **ambiente di prova pubblicabile**, non un archivio garantito a lungo termine: prima di raccogliere dati importanti o aprire le chat al pubblico, configura un datastore con durata e backup adatti o un piano che lo garantisca.

## Sicurezza e funzioni

- `.env` non è incluso e viene escluso da `.gitignore`. `.env.example` contiene solo nomi di variabili e valori vuoti.
- Il codice VIP viene letto dal server da `VIP_EMAIL_CODE`; non è più scritto in `public/app.js`. Non pubblicare il codice.
- Password salvate come hash `scrypt`; cookie di sessione `HttpOnly`, `SameSite=Lax` e `Secure` in produzione. Le sessioni attive si azzerano quando il processo riparte, quindi l'utente potrebbe dover accedere di nuovo.
- Account, chat e configurazioni audio sono salvati in PostgreSQL quando `DATABASE_URL` è impostato. I file audio caricati sono salvati nella tabella `foglabs_assets`.
- L'indirizzo email è usato come identificativo dell'account ma in questa build **non viene verificato via email**. Non usare account di altre persone e aggiungi verifica email, informativa privacy e moderazione prima del lancio aperto al pubblico.
- Il VIP via codice è un account condiviso, non un sistema di abbonamento individuale. L'acquisto Premium da 2 €/mese non è collegato ai pagamenti in questa build.
- Le chiamate WebRTC possono non collegarsi da tutte le reti senza un server TURN. Lo scambio di segnalazione è in memoria: riavvii interrompono le stanze attive.
- Le votazioni dei sondaggi sono locali al browser, non sincronizzate tra gli utenti.
- Discord OAuth resta disattivato finché non configuri `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` e un redirect HTTPS esatto nel Developer Portal.
- MineWiki è distribuito come eseguibile Windows; non viene eseguito nel browser.

## Sviluppo locale

1. Installa Node.js 20+.
2. Copia `.env.example` in `.env` e, se vuoi testare il VIP, imposta `VIP_EMAIL_CODE` in `.env`. Non caricare `.env` su GitHub.
3. Esegui `npm install` e `npm start` oppure `start.bat`. Senza `DATABASE_URL`, lo sviluppo locale usa i file JSON in `data/`.
4. Apri `http://localhost:3100/foglabs` (la porta locale può cambiare se 3100 è occupata).

## Checklist prima di considerarlo lancio pubblico

- [ ] Configura un database non effimero con backup e controlla la policy di conservazione.
- [ ] Scegli un codice VIP privato e impostalo solo nelle variabili d'ambiente.
- [ ] Aggiungi verifica email, privacy policy, termini d'uso, moderazione e recupero account.
- [ ] Esegui test da due browser/dispositivi e verifica i caricamenti, le chat e le chiamate fuori dalla LAN.
- [ ] Configura TURN se necessario per le chiamate da reti diverse.
- [ ] Non attivare pagamenti Premium finché la verifica abbonamento server-side non è implementata e testata.
