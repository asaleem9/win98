'use client';

export default function AltaVista() {
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
      <div className="text-center py-6 px-4">
        <div className="text-[36px] font-bold mb-1" style={{ fontFamily: 'Times New Roman, serif' }}>
          <span className="text-[#cc0000]">Alta</span><span className="text-[#000080]">Vista</span>
        </div>
        <div className="text-[11px] text-[#666] mb-4 italic">The Search Engine</div>

        {/* Search box */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <input
            className="border-2 border-[#999] px-2 py-1 text-[12px] w-[350px]"
            placeholder="Enter your search terms"
            readOnly
          />
          <button className="bg-[#cc0000] text-white border-none px-4 py-1 text-[12px] font-bold cursor-pointer">
            Search
          </button>
        </div>
        <div className="text-[10px] text-[#666] mb-4">
          <span className="underline cursor-pointer text-[#0000cc]">Advanced Search</span> |
          <span className="underline cursor-pointer text-[#0000cc]"> Images</span> |
          <span className="underline cursor-pointer text-[#0000cc]"> MP3/Audio</span> |
          <span className="underline cursor-pointer text-[#0000cc]"> Video</span>
        </div>
      </div>

      {/* Category links */}
      <div className="max-w-[500px] mx-auto px-4">
        <div className="border-t border-[#cccccc] pt-3">
          <div className="grid grid-cols-3 gap-2 text-[11px] text-center">
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Automotive</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Business</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Computers</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Entertainment</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Health</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Hobbies</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Home/Family</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Money</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">News</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">People</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Shopping</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Sports</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Technology</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Travel</span>
            </div>
            <div>
              <span className="text-[#0000cc] underline cursor-pointer font-bold">Society</span>
            </div>
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
    </div>
  );
}
