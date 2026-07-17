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
  const lactoseTolerant = byAxis.lattosio?.key === "tollerante";
  const colorBlindness = byAxis.visione?.key === "daltonismo";

  const skin = darkSkin ? "#82563f" : "#f0c7a8";
  const skinShadow = darkSkin ? "#674230" : "#d9a98a";
  const hair = darkSkin ? "#171313" : "#4a3025";
  const iris = greenEyes ? "#4c9a67" : "#7b4d2c";
  const shirt = female ? "#a44f76" : "#3e6f8f";

  return (
    <figure className="phenotype-avatar-card">
      <div className="avatar-stage">
        <svg
          className="phenotype-avatar"
          viewBox="0 0 320 360"
          role="img"
          aria-label={`Avatar del fenotipo PF8 ${code}`}
        >
          <defs>
            <linearGradient id={`shirt-${code}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor={shirt} />
              <stop offset="1" stopColor="#203f50" />
            </linearGradient>
            <filter id={`shadow-${code}`} x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="9" stdDeviation="8" floodOpacity="0.2" />
            </filter>
          </defs>

          <ellipse cx="160" cy="326" rx="112" ry="22" fill="#163d40" opacity="0.12" />

          <g filter={`url(#shadow-${code})`}>
            <path
              d="M66 338c5-67 42-103 94-103s89 36 94 103"
              fill={`url(#shirt-${code})`}
            />
            <path d="M126 218h68v55c-20 18-48 18-68 0z" fill={skinShadow} />

            {lactoseTolerant ? (
              <g transform="translate(133,252)" stroke="#203f50" strokeWidth="2.5" strokeLinejoin="round">
                <path
                  d="M19 0h16v9l9 11v50a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7V20l9-11z"
                  fill="#fdf6e8"
                />
                <rect x="15" y="0" width="24" height="8" rx="2" fill="#fdf6e8" />
                <path d="M11 44h32" stroke="#8a6b2e" strokeWidth="2" opacity="0.5" />
                <path d="M14 30q13 8 26 0" stroke="#8a6b2e" strokeWidth="2" fill="none" opacity="0.4" />
              </g>
            ) : (
              <g
                transform="translate(131,278)"
                fill="none"
                stroke="#fdf6e8"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M0 -42Q40 0 0 42" />
                <path d="M0 -42L0 42" strokeWidth="2.5" opacity="0.7" />
                <path d="M-4 0H56" strokeWidth="4.5" />
                <path d="M44 -9L63 0L44 9" />
              </g>
            )}
            <ellipse cx="160" cy="138" rx="77" ry="96" fill={skin} />
            <ellipse cx="85" cy="145" rx="13" ry="24" fill={skin} />
            <ellipse cx="235" cy="145" rx="13" ry="24" fill={skin} />

            {curlyHair ? (
              <g>
                <g fill={hair}>
                  <circle cx="160" cy="46" r="21" />
                  {[86, 104, 124, 146, 174, 196, 216, 234].map((x, index) => (
                    <circle
                      key={`curl-${x}`}
                      cx={x}
                      cy={64 + (index % 3) * 6}
                      r={index % 2 === 0 ? 25 : 21}
                    />
                  ))}
                  <circle cx="79" cy="98" r="23" />
                  <circle cx="241" cy="98" r="23" />
                  <circle cx="94" cy="122" r="17" />
                  <circle cx="226" cy="122" r="17" />
                </g>
                <g fill="#000" opacity="0.14">
                  <circle cx="100" cy="70" r="10" />
                  <circle cx="140" cy="56" r="9" />
                  <circle cx="182" cy="60" r="10" />
                  <circle cx="216" cy="76" r="9" />
                  <circle cx="122" cy="94" r="8" />
                  <circle cx="200" cy="96" r="8" />
                  <circle cx="86" cy="112" r="7" />
                  <circle cx="234" cy="112" r="7" />
                </g>
                <g fill="#fff" opacity="0.16">
                  <circle cx="112" cy="54" r="6" />
                  <circle cx="152" cy="44" r="6" />
                  <circle cx="196" cy="52" r="6" />
                  <circle cx="228" cy="68" r="5" />
                  <circle cx="90" cy="78" r="5" />
                  <circle cx="168" cy="34" r="5" />
                </g>
              </g>
            ) : (
              <path
                d="M83 137c-7-71 34-116 80-116 54 0 87 42 77 122-16-13-22-44-24-65-41 21-79 24-121 7-1 20-4 37-12 52z"
                fill={hair}
              />
            )}

            <path d="M116 128q18-11 36 0" fill="none" stroke={hair} strokeWidth="6" strokeLinecap="round" />
            <path d="M168 128q18-11 36 0" fill="none" stroke={hair} strokeWidth="6" strokeLinecap="round" />

            <ellipse cx="134" cy="145" rx="15" ry="12" fill="#fff" />
            <ellipse cx="186" cy="145" rx="15" ry="12" fill="#fff" />
            <circle cx="134" cy="145" r="7" fill={iris} />
            <circle cx="186" cy="145" r="7" fill={iris} />
            <circle cx="134" cy="145" r="3" fill="#152224" />
            <circle cx="186" cy="145" r="3" fill="#152224" />
            <circle cx="131" cy="142" r="1.5" fill="#fff" />
            <circle cx="183" cy="142" r="1.5" fill="#fff" />

            {female ? (
              <g stroke="#2a1a16" strokeWidth="2.2" strokeLinecap="round" fill="none">
                <path d="M121 136l-7-6" />
                <path d="M125 132l-5-7" />
                <path d="M131 130l-3-8" />
                <path d="M199 136l7-6" />
                <path d="M195 132l5-7" />
                <path d="M189 130l3-8" />
              </g>
            ) : null}

            {female ? (
              <g>
                <circle cx="85" cy="177" r="10" fill="#f3c752" stroke="#b9861b" strokeWidth="1.5" />
                <circle cx="82" cy="174" r="2.5" fill="#fff" opacity="0.7" />
                <circle cx="235" cy="177" r="10" fill="#f3c752" stroke="#b9861b" strokeWidth="1.5" />
                <circle cx="232" cy="174" r="2.5" fill="#fff" opacity="0.7" />
              </g>
            ) : null}

            {colorBlindness ? (
              <g fill="none" stroke="#263b43" strokeWidth="5">
                <rect x="108" y="129" width="51" height="34" rx="13" />
                <rect x="161" y="129" width="51" height="34" rx="13" />
                <path d="M159 141h3M108 142l-19-7M212 142l19-7" />
              </g>
            ) : null}

            <path d="M160 151c-4 15-7 25-1 30 5 3 12 2 17-1" fill="none" stroke={skinShadow} strokeWidth="5" strokeLinecap="round" />
            {female ? (
              <path
                d="M112 192c11 5 21 7 48 7s37-2 48-7c-8 22-27 36-48 36s-40-14-48-36z"
                fill="#c81f3f"
              />
            ) : (
              <path d="M129 195q31 24 62 0" fill="none" stroke="#944d54" strokeWidth="6" strokeLinecap="round" />
            )}
          </g>
        </svg>
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
