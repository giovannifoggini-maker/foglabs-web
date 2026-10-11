# VYBEX — configurazione finale Cloudflare Pages

Questa versione include una Cloudflare Pages Function (`functions/_middleware.js`) che inoltra le API al backend Node.js configurato con `BACKEND_URL`.

La distribuzione completa richiede:

1. Repository GitHub con i contenuti di questa cartella nella root.
2. Backend Node.js attivo con `server.js`, PostgreSQL e il segreto `VIP_EMAIL_CODE` configurato sul server.
3. Progetto Cloudflare Pages collegato al repository, build command `exit 0`, output directory `public`.
4. Variabile `BACKEND_URL` in Cloudflare Pages impostata all'URL HTTPS del backend.

Segui `README_CLOUDFLARE.md` per i passaggi e `README_CORREZIONE_ACCESSO_VIP.md` per la diagnostica.

Nota: Cloudflare Pages serve il frontend ed esegue il proxy; non avvia da sola il server Node.js. Questa build usa l'email come identificativo, ma non include verifica email né recupero password.
