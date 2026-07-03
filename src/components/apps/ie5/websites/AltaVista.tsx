'use client';

import { useState } from 'react';
import type { SiteDef } from './registry';
import { searchSites, fakeHitCount, SearchResult } from './search';

interface AltaVistaProps {
  onNavigate: (url: string) => void;
}

export const site: SiteDef = {
  key: 'altavista',
  urls: ['http://www.altavista.com', 'www.altavista.com', 'altavista.com'],
  title: 'AltaVista - The Search Engine',
  keywords: ['altavista', 'search', 'engine', 'web', 'query'],
  description: 'AltaVista, one of the early web search engines.',
  render: ({ onNavigate }) => <AltaVista onNavigate={onNavigate} />,
};

const CATEGORIES = [
  'Automotive', 'Business', 'Computers', 'Entertainment', 'Health',
  'Hobbies', 'Home/Family', 'Money', 'News', 'People',
  'Shopping', 'Sports', 'Technology', 'Travel', 'Society',
];

export default function AltaVista({ onNavigate }: AltaVistaProps) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const runSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setSubmitted(q);
    setResults(searchSites(q));
  };

  return (
    <div className="bg-white text-black font-[Arial,sans-serif] text-[12px] min-h-full">
      {/* Red header bar */}
      <div className="bg-[#cc0000] text-white flex items-center justify-between px-4 py-1">
        <div className="flex items-center gap-3">
          <span className="text-[10px] underline cursor-pointer">Help</span>
          <span className="text-[10px] underline cursor-pointer">Feedback</span>
        </div>
        <div className="text-[10px]">
          <span className="underline cursor-pointer">My AltaVista</span>
        </div>
      </div>

      {/* Logo + Search */}
      <div className={`text-center px-4 ${submitted ? 'py-3' : 'py-6'}`}>
        <div
          className={`font-bold mb-1 cursor-pointer ${submitted ? 'text-[22px]' : 'text-[36px]'}`}
          style={{ fontFamily: 'Times New Roman, serif' }}
          onClick={() => { setSubmitted(null); setQuery(''); }}
        >
          <span className="text-[#cc0000]">Alta</span><span className="text-[#000080]">Vista</span>
        </div>
        {!submitted && <div className="text-[11px] text-[#666] mb-4 italic">The Search Engine</div>}

        {/* Search box */}
        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
          className="flex items-center justify-center gap-2 mb-2"
        >
          <input
            className="border-2 border-[#999] px-2 py-1 text-[12px] w-[350px]"
            placeholder="Enter your search terms"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="bg-[#cc0000] text-white border-none px-4 py-1 text-[12px] font-bold cursor-pointer">
            Search
          </button>
        </form>
        <div className="text-[10px] text-[#666] mb-2">
          <span className="underline cursor-pointer text-[#0000cc]">Advanced Search</span> |
          <span className="underline cursor-pointer text-[#0000cc]"> Images</span> |
          <span className="underline cursor-pointer text-[#0000cc]"> MP3/Audio</span> |
          <span className="underline cursor-pointer text-[#0000cc]"> Video</span>
        </div>
      </div>

      {submitted ? (
        <SearchResults query={submitted} results={results} onNavigate={onNavigate} />
      ) : (
        <HomeBody />
      )}
    </div>
  );
}

function SearchResults({ query, results, onNavigate }: { query: string; results: SearchResult[]; onNavigate: (url: string) => void }) {
  const hits = fakeHitCount(query);
  return (
    <div className="max-w-[560px] mx-auto px-4">
      <div className="border-t border-[#cccccc] pt-2 pb-3 text-[11px] text-[#333]">
        AltaVista found <b>{hits.toLocaleString('en-US')}</b> pages for <b>{query}</b>.
        {results.length > 0
          ? <> Showing the top <b>{results.length}</b> results.</>
          : <> Showing <b>0</b> results.</>}
      </div>

      {results.length === 0 ? (
        <div className="text-[12px] text-[#333] pb-6">
          <p className="mb-2">No web pages matched your query.</p>
          <ul className="list-disc pl-5 text-[11px] space-y-1 text-[#666]">
            <li>Make sure all words are spelled correctly.</li>
            <li>Try different or more general keywords.</li>
            <li>Try fewer keywords.</li>
          </ul>
        </div>
      ) : (
        <ol className="space-y-4 pb-6">
          {results.map((r, i) => (
            <li key={r.site.key}>
              <div className="text-[10px] text-[#999]">{i + 1}.</div>
              <div
                className="text-[#0000cc] underline cursor-pointer text-[14px] leading-tight"
                onClick={() => onNavigate(r.url)}
              >
                {r.site.title}
              </div>
              <div className="text-[12px] text-[#333]">{r.site.description}</div>
              <div className="text-[#008000] text-[11px]">{r.url}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function HomeBody() {
  return (
    <div className="max-w-[500px] mx-auto px-4">
      <div className="border-t border-[#cccccc] pt-3">
        <div className="grid grid-cols-3 gap-2 text-[11px] text-center">
          {CATEGORIES.map((c) => (
            <div key={c}>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AltaVista tools */}
      <div className="border-t border-[#cccccc] mt-3 pt-3 mb-4">
        <div className="text-[13px] font-bold text-[#cc0000] mb-2">AltaVista Tools</div>
        <div className="text-[11px] space-y-1">
          <div><span className="text-[#0000cc] underline cursor-pointer">AltaVista Translate</span> - Translate web pages in real time</div>
          <div><span className="text-[#0000cc] underline cursor-pointer">AV Photo Finder</span> - Search for images on the web</div>
          <div><span className="text-[#0000cc] underline cursor-pointer">AV Family Filter</span> - Filter inappropriate content</div>
        </div>
      </div>

      <div className="text-center text-[10px] text-[#999] border-t border-[#cccccc] pt-2 pb-4">
        &copy; 1998 AltaVista Company. All Rights Reserved.
        <br />
        <span className="text-[#0000cc] underline cursor-pointer">About AltaVista</span> |
        <span className="text-[#0000cc] underline cursor-pointer"> Privacy</span> |
        <span className="text-[#0000cc] underline cursor-pointer"> Terms of Use</span>
      </div>
    </div>
  );
}
