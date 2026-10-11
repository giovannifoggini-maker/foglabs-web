# FOGLABS / VYBEX — Accesso ospite (v1.6.0)

Questa variante rimuove dall'interfaccia il flusso email, password, creazione account e VIP. Si entra tramite **Continua senza email**.

## Pubblicazione Cloudflare Pages
- Repository root: cartella che contiene `public/`, `functions/` e `package.json`.
- Build output directory: `public`
- Build command: `exit 0` (solo se il progetto non richiede una build)
- `functions/` deve restare nella root del progetto, non dentro `public/`.

Questa variante non elimina ancora gli endpoint account dal backend: sono semplicemente fuori dall'interfaccia e non vengono usati nel normale accesso ospite. Se vuoi ricreare in seguito l'autenticazione, sarà meglio riprogettarla separatamente.

Per le API server-side che rimangono attive, configura `BACKEND_URL` come secret/variable in Cloudflare Pages. Non inserire password o codici segreti nei file pubblici.
