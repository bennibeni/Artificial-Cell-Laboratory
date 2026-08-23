# Nascita, senescenza, rinascita

### Una storia sulla replicazione cellulare, dal modello T4/PF8 di Artificial Cell Laboratory

*Sette pannelli sull'auto-ispezione replicativa, con un parallelo al limite di Hayflick e ai suoi limiti come analogia.*

---

## 1. Nascita

Una cellula nasce con un genoma completo. In una cellula umana, il DNA include anche i telomeri: sequenze ripetute non codificanti alle estremità dei cromosomi, che funzionano come il tappo di plastica in fondo a un laccio da scarpe — proteggono, non contengono istruzioni.

**Dato del modello**: genoma di default (matrice 4×4), generazione 0, MessageData `[1,0,1,0,0,0,0,0]`, codice PF8 `101000`.

---

## 2. Prima divisione

La cellula si replica per auto-ispezione: la figlia eredita ciò che la madre è *diventata* (il suo MessageData calcolato), non il genoma originale. Nel corpo umano, ogni divisione cellulare accorcia leggermente i telomeri — le DNA polimerasi non riescono a copiare fino in fondo l'estremità di un filamento lineare: è un limite meccanico della replicazione, non un errore.

**Dato del modello**: generazione 1, MessageData `[0,0,1,0,0,0,1,0]`, codice `001000`. Due bit cambiati rispetto alla generazione precedente.

---

## 3. Seconda divisione

L'informazione continua a impoverirsi, ma il fenotipo (PF8) sembra ancora vitale. Anche i telomeri accorciati non sono ancora abbastanza corti da attivare un allarme — la cellula biologica continua a dividersi normalmente, senza segni visibili del conto alla rovescia in corso.

**Dato del modello**: generazione 2, MessageData `[1,0,1,0,1,0,1,0]`, codice `101010`.

---

## 4. Senescenza

Il silenzio arriva sempre qui: verificato per esaustione su tutti i 65.536 genomi 4×4 possibili, mai oltre la generazione 3. È il **limite di Hayflick** del modello — un contatore fisso incorporato nella struttura stessa della regola di trasformazione (lo shift di 2 posizioni su un ciclo di 8, che non è iniettivo), non nel singolo genoma di partenza.

Nel corpo, quando i telomeri scendono sotto una soglia critica, la cellula rileva la cosa come un danno al DNA e blocca la divisione: **senescenza replicativa**. La cellula non muore, semplicemente smette di dividersi.

**Dato del modello**: generazione 3, MessageData `[0,0,0,0,0,0,0,0]` — stato completamente silente.

---

## 5. Il bivio (telomerasi)

Una singola mutazione al momento giusto basta a evitare l'estinzione della linea. Con una mutazione ogni 4 generazioni, la cellula resta silente per **esattamente 1 generazione**, poi rinasce — un risultato esatto, non approssimato: deriva direttamente dal fatto che qualunque stato vivo collassa entro al più 3 passi.

Nel corpo, l'enzima **telomerasi** può ricostruire i telomeri e resettare il contatore — è attivo nelle cellule staminali (che devono rifornire i tessuti per tutta la vita) ma silenziato nella maggior parte delle cellule somatiche adulte. Non a caso: dare a *ogni* cellula la capacità di dividersi all'infinito sarebbe pericoloso.

**Dato del modello**: generazione 4, mutazione sul locus 3 (0→1), MessageData `[0,1,0,1,0,0,0,0]` — la linea riprende vita.

---

## 6. Equilibrio, non progresso

La mutazione salva la linea dall'estinzione, ma non garantisce novità: produce un'orbita ripetitiva di 4 generazioni (3 vive + 1 silente), non una vera deriva evolutiva. È un'eco imperfetta ma reale di un fatto inquietante: la telomerasi è **riattivata nella maggior parte delle cellule tumorali**. La linea HeLa, coltivata ininterrottamente dal 1951, discende da cellule che hanno riacceso questo meccanismo — non "guarendo" la cellula, ma rendendola capace di proliferare senza limite.

**Dato del modello**: il ciclo si ripete identico a ogni successiva mutazione (generazioni 4-7, poi 8-11, ecc.) — mutazione, due generazioni vive, una silente, mutazione di nuovo.

---

## 7. Dove l'analogia si rompe

Due avvertenze oneste.

**Primo**: il collasso nel modello è un fatto **matematico** — la trasformazione XOR con scarto di 2 posizioni non è iniettiva su un ciclo di 8 elementi, dimostrabile in poche righe di algebra. Quello di Hayflick è un fatto **biochimico** — la lunghezza fisica del DNA telomerico. Sono meccanismi del tutto diversi che producono un declino a soglia fissa per ragioni non correlate; l'analogia riguarda il *pattern* (un limite deterministico di generazioni), non il *meccanismo*.

**Secondo**: lo stato zero nel modello è un vicolo cieco innocuo, non una salvaguardia. Nella biologia reale, il limite di Hayflick è considerato un **meccanismo anti-tumorale**: fermare una linea cellulare dopo un numero finito di cicli limita quanto danno accumulato (mutazioni, errori di copia) può diffondersi nell'organismo. Il modello non ha nulla di equivalente a questa funzione protettiva — il suo silenzio non protegge niente, è solo la conseguenza di una regola algebrica.

---

## Nota sul modello sottostante

Il motore descritto (T4/PF8) è parte del progetto "Artificial Cell Laboratory": un genoma diploide 4×4 viene risolto per dominanza mendeliana (OR logico) in 8 loci, trasformati tramite una regola XOR ciclica ispirata al Tom Thumb Algorithm applicato all'Universal Constructor di von Neumann (Rossier, Petraglio, Stauffer, Tempesti — *Tom Thumb Algorithm and von Neumann Universal Constructor*, 2004). La replicazione per auto-ispezione qui descritta usa il MessageData calcolato di ogni generazione come genoma (ricodificato in forma omozigote) della generazione successiva, anziché ripartire ogni volta dal genoma originale — è questo principio, applicato al motore T4, a produrre il comportamento "nascita → collasso → rinascita" raccontato sopra.

---

Se vuoi approfondire clicca su [https://artificial-cell-laboratory.vercel.app/](https://artificial-cell-laboratory.vercel.app/)
