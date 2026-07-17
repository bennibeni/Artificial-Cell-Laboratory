# Come integrare questa cartella nel tuo progetto Next.js

1. Copia il contenuto di `app/` dentro la cartella `app/` del tuo progetto
   (es. quello di Specimen), mantenendo la struttura:

   app/
       page.js
       App.jsx
       styles.css
       components/
       data/
       lib/

2. La pagina sarà disponibile su ``.

3. Se vuoi che sostituisca del tutto Specimen mantenendo lo stesso URL/brand:
   - Sposta il contenuto di `app/` direttamente dentro `app/` (root) invece
     che in una sottocartella, così la pagina risponde su `/` invece che su ``.
   - Aggiorna il titolo in `page.js` (campo `metadata.title`) e l'intestazione
     `<h1>` dentro `App.jsx` se vuoi mostrare "Specimen" invece di
     "Artificial Cell Laboratory".

4. Nessuna dipendenza aggiuntiva richiesta oltre a React e Next.js
   (verificato: nessun import esterno oltre a "react").

5. `docs/README.md` e `docs/spieghe.txt` sono solo documentazione di supporto,
   non vanno copiati dentro `app/`.
