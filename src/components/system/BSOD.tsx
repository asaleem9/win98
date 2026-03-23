'use client';

import { useEffect } from 'react';

interface BSODProps {
  message?: string;
  onDismiss: () => void;
}

export function BSOD({ message, onDismiss }: BSODProps) {
  useEffect(() => {
    const handleKey = () => onDismiss();
    const handleClick = () => onDismiss();
    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onDismiss]);

  const errorMsg = message || 'A fatal exception 0E has occurred at 0028:C0034B03';

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0000AA] flex items-center justify-center p-8 cursor-default">
      <div className="max-w-[600px] text-white font-[family-name:var(--win98-font-fixedsys)] text-[14px] leading-relaxed">
        <div className="text-center mb-4">
          <span className="bg-[#A8A8A8] text-[#0000AA] px-2"> Windows </span>
        </div>

        <p className="mb-4">
          {errorMsg} in VxD VMCPD(01) + 00010E36. The current application will be terminated.
        </p>

        <p className="mb-4">
          * Press any key to terminate the current application.<br />
          * Press CTRL+ALT+DEL to restart your computer. You will<br />
          &nbsp;&nbsp;lose any unsaved information in all applications.
        </p>

        <p className="text-center mt-8">
          Press any key to continue <span className="animate-pulse">_</span>
        </p>
      </div>
    </div>
  );
}
