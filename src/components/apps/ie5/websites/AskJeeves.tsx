'use client';

import { useState } from 'react';

interface AskJeevesProps {
  onNavigate: (url: string) => void;
}

interface Answer {
  q: string;
  url: string;
  label: string;
}

// Curated "answers" — each points at one of our other fake pages.
const ANSWERS: Answer[] = [
  { q: 'Where can I find dancing hamsters?', url: 'http://www.hampsterdance.com', label: 'The Hampster Dance' },
  { q: 'Where can I search the Web?', url: 'http://www.yahoo.com', label: 'Yahoo!' },
  { q: 'Where can I build a free home page?', url: 'http://www.geocities.com', label: 'GeoCities' },
  { q: 'How do I get more RAM?', url: 'http://www.downloadmoreram.com', label: 'DownloadMoreRAM.com' },
  { q: 'Where is the AltaVista search engine?', url: 'http://www.altavista.com', label: 'AltaVista' },
  { q: 'How do I join a webring?', url: 'http://www.webring.org', label: 'WebRing Directory' },
];

const SUGGESTIONS = [
  'Where can I find dancing hamsters?',
  'How do I get more RAM?',
  'What is the meaning of life?',
  'How do I make my computer faster?',
];

export default function AskJeeves({ onNavigate }: AskJeevesProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Answer[] | null>(null);

  const doSearch = (q: string) => {
    const lower = q.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);
    const matches = ANSWERS.filter((a) =>
      words.some((w) => a.q.toLowerCase().includes(w) || a.label.toLowerCase().includes(w)),
    );
    setResults(matches.length ? matches : ANSWERS);
  };

  return (
    <div className="bg-white text-black font-[Arial,sans-serif] text-[12px] min-h-full">
      {/* Header */}
      <div className="bg-[#003366] text-white px-4 py-2 flex items-center gap-3">
        <span className="text-[28px]">🎩</span>
        <div>
          <div className="text-[26px] font-bold" style={{ fontFamily: 'Georgia, serif' }}>Ask Jeeves</div>
          <div className="text-[10px] text-[#99ccff]">Have a question? Just ask!</div>
        </div>
      </div>

      {/* Ask box */}
      <div className="max-w-[520px] mx-auto text-center py-5 px-4">
        <div className="text-[14px] font-bold mb-2 text-[#003366]">Ask me a question, and I&apos;ll find the answer!</div>
        <form
          onSubmit={(e) => { e.preventDefault(); doSearch(query); }}
          className="flex items-center justify-center gap-2"
        >
          <input
            className="border-2 border-[#003366] px-2 py-1 text-[12px] w-[320px]"
            placeholder="Type your question here..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="bg-[#003366] text-white border-none px-4 py-1 text-[12px] font-bold cursor-pointer">
            Ask!
          </button>
        </form>

        <div className="text-[11px] text-[#666] mt-3">
          Popular questions:
          <div className="mt-1 space-y-1">
            {SUGGESTIONS.map((s) => (
              <div key={s}>
                <span
                  className="text-[#0000cc] underline cursor-pointer"
                  onClick={() => { setQuery(s); doSearch(s); }}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        {results && (
          <div className="border-t border-[#ccc] mt-4 pt-3 text-left">
            <div className="text-[13px] font-bold text-[#003366] mb-2">
              Jeeves knows these answers to your question:
            </div>
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.url} className="flex items-start gap-2">
                  <span className="text-[16px]">🎩</span>
                  <div>
                    <span
                      className="text-[#0000cc] underline cursor-pointer font-bold text-[13px]"
                      onClick={() => onNavigate(r.url)}
                    >
                      {r.label}
                    </span>
                    <div className="text-[11px] text-[#666]">{r.q} &mdash; {r.url}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-[#999] border-t border-[#ccc] pt-2 pb-4">
        &copy; 1998 Ask Jeeves, Inc. Jeeves is at your service.
      </div>
    </div>
  );
}
