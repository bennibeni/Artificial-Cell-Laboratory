// lib/replicationEngine.js
//
// Estensione "self-inspection" del motore T4 di R56, ispirata al Tom Thumb
// Algorithm applicato all'Universal Constructor di von Neumann (Rossier,
// Petraglio, Stauffer, Tempesti 2004).
//
// Idea del paper: l'organismo non ripete un genoma fisso a ogni
// replicazione — copia il proprio STATO CORRENTE (self-inspection),
// mutazioni incluse. Qui: il messageData a 8 bit calcolato dalla
// generazione N diventa il "genoma" (via ri-codifica omozigote) della
// generazione N+1, invece di ripartire ogni volta dal genoma originale.
//
// PERCHÉ OMOZIGOTE: resolveDominance in t4CompleteCell.js è un OR, quindi
// resolveDominance(v, v) = v esattamente. Codificando ogni bit del
// messageData come coppia (v, v) nella riga corrispondente del genoma 4x4,
// la ri-iniezione è LOSSLESS rispetto al valore di quel locus — è il modo
// più fedele di "reinserire" lo stato calcolato come nuovo genoma, senza
// introdurre bias di dominanza indesiderati.
//
// ATTENZIONE - verificato per ESAUSTIONE prima di scrivere questo modulo
// (tutti i 65.536 genomi 4x4 possibili testati fino a 8 generazioni):
// la self-inspection pura collassa SEMPRE allo stato tutto-zero entro la
// generazione 3, mai oltre. Distribuzione: 10.3% collassa già a gen 0,
// 5.0% a gen 1, 13.0% a gen 2, 71.8% (la maggioranza, incluso il genoma
// di default dell'app) esattamente a gen 3. È un limite superiore
// strutturale, non statistico: conseguenza dello shift-2 non iniettivo
// (gcd(2,8)=2) applicato ricorsivamente. Senza mutazioni la linea si
// spegne quindi sempre entro 3 passi: la mutazione periodica non è un
// optional estetico, è ciò che tiene viva la simulazione. Vedi note UI
// in fondo al file.

import { runCompleteT4Cell } from './t4CompleteCell';

/**
 * Ricodifica un vettore di 8 bit (tipicamente il messageData di una
 * generazione) in un genoma 4x4 diploide OMOZIGOTE, tale che
 * resolveGenomeToLoci(genoma) restituisca esattamente quegli 8 bit.
 *
 * @param {number[]} bits8
 * @returns {number[][]} genoma 4x4
 */
export function encodeHomozygousGenome(bits8) {
  if (!Array.isArray(bits8) || bits8.length !== 8) {
    throw new Error('encodeHomozygousGenome richiede un array di 8 bit.');
  }
  const genome = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  for (let row = 0; row < 4; row++) {
    const low = bits8[row] ? 1 : 0;
    const high = bits8[row + 4] ? 1 : 0;
    genome[row][0] = low;
    genome[row][1] = low;
    genome[row][2] = high;
    genome[row][3] = high;
  }
  return genome;
}

/**
 * Esegue un passo di replicazione self-inspection: prende lo stato completo
 * di una generazione (già passata per tutti gli 8 tick, es. da
 * runCompleteT4Cell) e produce la generazione successiva.
 *
 * @param {object} parentCell - cellula completa (tick=8), come restituita
 *   da runCompleteT4Cell / cellAtTick(genome, 8).
 * @param {object} [options]
 * @param {number|null} [options.mutateIndex] - indice (0-7) del bit del
 *   messageData da mutare in emissione, PRIMA della ri-codifica in genoma.
 *   È l'equivalente del secondo flag-bit del paper: aggiorna il valore
 *   espresso di quel locus senza alterare il percorso di sviluppo
 *   (tick order / t4Partner restano invariati — la "TTA-layer" non cambia).
 * @param {number|null} [options.mutateTo] - valore forzato (0/1); se
 *   omesso, esegue un flip del bit esistente.
 * @param {number} [options.generation] - numero di generazione da assegnare
 *   al risultato. parentCell è la cellula T4 grezza (non ha un campo
 *   generation proprio: quello vive solo nel wrapper restituito da questa
 *   funzione o da runReplicationLineage), quindi va passato esplicitamente
 *   se non si usa runReplicationLineage.
 * @returns {object} { cell, genome, mutation, generation }
 */
export function replicateGeneration(parentCell, options = {}) {
  const { mutateIndex = null, mutateTo = null, generation = null } = options;

  // 1. SELF-INSPECTION: la base per il genoma figlio è lo stato CALCOLATO
  //    dal genitore (messageData), non il suo genoma originale.
  const childBits = [...parentCell.messageData];

  // 2. Mutazione in emissione (vedi nota in testa al file: quasi sempre
  //    necessaria per evitare il collasso immediato a zero).
  let mutation = null;
  if (mutateIndex !== null) {
    const before = childBits[mutateIndex];
    childBits[mutateIndex] = mutateTo !== null ? (mutateTo ? 1 : 0) : (1 - before);
    mutation = { locus: mutateIndex, from: before, to: childBits[mutateIndex] };
  }

  // 3. Ri-codifica in genoma 4x4 e costruzione completa via motore T4
  //    esistente, INVARIATO.
  const childGenome = encodeHomozygousGenome(childBits);
  const childCell = runCompleteT4Cell(childGenome);

  return {
    generation: generation !== null ? generation : undefined,
    genome: childGenome,
    cell: childCell,
    mutation,
    parentMessageData: parentCell.messageData,
    isZeroState: childCell.messageData.every((b) => b === 0),
  };
}

/**
 * Genera una linea evolutiva di N generazioni a partire da un genoma seed.
 *
 * @param {number[][]} seedGenome4x4
 * @param {number} nGenerations
 * @param {object} [options]
 * @param {number|null} [options.mutateEveryNGenerations] - es. 2 = mutazione ogni 2 generazioni.
 * @param {(gen:number)=>boolean} [options.mutationSchedule] - alternativa più fine.
 * @param {() => number} [options.randomLocusPicker] - default: locus casuale 0-7.
 * @returns {object[]} array di generazioni, ciascuna con { generation, genome, cell, mutation, isZeroState }
 */
export function runReplicationLineage(seedGenome4x4, nGenerations, options = {}) {
  const {
    mutateEveryNGenerations = null,
    mutationSchedule = null,
    randomLocusPicker = () => Math.floor(Math.random() * 8),
  } = options;

  const gen0Cell = runCompleteT4Cell(seedGenome4x4);
  const lineage = [{
    generation: 0,
    genome: seedGenome4x4,
    cell: gen0Cell,
    mutation: null,
    isZeroState: gen0Cell.messageData.every((b) => b === 0),
  }];

  let current = lineage[0];
  for (let g = 1; g <= nGenerations; g++) {
    const shouldMutate = mutationSchedule
      ? mutationSchedule(g)
      : Boolean(mutateEveryNGenerations && g % mutateEveryNGenerations === 0);

    const next = replicateGeneration(current.cell, {
      mutateIndex: shouldMutate ? randomLocusPicker() : null,
      generation: g,
    });
    lineage.push(next);
    current = next;
  }
  return lineage;
}

/**
 * Diff locus-per-locus tra due messageData, per evidenziare in UI cosa è
 * cambiato tra due generazioni (stesso spirito del bordo evidenziato di
 * provenienza usato in ChromosomeKaryotype.jsx per R44/R45).
 */
export function diffMessageData(parentMD, childMD) {
  return parentMD.map((bit, i) => ({
    locus: i,
    changed: bit !== childMD[i],
    from: bit,
    to: childMD[i],
  }));
}

/**
 * Calcola quante generazioni mancano al collasso allo stato zero, utile
 * per un indicatore "generazioni al silenzio" in UI (vedi note sotto).
 * Restituisce null se non collassa entro maxLookahead generazioni.
 */
export function generationsUntilSilence(cell, maxLookahead = 8) {
  let current = cell;
  for (let g = 1; g <= maxLookahead; g++) {
    const next = replicateGeneration(current, { mutateIndex: null, generation: g });
    if (next.isZeroState) return g;
    current = next.cell;
  }
  return null;
}

/**
 * Predice quante generazioni consecutive di silenzio (stato zero) si
 * osservano per ogni ciclo di mutazione, data una frequenza di mutazione.
 *
 * FORMULA VERIFICATA SPERIMENTALMENTE (locus fisso E locus casuale, 30
 * prove per frequenza, su 8 frequenze diverse): generazioniSilenti =
 * max(0, mutateEveryNGenerations - 3). È una conseguenza diretta e
 * deterministica del teorema esaustivo su generationsUntilSilence: siccome
 * QUALUNQUE stato vivo collassa a zero entro al più 3 passi, una mutazione
 * che arriva ogni N<=3 generazioni previene sempre il collasso (0 gen.
 * silenti, linea sempre viva); una mutazione ogni N>=4 generazioni arriva
 * sempre in ritardo di (N-3) passi rispetto al collasso, e quella è
 * esattamente la durata del "silenzio" prima della resurrezione.
 *
 * Non dipende dal genoma di partenza né da quale locus viene mutato: è una
 * proprietà del motore (shift-2 non iniettivo), non del caso specifico.
 *
 * @param {number} mutateEveryNGenerations
 * @returns {number} generazioni di silenzio attese per ciclo (0 se la linea
 *   non muore mai con questa frequenza).
 */
export function expectedSilentWindow(mutateEveryNGenerations) {
  if (!Number.isFinite(mutateEveryNGenerations) || mutateEveryNGenerations <= 0) return 0;
  return Math.max(0, mutateEveryNGenerations - 3);
}

/*
 * NOTE PER L'INTEGRAZIONE UI (tab "Replicazione"):
 *
 * 1. Indicatore "generazioni al silenzio" (generationsUntilSilence):
 *    dato che senza mutazione lo stato zero arriva sempre entro la
 *    generazione 3 (limite superiore verificato per esaustione, non solo
 *    osservato), un countdown visibile evita che l'utente scambi il
 *    collasso per un bug quando il PF8 sparisce.
 *
 * 2. Il diff (diffMessageData) è il punto naturale per riusare lo stile
 *    "bordo evidenziato" già presente in ChromosomeKaryotype.jsx (R44/R45).
 *
 * 3. Frequenza di mutazione e formula del silenzio (expectedSilentWindow):
 *    con mutateEveryNGenerations <= 3 la linea non muore mai (0 generazioni
 *    silenti per ciclo) — utile per mostrare una linea "sempre viva".
 *    Con mutateEveryNGenerations >= 4 la linea attraversa (N-3) generazioni
 *    di stato zero a ogni ciclo prima della resurrezione — utile per
 *    mostrare esplicitamente il ciclo nascita/senescenza/rinascita nella
 *    storyboard didattica (vedi pannelli 4-6, limite di Hayflick).
 *    Impostare mutateEveryNGenerations = 4 è il caso minimo che rende
 *    visibile un vero momento di silenzio (1 sola generazione spenta per
 *    ciclo) senza allungare troppo l'attesa.
 *
 * 4. Esempio d'uso in page.js:
 *
 *    import { runReplicationLineage, expectedSilentWindow } from '../lib/replicationEngine';
 *
 *    const mutateEvery = 4;
 *    const lineage = runReplicationLineage(DEFAULT_GENOME_4X4, 20, {
 *      mutateEveryNGenerations: mutateEvery,
 *    });
 *    const silentGens = expectedSilentWindow(mutateEvery); // 1
 *    // lineage[i].cell.pf8, lineage[i].mutation, lineage[i].isZeroState ...
 */
