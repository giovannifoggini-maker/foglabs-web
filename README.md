# VYBEX

VYBEX è una piattaforma locale di test per audio, DJ, radio e funzioni community.

## Avvio

1. Installa Node.js se non lo hai già.
2. Avvia `start.bat` oppure esegui `node server.js`.
3. Il browser apre prima la home dell’ecosistema FogLabs (`/foglabs`). Se la porta 3100 è occupata, il server prova automaticamente le porte successive fino alla 3110: usa l’indirizzo esatto stampato nella console. VYBEX si apre scegliendo la relativa scheda, oppure da `/vybex`.

Non è necessario pubblicare il sito online.

## Account e salvataggio

- Guest: solo ascolto.
- Account email + username + password + conferma password: modifica e upload.
- Gli upload vengono salvati nella cartella `data` e associati all'account.
- Preferiti, scene, coda e preferenze vengono salvati server-side nel profilo.
- Uscendo e rientrando con lo stesso account, i dati vengono recuperati.
- Le sessioni di login sono temporanee e vengono ricreate dopo un riavvio del server: l'account e i dati salvati restano.

## Discord reale

La funzione Discord usa un vero Discord Webhook: il file audio viene inviato come allegato nel canale configurato.

Nel pannello `Studio` puoi salvare o scollegare il webhook. Il webhook non viene inserito nel JavaScript del browser; resta nel profilo locale del server.

Per motivi di sicurezza non condividere il webhook con altre persone: chi possiede quell'URL può usarlo per pubblicare nel canale associato.

Nota: questa funzione è condivisione di file tramite Webhook, non è ancora un bot che entra automaticamente in un canale vocale. Il vecchio pulsante vocale finto è stato rimosso per non mostrare una funzione non realmente collegata a Discord.

## Limite upload

Gli upload sono limitati a 25 MB per file nella build di test.


## Collegamento account Discord (OAuth2)
Per sincronizzare il tuo account Discord, copia `.env.example` in `.env` e inserisci `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET` dell'app Discord. Nel Developer Portal aggiungi `http://localhost:3100/api/discord/oauth/callback` tra i Redirect URI OAuth2. VYBEX usa gli scope `identify` e `guilds` per mostrare l'account e i server a cui hai accesso. Non usare self-bot: Discord vieta l'automazione di normali account utente.


## Accesso Discord

La funzione **Accedi con Discord** usa il normale OAuth2 ufficiale di Discord: non inserire password Discord, token o Client Secret nell'interfaccia di VYBEX.

Per il primo utilizzo il proprietario dell'app deve configurare una Discord Application e il redirect OAuth2 sul server. Dopo questa configurazione, l'utente vede soltanto **Accedi con Discord**, autorizza nella pagina ufficiale Discord e torna a VYBEX.

L'app può sincronizzare l'identità e l'elenco dei server autorizzati dall'account. Per leggere/scrivere nei canali di un server è inoltre necessario che un bot autorizzato sia presente nel server: l'accesso OAuth dell'utente da solo non concede accesso ai messaggi dei canali.


## 🧰 100 nuove funzioni

La build include un pannello **🧰 100 Funzioni** organizzato in sei sezioni:

- 🧠 Intelligenza e automazioni — 15
- 🎨 Personalizzazione — 15
- 📊 Statistiche — 10
- 🗂️ Gestione libreria — 10
- 🎤 Effetti — 10
- 🚀 Funzioni extra — 40

Le preferenze del pannello vengono salvate nel browser. Sono collegati concretamente, tra gli altri, export/import JSON, statistiche locali, notifiche browser, fullscreen, importazione di cartelle, backup, ricerca, panic button, scene automatiche, timer e temi. Alcune funzioni dipendono dalle API disponibili nel browser (per esempio notifiche e fullscreen); il web non può forzare funzioni di sistema come “sempre in primo piano”.

## Aggiornamento: Sticker & Emoji Maker
La build include un maker locale per creare PNG di sticker ed emoji direttamente dal browser. Supporta testo, emoji, sfondo, colori, bordo e rotazione. Il file viene generato localmente e scaricato come PNG.

Sono inoltre stati collegati diversi controlli che prima erano solo interruttori visivi: layout compatto/lista/griglia, card trasparenti, modalità presentazione/streaming/silenziosa/gaming e sfondo animato.


## Chiamate vocali sulla rete Wi-Fi
Avvia il server sul PC host. La porta predefinita è 3100; se è occupata, VYBEX prova automaticamente le porte successive fino alla 3110. Leggi la porta effettiva nella console e usa `http://IP-DEL-PC:PORTA`, sostituendo `PORTA` con quel numero; poi apri Chiamate Wi-Fi e usa lo stesso codice stanza. Il browser deve consentire l’accesso al microfono: normalmente getUserMedia richiede HTTPS o localhost; per altri dispositivi usa HTTPS locale configurato oppure un browser di sviluppo. La segnalazione resta sul server locale e WebRTC invia l’audio direttamente tra dispositivi. La configurazione ICE è limitata alla rete locale (nessun server TURN/STUN esterno).


Chiamate via Internet: consulta README_CHIAMATE_INTERNET.md. La connessione da reti diverse richiede hosting HTTPS e può richiedere un server TURN.


## Anteprima iniziale
All'apertura, VYBEX mostra una pagina di anteprima con le funzioni principali. Il pulsante **Entra in VYBEX** apre poi la schermata email/accesso; **Torna all'anteprima** permette di tornare indietro.

## Menu FogLabs
La barra superiore include due voci: **Su di noi · FogLabs**, con una breve presentazione del progetto, e **Altri modelli**, dove sono elencati VYBEX e il FogLabs Randomizer web, seguiti da schede segnaposto per i prossimi progetti. Il menu supporta italiano e inglese e si apre anche nella schermata di anteprima.
## FogLabs Randomizer (web)

Apri il Randomizer dall’area **Altri modelli** oppure direttamente su `http://localhost:3100/randomizer`. È una pagina web integrata nello stesso server VYBEX (non richiede uno script PowerShell): digita un testo, genera un codice casuale della stessa lunghezza fino a 15 caratteri e copialo negli appunti. La generazione avviene nel browser e non invia il testo a un servizio esterno.

## FogLabs e AI Nametag Creator

All'avvio il browser apre prima la home dell'ecosistema FogLabs (`/foglabs`); VYBEX si apre solo dopo aver scelto il relativo progetto (`/vybex`). Il nuovo AI Nametag Creator è disponibile in `/nametag`: funziona nel browser senza API, con configurazione, generazione, copia, preferiti e cronologia salvati localmente.


## MineWiki Cubiomes

La home FogLabs (`/foglabs`) include ora la scheda **MineWiki Cubiomes**, con pagina dedicata su `/minewiki` e download dell'eseguibile Windows in `/downloads/MineWiki_Cubiomes.exe`. Il launcher BAT originale non è necessario: il download è il programma `.exe` vero e proprio.

**Limite importante:** è stato fornito solo un eseguibile Windows compilato, non il sorgente dell'app. Il sito può ospitare la pagina di progetto e distribuire l'EXE, ma non può eseguire direttamente una finestra Windows dentro il browser. Per una versione web completa serve il codice sorgente o una reimplementazione delle funzioni.


## Logo FogLabs

Il simbolo immagine fornito è integrato nell’header della home FogLabs e nelle intestazioni delle pagine Randomizer, AI Nametag Creator e MineWiki. Le pagine VYBEX continuano a usare il logo specifico VYBEX. La home si apre all’avvio; MineWiki resta un’app Windows scaricabile, non eseguibile dentro il browser.


## Pubblicazione online

Per pubblicare una beta pubblica, consulta **README_DEPLOY.md**. Il pacchetto include un Render Blueprint, PostgreSQL per lo stato degli account/chat/libreria e il codice VIP configurato da variabile d'ambiente. Prima di un lancio commerciale occorre completare verifica email, privacy, moderazione, test multi-dispositivo e configurazione TURN per chiamate affidabili.
