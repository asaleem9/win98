'use client';

import { useEffect, useState } from 'react';

export default function GeoCities() {
  const [visitorCount] = useState(3847);
  const [newBlink, setNewBlink] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setNewBlink((b) => !b), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-full text-[#00ff00] font-[Comic_Sans_MS,cursive] text-[14px]"
      style={{
        background: '#000033 url("data:image/svg+xml,%3Csvg width=\'3\' height=\'3\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'1\' height=\'1\' fill=\'%23000066\'/%3E%3C/svg%3E") repeat',
      }}
    >
      <div className="max-w-[600px] mx-auto px-4 py-2">
        {/* Under construction banner */}
        <div className="text-center mb-2">
          <div className="text-[#ffff00] text-[10px] tracking-widest">~ ~ ~ ~ ~ ~ ~ ~ ~ ~</div>
          <div className="text-[#ff6600] text-[20px] font-bold my-1">
            *** UNDER CONSTRUCTION ***
          </div>
          <div className="text-[#ffff00] text-[10px] tracking-widest">~ ~ ~ ~ ~ ~ ~ ~ ~ ~</div>
        </div>

        {/* Marquee */}
        <div className="overflow-hidden border border-[#333366] bg-[#000022] my-2 py-1">
          <div className="animate-[marquee_12s_linear_infinite] whitespace-nowrap text-[#00ffff] text-[13px]">
            *** WeLcOmE tO mY aWeSoMe HoMePaGe!!! *** This site is best viewed with Netscape Navigator at 800x600 *** Sign my guestbook!!! *** Last updated: December 15, 1998 ***
          </div>
        </div>

        <hr className="border-[#333366] my-3" />

        {/* Welcome section */}
        <div className="text-center">
          <h1 className="text-[#ff00ff] text-[24px] font-bold mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            ~*~*~ Welcome to Dave&apos;s Cool Page ~*~*~
          </h1>
          <div className="text-[#ffff00] text-[12px] mb-3">
            You are visitor #{String(visitorCount).padStart(8, '0')}
          </div>
        </div>

        {/* Content */}
        <div className="text-[#cccccc] text-[12px] leading-relaxed mb-3">
          <p className="mb-2">
            Hey everyone!! Welcome to my homepage on GeoCities!! I just got this page set up
            and I&apos;m still working on it. Check back soon for more cool stuff!!!
          </p>
          <p className="mb-2">Here are some things I like:</p>
          <ul className="list-disc pl-5 mb-3 text-[#66ff66]">
            <li>The X-Files (THE TRUTH IS OUT THERE)</li>
            <li>Star Wars (Episode I is coming!!)</li>
            <li>My cat Whiskers</li>
            <li>HTML programming</li>
            <li>Downloading MP3s</li>
          </ul>
        </div>

        {/* Links section */}
        <div className="border border-[#333366] bg-[#000044] p-3 mb-3">
          <div className="text-[#ff6600] text-[16px] font-bold mb-2 text-center">
            Cool Links!!!
          </div>
          <div className="space-y-1 text-[12px]">
            <div>
              <span className={newBlink ? 'text-[#ff0000] font-bold' : 'text-transparent font-bold'}>NEW!</span>{' '}
              <span className="text-[#00ccff] underline cursor-pointer">The Official Star Wars Site</span>
            </div>
            <div>
              <span className={newBlink ? 'text-[#ff0000] font-bold' : 'text-transparent font-bold'}>NEW!</span>{' '}
              <span className="text-[#00ccff] underline cursor-pointer">Download Winamp - It Really Whips the Llama&apos;s Ass!</span>
            </div>
            <div>
              <span className="text-[#00ccff] underline cursor-pointer">The Hamster Dance</span>
            </div>
            <div>
              <span className="text-[#00ccff] underline cursor-pointer">Space Jam Official Movie Site</span>
            </div>
            <div>
              <span className="text-[#00ccff] underline cursor-pointer">Angelfire Free Homepages</span>
            </div>
          </div>
        </div>

        {/* Guestbook */}
        <div className="text-center my-4">
          <div className="inline-block border-2 border-[#ffff00] bg-[#000066] px-4 py-2 cursor-pointer">
            <div className="text-[#ffff00] text-[16px] font-bold">
              Sign My Guestbook!!!
            </div>
            <div className="text-[#cccccc] text-[10px]">(Please be nice)</div>
          </div>
        </div>

        {/* Web rings */}
        <div className="border-t border-[#333366] pt-3 text-center text-[10px] text-[#999999]">
          <div className="mb-1">This site is part of the <span className="text-[#00ccff] underline">Sci-Fi Fans WebRing</span></div>
          <div className="flex justify-center gap-3 mb-3">
            <span className="text-[#00ccff] underline cursor-pointer">[Previous]</span>
            <span className="text-[#00ccff] underline cursor-pointer">[Random]</span>
            <span className="text-[#00ccff] underline cursor-pointer">[Next]</span>
            <span className="text-[#00ccff] underline cursor-pointer">[List Sites]</span>
          </div>
          <div className="text-[#666666]">
            Made with Notepad | Best viewed at 800x600
            <br />
            &copy; 1998 Dave&apos;s Cool Page - GeoCities/Area51/Vault/4827
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(100%); }
          to { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
