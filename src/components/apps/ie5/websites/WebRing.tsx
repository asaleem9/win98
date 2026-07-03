'use client';

interface WebRingProps {
  onNavigate: (url: string) => void;
}

const RING_SITES = [
  { label: "Dave's Cool Page", url: 'http://www.geocities.com', desc: 'X-Files, Star Wars & my cat Whiskers' },
  { label: 'The Hampster Dance', url: 'http://www.hampsterdance.com', desc: 'The dancing hamster phenomenon!' },
  { label: 'DownloadMoreRAM.com', url: 'http://www.downloadmoreram.com', desc: 'Speed up your PC for FREE' },
  { label: 'Yahoo! Directory', url: 'http://www.yahoo.com', desc: 'A guide to the World Wide Web' },
];

const RINGS = [
  '90s Kids WebRing',
  'Sci-Fi Fans WebRing',
  'GeoCities Homesteaders Ring',
  'The MP3 Traders Ring',
  'Anime & Manga WebRing',
  'Beanie Baby Collectors Ring',
];

export default function WebRing({ onNavigate }: WebRingProps) {
  return (
    <div className="min-h-full bg-[#ccccff] text-black font-[Verdana,Arial,sans-serif] text-[12px]">
      <div className="bg-[#333399] text-white text-center py-3">
        <div className="text-[26px] font-bold" style={{ fontFamily: 'Impact, sans-serif' }}>WebRing</div>
        <div className="text-[11px] text-[#ccccff]">Connecting the Web, one site at a time since 1995</div>
      </div>

      <div className="max-w-[560px] mx-auto px-4 py-3">
        {/* Ring navigation widget */}
        <div className="border-2 border-[#333399] bg-white p-3 mb-4 text-center">
          <div className="text-[13px] font-bold text-[#333399] mb-1">This site belongs to the</div>
          <div className="text-[15px] font-bold text-[#cc0000] mb-2">~ 90s Kids WebRing ~</div>
          <div className="flex justify-center items-center gap-2 text-[11px] flex-wrap">
            <button onClick={() => onNavigate('http://www.geocities.com')} className="text-[#0000cc] underline cursor-pointer">[ &lt;&lt; Prev ]</button>
            <button onClick={() => onNavigate('http://www.hampsterdance.com')} className="text-[#0000cc] underline cursor-pointer">[ Random ]</button>
            <button onClick={() => onNavigate('http://www.downloadmoreram.com')} className="text-[#0000cc] underline cursor-pointer">[ Next &gt;&gt; ]</button>
            <button onClick={() => onNavigate('http://www.yahoo.com')} className="text-[#0000cc] underline cursor-pointer">[ List All ]</button>
          </div>
        </div>

        {/* Featured member sites */}
        <div className="bg-white border border-[#9999cc] p-3 mb-4">
          <div className="text-[13px] font-bold text-[#333399] mb-2 border-b border-[#ccc] pb-1">Featured Member Sites</div>
          <ul className="space-y-2">
            {RING_SITES.map((s) => (
              <li key={s.url}>
                <span onClick={() => onNavigate(s.url)} className="text-[#0000cc] underline cursor-pointer font-bold">{s.label}</span>
                <span className="text-[#666] text-[11px]"> &mdash; {s.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Browse rings */}
        <div className="bg-white border border-[#9999cc] p-3 mb-4">
          <div className="text-[13px] font-bold text-[#333399] mb-2 border-b border-[#ccc] pb-1">Browse Popular Rings</div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {RINGS.map((r) => (
              <div key={r} className="text-[#0000cc] underline cursor-pointer" onClick={() => onNavigate('http://www.yahoo.com')}>{r}</div>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-[#666]">
          Want to add your site to a ring? <span className="text-[#0000cc] underline cursor-pointer">Join WebRing today!</span>
          <br />&copy; 1998 WebRing Inc. Keep the Web connected!
        </div>
      </div>
    </div>
  );
}
