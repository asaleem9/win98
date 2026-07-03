'use client';

import { useState } from 'react';
import type { SiteDef } from './registry';
import { searchSites } from './search';

interface AskJeevesProps {
  onNavigate: (url: string) => void;
}

interface Answer {
  q: string;
  url: string;
  label: string;
}

// Curated fallbacks — shown when the search turns up nothing, so Jeeves is never
// left empty-handed. Each points at one of our other fake pages.
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

export const site: SiteDef = {
  key: 'askjeeves',
  urls: ['http://www.askjeeves.com', 'www.askjeeves.com', 'askjeeves.com', 'ask.com', 'www.ask.com'],
  title: 'Ask Jeeves',
  keywords: ['ask', 'jeeves', 'search', 'butler', 'questions', 'answers'],
  description: 'Ask Jeeves — the natural-language search butler.',
  render: ({ onNavigate }) => <AskJeeves onNavigate={onNavigate} />,
};

/** Jeeves' in-character reply, chosen from the shape of the question. */
export function jeevesReply(query: string): string {
  const q = query.trim().toLowerCase().replace(/[?.!]+$/, '');

  if (/meaning of life/.test(q)) return 'The answer is 42, sir. Though I have always found a nice cup of tea to help as well.';
  if (/who are you|who is jeeves|your name/.test(q)) return 'I am Jeeves, your devoted search butler. It is my pleasure to be of service.';
  if (/why is the sky blue/.test(q)) return 'Sunlight scatters off the air, sir — the shorter blue wavelengths most of all. A most agreeable arrangement.';
  if (/(make|is).*(computer|pc).*(faster|slow)/.test(q) || /faster/.test(q)) return 'A common complaint, sir. Fewer programs at startup works wonders — and some suggest simply downloading more memory.';
  if (/y2k|year 2000|millennium bug/.test(q)) return 'Not to worry, sir. I have set the clocks forward and stocked the pantry, just in case.';

  if (/^who\b/.test(q)) return 'A question of persons, sir. Allow me to fetch what the Web knows of them.';
  if (/^what\b/.test(q)) return 'Ah, a matter of definition. Permit me to look that up on your behalf.';
  if (/^why\b/.test(q)) return 'Ever the philosopher! Let us see what the Web has to say on the matter.';
  if (/^when\b/.test(q)) return 'A question of timing, sir. I shall consult the appropriate references at once.';
  if (/^where\b/.test(q)) return 'I believe I know just the place. Kindly follow me.';
  if (/^(how do i|how can i|how to|how)\b/.test(q)) return 'Right away, sir. Here is how the matter is best handled.';

  return 'Very good, sir. I have taken the liberty of consulting the Web on your behalf.';
}

export default function AskJeeves({ onNavigate }: AskJeevesProps) {
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState<string | null>(null);
  const [results, setResults] = useState<Answer[]>([]);

  const doSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAsked(trimmed);
    const ranked = searchSites(trimmed);
    if (ranked.length > 0) {
      setResults(ranked.map((r) => ({ q: r.site.description, url: r.url, label: r.site.title })));
    } else {
      setResults(ANSWERS);
    }
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

        {!asked && (
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
        )}

        {asked && (
          <div className="border-t border-[#ccc] mt-4 pt-3 text-left">
            <div className="text-[12px] text-[#666] italic mb-1">You asked: {asked}</div>
            <div className="flex items-start gap-2 mb-3">
              <span className="text-[22px] leading-none">🎩</span>
              <div className="text-[13px] text-[#003366]">{jeevesReply(asked)}</div>
            </div>
            <div className="text-[13px] font-bold text-[#003366] mb-2">
              Jeeves found these answers to your question:
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
