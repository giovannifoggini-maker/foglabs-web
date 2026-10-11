# Pubblicazione gratuita — VYBEX

Questa build è predisposta per un deploy su un web service gratuito.

## Costi
Il progetto non contiene pagamenti, abbonamenti, Stripe, PayPal o paywall.

## Pubblicazione
1. Crea un repository GitHub e carica tutto il contenuto di questa cartella.
2. Su Render scegli di creare un nuovo Web Service dal repository.
3. Il file `render.yaml` imposta automaticamente il piano `free`, `npm install` e `node server.js`.
4. Render assegna un indirizzo web pubblico HTTPS.

## Limiti importanti della versione gratuita
Il servizio può andare in sospensione dopo 15 minuti senza traffico e può impiegare circa un minuto a ripartire.
Il filesystem locale non è permanente: gli audio caricati via sito possono andare persi dopo riavvio/redeploy.
Per questo questa build è adatta alla pubblicazione/test gratuito, non a uno storage permanente.

## Account
La versione TEST usa un account email + username + password. Le password sono salvate come hash scrypt. Per un deploy pubblico serve uno storage/database persistente; il filesystem locale gratuito non è sufficiente per garantire la persistenza degli account.

## Discord
La build pubblicabile qui è la versione TEST: la sezione Discord resta dentro l'app e la voce è simulata. Il collegamento OAuth2 Discord + bot vocale reale richiede le relative credenziali Discord e variabili d'ambiente, ma non richiede pagamenti.


## Contatore utenti
La pagina mostra un contatore iniziale di **768 utenti**.
Ogni nuovo accesso in modalità test aggiunge +1 e il numero viene restituito dal server tramite `/api/me` e `/api/stats`.

Nota: sul piano gratuito con filesystem/processo effimero, il contatore può ripartire dal valore iniziale dopo un redeploy o riavvio. Per conservarlo in modo permanente serve uno storage/database esterno.


## VIP senza pagamenti
Inserendo il codice configurato in `VIP_EMAIL_CODE` nel campo di accesso e premendo "Sblocca VIP" si attivano badge VIP, suono casuale, modalità FX e permessi di modifica/upload. Il codice resta soltanto nelle variabili ambiente del backend.
