# FOGLABS — pacchetto finale per Cloudflare Pages

Questa cartella è pronta per pubblicare **il frontend statico** di FogLabs su Cloudflare Pages. Include le pagine, gli stili, gli script e i file multimediali presenti in `public/`, oltre alle regole di percorso.

## Configurazione Cloudflare Pages
- Repository GitHub: `foglabs-web`
- Branch: `main`
- Framework preset: `None`
- Build command: lasciare vuoto
- Build output directory: `public`
- Variabili/segreti: non inserirli nel frontend.

Dopo aver caricato i file nel repository: Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git → scegli `foglabs-web` e `main` → configura i campi sopra → Save and Deploy.

## Importante: cosa è e cosa non è pronto
Questo pacchetto pubblica le pagine statiche. **Non equivale alla migrazione del backend Node.js**: login/account, VIP, chat pubbliche, voce e OAuth Discord non diventano automaticamente operativi su Cloudflare Pages. Queste API richiedono una migrazione e test separati su servizi Cloudflare compatibili. Non considerare funzionanti online le funzioni che dipendono dal server finché non sono state migrate e verificate.

Il sito usa il testo “sistema”/“progetti” evitando di descrivere tutto come “ecosistema”. Il file `public/_redirects` contiene gli alias di percorso statici.
