"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import db from "./data/pf8-database.json";
import {
  DEFAULT_GENOME_4X4,
  GENETIC_REGIONS,
  locusDescriptor,
  cellAtTick,
  cloneMatrix,
  runCompleteT4Cell,
} from "./lib/t4CompleteCell.js";
import { buildPF8Profile, phenotypeDescriptor } from "./lib/pf8.js";
import PhenotypeAvatar from "./components/PhenotypeAvatar.jsx";
import {
  BIOLOGY_GLOSSARY_ALIASES,
  BIOLOGY_GLOSSARY_BY_ALIAS,
  MODEL_GLOSSARY_ALIASES,
  MODEL_GLOSSARY_BY_ALIAS,
} from "./lib/biologyGlossary.js";
import { runReplicationLineage, expectedSilentWindow } from "./lib/replicationEngine.js";

const tabs = [
  "Simulatore",
  "Genoma",
  "Mendel",
  "TTE-T4",
  "Memoria",
  "PF8",
  "Fenotipo",
  "Ispezione",
  "Statistiche",
  "Replicazione",
];

const fmt = new Intl.NumberFormat("it-IT");
const pct = new Intl.NumberFormat("it-IT", {
  style: "percent",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});


const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const glossaryAliases = [...MODEL_GLOSSARY_ALIASES, ...BIOLOGY_GLOSSARY_ALIASES].sort(
  (a, b) => b.length - a.length,
);

const glossaryTermPattern = new RegExp(
  `(?<![\\p{L}\\p{N}_])(${glossaryAliases.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}_])`,
  "giu",
);

function BiologyTerm({ children, entry }) {
  return (
    <span className="biology-term" tabIndex={0} aria-label={`${children}: ${entry.definition}`}>
      {children}
      <span className="biology-tooltip" role="tooltip">
        <b>{entry.term}</b>
        <span>{entry.definition}</span>
      </span>
    </span>
  );
}

function ModelTerm({ children, entry }) {
  return (
    <span
      className="model-term"
      tabIndex={0}
      aria-label={`${children}. Termine del modello: ${entry.definition}. Analogia biologica: ${entry.analogy}`}
    >
      {children}
      <span className="model-tooltip" role="tooltip">
        <b>{entry.term}</b>
        <span className="tooltip-kind">Termine del modello</span>
        <span>{entry.definition}</span>
        <span className="tooltip-analogy"><strong>Analogia biologica:</strong> {entry.analogy}</span>
      </span>
    </span>
  );
}

function annotateGlossaryText(value, keyPrefix = "glossary") {
  if (typeof value !== "string") return value;

  const parts = value.split(glossaryTermPattern);
  return parts.map((part, index) => {
    const key = part.toLocaleLowerCase("it-IT");
    const modelEntry = MODEL_GLOSSARY_BY_ALIAS.get(key);
    if (modelEntry) {
      return (
        <ModelTerm key={`${keyPrefix}-model-${index}`} entry={modelEntry}>
          {part}
        </ModelTerm>
      );
    }

    const biologyEntry = BIOLOGY_GLOSSARY_BY_ALIAS.get(key);
    return biologyEntry ? (
      <BiologyTerm key={`${keyPrefix}-biology-${index}`} entry={biologyEntry}>
        {part}
      </BiologyTerm>
    ) : (
      part
    );
  });
}

function GlossaryContent({ children }) {
  const renderNode = (node, path = "node") => {
    if (typeof node === "string") return annotateGlossaryText(node, path);
    if (!isValidElement(node)) return node;
    if (node.type === BiologyTerm || node.type === ModelTerm) return node;

    return cloneElement(node, {
      ...node.props,
      children: Children.map(node.props.children, (child, index) =>
        renderNode(child, `${path}-${index}`),
      ),
    });
  };

  return Children.map(children, (child, index) => renderNode(child, `root-${index}`));
}

const phaseLabels = {
  initialized: "Inizializzata",
  developing: "In sviluppo",
  completed: "Completata",
};

const tabHelp = {
  Simulatore: {
    title: "Il simulatore completo",
    paragraphs: [
      "Questa vista riunisce genoma, sviluppo, memoria e risultato PF8. Puoi cambiare gli alleli e osservare come l’informazione iniziale viene trasformata durante gli otto tick.",
      "Nelle cellule naturali il DNA non produce direttamente il fenotipo: viene letto, regolato e tradotto attraverso molti passaggi. Il modello T4 rappresenta questa idea con una pipeline digitale molto semplificata.",
    ],
  },
  Genoma: {
    title: "Il genoma 4×4",
    paragraphs: [
      "Il genoma contiene quattro regioni genetiche astratte. Ogni regione comprende due loci, A e B; per ciascun locus sono mostrati un allele sul cromosoma materno e uno sul cromosoma paterno.",
      "Nelle cellule diploidi i cromosomi omologhi portano, nello stesso locus, una copia materna e una paterna. Il modello conserva questa relazione con due bit per locus, pur riducendo la complessità reale a valori 0 e 1.",
      "Muovendo il tick, la tabella evidenzia il locus letto dal motore, il locus partner, quelli già elaborati e quelli ancora da elaborare. Gli alleli non cambiano: come nel normale processo di espressione genica, cambia la lettura del genoma, non la sua sequenza.",
    ],
  },
  Mendel: {
    title: "Risoluzione mendeliana",
    paragraphs: [
      "Per ciascuna regione vengono risolti due loci. Ogni locus confronta l’allele materno e quello paterno mediante OR logica: 00 produce 0, mentre 01, 10 e 11 producono 1.",
      "È un’astrazione della dominanza mendeliana completa: il valore 1 si comporta come dominante. Nei sistemi naturali esistono anche codominanza, dominanza incompleta, penetranza variabile e interazioni fra più geni.",
    ],
  },
  "TTE-T4": {
    title: "Tom Thumb Engine T4",
    paragraphs: [
      "A ogni tick il motore confronta un locus con quello distante due posizioni e ne calcola lo XOR. Il risultato viene scritto nella memoria interna.",
      "Il motore svolge il ruolo di un interprete genomico astratto. Nelle cellule naturali un compito analogo è svolto da reti di regolazione, RNA, proteine ed enzimi che trasformano l’informazione genetica in attività cellulare.",
    ],
  },
  Memoria: {
    title: "Memoria cellulare",
    paragraphs: [
      "La memoria 4×4 registra progressivamente gli otto risultati prodotti dal motore. MessageData legge le celle nell’ordine stabilito dal modello.",
      "Le cellule naturali conservano una forma di memoria attraverso concentrazioni molecolari, modificazioni epigenetiche, proteine persistenti e stati delle reti regolative. La matrice rappresenta in modo essenziale questa persistenza interna.",
    ],
  },
  PF8: {
    title: "Codifica PF8",
    paragraphs: [
      "I primi sei bit di MessageData formano il codice PF8. I primi tre identificano la riga e gli ultimi tre la colonna della matrice 8×8.",
      "Le sessantaquattro celle rappresentano sessantaquattro combinazioni fenotipiche. La frequenza associata a ciascuna cella indica quanti genomi del database completo conducono a quel risultato.",
    ],
  },
  Fenotipo: {
    title: "Fenotipo semplificato",
    paragraphs: [
      "I sei bit PF8 descrivono sesso, pelle, capelli, occhi, tolleranza al lattosio e visione. Ogni bit seleziona una delle due varianti previste per il carattere.",
      "Il fenotipo naturale nasce dall’interazione tra geni, sviluppo e ambiente. Anche la persistenza della lattasi è un buon esempio di relazione tra evoluzione biologica e storia delle popolazioni dedite all’allevamento.",
    ],
  },
  Ispezione: {
    title: "Ispezione interna",
    paragraphs: [
      "Questa sezione controlla se lo sviluppo è completo, se il fenotipo è disponibile e quanta informazione attiva è presente nella memoria e nel messaggio.",
      "In una cellula reale l’omeostasi mantiene entro limiti compatibili con la vita energia, pH, concentrazioni ioniche e integrità delle strutture. Qui la stabilità è una condizione computazionale più semplice: sviluppo terminato e risultato leggibile.",
    ],
  },
  Statistiche: {
    title: "Statistiche dello spazio PF8",
    paragraphs: [
      "Il database riassume la distribuzione di 43.046.721 configurazioni genomiche nelle sessantaquattro celle PF8. Mostra frequenze, probabilità, rango, entropia e dispersione.",
      "In genetica delle popolazioni le frequenze di varianti e fenotipi non sono necessariamente uniformi. Vincoli ereditari e combinatori possono rendere alcuni esiti molto più comuni di altri, proprio come accade nella matrice PF8.",
    ],
  },
  Replicazione: {
    title: "Replicazione per auto-ispezione",
    paragraphs: [
      "A ogni generazione, il MessageData calcolato dalla cellula precedente diventa il genoma (omozigote) della cellula successiva: l'organismo copia il proprio stato attuale, non un genoma originale fisso. È lo stesso principio usato dal Tom Thumb Algorithm per la replicazione dell'Universal Constructor di von Neumann.",
      "Senza mutazioni la linea collassa sempre allo stato tutto-zero entro la generazione 3, mai oltre: verificato per esaustione su tutti i 65.536 genomi 4×4 possibili. Con una mutazione ogni N generazioni, vale una regola esatta: se N è 3 o meno la linea non muore mai; se N è 4 o più, la linea attraversa esattamente N−3 generazioni di silenzio a ogni ciclo prima di rinascere. È una conseguenza diretta del limite dei 3 passi, non un effetto separato.",
    ],
  },
};

// --- Tour guidato ---
//
// Non segue l'ordine dei tab nel menu (che mette Replicazione al 6°
// posto): segue una progressione didattica a tre livelli — meccanismo
// del singolo genoma (Genoma→Mendel→TTE-T4→Memoria→PF8→Fenotipo),
// verifica (Ispezione), scala di popolazione (Statistiche), infine
// dimensione temporale/evolutiva (Replicazione) come tappa conclusiva,
// perché presuppone di aver già capito il ciclo a singola generazione
// prima di seguirlo ripetuto nel tempo.
const TOUR_STEPS = [
  {
    tab: "Simulatore",
    title: "La panoramica",
    description:
      "Parti da qui per vedere l'intera pipeline in un colpo d'occhio: genoma, sviluppo tick-by-tick, memoria e risultato PF8 tutti insieme. Non serve capire ogni dettaglio subito: l'obiettivo è avere una mappa mentale del percorso completo prima di entrare nei singoli meccanismi.",
  },
  {
    tab: "Genoma",
    title: "Il punto di partenza",
    description:
      "Osserva la matrice 4×4: quattro regioni genetiche astratte, ciascuna con due loci (A e B), ciascun locus con un allele materno e uno paterno. Prova a modificare qualche allele: qui il genoma è ancora \"grezzo\", non tradotto in nulla.",
  },
  {
    tab: "Mendel",
    title: "Come si risolve un locus",
    description:
      "Per ogni locus, l'allele materno e quello paterno si combinano con un OR logico: 00→0, tutto il resto→1. È la regola che dà origine a ogni singolo bit successivo.",
  },
  {
    tab: "TTE-T4",
    title: "Il motore che \"legge\" il genoma",
    description:
      "Ogni tick confronta un locus con quello a due posizioni di distanza e calcola lo XOR tra i due, scrivendo il risultato in memoria. Il genoma non cambia mai: cambia solo cosa viene letto e quando.",
  },
  {
    tab: "Memoria",
    title: "Dove si accumula il risultato",
    description:
      "La matrice 4×4 di memoria registra progressivamente gli otto risultati prodotti dal motore T4. Segui come MessageData legge le celle in un ordine preciso.",
  },
  {
    tab: "PF8",
    title: "Dal messaggio al codice",
    description:
      "I primi sei bit di MessageData diventano il codice PF8: i primi tre indicano la riga, gli ultimi tre la colonna di una griglia 8×8. Qui vedi la cella che \"ospita\" il fenotipo che stai costruendo.",
  },
  {
    tab: "Fenotipo",
    title: "Il risultato leggibile",
    description:
      "I sei bit PF8 si traducono in sesso, pelle, capelli, occhi, tolleranza al lattosio e visione, con il ritratto a comporli visivamente. È il primo punto del tour in cui il modello \"si vede\".",
  },
  {
    tab: "Ispezione",
    title: "Un controllo di qualità",
    description:
      "Prima di allargare lo sguardo, verifica che lo sviluppo sia completo e il fenotipo stabile e leggibile: gli otto tick sono finiti e il messaggio non è vuoto.",
  },
  {
    tab: "Statistiche",
    title: "Dal singolo genoma alla popolazione",
    description:
      "Cambio di scala: da \"questo genoma produce questo fenotipo\" a come si distribuiscono 43.046.721 genomi possibili sulle 64 celle PF8. Gli esiti non sono equiprobabili.",
  },
  {
    tab: "Replicazione",
    title: "L'estensione nel tempo",
    description:
      "Ultima tappa, la più avanzata: il MessageData di una generazione diventa il genoma della successiva. Scopri il limite dei 3 passi al collasso e il ciclo nascita/silenzio/rinascita legato alla mutazione periodica.",
  },
];

function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-heading">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Bits({ values }) {
  return (
    <div className="bits" aria-label="Sequenza di bit">
      {values.map((value, index) => (
        <span className={value ? "on" : "off"} key={index}>
          {value}
        </span>
      ))}
    </div>
  );
}

function Matrix({ matrix, editable = false, onToggle, highlight, showCoordinates = false }) {
  return (
    <div className="matrix-shell">
      <div className="matrix" role="grid" aria-label="Matrice quattro per quattro">
        {matrix.flatMap((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <button
              type="button"
              disabled={!editable}
              onClick={() => onToggle?.(rowIndex, columnIndex)}
              className={`${value ? "on" : "off"} ${
                highlight?.row === rowIndex && highlight?.col === columnIndex
                  ? "active"
                  : ""
              }`}
              key={`${rowIndex}-${columnIndex}`}
              aria-label={`Riga ${rowIndex + 1}, colonna ${columnIndex + 1}: ${value}`}
            >
              {showCoordinates ? (
                <span className="matrix-coordinate" aria-hidden="true">
                  {rowIndex},{columnIndex}
                </span>
              ) : null}
              <span className="matrix-value">{value}</span>
            </button>
          )),
        )}
      </div>
    </div>
  );
}

function PF8Grid({ counts, active, trail }) {
  const max = Math.max(...counts.flat());

  const trailByCell = new Map();
  if (trail) {
    trail.forEach((point) => {
      const key = `${point.row}-${point.col}`;
      if (!trailByCell.has(key)) trailByCell.set(key, []);
      trailByCell.get(key).push(point);
    });
  }

  return (
    <div>
      <div className="pf8-grid">
        {counts.flatMap((row, rowIndex) =>
          row.map((count, columnIndex) => {
            const key = `${rowIndex}-${columnIndex}`;
            const isActive = active.row === rowIndex && active.col === columnIndex;
            const trailPoints = trailByCell.get(key) ?? [];
            const trailLabel =
              trailPoints.length > 3
                ? `×${trailPoints.length}`
                : trailPoints.map((point) => point.generation).join(",");
            // Il bit "sesso" è il più significativo della riga (sesso, pelle, capelli):
            // righe 0-3 = femmina, righe 4-7 = maschio. Separazione netta, nessuna riga mista.
            const hue = rowIndex < 4 ? "220 38 38" : "37 99 235";

            return (
              <div
                key={key}
                className={[isActive ? "selected" : "", trailPoints.length ? "on-trail" : ""]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  "--density": (0.14 + 0.58 * Math.pow(count / max, 1.8)).toFixed(3),
                  "--hue": hue,
                }}
              >
                <b>
                  {rowIndex},{columnIndex}
                </b>
                <span>{fmt.format(count)}</span>
                {trailPoints.length ? (
                  <span
                    className="pf8-trail-badge"
                    title={`Generazioni passate da qui: ${trailPoints
                      .map((point) => point.generation)
                      .join(", ")}`}
                  >
                    {trailLabel}
                  </span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
      <div className="pf8-grid-legend">
        <span className="pf8-legend-item">
          <span className="pf8-legend-swatch female" aria-hidden="true" />
          Femmina (righe 0–3)
        </span>
        <span className="pf8-legend-item">
          <span className="pf8-legend-swatch male" aria-hidden="true" />
          Maschio (righe 4–7)
        </span>
        <span className="pf8-legend-item pf8-legend-note">
          L'intensità del colore indica la frequenza nello spazio genomico.
        </span>
      </div>
    </div>
  );
}

function generationsUntilSilenceDisplay(lineage, fromIndex) {
  for (let i = fromIndex; i < lineage.length; i++) {
    if (lineage[i].isZeroState) return i === fromIndex ? "già silente" : `${i - fromIndex}`;
  }
  return `oltre l'orizzonte visibile (${lineage.length - 1 - fromIndex}+)`;
}

function DiffBits({ values, diffFlags }) {
  return (
    <div className="bits" aria-label="Sequenza di bit con differenze evidenziate">
      {values.map((value, index) => (
        <span
          className={`${value ? "on" : "off"} ${diffFlags?.[index] ? "changed" : ""}`}
          key={index}
          title={diffFlags?.[index] ? "Cambiato rispetto alla generazione precedente" : undefined}
        >
          {value}
        </span>
      ))}
    </div>
  );
}

// --- Storyboard didattica "Nascita, senescenza, rinascita" ---
//
// Usa una linea di generazioni CALCOLATA UNA VOLTA SOLA con parametri fissi
// (genoma di default, mutazione ogni 4 generazioni), indipendente dai
// controlli correnti del tab Replicazione. Questo è intenzionale: i testi
// dei pannelli citano numeri esatti ("esattamente 1 generazione di
// silenzio"), validi solo per N=4. Se la storyboard leggesse lo state
// corrente dell'utente (mutateEvery, genome), quei numeri diventerebbero
// falsi ogni volta che l'utente avesse cambiato i controlli prima di
// aprirla. La storyboard racconta sempre la stessa storia, con dati
// riproducibili, mentre il resto del tab resta libero ed esplorativo.
const STORYBOARD_MUTATE_EVERY = 4;
const STORYBOARD_GENERATIONS = 8;

function buildStoryboardLineage() {
  return runReplicationLineage(DEFAULT_GENOME_4X4, STORYBOARD_GENERATIONS, {
    mutateEveryNGenerations: STORYBOARD_MUTATE_EVERY,
    randomLocusPicker: () => 3, // locus fisso: la storia è riproducibile a ogni apertura
  });
}

function StoryboardPanel({ lineage, genIndex, diffAgainst, badge, title, natural, children }) {
  const gen = lineage[genIndex];
  const parent = diffAgainst !== null && diffAgainst !== undefined ? lineage[diffAgainst] : null;
  const diffFlags = parent
    ? parent.cell.messageData.map((bit, i) => bit !== gen.cell.messageData[i])
    : null;

  return (
    <div className="storyboard-panel">
      <div className="storyboard-panel-icon" aria-hidden="true">{badge}</div>
      <div className="storyboard-panel-body">
        <h3>{title}</h3>
        {gen ? (
          <>
            <DiffBits values={gen.cell.messageData} diffFlags={diffFlags} />
            <p className="storyboard-panel-meta">
              Generazione {gen.generation} · codice {gen.cell.code}
              {gen.mutation ? ` · mutazione sul locus ${gen.mutation.locus} (${gen.mutation.from}→${gen.mutation.to})` : ""}
              {gen.isZeroState ? " · stato silente" : ""}
            </p>
          </>
        ) : null}
        <p>{children}</p>
        {natural ? <p className="storyboard-panel-natural">{natural}</p> : null}
      </div>
    </div>
  );
}

function StoryboardOverlay({ onClose }) {
  const lineage = useMemo(() => buildStoryboardLineage(), []);
  const [step, setStep] = useState(0);
  const [cycleTick, setCycleTick] = useState(0); // per il mini-stepper del pannello 6

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setStep((s) => Math.min(6, s + 1));
      if (event.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  // Pannello 6: ciclo di 4 generazioni (4,5,6,7) percorribile manualmente
  const cycleGenIndex = 4 + (cycleTick % 4);

  const panels = [
    <StoryboardPanel
      key="p0"
      lineage={lineage}
      genIndex={0}
      diffAgainst={null}
      badge="1"
      title="Nascita"
    >
      Una cellula nasce con un genoma completo. In una cellula umana, il DNA include anche i telomeri:
      sequenze ripetute non codificanti alle estremità dei cromosomi, che funzionano come il tappo di
      plastica in fondo a un laccio da scarpe — proteggono, non contengono istruzioni.
    </StoryboardPanel>,

    <StoryboardPanel
      key="p1"
      lineage={lineage}
      genIndex={1}
      diffAgainst={0}
      badge="2"
      title="Prima divisione"
    >
      La cellula si replica per auto-ispezione: la figlia eredita ciò che la madre è diventata (il suo
      MessageData calcolato), non il genoma originale. Nel corpo umano, ogni divisione cellulare accorcia
      leggermente i telomeri — le DNA polimerasi non riescono a copiare fino in fondo l'estremità di un
      filamento lineare: è un limite meccanico della replicazione, non un errore.
    </StoryboardPanel>,

    <StoryboardPanel
      key="p2"
      lineage={lineage}
      genIndex={2}
      diffAgainst={1}
      badge="3"
      title="Seconda divisione"
    >
      L'informazione continua a impoverirsi, ma il fenotipo (PF8) sembra ancora vitale. Anche i telomeri
      accorciati non sono ancora abbastanza corti da attivare un allarme — la cellula biologica continua a
      dividersi normalmente, senza segni visibili del conto alla rovescia in corso.
    </StoryboardPanel>,

    <StoryboardPanel
      key="p3"
      lineage={lineage}
      genIndex={3}
      diffAgainst={2}
      badge="4"
      title="Senescenza"
    >
      Il silenzio arriva sempre qui: verificato su tutti i 65.536 genomi 4×4 possibili, mai oltre la
      generazione 3. È il limite di Hayflick del nostro motore — un contatore fisso incorporato nella
      struttura stessa della regola di trasformazione, non nel singolo genoma di partenza. Nel corpo, quando
      i telomeri scendono sotto una soglia critica, la cellula rileva la cosa come un danno al DNA e blocca
      la divisione: senescenza replicativa. La cellula non muore, semplicemente smette di dividersi.
    </StoryboardPanel>,

    <StoryboardPanel
      key="p4"
      lineage={lineage}
      genIndex={4}
      diffAgainst={3}
      badge="5"
      title="Il bivio (telomerasi)"
    >
      Con una mutazione ogni 4 generazioni, la cellula resta silente per esattamente 1 generazione, poi
      rinasce. Nel corpo, l'enzima telomerasi può ricostruire i telomeri e resettare il contatore — è attivo
      nelle cellule staminali (che devono rifornire i tessuti per tutta la vita) ma silenziato nella maggior
      parte delle cellule somatiche adulte. Non a caso: dare a ogni cellula la capacità di dividersi
      all'infinito sarebbe pericoloso.
    </StoryboardPanel>,

    <div className="storyboard-panel" key="p5">
      <div className="storyboard-panel-icon" aria-hidden="true">6</div>
      <div className="storyboard-panel-body">
        <h3>Equilibrio, non progresso</h3>
        <DiffBits
          values={lineage[cycleGenIndex].cell.messageData}
          diffFlags={lineage[cycleGenIndex - 1]?.cell.messageData.map(
            (bit, i) => bit !== lineage[cycleGenIndex].cell.messageData[i],
          )}
        />
        <p className="storyboard-panel-meta">
          Generazione {lineage[cycleGenIndex].generation} del ciclo
          {lineage[cycleGenIndex].isZeroState ? " · stato silente" : ""}
        </p>
        <div className="storyboard-cycle-controls">
          <button type="button" onClick={() => setCycleTick((t) => t + 1)}>
            Avanza nel ciclo →
          </button>
        </div>
        <p>
          La mutazione salva la linea dall'estinzione, ma non garantisce novità: qui produce un'orbita
          ripetitiva di 4 generazioni (3 vive + 1 silente), non una vera deriva evolutiva. È un'eco
          imperfetta ma reale di un fatto inquietante: la telomerasi è riattivata nella maggior parte delle
          cellule tumorali. La linea HeLa, coltivata ininterrottamente dal 1951, discende da cellule che
          hanno riacceso questo meccanismo — non "guarendo" la cellula, ma rendendola capace di proliferare
          senza limite.
        </p>
      </div>
    </div>,

    <div className="storyboard-panel" key="p6">
      <div className="storyboard-panel-icon" aria-hidden="true">7</div>
      <div className="storyboard-panel-body">
        <h3>Dove l'analogia si rompe</h3>
        <p>
          Due avvertenze oneste. Primo: il nostro collasso è un fatto matematico (la trasformazione XOR
          shift-2 non è iniettiva su un ciclo di 8), quello di Hayflick è un fatto biochimico (la lunghezza
          fisica del DNA telomerico) — meccanismi del tutto diversi che producono un declino a soglia fissa
          per ragioni non correlate.
        </p>
        <p>
          Secondo: il nostro "stato zero" è un vicolo cieco innocuo, non una salvaguardia — nella biologia
          reale, il limite di Hayflick è considerato un meccanismo anti-tumorale: fermare una linea cellulare
          dopo un numero finito di cicli limita quanto danno accumulato può diffondersi nell'organismo. Il
          nostro modello non ha nulla di equivalente a questa funzione protettiva.
        </p>
      </div>
    </div>,
  ];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="help-modal storyboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="storyboard-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="help-modal-heading">
          <div>
            <p className="help-kicker">Storia · Replicazione per auto-ispezione</p>
            <h2 id="storyboard-title">Nascita, senescenza, rinascita</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi la storia">
            ×
          </button>
        </div>

        <div className="help-modal-content storyboard-content">{panels[step]}</div>

        <div className="storyboard-progress" aria-label="Avanzamento della storia">
          {panels.map((_, index) => (
            <button
              type="button"
              key={index}
              className={index === step ? "active" : ""}
              onClick={() => setStep(index)}
              aria-label={`Vai al pannello ${index + 1}`}
            />
          ))}
        </div>

        <div className="help-modal-footer storyboard-footer">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← Indietro
          </button>
          {step < panels.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => Math.min(panels.length - 1, s + 1))}>
              Avanti →
            </button>
          ) : (
            <button type="button" onClick={onClose}>
              Chiudi
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function SectionExplanation({ badge, title, children, natural }) {
  return (
    <aside className="section-explanation" aria-label={title}>
      <div className="section-explanation-icon" aria-hidden="true">{badge}</div>
      <div>
        <h3>{title}</h3>
        <p><GlossaryContent>{children}</GlossaryContent></p>
        {natural ? (
          <p className="section-explanation-natural">
            <GlossaryContent>{natural}</GlossaryContent>
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function HelpModal({ tab, onClose }) {
  const help = tabHelp[tab];

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="help-modal-heading">
          <div>
            <p className="help-kicker">Guida alla sezione · {tab}</p>
            <h2 id="help-modal-title">{help.title}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi la guida">
            ×
          </button>
        </div>

        <div className="help-modal-content">
          {help.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="help-modal-footer">
          <button type="button" onClick={onClose}>Ho capito</button>
        </div>
      </section>
    </div>
  );
}

function TourPanel({ stepIndex, onNext, onPrev, onClose }) {
  const step = TOUR_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <section className="tour-panel" role="dialog" aria-label="Tour guidato">
      <div className="tour-panel-text">
        <p className="tour-kicker">
          Tour guidato · Passo {stepIndex + 1} di {TOUR_STEPS.length} · {step.title}
        </p>
        <p className="tour-panel-description">{step.description}</p>
      </div>

      <div className="tour-panel-controls">
        <div className="tour-panel-progress" aria-hidden="true">
          {TOUR_STEPS.map((tourStep, index) => (
            <span key={tourStep.tab} className={index === stepIndex ? "active" : ""} />
          ))}
        </div>

        <div className="tour-panel-buttons">
          <button type="button" onClick={onPrev} disabled={isFirst}>
            Indietro
          </button>
          <button type="button" className="primary" onClick={onNext}>
            {isLast ? "Fine tour" : "Avanti"}
          </button>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi il tour guidato">
            ×
          </button>
        </div>
      </div>
    </section>
  );
}


const MUTATION_EFFECTS = {
  neutral: { icon: "○", label: "Mutazione neutra" },
  loci: { icon: "🧬", label: "Effetto sui loci" },
  phenotype: { icon: "🦋", label: "Effetto sul fenotipo" },
};

function changedPhenotypeTraits(beforeCode, afterCode) {
  const beforeTraits = phenotypeDescriptor(beforeCode);
  const afterTraits = phenotypeDescriptor(afterCode);

  return beforeTraits.flatMap((beforeTrait, index) => {
    const afterTrait = afterTraits[index];
    if (!afterTrait || beforeTrait.key === afterTrait.key) return [];

    return [{
      axis: beforeTrait.axis,
      before: beforeTrait.label,
      after: afterTrait.label,
    }];
  });
}

function classifyMutationEffect(beforeCell, afterCell) {
  // Lo stato “Effetto sui loci ma non sul fenotipo” non è raggiungibile con un singolo clic
  // nelle regole attuali. Rimane predisposto per future mutazioni multiple o differenti
  // regole del motore.
  const lociChanged = beforeCell.loci.join("") !== afterCell.loci.join("");
  const phenotypeChanged = beforeCell.code !== afterCell.code;

  if (phenotypeChanged) return "phenotype";
  if (lociChanged) return "loci";
  return "neutral";
}

export default function App() {
  const [genome, setGenome] = useState(() => cloneMatrix(DEFAULT_GENOME_4X4));
  const [tick, setTick] = useState(8);
  const [tab, setTab] = useState("Simulatore");
  const [helpOpen, setHelpOpen] = useState(false);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [tourStep, setTourStep] = useState(null); // null = tour chiuso; altrimenti indice 0..TOUR_STEPS.length-1
  const [lastMutation, setLastMutation] = useState(null);

  // --- Replicazione per auto-ispezione (TTE-T4 + Tom Thumb self-inspection) ---
  const [lineageLength, setLineageLength] = useState(10);
  const [mutateEvery, setMutateEvery] = useState(4);
  const [lineageSeed, setLineageSeed] = useState(0); // forza rigenerazione con nuova mutazione casuale
  const [selectedGen, setSelectedGen] = useState(0);

  const lineage = useMemo(
    () =>
      runReplicationLineage(genome, lineageLength, {
        mutateEveryNGenerations: mutateEvery > 0 ? mutateEvery : null,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [genome, lineageLength, mutateEvery, lineageSeed],
  );

  const selectedGeneration = lineage[Math.min(selectedGen, lineage.length - 1)];
  const selectedDiff =
    selectedGeneration.parentMessageData?.map(
      (bit, i) => bit !== selectedGeneration.cell.messageData[i],
    ) ?? [];

  const cell = useMemo(() => cellAtTick(genome, tick), [genome, tick]);
  const complete = useMemo(() => runCompleteT4Cell(genome), [genome]);
  const profile = useMemo(() => buildPF8Profile(db, complete.code), [complete.code]);
  const phenotype = useMemo(() => phenotypeDescriptor(complete.code), [complete.code]);
  const currentProfile = useMemo(() => buildPF8Profile(db, cell.code), [cell.code]);
  const selectedT4Event = complete.history[Math.min(tick, 7)];
  const selectedT4IsPending = tick < 8;

  const activeLocusIndex = tick < 8 ? tick : null;
  const activePartnerIndex = activeLocusIndex === null ? null : (activeLocusIndex + 2) % 8;
  const activeLocus = activeLocusIndex === null ? null : locusDescriptor(activeLocusIndex);
  const activePartner = activePartnerIndex === null ? null : locusDescriptor(activePartnerIndex);

  const locusState = (locusIndex) => {
    if (activeLocusIndex === null) return "processed";
    if (locusIndex === activeLocusIndex) return "current";
    if (locusIndex === activePartnerIndex) return "partner";
    if (locusIndex < tick) return "processed";
    return "future";
  };

  const toggle = (row, column) => {
    setGenome((currentGenome) => {
      const nextGenome = currentGenome.map((currentRow, rowIndex) =>
        currentRow.map((value, columnIndex) =>
          rowIndex === row && columnIndex === column ? 1 - value : value,
        ),
      );

      const beforeCell = runCompleteT4Cell(currentGenome);
      const afterCell = runCompleteT4Cell(nextGenome);
      const effect = classifyMutationEffect(beforeCell, afterCell);
      const locusIndex = column < 2 ? row : row + 4;

      setLastMutation({
        row,
        column,
        from: currentGenome[row][column],
        to: nextGenome[row][column],
        locus: locusDescriptor(locusIndex),
        origin: column % 2 === 0 ? "materna" : "paterna",
        effect,
        beforeCode: beforeCell.code,
        afterCode: afterCell.code,
        changedTraits: changedPhenotypeTraits(beforeCell.code, afterCell.code),
      });

      return nextGenome;
    });
  };

  const randomize = () => {
    setLastMutation(null);
    setGenome(
      Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => (Math.random() < 0.5 ? 0 : 1)),
      ),
    );
  };

  const reset = () => {
    setLastMutation(null);
    setGenome(cloneMatrix(DEFAULT_GENOME_4X4));
    setTick(8);
  };

  const startTour = () => {
    setTourStep(0);
    setTab(TOUR_STEPS[0].tab);
  };

  const goToTourStep = (index) => {
    if (index < 0 || index >= TOUR_STEPS.length) {
      setTourStep(null);
      return;
    }
    setTourStep(index);
    setTab(TOUR_STEPS[index].tab);
  };

  return (
    <main>
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Artificial Cell Model</p>
          <h1>Artificial Cell Laboratory</h1>
          <p className="hero-description">
            Modello T4 modulare: genoma, sviluppo temporale, memoria, PF8 e potenza
            genomica.
          </p>
        </div>

        <div className={`status ${cell.inspection.stable ? "ok" : "pending"}`}>
          <span className="status-dot" aria-hidden="true" />
          {cell.inspection.stable ? "Stabile" : "In sviluppo"}
        </div>
      </header>

      <nav className="tabs" aria-label="Sezioni del laboratorio">
        {tabs.map((item) => (
          <button
            type="button"
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}

        <button
          type="button"
          className="help-button tour-button"
          onClick={startTour}
          aria-label="Avvia il tour guidato dell'applicazione"
        >
          <span aria-hidden="true">➔</span>
          Tour guidato
        </button>

        <button
          type="button"
          className="help-button"
          onClick={() => setHelpOpen(true)}
          aria-label={`Apri la guida della sezione ${tab}`}
        >
          <span aria-hidden="true">?</span>
          Spiegazione
        </button>
      </nav>

      {tourStep !== null ? (
        <TourPanel
          stepIndex={tourStep}
          onNext={() => goToTourStep(tourStep + 1)}
          onPrev={() => goToTourStep(tourStep - 1)}
          onClose={() => setTourStep(null)}
        />
      ) : null}

      <section className="toolbar" aria-label="Controlli del simulatore">
        <div className="toolbar-actions">
          <button type="button" onClick={randomize}>
            Genoma casuale
          </button>
          <button type="button" onClick={reset}>
            Ripristina
          </button>
        </div>

        <div className="tick-controls">
          <button
            type="button"
            onClick={() => setTick((currentTick) => Math.max(0, currentTick - 1))}
            aria-label="Riduci tick"
          >
            − Tick
          </button>

          <label>
            <span>Avanzamento</span>
            <input
              type="range"
              min="0"
              max="8"
              value={tick}
              onChange={(event) => setTick(Number(event.target.value))}
            />
            <b>{tick} / 8</b>
          </label>

          <button
            type="button"
            onClick={() => setTick((currentTick) => Math.min(8, currentTick + 1))}
            aria-label="Aumenta tick"
          >
            + Tick
          </button>
        </div>
      </section>

      {tab === "Simulatore" && (
        <>
          <SectionExplanation
            badge="CELL"
            title="Che cosa mostra il simulatore?"
            natural="In natura, il fenotipo emerge dall’attività coordinata di DNA, RNA, proteine e segnali cellulari. Qui la stessa idea è rappresentata da una catena digitale molto più semplice."
          >
            Questa vista segue l’intera cellula: parte dagli alleli, applica la risoluzione mendeliana, esegue il motore T4 e mostra come memoria, MessageData e posizione PF8 cambiano durante gli otto tick.
          </SectionExplanation>
          <div className="dashboard simulator-dashboard">
          <Card
            title="Genoma 4×4"
            subtitle="Clicca su un allele per modificarne il valore."
          >
            <Matrix matrix={genome} editable onToggle={toggle} />
          </Card>

          <Card
            title={`Memoria al tick ${tick}`}
            subtitle="La cella evidenziata è l’ultima posizione scritta."
          >
            <Matrix matrix={cell.memory} highlight={cell.history.at(-1)?.address} />
            <p className="technical-note">
              Riga = tick mod 4 · Colonna = floor(tick / 4)
            </p>
          </Card>

          <Card title="Stato sintetico" className="wide summary-card">
            <div className="metrics summary-metrics">
              <Metric label="Fase" value={phaseLabels[cell.phase] ?? cell.phase} />
              <Metric label="Loci" value={cell.loci.join("")} />
              <Metric label="MessageData" value={cell.messageData.join("")} />
              <Metric label="Codice PF8" value={cell.code} />
              <Metric label="Coordinate" value={`(${cell.pf8.row}, ${cell.pf8.col})`} />
              <Metric label="Potenza genomica" value={fmt.format(currentProfile.count)} />
            </div>
          </Card>
          </div>
        </>
      )}

      {tab === "Genoma" && (
        <Card
          title="Genome Laboratory"
          subtitle="Quattro regioni genetiche, due loci diploidi per regione e sedici alleli complessivi."
        >
          <aside className="genome-explanation" aria-label="Perché il tick non modifica il genoma">
            <div className="genome-explanation-icon" aria-hidden="true">DNA</div>
            <div>
              <h3>Perché i valori non cambiano con il tick?</h3>
              <p>
                <GlossaryContent>
                  Questa tabella mostra il <strong>genoma</strong>, cioè l’informazione ereditaria di partenza.
                  Il tick fa avanzare la <strong>lettura</strong> dei loci da parte del Tom Thumb Engine, ma non
                  riscrive gli alleli. Per questo cambiano le evidenziazioni, la memoria e il fenotipo in
                  costruzione, mentre i valori 0 e 1 restano invariati.
                </GlossaryContent>
              </p>
              <p className="genome-explanation-natural">
                <GlossaryContent>
                  Anche nelle cellule reali, durante la normale espressione genica, il DNA viene letto per
                  produrre RNA e proteine senza essere modificato nella sua sequenza.
                </GlossaryContent>
              </p>
            </div>
          </aside>

          <div className={`genome-tick-status ${tick >= 8 ? "complete" : "active"}`}>
            {tick >= 8 ? (
              <>
                <b>Sviluppo completato</b>
                <span>Tutti gli otto loci sono stati letti dal Tom Thumb Engine.</span>
              </>
            ) : (
              <>
                <b>Tick {tick}: lettura di {activeLocus.label}</b>
                <span>
                  {activeLocus.fullLabel} · partner {activePartner.label} ({activePartner.fullLabel})
                </span>
              </>
            )}
            <div className="genome-state-legend" aria-label="Legenda dello stato dei loci">
              <span className="current">Locus corrente</span>
              <span className="partner">Locus partner</span>
              <span className="processed">Già elaborato</span>
              <span className="future">Da elaborare</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="genetics-table genome-tick-table">
              <thead>
                <tr>
                  <th rowSpan="2">Regione genetica</th>
                  <th colSpan="2">Locus A</th>
                  <th colSpan="2">Locus B</th>
                </tr>
                <tr>
                  <th><span className="parent-origin maternal" aria-hidden="true">♀</span>Cromosoma materno</th>
                  <th><span className="parent-origin paternal" aria-hidden="true">♂</span>Cromosoma paterno</th>
                  <th><span className="parent-origin maternal" aria-hidden="true">♀</span>Cromosoma materno</th>
                  <th><span className="parent-origin paternal" aria-hidden="true">♂</span>Cromosoma paterno</th>
                </tr>
              </thead>
              <tbody>
                {genome.map((row, rowIndex) => {
                  const locusAIndex = rowIndex;
                  const locusBIndex = rowIndex + 4;
                  const rowStates = [locusState(locusAIndex), locusState(locusBIndex)];

                  return (
                    <tr
                      key={GENETIC_REGIONS[rowIndex]}
                      className={rowStates.includes("current") ? "contains-current" : rowStates.includes("partner") ? "contains-partner" : ""}
                    >
                      <th>{GENETIC_REGIONS[rowIndex]}</th>
                      {row.map((value, columnIndex) => {
                        const locusIndex = columnIndex < 2 ? locusAIndex : locusBIndex;
                        const state = locusState(locusIndex);
                        const descriptor = locusDescriptor(locusIndex);

                        return (
                          <td key={columnIndex} className={`locus-cell ${state}`}>
                            <small>{descriptor.label}</small>
                            <button
                              type="button"
                              className={`allele ${value ? "on" : "off"}`}
                              onClick={() => toggle(rowIndex, columnIndex)}
                              aria-label={`${GENETIC_REGIONS[rowIndex]}, locus ${columnIndex < 2 ? "A" : "B"}, cromosoma ${columnIndex % 2 === 0 ? "materno" : "paterno"}: allele ${value}; stato ${state}`}
                            >
                              {value}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lastMutation ? (
            <aside className={`mutation-effect mutation-effect--${lastMutation.effect}`} aria-live="polite">
              <span className="mutation-effect-icon" aria-hidden="true">
                {MUTATION_EFFECTS[lastMutation.effect].icon}
              </span>
              <div>
                <b>{MUTATION_EFFECTS[lastMutation.effect].label}</b>
                <span>
                  {lastMutation.locus.fullLabel}, allele di origine {lastMutation.origin}: {lastMutation.from} → {lastMutation.to}.
                </span>
                {lastMutation.effect === "phenotype" ? (
                  <div className="mutation-phenotype-details">
                    <small>Codice PF8: {lastMutation.beforeCode} → {lastMutation.afterCode}</small>
                    <ul aria-label="Caratteri fenotipici modificati">
                      {lastMutation.changedTraits.map((trait) => (
                        <li key={trait.axis}>
                          <strong>{trait.axis}</strong>: {trait.before} → {trait.after}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </aside>
          ) : (
            <aside className="mutation-effect mutation-effect--idle">
              <span className="mutation-effect-icon" aria-hidden="true">◇</span>
              <div>
                <b>Indicatore di mutazione</b>
                <span>Clicca un allele per verificare l’effetto della variazione. Con una singola mutazione, il motore T4 produce normalmente un esito neutro oppure un cambiamento fenotipico; lo stato “solo loci” resta disponibile per future regole o mutazioni multiple.</span>
              </div>
            </aside>
          )}

          <p className="technical-note">
            In ogni locus, <span className="parent-origin maternal" aria-hidden="true">♀</span> indica l’allele sul cromosoma materno e <span className="parent-origin paternal" aria-hidden="true">♂</span> quello sul cromosoma paterno. Il tick non cambia il DNA: evidenzia quali loci il motore sta leggendo.
          </p>
        </Card>
      )}

      {tab === "Mendel" && (
        <Card
          title="Mendelian Resolution Laboratory"
          subtitle="Ogni coppia materna-paterna viene risolta in un valore di espressione mediante OR logica."
        >
          <SectionExplanation
            badge="OR"
            title="Come vengono risolti gli alleli?"
            natural="È l’analogo semplificato della dominanza mendeliana completa: un allele dominante può manifestarsi anche quando l’altra copia è recessiva. Nella biologia reale esistono anche codominanza e dominanza incompleta."
          >
            Ogni locus contiene un allele sul cromosoma materno e uno sul cromosoma paterno. La OR li riduce a un solo valore espresso: soltanto 0 e 0 producono 0; tutte le altre coppie producono 1.
          </SectionExplanation>
          <div className="table-wrap">
            <table className="genetics-table mendel-table">
              <thead>
                <tr>
                  <th rowSpan="2">Regione genetica</th>
                  <th colSpan="3">Locus A</th>
                  <th colSpan="3">Locus B</th>
                </tr>
                <tr>
                  <th><span className="parent-origin maternal" aria-hidden="true">♀</span>Allele materno</th>
                  <th><span className="parent-origin paternal" aria-hidden="true">♂</span>Allele paterno</th>
                  <th>Espressione</th>
                  <th><span className="parent-origin maternal" aria-hidden="true">♀</span>Allele materno</th>
                  <th><span className="parent-origin paternal" aria-hidden="true">♂</span>Allele paterno</th>
                  <th>Espressione</th>
                </tr>
              </thead>
              <tbody>
                {genome.map((row, rowIndex) => (
                  <tr key={GENETIC_REGIONS[rowIndex]}>
                    <th>{GENETIC_REGIONS[rowIndex]}</th>
                    <td>{row[0]}</td>
                    <td>{row[1]}</td>
                    <td className="resolved-locus">
                      <span>L{rowIndex}</span>
                      <b>{cell.loci[rowIndex]}</b>
                    </td>
                    <td>{row[2]}</td>
                    <td>{row[3]}</td>
                    <td className="resolved-locus">
                      <span>L{rowIndex + 4}</span>
                      <b>{cell.loci[rowIndex + 4]}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Otto loci risolti</h3>
          <Bits values={cell.loci} />
          <div className="locus-legend">
            {cell.loci.map((value, index) => {
              const descriptor = locusDescriptor(index);
              return (
                <span key={descriptor.label}>
                  <b>{descriptor.label} = {value}</b>
                  {descriptor.fullLabel}
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {tab === "TTE-T4" && (
        <Card title="Tom Thumb Engine T4" subtitle="Esecuzione reale, passo per passo, degli otto tick.">
          <SectionExplanation
            badge="XOR"
            title="Perché il motore confronta due loci?"
            natural="Le cellule reali usano reti regolative nelle quali geni e proteine si attivano o si reprimono reciprocamente. La XOR non è una reazione naturale specifica, ma rappresenta questa dipendenza fra segnali."
          >
            A ogni tick il locus corrente viene confrontato con un partner distante due posizioni. Due valori diversi producono 1; due valori uguali producono 0. Il risultato non modifica il genoma: viene scritto nella memoria.
          </SectionExplanation>

          <p className="formula">writeₜ = Lₜ XOR L₍ₜ₊₂ mod 8₎</p>

          <section className={`tte-step ${selectedT4IsPending ? "pending" : "complete"}`}>
            <div className="tte-step-heading">
              <div>
                <p>{selectedT4IsPending ? "Operazione da eseguire" : "Ultima operazione eseguita"}</p>
                <h3>Tick {selectedT4Event.tick}</h3>
              </div>
              <span>{selectedT4IsPending ? `Avanzamento ${tick}/8` : "Sviluppo 8/8 completato"}</span>
            </div>

            <div className="tte-calculation-flow" aria-label={`Calcolo del tick ${selectedT4Event.tick}`}>
              <article>
                <small>Locus corrente</small>
                <b>{locusDescriptor(selectedT4Event.locusIndex).label}</b>
                <strong>{selectedT4Event.locusValue}</strong>
                <span>{locusDescriptor(selectedT4Event.locusIndex).fullLabel}</span>
              </article>

              <div className="tte-operator" aria-hidden="true">XOR</div>

              <article>
                <small>Locus partner</small>
                <b>{locusDescriptor(selectedT4Event.partnerIndex).label}</b>
                <strong>{selectedT4Event.partnerValue}</strong>
                <span>{locusDescriptor(selectedT4Event.partnerIndex).fullLabel}</span>
              </article>

              <div className="tte-operator" aria-hidden="true">=</div>

              <article className="tte-result">
                <small>Valore scritto</small>
                <b>{selectedT4Event.locusValue} XOR {selectedT4Event.partnerValue}</b>
                <strong>{selectedT4Event.writeValue}</strong>
                <span>Memoria[{selectedT4Event.address.row}][{selectedT4Event.address.col}]</span>
              </article>
            </div>

            <div className="tte-memory-transition">
              <div>
                <h4>Memoria prima del tick {selectedT4Event.tick}</h4>
                <Matrix matrix={selectedT4Event.memoryBefore} />
              </div>

              <div className="tte-write-arrow" aria-label="Scrittura nella memoria">
                <span>scrive</span>
                <b>{selectedT4Event.writeValue}</b>
                <small>riga {selectedT4Event.address.row}, colonna {selectedT4Event.address.col}</small>
                <i aria-hidden="true">→</i>
              </div>

              <div>
                <h4>Memoria dopo il tick {selectedT4Event.tick}</h4>
                <Matrix matrix={selectedT4Event.memoryAfter} highlight={selectedT4Event.address} />
              </div>
            </div>

            <p className="tte-step-note">
              {selectedT4IsPending
                ? "La memoria a sinistra coincide con lo stato corrente. Premendo + Tick, il risultato evidenziato verrà scritto nella posizione indicata."
                : "Gli otto risultati sono stati scritti. La matrice di destra mostra lo stato finale prodotto dal motore T4."}
            </p>
          </section>

          <h3 className="tte-history-title">Sequenza completa degli otto tick</h3>
          <div className="table-wrap">
            <table className="tte-history-table">
              <thead>
                <tr>
                  <th>Tick</th>
                  <th>Locus</th>
                  <th>Partner</th>
                  <th>Calcolo</th>
                  <th>Write</th>
                  <th>Indirizzo</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {complete.history.map((event) => {
                  const state = event.tick < tick ? "done" : event.tick === selectedT4Event.tick ? "current" : "future";
                  return (
                    <tr className={`tte-event-${state}`} key={event.tick}>
                      <td>{event.tick}</td>
                      <td>
                        {locusDescriptor(event.locusIndex).label}={event.locusValue}
                        <small>{locusDescriptor(event.locusIndex).fullLabel}</small>
                      </td>
                      <td>
                        {locusDescriptor(event.partnerIndex).label}={event.partnerValue}
                        <small>{locusDescriptor(event.partnerIndex).fullLabel}</small>
                      </td>
                      <td>{event.locusValue} XOR {event.partnerValue}</td>
                      <td><b>{event.writeValue}</b></td>
                      <td>({event.address.row},{event.address.col})</td>
                      <td>
                        <span className={`tte-state-badge ${state}`}>
                          {state === "done" ? "Eseguito" : state === "current" ? (selectedT4IsPending ? "Corrente" : "Ultimo") : "Futuro"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "Memoria" && (
        <>
          <SectionExplanation
            badge="MEM"
            title="Perché la cellula possiede una memoria?"
            natural="Nelle cellule naturali lo stato presente dipende da RNA, proteine, concentrazioni molecolari e modificazioni epigenetiche accumulate nel tempo. Cellule con lo stesso DNA possono quindi comportarsi diversamente."
          >
            La memoria 4×4 conserva gli esiti prodotti dai tick. È separata dal genoma: il DNA resta stabile, mentre lo stato interno si costruisce progressivamente e viene poi letto come MessageData.
          </SectionExplanation>

          <div className="memory-layout">
            <Card
              title="Come si costruisce la memoria"
              subtitle="Il pannello segue la scrittura eseguita dal motore fino al tick selezionato."
              className="memory-explainer"
            >
              <div className="memory-step-list">
                <div className="memory-step">
                  <span className="memory-step-number">1</span>
                  <div>
                    <h3>Il motore confronta due loci</h3>
                    <p>Al tick corrente viene letto un locus e il partner distante due posizioni. La XOR produce il bit da memorizzare.</p>
                  </div>
                </div>

                <div className="memory-step">
                  <span className="memory-step-number">2</span>
                  <div>
                    <h3>Il tick determina l’indirizzo</h3>
                    <p><code>riga = tick mod 4</code> e <code>colonna = floor(tick / 4)</code>. I tick 0–3 riempiono la prima colonna; i tick 4–7 la seconda.</p>
                  </div>
                </div>

                <div className="memory-step">
                  <span className="memory-step-number">3</span>
                  <div>
                    <h3>Il risultato viene conservato</h3>
                    <p>La cella evidenziata è l’ultima posizione scritta. Le altre celle già compilate conservano i risultati dei tick precedenti.</p>
                  </div>
                </div>

                <div className="memory-step">
                  <span className="memory-step-number">4</span>
                  <div>
                    <h3>La memoria diventa MessageData</h3>
                    <p>I primi otto slot utili vengono letti in ordine e formano il messaggio interno usato per costruire il codice PF8.</p>
                  </div>
                </div>
              </div>

              {cell.history.length > 0 ? (() => {
                const event = cell.history.at(-1);
                const source = locusDescriptor(event.locusIndex);
                const partner = locusDescriptor(event.partnerIndex);

                return (
                  <div className="memory-current-write">
                    <span className="memory-current-label">Ultima scrittura eseguita</span>
                    <p>
                      Tick <b>{event.tick}</b>: {source.label} = {event.locusValue} XOR {partner.label} = {event.partnerValue}
                      {" "}→ <strong>{event.writeValue}</strong> in M[{event.address.row},{event.address.col}]
                    </p>
                  </div>
                );
              })() : (
                <div className="memory-current-write memory-current-write--empty">
                  <span className="memory-current-label">Nessuna scrittura</span>
                  <p>Il tick è 0: la memoria è ancora vuota. Premi <b>+ Tick</b> per eseguire la prima operazione.</p>
                </div>
              )}

              <div className="memory-visual-block">
                <h3>Memoria al tick {tick}</h3>
                <Matrix
                  matrix={cell.memory}
                  highlight={cell.history.at(-1)?.address}
                  showCoordinates
                />
                <p className="memory-legend">
                  <span><i className="memory-legend-swatch memory-legend-swatch--on" /> bit attivo (1)</span>
                  <span><i className="memory-legend-swatch memory-legend-swatch--off" /> bit inattivo (0)</span>
                  <span><i className="memory-legend-swatch memory-legend-swatch--last" /> ultima cella scritta</span>
                </p>
              </div>
            </Card>

            <Card
              title="Stato sintetico"
              subtitle="Le sole informazioni necessarie per leggere lo stato corrente."
              className="memory-summary"
            >
              <div className="memory-summary-grid">
                <Metric label="Avanzamento" value={`${tick}/8 tick`} />
                <Metric label="Scritture eseguite" value={cell.history.length} />
                <Metric label="Bit attivi" value={cell.inspection.memoryMass} />
                <Metric label="Ultimo indirizzo" value={cell.history.length ? `M[${cell.history.at(-1).address.row},${cell.history.at(-1).address.col}]` : "—"} />
              </div>

              <div className="memory-message-summary">
                <span>MessageData corrente</span>
                <Bits values={cell.messageData} />
                <code>{cell.messageData.join("")}</code>
              </div>

              <div className="memory-progress-track" aria-label={`Sviluppo memoria ${tick} su 8 tick`}>
                <span style={{ width: `${(tick / 8) * 100}%` }} />
              </div>

              <div className="memory-recent-events">
                <h3>Ultime operazioni</h3>
                {cell.history.length ? (
                  <ul>
                    {cell.history.slice(-3).reverse().map((event) => (
                      <li key={event.tick}>
                        <b>T{event.tick}</b>
                        <span>{event.locusValue} XOR {event.partnerValue} = {event.writeValue}</span>
                        <code>M[{event.address.row},{event.address.col}]</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="memory-empty-state">Nessuna operazione eseguita.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === "PF8" && (
        <>
          <SectionExplanation
            badge="PF8"
            title="Come nasce la posizione nella matrice?"
            natural="In biologia molti stati molecolari differenti possono convergere verso un numero limitato di identità cellulari. PF8 rappresenta questa convergenza come uno spazio discreto di sessantaquattro esiti."
          >
            I primi sei bit di MessageData formano il codice PF8. I primi tre indicano la riga e gli ultimi tre la colonna. La cella evidenziata identifica il fenotipo corrente e il suo peso nello spazio genomico.
          </SectionExplanation>
          <div className="dashboard">
          <Card title="Codifica PF8">
            <p className="bigcode">
              {complete.pf8.rowBits} | {complete.pf8.colBits}
            </p>
            <div className="metrics">
              <Metric label="Codice" value={complete.code} />
              <Metric label="Riga" value={complete.pf8.row} />
              <Metric label="Colonna" value={complete.pf8.col} />
              <Metric label="Genomi associati" value={fmt.format(profile.count)} />
              <Metric label="Probabilità" value={pct.format(profile.probability)} />
              <Metric label="Rango" value={`${profile.rank}/64`} />
            </div>
          </Card>
          <Card title="Matrice PF8 completa" className="wide">
            <PF8Grid counts={db.pf8.counts} active={complete.pf8} />
          </Card>
          </div>
        </>
      )}

      {tab === "Fenotipo" && (
        <>
          <SectionExplanation
            badge="PHENO"
            title="Che cosa rappresenta il fenotipo?"
            natural="Il fenotipo reale nasce dall’interazione fra genotipo, sviluppo e ambiente. Anche individui geneticamente simili possono manifestare differenze per effetto della regolazione e delle condizioni di vita."
          >
            Il codice PF8 viene decodificato in sei caratteri binari e mostrato mediante l’avatar. L’immagine è una rappresentazione simbolica del risultato finale, non una ricostruzione anatomica o genetica completa.
          </SectionExplanation>
          <section className="phenotype-laboratory" aria-label="Laboratorio del fenotipo">
          <PhenotypeAvatar phenotype={phenotype} code={complete.code} />

          <Card
            title="Phenotype Laboratory"
            subtitle="Il codice PF8 corrente viene tradotto in sei caratteri osservabili."
            className="phenotype-details-card"
          >
            <div className="phenotype-intro">
              <p>
                L’avatar mostra il risultato completo dello sviluppo T4. Colore della
                pelle, forma dei capelli, colore degli occhi e presenza degli occhiali
                cambiano direttamente con i bit del fenotipo.
              </p>
              <div className="phenotype-code-strip">
                <span>Codice corrente</span>
                <b>{complete.code}</b>
                <small>PF8 ({complete.pf8.row}, {complete.pf8.col})</small>
              </div>
            </div>

            <div className="phenotype">
              {phenotype.map((trait) => (
                <article key={trait.axis}>
                  <div
                    className={`trait-icon ${
                      trait.axis === "sesso"
                        ? `sex-origin ${trait.key === "femmina" ? "maternal" : "paternal"}`
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    {trait.icon}
                  </div>
                  <div className="trait-copy">
                    <span>{trait.axis}</span>
                    <b>{trait.label}</b>
                    <small>
                      bit {trait.bit}
                      {trait.culturalModel ? ` · ${trait.culturalModel}` : ""}
                      {trait.description ? ` · ${trait.description}` : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </Card>
          </section>
        </>
      )}

      {tab === "Ispezione" && (
        <Card title="Internal Inspection">
          <SectionExplanation
            badge="CHECK"
            title="Che cosa significa ispezionare la cellula?"
            natural="Una cellula reale mantiene l’omeostasi controllando energia, pH, ioni e integrità delle strutture. Qui il controllo è più semplice: verifica che lo sviluppo sia terminato e che il risultato sia coerente e leggibile."
          >
            L’ispezione riassume completezza, stabilità, quantità di bit attivi e disponibilità del fenotipo. Non cambia la cellula: osserva e diagnostica lo stato prodotto fino al tick corrente.
          </SectionExplanation>
          <div className="metrics">
            <Metric label="Stato" value={cell.inspection.status} />
            <Metric label="Completa" value={String(cell.inspection.complete)} />
            <Metric label="Stabile" value={String(cell.inspection.stable)} />
            <Metric
              label="Fenotipo pronto"
              value={String(cell.inspection.phenotypeReady)}
            />
            <Metric label="Massa memoria" value={cell.inspection.memoryMass} />
            <Metric label="Celle occupate" value={cell.inspection.occupiedCells} />
            <Metric label="Massa messaggio" value={cell.inspection.messageMass} />
            <Metric
              label="Note"
              value={cell.inspection.notes.join(", ") || "nessuna"}
            />
          </div>
          <p className="cross-tab-link">
            Questa è un'istantanea della cellula in un istante fisso. Il tab{" "}
            <button type="button" className="link-button" onClick={() => setTab("Replicazione")}>
              Replicazione
            </button>{" "}
            mostra la stessa diagnosi ripetuta su più generazioni consecutive — cosa succede quando questo stato diventa il punto di partenza della cellula successiva.
          </p>
        </Card>
      )}

      {tab === "Statistiche" && (
        <>
          <SectionExplanation
            badge="DATA"
            title="Perché alcuni fenotipi sono più frequenti?"
            natural="Anche in natura le combinazioni genetiche e fenotipiche non sono distribuite uniformemente. Vincoli ereditari, sviluppo e selezione rendono alcuni esiti più comuni, robusti o accessibili di altri."
          >
            Il database conta quanti genomi conducono a ciascuna cella PF8. Frequenza, rango, entropia e deviazione standard descrivono la geometria complessiva del modello, non la frequenza reale dei caratteri umani.
          </SectionExplanation>
          <div className="dashboard">
          <Card title="Database PF8">
            <div className="metrics">
              <Metric label="Spazio genomico" value={fmt.format(db.genomeSpace.valid)} />
              <Metric label="Entropia" value={db.statistics.entropy.toFixed(4)} />
              <Metric
                label="Media per cella"
                value={fmt.format(Math.round(db.statistics.mean))}
              />
              <Metric
                label="Deviazione standard"
                value={fmt.format(Math.round(db.statistics.standardDeviation))}
              />
              <Metric
                label="Massimo"
                value={`${db.statistics.max.code}: ${fmt.format(db.statistics.max.count)}`}
              />
              <Metric
                label="Minimo"
                value={`${db.statistics.min.code}: ${fmt.format(db.statistics.min.count)}`}
              />
            </div>
          </Card>
          <Card title="Profilo del fenotipo corrente">
            <div className="metrics">
              <Metric label="Codice" value={complete.code} />
              <Metric label="Conteggio" value={fmt.format(profile.count)} />
              <Metric label="Quota" value={pct.format(profile.probability)} />
              <Metric label="Rango" value={profile.rank} />
              <Metric label="Z-score" value={profile.zScore.toFixed(3)} />
            </div>
          </Card>
          <Card title="Heatmap PF8" className="wide">
            <PF8Grid counts={db.pf8.counts} active={complete.pf8} />
          </Card>
          </div>
        </>
      )}

      {tab === "Replicazione" && (
        <>
          <SectionExplanation
            badge="TTA"
            title="Che cos'è la replicazione per auto-ispezione?"
            natural="Nel Tom Thumb Algorithm applicato all'Universal Constructor di von Neumann, l'organismo non ripete un genoma fisso a ogni replicazione: copia il proprio stato attuale, mutazioni comprese. Qui la stessa idea è applicata al motore TTE-T4."
          >
            Il MessageData calcolato da una generazione diventa, tramite ricodifica omozigote, il genoma della generazione successiva. Senza mutazioni la linea collassa sempre a zero entro la generazione 3. Con mutazione ogni N generazioni: N≤3 mantiene la linea sempre viva, N≥4 introduce esattamente N−3 generazioni di silenzio per ciclo prima della resurrezione.
          </SectionExplanation>

          <button
            type="button"
            className="storyboard-cta"
            onClick={() => setStoryboardOpen(true)}
          >
            <span className="storyboard-cta-icon" aria-hidden="true">📖</span>
            <span className="storyboard-cta-copy">
              <b>Racconta la storia</b>
              <small>Nascita, senescenza, rinascita — 7 pannelli con l'analogia del limite di Hayflick</small>
            </span>
          </button>

          <section className="toolbar" aria-label="Controlli della replicazione">
            <div className="toolbar-actions">
              <label>
                <span>Generazioni</span>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={lineageLength}
                  onChange={(event) =>
                    setLineageLength(Math.max(1, Math.min(40, Number(event.target.value) || 1)))
                  }
                />
              </label>
              <label>
                <span>Muta ogni N generazioni (0 = mai)</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={mutateEvery}
                  onChange={(event) => setMutateEvery(Math.max(0, Number(event.target.value) || 0))}
                />
              </label>
              <p className="mutation-preview">
                {mutateEvery === 0
                  ? "Nessuna mutazione: la linea collassa a zero entro la generazione 3 e non si riprende più."
                  : expectedSilentWindow(mutateEvery) === 0
                  ? `Con N=${mutateEvery}, la linea non muore mai (0 generazioni silenti per ciclo).`
                  : `Con N=${mutateEvery}, attese ${expectedSilentWindow(mutateEvery)} generazion${expectedSilentWindow(mutateEvery) === 1 ? "e" : "i"} silenzios${expectedSilentWindow(mutateEvery) === 1 ? "a" : "e"} per ciclo prima della resurrezione.`}
              </p>
              <button type="button" onClick={() => setLineageSeed((s) => s + 1)}>
                Rigenera (nuova mutazione casuale)
              </button>
            </div>
          </section>

          {storyboardOpen ? <StoryboardOverlay onClose={() => setStoryboardOpen(false)} /> : null}

          <div className="dashboard">
            <Card title="Linea di generazioni" className="wide">
              <div className="tick-controls">
                <button
                  type="button"
                  onClick={() => setSelectedGen((g) => Math.max(0, g - 1))}
                  aria-label="Generazione precedente"
                >
                  − Gen
                </button>
                <label>
                  <span>Generazione selezionata</span>
                  <input
                    type="range"
                    min="0"
                    max={lineage.length - 1}
                    value={selectedGen}
                    onChange={(event) => setSelectedGen(Number(event.target.value))}
                  />
                  <b>
                    {selectedGen} / {lineage.length - 1}
                  </b>
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedGen((g) => Math.min(lineage.length - 1, g + 1))}
                  aria-label="Generazione successiva"
                >
                  + Gen
                </button>
              </div>

              <div className="matrix-shell" style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "0.75rem" }}>
                {lineage.map((g, index) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => setSelectedGen(index)}
                    className={`${index === selectedGen ? "active" : ""} ${g.isZeroState ? "off" : "on"}`}
                    title={
                      g.isZeroState
                        ? `Generazione ${index}: stato silente`
                        : `Generazione ${index}${g.mutation ? " · mutazione" : ""}`
                    }
                    aria-label={`Vai alla generazione ${index}`}
                  >
                    {index}
                    {g.mutation ? " •" : ""}
                  </button>
                ))}
              </div>
            </Card>

            <Card
              title={`Generazione ${selectedGeneration.generation}`}
              subtitle={
                selectedGeneration.mutation
                  ? `Mutazione sul locus ${selectedGeneration.mutation.locus}: ${selectedGeneration.mutation.from} → ${selectedGeneration.mutation.to}`
                  : "Nessuna mutazione in questa generazione"
              }
            >
              <p>MessageData (evidenziati i bit cambiati rispetto al genitore):</p>
              <DiffBits values={selectedGeneration.cell.messageData} diffFlags={selectedDiff} />
              <div className="metrics">
                <Metric label="Codice PF8" value={selectedGeneration.cell.code} />
                <Metric label="Stato" value={selectedGeneration.isZeroState ? "Silente (zero)" : "Attivo"} />
                <Metric
                  label="Generazioni al silenzio"
                  value={
                    generationsUntilSilenceDisplay(lineage, selectedGen)
                  }
                />
              </div>
            </Card>

            <Card title="Genoma ricodificato (omozigote)" className="wide">
              <Matrix matrix={selectedGeneration.genome} showCoordinates />
            </Card>

            <Card
              title="Percorso PF8 della lineage"
              subtitle="Ogni generazione calcolata lascia un segno; il riquadro dorato è la generazione selezionata sopra."
              className="wide"
            >
              <PF8Grid
                counts={db.pf8.counts}
                active={selectedGeneration.cell.pf8}
                trail={lineage.map((g) => ({
                  row: g.cell.pf8.row,
                  col: g.cell.pf8.col,
                  generation: g.generation,
                  isZeroState: g.isZeroState,
                }))}
              />
            </Card>
          </div>
        </>
      )}

      {helpOpen ? <HelpModal tab={tab} onClose={() => setHelpOpen(false)} /> : null}

      <footer>
        Il motore implementa fedelmente la pipeline T4 fornita. Il dizionario
        fenotipico PF8 è separato dal motore T4 e può essere esteso senza modificarne
        le regole.
      </footer>
    </main>
  );
}
