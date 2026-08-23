# — Artificial Cell Laboratory

Copia l'intera cartella `app/` dentro la cartella `app` del progetto Next.js:

```text
app/
    page.js
    App.jsx
    styles.css
    components/
    data/
    lib/
```

**Importante — cartella `public/`:** il ritratto del fenotipo (tab
"Fenotipo") usa 64 ritagli fotografici in `public/avatars/` (uno per
ogni combinazione di sesso/pelle/capelli/occhi/vista/lattosio,
pre-tagliati dall'atlas condiviso con Cheat Stories/R22). Questa
cartella **non sta dentro `app/`**: va copiata a sé, come sorella di
`app/`, dentro la `public/` del progetto Next.js:

```text
public/
    avatars/
        chiara-marroni-F-lisci-normale-tollerante.png
        chiara-marroni-F-lisci-normale-intollerante.png
        ... (64 file in totale)
```

Se questa cartella manca, il ritratto in "Fenotipo" resta vuoto: si
vedono solo la cornice arrotondata della card e i due anelli decorativi
di sfondo, senza foto (le immagini rispondono 404).

La pagina sarà disponibile all'indirizzo:

```text
http://localhost:3000/
```

Non sono richieste dipendenze aggiuntive oltre a React e Next.js.
