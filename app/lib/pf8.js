export const PHENOTYPE_AXIS_ORDER = [
  "sesso",
  "pelle",
  "capelli",
  "occhi",
  "lattosio",
  "visione",
];

export const phenotypeAxes = {
  sesso: [
    { key: "femmina", label: "Femmina", icon: "♀️" },
    { key: "maschio", label: "Maschio", icon: "♂️" },
  ],
  pelle: [
    { key: "chiara", label: "Pelle chiara", icon: "⚪" },
    { key: "scura", label: "Pelle scura", icon: "🟤" },
  ],
  capelli: [
    { key: "lisci", label: "Capelli lisci", icon: "〰️" },
    { key: "ricci", label: "Capelli ricci", icon: "🌀" },
  ],
  occhi: [
    { key: "marroni", label: "Occhi marroni", icon: "🌰" },
    { key: "verdi", label: "Occhi verdi", icon: "🍃" },
  ],
  lattosio: [
    {
      key: "non_tollerante",
      label: "Non tollerante",
      culturalModel: "Cacciatrice-raccoglitrice",
      description: "Lattasi non persistente.",
      icon: "🏹",
    },
    {
      key: "tollerante",
      label: "Tollerante",
      culturalModel: "Allevatrice-pastorale",
      description: "Lattasi persistente.",
      icon: "🐐",
    },
  ],
  visione: [
    { key: "normale", label: "Visione normale", icon: "👁️" },
    { key: "daltonismo", label: "Daltonismo", icon: "👓" },
  ],
};

export function normalizePF8Code(code) {
  return String(code).replace(/[^01]/g, "").padEnd(6, "0").slice(0, 6);
}

export function buildPF8Profile(database, code) {
  const normalizedCode = normalizePF8Code(code);
  const count = database.pf8.byCode[normalizedCode] ?? 0;
  const total = database.genomeSpace.valid || database.statistics.total;
  const probability = total ? count / total : 0;
  const ordered = Object.entries(database.pf8.byCode).sort(
    (a, b) => b[1] - a[1],
  );

  return {
    code: normalizedCode,
    count,
    total,
    probability,
    rank: ordered.findIndex(([candidate]) => candidate === normalizedCode) + 1,
    mean: database.statistics.mean,
    zScore: database.statistics.standardDeviation
      ? (count - database.statistics.mean) /
        database.statistics.standardDeviation
      : 0,
    max: database.statistics.max,
    min: database.statistics.min,
  };
}

export function decodePhenotype(code) {
  const normalizedCode = normalizePF8Code(code);
  const bits = normalizedCode.split("").map(Number);

  const traits = PHENOTYPE_AXIS_ORDER.map((axisName, index) => {
    const bit = bits[index];
    return {
      axis: axisName,
      bit,
      ...phenotypeAxes[axisName][bit],
    };
  });

  return {
    code: normalizedCode,
    traits,
    byAxis: Object.fromEntries(traits.map((trait) => [trait.axis, trait])),
  };
}

export function phenotypeDescriptor(code) {
  return decodePhenotype(code).traits;
}
