# Accesso e VIP — correzione diagnostica

Questa versione modifica i messaggi di errore di VYBEX: se le API account/VIP non sono raggiungibili dal sito Cloudflare Pages, l'interfaccia segnala che il backend non è collegato invece di far sembrare errate le credenziali.

**Importante:** questa correzione non rende attivi account e VIP da sola. Nel pacchetto è presente `server.js`, un server Node.js con dipendenza PostgreSQL; Cloudflare Pages statico non avvia automaticamente quel server. Per rendere operative le funzioni bisogna distribuire il backend su un runtime compatibile e collegare il frontend agli endpoint, quindi testare accesso e VIP.

Configurazione Pages per il frontend: root directory vuota se `public/` è nella root del repository; build command vuoto; build output directory `public`. Pubblicare la cartella `public` aggiornata. Non inserire password, token o codici segreti nel frontend o nel repository pubblico.
