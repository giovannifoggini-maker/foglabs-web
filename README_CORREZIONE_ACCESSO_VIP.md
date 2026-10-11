# Correzione accesso email e VIP

Questa versione risolve due problemi del flusso di accesso:

1. **Cloudflare Pages non esegue `server.js`**. La nuova funzione `functions/_middleware.js` inoltra `/api/*`, `/auth/*`, `/audio/*` e `/health` al backend specificato dalla variabile ambiente `BACKEND_URL`. Le risorse statiche continuano a essere servite da Pages.
2. **Accesso agli account esistenti**. Se l'email esiste, il server verifica la password e apre la sessione; username e conferma password servono soltanto per creare un nuovo account.

## Configurazione necessaria

- Pubblica il backend `server.js` su un host compatibile con Node.js e configura `DATABASE_URL` e `NODE_ENV=production`. Attenzione: il database Free previsto dal `render.yaml` scade dopo 30 giorni; per dati duraturi serve un database persistente ([documentazione Render](https://render.com/docs/free)).
- Imposta `VIP_EMAIL_CODE` come variabile segreta sul backend, usando il codice privato che hai scelto. Non inserirlo nei file pubblici o nel repository.
- Su Cloudflare Pages configura `BACKEND_URL` con l'origine HTTPS del backend, senza percorso finale.
- La directory Pages è `public`; `functions/` resta nella radice del repository e il build command può essere `exit 0`.

## Diagnostica rapida

- `GET /health` sul backend: verifica il servizio e la connessione database.
- `GET /health` sul dominio Pages: verifica che il proxy funzioni.
- `503 backend_unavailable`: manca `BACKEND_URL` o il backend non è configurato.
- `502 backend_unavailable`: Pages non riesce a raggiungere il backend.
- `403 wrong_password`: l'email esiste ma la password non coincide.
- `403 invalid_code`: il codice inserito non coincide con `VIP_EMAIL_CODE`.
- `503 vip_not_configured`: `VIP_EMAIL_CODE` è vuoto sul backend.

La build non contiene un sistema di verifica via email: l'email identifica l'account, ma non viene inviata una mail di conferma.
