'use client';

export default function Yahoo1998() {
  return (
    <div className="bg-white text-black font-[Arial,sans-serif] text-[12px] min-h-full">
      {/* Purple header */}
      <div className="bg-[#7b2d8e] text-white text-center py-1">
        <div className="text-[28px] font-bold tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
          Yahoo!
        </div>
        <div className="text-[10px] flex justify-center gap-3 mt-1">
          <a className="text-[#ffff00] underline cursor-pointer">Yahoo! Mail</a>
          <a className="text-[#ffff00] underline cursor-pointer">My Yahoo!</a>
          <a className="text-[#ffff00] underline cursor-pointer">News</a>
          <a className="text-[#ffff00] underline cursor-pointer">Sports</a>
          <a className="text-[#ffff00] underline cursor-pointer">Weather</a>
          <a className="text-[#ffff00] underline cursor-pointer">Stock Quotes</a>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-[#eeeeee] border-b border-[#cccccc] flex items-center justify-center gap-2 py-2 px-4">
        <input
          className="border border-[#999] px-1 py-[2px] text-[12px] w-[250px]"
          placeholder="Search the web"
          readOnly
        />
        <button className="bg-[#dddddd] border border-[#999] px-3 py-[1px] text-[11px] cursor-pointer">
          Search
        </button>
        <span className="text-[10px] text-[#666]">advanced search</span>
      </div>

      {/* Directory */}
      <div className="max-w-[600px] mx-auto px-4 py-3">
        <table className="w-full text-[12px]">
          <tbody>
            <tr>
              <td className="align-top w-1/2 pb-2 pr-4">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Arts &amp; Humanities</span>
                </div>
                <div className="text-[#666] text-[11px]">Literature, Photography...</div>
              </td>
              <td className="align-top w-1/2 pb-2">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">News &amp; Media</span>
                </div>
                <div className="text-[#666] text-[11px]">Full Coverage, Newspapers, TV...</div>
              </td>
            </tr>
            <tr>
              <td className="align-top w-1/2 pb-2 pr-4">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Business &amp; Economy</span>
                </div>
                <div className="text-[#666] text-[11px]">Companies, Finance, Jobs...</div>
              </td>
              <td className="align-top w-1/2 pb-2">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Recreation &amp; Sports</span>
                </div>
                <div className="text-[#666] text-[11px]">Sports, Travel, Autos, Games...</div>
              </td>
            </tr>
            <tr>
              <td className="align-top w-1/2 pb-2 pr-4">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Computers &amp; Internet</span>
                </div>
                <div className="text-[#666] text-[11px]">Internet, WWW, Software...</div>
              </td>
              <td className="align-top w-1/2 pb-2">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Reference</span>
                </div>
                <div className="text-[#666] text-[11px]">Libraries, Dictionaries, Quotations...</div>
              </td>
            </tr>
            <tr>
              <td className="align-top w-1/2 pb-2 pr-4">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Education</span>
                </div>
                <div className="text-[#666] text-[11px]">Universities, K-12, College...</div>
              </td>
              <td className="align-top w-1/2 pb-2">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Science</span>
                </div>
                <div className="text-[#666] text-[11px]">Biology, Astronomy, Engineering...</div>
              </td>
            </tr>
            <tr>
              <td className="align-top w-1/2 pb-2 pr-4">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Entertainment</span>
                </div>
                <div className="text-[#666] text-[11px]">Cool Links, Movies, Music...</div>
              </td>
              <td className="align-top w-1/2 pb-2">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Social Science</span>
                </div>
                <div className="text-[#666] text-[11px]">Archaeology, Economics...</div>
              </td>
            </tr>
            <tr>
              <td className="align-top w-1/2 pb-2 pr-4">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Government</span>
                </div>
                <div className="text-[#666] text-[11px]">Elections, Military, Law, Taxes...</div>
              </td>
              <td className="align-top w-1/2 pb-2">
                <div className="font-bold text-[13px]">
                  <span className="text-[#0000cc] underline cursor-pointer">Society &amp; Culture</span>
                </div>
                <div className="text-[#666] text-[11px]">People, Environment, Religion...</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* News headlines */}
        <div className="border-t border-[#cccccc] mt-2 pt-2">
          <div className="font-bold text-[13px] text-[#660000] mb-1">In the News</div>
          <ul className="list-disc pl-5 text-[11px] space-y-1">
            <li><span className="text-[#0000cc] underline cursor-pointer">Y2K Bug preparations intensify worldwide</span></li>
            <li><span className="text-[#0000cc] underline cursor-pointer">Titanic breaks box office records for 10th consecutive week</span></li>
            <li><span className="text-[#0000cc] underline cursor-pointer">Microsoft releases Windows 98 Second Edition</span></li>
            <li><span className="text-[#0000cc] underline cursor-pointer">Mark McGwire hits 70th home run</span></li>
            <li><span className="text-[#0000cc] underline cursor-pointer">Google.com launches as new search engine</span></li>
          </ul>
        </div>

        <div className="text-center text-[10px] text-[#999] mt-4 border-t border-[#cccccc] pt-2">
          Copyright &copy; 1998 Yahoo! Inc. All rights reserved.
          <br />
          <span className="text-[#0000cc] underline cursor-pointer">Privacy Policy</span> -
          <span className="text-[#0000cc] underline cursor-pointer">Terms of Service</span>
        </div>
      </div>
    </div>
  );
}
