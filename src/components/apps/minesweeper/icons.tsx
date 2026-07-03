'use client';

export function MineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} width="100%" height="100%">
      <g stroke="#000" strokeWidth="1.4" strokeLinecap="round">
        <line x1="8" y1="0.5" x2="8" y2="15.5" />
        <line x1="0.5" y1="8" x2="15.5" y2="8" />
        <line x1="2.3" y1="2.3" x2="13.7" y2="13.7" />
        <line x1="13.7" y1="2.3" x2="2.3" y2="13.7" />
      </g>
      <circle cx="8" cy="8" r="5" fill="#000" />
      <circle cx="6.2" cy="6.2" r="1.3" fill="#fff" />
    </svg>
  );
}

export function FlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} width="100%" height="100%">
      <rect x="4" y="13" width="8" height="1.6" fill="#000" />
      <line x1="6.5" y1="13.4" x2="6.5" y2="2" stroke="#000" strokeWidth="1.2" />
      <path d="M 7.2 2.2 L 13 4.6 L 7.2 7 Z" fill="#FF0000" stroke="#800000" strokeWidth="0.4" />
    </svg>
  );
}

export function QuestionMark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ color: '#000', fontWeight: 'bold' }}>
      ?
    </span>
  );
}
