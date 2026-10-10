CHIAMATE VOCALI VIA INTERNET — GUIDA

Questa versione abilita server STUN pubblici nella configurazione WebRTC e mantiene il signaling sul server Node.js di VYBEX.

Per provarla da reti diverse:
1. Pubblica il progetto su un servizio Node.js raggiungibile via HTTPS (il file render.yaml è una configurazione iniziale per Render).
2. Attendi che il servizio sia avviato e apri il suo URL HTTPS pubblico.
3. Da due dispositivi/reti diverse, apri lo stesso URL e accedi alla sezione Chiamate Wi-Fi/voce.
4. Un dispositivo crea la stanza; l'altro inserisce il codice.
5. Consenti l'accesso al microfono.

IMPORTANTE:
- Il nome della sezione potrebbe ancora dire “Wi-Fi”, ma una volta ospitato online il server di segnalazione è raggiungibile via Internet.
- STUN aiuta i peer a trovare un percorso diretto, ma non garantisce la connessione su tutte le reti. Alcune reti/firewall richiedono un server TURN. Un TURN affidabile può non essere gratuito; non è configurato in questo ZIP.
- Il piano gratuito di un host può andare in sospensione e interrompere le chiamate.
- Il browser richiede HTTPS per il microfono su un sito remoto. Non usare localhost per chiamare qualcuno su Internet.
- Le chiamate non sono state testate qui tra due dispositivi/reti reali: verifica prima di considerarle operative.
- Non inserire segreti o password in file pubblici.
