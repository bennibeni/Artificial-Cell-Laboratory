// Ritratto del fenotipo PF8 basato sull'atlas fotografico condiviso con
// gli altri progetti della suite (Cheat Stories, R22/R23).
//
// Le 64 combinazioni sono ritagliate una volta per tutte come file
// singoli (vedi public/avatars/), non più via background-position su
// uno sprite-sheet: la griglia originale dell'atlas non è perfettamente
// uniforme (le celle non sono tutte esattamente larghe 1/4 e alte 1/4
// dell'immagine), quindi il ritaglio "ingenuo" per divisione lasciava
// uno spicchio della cella adiacente visibile ai bordi. Ritagliando in
// anticipo sui veri confini di ciascuna cella si ottiene un'immagine
// già centrata e pulita, senza calcoli percentuali nel browser.

function avatarFileName({ pelle, occhi, sesso, capelli, visione, lattosio }) {
  return `/avatars/${pelle}-${occhi}-${sesso}-${capelli}-${visione}-${lattosio}.png`;
}

function TraitBadge({ icon, label }) {
  return (
    <span className="avatar-trait-badge">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

export default function PhenotypeAvatar({ phenotype, code }) {
  const byAxis = Object.fromEntries(phenotype.map((trait) => [trait.axis, trait]));
  const female = byAxis.sesso?.key === "femmina";
  const darkSkin = byAxis.pelle?.key === "scura";
  const curlyHair = byAxis.capelli?.key === "ricci";
  const greenEyes = byAxis.occhi?.key === "verdi";
  const lactoseIntolerant = byAxis.lattosio?.key !== "tollerante";
  const colorBlindness = byAxis.visione?.key === "daltonismo";

  const avatarSrc = avatarFileName({
    pelle: darkSkin ? "scura" : "chiara",
    occhi: greenEyes ? "verdi" : "marroni",
    sesso: female ? "F" : "M",
    capelli: curlyHair ? "ricci" : "lisci",
    visione: colorBlindness ? "daltonismo" : "normale",
    lattosio: lactoseIntolerant ? "intollerante" : "tollerante",
  });

  return (
    <figure className="phenotype-avatar-card">
      <div className="avatar-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="phenotype-avatar-photo"
          src={avatarSrc}
          alt={`Avatar del fenotipo PF8 ${code}`}
        />
      </div>

      <figcaption>
        <p className="avatar-code">PF8 · {code}</p>
        <h3>Avatar corrente</h3>
        <div className="avatar-badges">
          {byAxis.sesso ? <TraitBadge icon={byAxis.sesso.icon} label={byAxis.sesso.label} /> : null}
          {byAxis.pelle ? <TraitBadge icon={byAxis.pelle.icon} label={byAxis.pelle.label} /> : null}
          {byAxis.capelli ? <TraitBadge icon={byAxis.capelli.icon} label={byAxis.capelli.label} /> : null}
          {byAxis.occhi ? <TraitBadge icon={byAxis.occhi.icon} label={byAxis.occhi.label} /> : null}
          {byAxis.lattosio ? <TraitBadge icon={byAxis.lattosio.icon} label={byAxis.lattosio.label} /> : null}
          {byAxis.visione ? <TraitBadge icon={byAxis.visione.icon} label={byAxis.visione.label} /> : null}
        </div>
      </figcaption>
    </figure>
  );
}
