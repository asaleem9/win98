'use client';

// Inline SVG diagrams for the encyclopedia's "media boxes" — the little
// illustrated panels that gave the multimedia encyclopedias of the era their
// charm. Each is hand-drawn as a labelled schematic and keyed by IllustrationKey
// so an article can name one in its `media` field.

import type { IllustrationKey } from './articles';

const SVG_PROPS = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '100%',
  style: { maxWidth: 340, height: 'auto', display: 'block', margin: '0 auto' } as const,
};

// Small serif label used throughout the diagrams.
function Label({ x, y, children, anchor = 'middle', size = 9 }: { x: number; y: number; children: string; anchor?: 'start' | 'middle' | 'end'; size?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontFamily="Georgia, 'Times New Roman', serif" fill="#1a1a3a">
      {children}
    </text>
  );
}

function SolarSystem() {
  const planets: { name: string; r: number; fill: string }[] = [
    { name: 'Mer', r: 3, fill: '#b9a179' },
    { name: 'Ven', r: 5, fill: '#e5c37a' },
    { name: 'Earth', r: 5, fill: '#3a7bd5' },
    { name: 'Mars', r: 4, fill: '#c1440e' },
    { name: 'Jup', r: 12, fill: '#d8b98a' },
    { name: 'Sat', r: 10, fill: '#e3d2a0' },
    { name: 'Ura', r: 7, fill: '#a6e0e0' },
    { name: 'Nep', r: 7, fill: '#3f54c0' },
    { name: 'Pluto', r: 2, fill: '#cbb8a0' },
  ];
  let x = 58;
  const cy = 78;
  return (
    <svg viewBox="0 0 340 150" {...SVG_PROPS} role="img" aria-label="The Sun and the nine planets in order">
      <rect width="340" height="150" fill="#05060f" />
      <circle cx="18" cy={cy} r="30" fill="#ffcf3f" />
      <circle cx="18" cy={cy} r="30" fill="url(#sunGlow)" opacity="0.5" />
      <defs>
        <radialGradient id="sunGlow"><stop offset="55%" stopColor="#ffcf3f" /><stop offset="100%" stopColor="#ff8a00" /></radialGradient>
      </defs>
      <text x="18" y={cy + 3} textAnchor="middle" fontSize="8" fontFamily="Georgia, serif" fill="#5a3a00" fontWeight="bold">SUN</text>
      {planets.map((p) => {
        x += p.r + 12;
        const px = x;
        x += p.r;
        return (
          <g key={p.name}>
            <circle cx={px} cy={cy} r={p.r} fill={p.fill} stroke="#000" strokeWidth="0.4" />
            {p.name === 'Sat' && <ellipse cx={px} cy={cy} rx={p.r + 5} ry="2.5" fill="none" stroke="#e3d2a0" strokeWidth="1.2" />}
            <text x={px} y={cy + p.r + 11} textAnchor="middle" fontSize="7.5" fontFamily="Georgia, serif" fill="#dfe6ff">{p.name}</text>
          </g>
        );
      })}
      <text x="170" y="140" textAnchor="middle" fontSize="8" fontFamily="Georgia, serif" fill="#8fa0d8" fontStyle="italic">not drawn to scale</text>
    </svg>
  );
}

function DinoScale() {
  return (
    <svg viewBox="0 0 340 180" {...SVG_PROPS} role="img" aria-label="Size comparison of Brachiosaurus, Tyrannosaurus and a human">
      <rect width="340" height="180" fill="#eaf3e2" />
      {/* ground */}
      <line x1="0" y1="158" x2="340" y2="158" stroke="#7a8a5a" strokeWidth="2" />
      {/* Brachiosaurus */}
      <g fill="#6f8f4f" stroke="#3d5a2a" strokeWidth="1">
        <path d="M40 158 C40 120 44 96 60 70 C66 60 70 44 82 40 C90 37 96 44 92 52 C88 60 80 62 78 74 C90 96 96 124 96 158 Z" />
        <path d="M92 152 C120 150 140 150 150 156 L150 158 L96 158 Z" />
      </g>
      <Label x={70} y={30}>Brachiosaurus</Label>
      <Label x={70} y={172}>~13 m tall</Label>
      {/* T. rex */}
      <g fill="#a9662f" stroke="#5c3413" strokeWidth="1">
        <path d="M190 158 C186 138 190 120 204 112 C214 106 232 108 240 116 C246 110 256 108 258 114 C252 118 246 118 244 122 C246 134 240 146 232 152 C238 152 240 158 240 158 Z" />
        <path d="M198 138 l-8 8 l6 2 Z" />
      </g>
      <Label x={222} y={96}>Tyrannosaurus rex</Label>
      <Label x={222} y={172}>~6 m tall</Label>
      {/* Human */}
      <g fill="#2a3a6a">
        <circle cx="300" cy="146" r="3.4" />
        <rect x="297.6" y="149" width="4.8" height="9" rx="1.5" />
      </g>
      <Label x={300} y={172}>Human (~1.8 m)</Label>
    </svg>
  );
}

function Modem() {
  return (
    <svg viewBox="0 0 340 150" {...SVG_PROPS} role="img" aria-label="How a modem connects a computer to the Internet">
      <rect width="340" height="150" fill="#f4f4ec" />
      {/* Computer */}
      <rect x="14" y="46" width="46" height="36" rx="2" fill="#c9c3a6" stroke="#6b6650" strokeWidth="1.4" />
      <rect x="19" y="51" width="36" height="24" fill="#183018" />
      <text x="37" y="66" textAnchor="middle" fontSize="12" fill="#4bd44b" fontFamily="monospace">1010</text>
      <Label x={37} y={98}>Computer</Label>
      <Label x={37} y={110} size={8}>(digital data)</Label>
      {/* arrow to modem */}
      <line x1="62" y1="64" x2="96" y2="64" stroke="#333" strokeWidth="1.4" markerEnd="url(#arw)" />
      {/* Modem */}
      <rect x="100" y="52" width="52" height="24" rx="2" fill="#3a3f4a" stroke="#111" strokeWidth="1.4" />
      <circle cx="110" cy="64" r="2" fill="#4bd44b" />
      <circle cx="118" cy="64" r="2" fill="#e0b020" />
      <text x="136" y="67" textAnchor="middle" fontSize="7" fill="#cfd6e2" fontFamily="Georgia, serif">MODEM</text>
      <Label x={126} y={92}>Modem</Label>
      {/* squiggle = sound down phone line */}
      <path d="M154 64 q6 -8 12 0 t12 0 t12 0 t12 0" fill="none" stroke="#b0432f" strokeWidth="1.6" />
      <Label x={186} y={50} size={8}>≈ screech ≈</Label>
      {/* phone line to cloud */}
      <line x1="204" y1="64" x2="236" y2="64" stroke="#333" strokeWidth="1.4" markerEnd="url(#arw)" />
      {/* Internet cloud */}
      <g>
        <ellipse cx="288" cy="62" rx="40" ry="22" fill="#dbe6ff" stroke="#3a5aa0" strokeWidth="1.4" />
        <text x="288" y="60" textAnchor="middle" fontSize="10" fontFamily="Georgia, serif" fill="#20306a" fontWeight="bold">The</text>
        <text x="288" y="72" textAnchor="middle" fontSize="10" fontFamily="Georgia, serif" fill="#20306a" fontWeight="bold">Internet</text>
      </g>
      <Label x={186} y={112} size={8}>telephone line carries the data as sound</Label>
      <defs>
        <marker id="arw" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="#333" /></marker>
      </defs>
    </svg>
  );
}

function Heart() {
  return (
    <svg viewBox="0 0 300 190" {...SVG_PROPS} role="img" aria-label="The four chambers of the human heart">
      <rect width="300" height="190" fill="#fff4f4" />
      {/* right side (blue, deoxygenated) */}
      <path d="M150 30 C120 26 96 44 96 80 C96 120 120 150 150 170 L150 30 Z" fill="#5a8fd6" stroke="#2a4a80" strokeWidth="1.4" />
      {/* left side (red, oxygenated) */}
      <path d="M150 30 C180 26 204 44 204 80 C204 120 180 150 150 170 L150 30 Z" fill="#d65a5a" stroke="#802a2a" strokeWidth="1.4" />
      {/* chamber divides */}
      <line x1="150" y1="30" x2="150" y2="170" stroke="#5a2a2a" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="112" y1="92" x2="150" y2="92" stroke="#2a4a80" strokeWidth="0.8" />
      <line x1="150" y1="92" x2="188" y2="92" stroke="#802a2a" strokeWidth="0.8" />
      {/* vessels */}
      <rect x="132" y="16" width="7" height="18" fill="#5a8fd6" stroke="#2a4a80" strokeWidth="1" />
      <rect x="161" y="16" width="7" height="18" fill="#d65a5a" stroke="#802a2a" strokeWidth="1" />
      <Label x={118} y={70} size={8}>R. atrium</Label>
      <Label x={118} y={128} size={8}>R. ventricle</Label>
      <Label x={182} y={70} size={8}>L. atrium</Label>
      <Label x={182} y={128} size={8}>L. ventricle</Label>
      <Label x={80} y={30} anchor="start" size={8}>from body →</Label>
      <Label x={220} y={30} anchor="end" size={8}>→ to body</Label>
    </svg>
  );
}

function Volcano() {
  return (
    <svg viewBox="0 0 320 190" {...SVG_PROPS} role="img" aria-label="Cross-section of a volcano">
      <rect width="320" height="190" fill="#bfe0ef" />
      {/* ash cloud */}
      <g fill="#8a8a8a" opacity="0.85">
        <ellipse cx="160" cy="26" rx="34" ry="16" />
        <ellipse cx="140" cy="36" rx="24" ry="12" />
        <ellipse cx="184" cy="36" rx="22" ry="12" />
      </g>
      <Label x={230} y={26} anchor="start" size={8}>ash cloud</Label>
      {/* cone (layered) */}
      <polygon points="160,44 60,178 260,178" fill="#7a5a3a" stroke="#3e2a18" strokeWidth="1.4" />
      <polyline points="96,138 160,110 224,138" fill="none" stroke="#5c4028" strokeWidth="1" />
      <polyline points="112,158 160,140 208,158" fill="none" stroke="#5c4028" strokeWidth="1" />
      {/* vent + lava */}
      <path d="M156 44 L164 44 L172 178 L148 178 Z" fill="#b0432f" />
      <path d="M160 44 q-6 -14 -2 -22 q6 8 2 22" fill="#ff7a2f" stroke="#c0400f" strokeWidth="1" />
      {/* magma chamber */}
      <ellipse cx="160" cy="176" rx="46" ry="16" fill="#e04a10" opacity="0.9" />
      <Label x={160} y={180} size={8}>magma chamber</Label>
      <Label x={196} y={92} anchor="start" size={8}>central vent</Label>
      <line x1="176" y1="90" x2="166" y2="96" stroke="#333" strokeWidth="0.8" />
    </svg>
  );
}

function Photosynthesis() {
  return (
    <svg viewBox="0 0 320 190" {...SVG_PROPS} role="img" aria-label="How a leaf makes food by photosynthesis">
      <rect width="320" height="190" fill="#eef7ff" />
      {/* sun */}
      <circle cx="46" cy="40" r="20" fill="#ffcf3f" stroke="#e0a000" strokeWidth="1.2" />
      {[...Array(8)].map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={46 + Math.cos(a) * 24} y1={40 + Math.sin(a) * 24} x2={46 + Math.cos(a) * 30} y2={40 + Math.sin(a) * 30} stroke="#ffcf3f" strokeWidth="2" />;
      })}
      <Label x={46} y={78}>sunlight</Label>
      {/* leaf */}
      <path d="M150 120 C150 70 200 60 240 70 C246 110 210 140 160 138 Z" fill="#4c9a3a" stroke="#2f6b22" strokeWidth="1.4" />
      <path d="M158 132 C185 112 210 96 236 76" fill="none" stroke="#2f6b22" strokeWidth="1" />
      {/* stem */}
      <line x1="150" y1="120" x2="150" y2="176" stroke="#5a7a2a" strokeWidth="3" />
      {/* CO2 in */}
      <line x1="112" y1="104" x2="150" y2="104" stroke="#555" strokeWidth="1.4" markerEnd="url(#psarw)" />
      <Label x={108} y={104} anchor="end" size={8}>CO₂ in</Label>
      {/* O2 out */}
      <line x1="240" y1="90" x2="278" y2="76" stroke="#2a7a2a" strokeWidth="1.4" markerEnd="url(#psarw)" />
      <Label x={282} y={72} anchor="start" size={8}>O₂ out</Label>
      {/* water up */}
      <line x1="150" y1="176" x2="150" y2="140" stroke="#2a6ad0" strokeWidth="1.4" markerEnd="url(#psarw)" />
      <Label x={158} y={168} anchor="start" size={8}>water up</Label>
      <Label x={214} y={128} size={8}>→ sugar (food)</Label>
      <defs>
        <marker id="psarw" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="#555" /></marker>
      </defs>
    </svg>
  );
}

function CompactDisc() {
  return (
    <svg viewBox="0 0 320 170" {...SVG_PROPS} role="img" aria-label="A laser reading the pits on a compact disc">
      <rect width="320" height="170" fill="#f0f0f4" />
      {/* disc seen on edge + face */}
      <ellipse cx="150" cy="60" rx="110" ry="26" fill="url(#cdSheen)" stroke="#8a8ab0" strokeWidth="1.2" />
      <ellipse cx="150" cy="60" rx="18" ry="5" fill="#f0f0f4" stroke="#8a8ab0" strokeWidth="1" />
      <defs>
        <linearGradient id="cdSheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c9d6ff" /><stop offset="30%" stopColor="#ffd6f0" /><stop offset="55%" stopColor="#d6ffe0" /><stop offset="80%" stopColor="#fff3c0" /><stop offset="100%" stopColor="#c9d6ff" />
        </linearGradient>
      </defs>
      {/* pit track hint */}
      <ellipse cx="150" cy="60" rx="70" ry="16" fill="none" stroke="#9090b0" strokeWidth="0.6" strokeDasharray="2 3" />
      <ellipse cx="150" cy="60" rx="46" ry="10" fill="none" stroke="#9090b0" strokeWidth="0.6" strokeDasharray="2 3" />
      <Label x={150} y={30}>spiral track of microscopic pits</Label>
      {/* laser from below */}
      <polygon points="150,88 144,150 156,150" fill="#ff3a3a" opacity="0.6" />
      <circle cx="150" cy="150" r="6" fill="#b01010" stroke="#600" strokeWidth="1" />
      <Label x={150} y={166}>laser beam reads the disc as it spins</Label>
    </svg>
  );
}

const ILLUSTRATIONS: Record<IllustrationKey, () => React.ReactElement> = {
  'solar-system': SolarSystem,
  'dino-scale': DinoScale,
  modem: Modem,
  heart: Heart,
  volcano: Volcano,
  photosynthesis: Photosynthesis,
  'compact-disc': CompactDisc,
};

export function Illustration({ name }: { name: IllustrationKey }) {
  const Component = ILLUSTRATIONS[name];
  return <Component />;
}

export { ILLUSTRATIONS };
