'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';

const archiveFiles = [
  { name: 'setup.exe', size: '4,215,296', packed: '2,847,103', ratio: '32%', modified: '03/15/1999 14:22', crc: 'A4F2B891' },
  { name: 'readme.txt', size: '12,847', packed: '4,291', ratio: '66%', modified: '03/15/1999 14:20', crc: '7C3E1D05' },
  { name: 'data.bin', size: '8,192,000', packed: '3,276,800', ratio: '60%', modified: '03/14/1999 09:45', crc: 'F19A3C72' },
  { name: 'license.txt', size: '4,096', packed: '1,892', ratio: '53%', modified: '03/10/1999 11:30', crc: 'B2D4E6A8' },
  { name: 'install.ini', size: '1,024', packed: '512', ratio: '50%', modified: '03/15/1999 14:22', crc: '3E7F9B01' },
  { name: 'uninstall.exe', size: '102,400', packed: '61,440', ratio: '40%', modified: '03/12/1999 16:00', crc: 'D8C2F4E6' },
];

function Win98Button({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2 h-[22px] font-[family-name:var(--win98-font)] text-[11px] cursor-default select-none
        bg-[var(--win98-button-face)]
        ${active
          ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]'
          : 'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]'
        }
        border-2 border-solid
      `}
    >
      {children}
    </button>
  );
}

function NagDialog({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="absolute inset-0 bg-[var(--win98-button-face)] z-50 flex items-center justify-center">
      <div className="border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] bg-[var(--win98-button-face)] p-4 max-w-[380px] shadow-md">
        <div className="flex gap-3 mb-4">
          <div className="text-4xl">📦</div>
          <div className="font-[family-name:var(--win98-font)] text-[11px]">
            <p className="font-bold mb-2">Thank you for trying WinRAR!</p>
            <p className="mb-2">
              This is a 40-day evaluation copy of WinRAR archiver.
              Please purchase a license after the evaluation period.
            </p>
            <p className="mb-2">
              WinRAR is not free software. After a 40 day trial period
              you must either buy a license or remove it from your computer.
            </p>
            <p className="text-[10px] text-gray-600">
              Days used: 387 &nbsp;&nbsp; Days remaining: -347
            </p>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Win98Button onClick={onContinue}>Continue</Win98Button>
          <Win98Button>Buy Now!</Win98Button>
          <Win98Button>Close</Win98Button>
        </div>
      </div>
    </div>
  );
}

export default function WinRAR({ windowId }: AppComponentProps) {
  const [showNag, setShowNag] = useState(true);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);

  const totalSize = '12,527,663';
  const totalPacked = '6,192,038';

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] relative font-[family-name:var(--win98-font)] text-[11px]">
      {showNag && <NagDialog onContinue={() => setShowNag(false)} />}

      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <span className="cursor-default"><u>F</u>ile</span>
        <span className="cursor-default"><u>C</u>ommands</span>
        <span className="cursor-default"><u>T</u>ools</span>
        <span className="cursor-default">F<u>a</u>vorites</span>
        <span className="cursor-default"><u>O</u>ptions</span>
        <span className="cursor-default"><u>H</u>elp</span>
      </div>

      {/* Toolbar */}
      <div className="flex gap-1 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        <Win98Button>Add</Win98Button>
        <Win98Button>Extract To</Win98Button>
        <Win98Button>Test</Win98Button>
        <Win98Button>Delete</Win98Button>
        <div className="w-px bg-[var(--win98-button-shadow)] mx-1" />
        <Win98Button>View</Win98Button>
        <Win98Button>Find</Win98Button>
        <Win98Button>Wizard</Win98Button>
        <Win98Button>Info</Win98Button>
      </div>

      {/* Address bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        <span className="text-[10px] mr-1">📦</span>
        <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] bg-white px-1 py-[1px] text-[11px]">
          C:\Downloads\archive.rar
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto bg-white border border-solid border-[var(--win98-button-shadow)] m-1">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 bg-[var(--win98-button-face)]">
            <tr className="border-b border-[var(--win98-button-shadow)]">
              <th className="text-left px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Name</th>
              <th className="text-right px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Size</th>
              <th className="text-right px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Packed</th>
              <th className="text-center px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Ratio</th>
              <th className="text-left px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Modified</th>
              <th className="text-left px-2 py-[2px] font-normal">CRC32</th>
            </tr>
          </thead>
          <tbody>
            {archiveFiles.map((file, i) => (
              <tr
                key={file.name}
                className={`cursor-default ${selectedFile === i ? 'bg-[var(--win98-hilight)] text-[var(--win98-hilight-text)]' : ''}`}
                onClick={() => setSelectedFile(i)}
              >
                <td className="px-2 py-[1px]">
                  <span className="mr-1">{file.name.endsWith('.exe') ? '⚙️' : file.name.endsWith('.txt') ? '📄' : '📁'}</span>
                  {file.name}
                </td>
                <td className="text-right px-2 py-[1px]">{file.size}</td>
                <td className="text-right px-2 py-[1px]">{file.packed}</td>
                <td className="text-center px-2 py-[1px]">{file.ratio}</td>
                <td className="px-2 py-[1px]">{file.modified}</td>
                <td className="px-2 py-[1px]">{file.crc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center px-2 py-[2px] border-t border-[var(--win98-button-highlight)] bg-[var(--win98-button-face)]">
        <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px]">
          Total {archiveFiles.length} files, {totalSize} bytes, packed {totalPacked} bytes
        </div>
      </div>
    </div>
  );
}
