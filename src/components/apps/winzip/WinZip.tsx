'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';

const zipFiles = [
  { name: 'index.html', type: 'HTML File', modified: '02/18/1999 10:30', size: '24,576', ratio: '72%', packed: '6,882' },
  { name: 'style.css', type: 'CSS File', modified: '02/18/1999 10:28', size: '8,192', ratio: '68%', packed: '2,621' },
  { name: 'script.js', type: 'JS File', modified: '02/18/1999 10:32', size: '16,384', ratio: '65%', packed: '5,734' },
  { name: 'logo.bmp', type: 'BMP Image', modified: '02/15/1999 09:00', size: '153,600', ratio: '88%', packed: '18,432' },
  { name: 'readme.txt', type: 'Text File', modified: '02/18/1999 10:35', size: '4,096', ratio: '62%', packed: '1,557' },
  { name: 'config.ini', type: 'INI File', modified: '02/17/1999 14:15', size: '1,024', ratio: '45%', packed: '563' },
  { name: 'data.dat', type: 'DAT File', modified: '02/16/1999 08:00', size: '524,288', ratio: '71%', packed: '152,044' },
];

function ToolbarButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center px-2 py-1 cursor-default select-none
        border border-solid border-transparent
        hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)]
        hover:border-b-[var(--win98-button-dark-shadow)] hover:border-r-[var(--win98-button-dark-shadow)]
        active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]
        active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]
        font-[family-name:var(--win98-font)] text-[10px]"
    >
      {children}
    </button>
  );
}

export default function WinZip({ windowId }: AppComponentProps) {
  const [selectedFile, setSelectedFile] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <span className="cursor-default"><u>F</u>ile</span>
        <span className="cursor-default"><u>A</u>ctions</span>
        <span className="cursor-default"><u>O</u>ptions</span>
        <span className="cursor-default"><u>H</u>elp</span>
      </div>

      {/* Toolbar */}
      <div className="flex gap-0 px-1 py-1 border-b border-[var(--win98-button-shadow)]">
        <ToolbarButton><span className="text-lg">📄</span>New</ToolbarButton>
        <ToolbarButton><span className="text-lg">📂</span>Open</ToolbarButton>
        <ToolbarButton><span className="text-lg">💾</span>Favorites</ToolbarButton>
        <div className="w-px bg-[var(--win98-button-shadow)] mx-1 self-stretch" />
        <ToolbarButton><span className="text-lg">➕</span>Add</ToolbarButton>
        <ToolbarButton><span className="text-lg">📤</span>Extract</ToolbarButton>
        <ToolbarButton><span className="text-lg">👁️</span>View</ToolbarButton>
        <div className="w-px bg-[var(--win98-button-shadow)] mx-1 self-stretch" />
        <ToolbarButton><span className="text-lg">✅</span>CheckOut</ToolbarButton>
        <ToolbarButton><span className="text-lg">🔧</span>Wizard</ToolbarButton>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto bg-white border border-solid border-[var(--win98-button-shadow)] m-1">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 bg-[var(--win98-button-face)]">
            <tr className="border-b border-[var(--win98-button-shadow)]">
              <th className="text-left px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)] min-w-[140px]">Name</th>
              <th className="text-left px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Type</th>
              <th className="text-left px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Modified</th>
              <th className="text-right px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Size</th>
              <th className="text-center px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Ratio</th>
              <th className="text-right px-2 py-[2px] font-normal">Packed</th>
            </tr>
          </thead>
          <tbody>
            {zipFiles.map((file, i) => (
              <tr
                key={file.name}
                className={`cursor-default ${selectedFile === i ? 'bg-[var(--win98-hilight)] text-[var(--win98-hilight-text)]' : ''}`}
                onClick={() => setSelectedFile(i)}
              >
                <td className="px-2 py-[1px]">
                  <span className="mr-1">{file.type.includes('Image') ? '🖼️' : file.type.includes('HTML') ? '🌐' : '📄'}</span>
                  {file.name}
                </td>
                <td className="px-2 py-[1px]">{file.type}</td>
                <td className="px-2 py-[1px]">{file.modified}</td>
                <td className="text-right px-2 py-[1px]">{file.size}</td>
                <td className="text-center px-2 py-[1px]">{file.ratio}</td>
                <td className="text-right px-2 py-[1px]">{file.packed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-1 px-1 py-[2px] border-t border-[var(--win98-button-highlight)]">
        <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px]">
          {selectedFile !== null ? `Selected: ${zipFiles[selectedFile].name}` : `${zipFiles.length} file(s)`}
        </div>
        <div className="border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px]">
          Total size: 732,160 bytes
        </div>
      </div>
    </div>
  );
}
