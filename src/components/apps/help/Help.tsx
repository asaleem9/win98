'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { cn } from '@/lib/cn';

interface HelpTopic {
  id: string;
  title: string;
  body: React.ReactNode;
}

const TOPICS: HelpTopic[] = [
  {
    id: 'welcome',
    title: 'Welcome to Windows 98',
    body: (
      <>
        <h2 className="text-[14px] font-bold mb-2">Welcome to Windows 98</h2>
        <p className="mb-2">
          Windows 98 makes your computer easier to use and more fun. This help system covers the basics of getting
          around the desktop, working with files, and using the included programs.
        </p>
        <p>Select a topic on the left to learn more.</p>
      </>
    ),
  },
  {
    id: 'desktop',
    title: 'Using the Desktop',
    body: (
      <>
        <h2 className="text-[14px] font-bold mb-2">Using the Desktop</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Double-click an icon to open it.</li>
          <li>Drag icons to rearrange them — positions are remembered.</li>
          <li>Drag on an empty area to select several icons at once.</li>
          <li>Right-click the desktop for New Folder, New Text Document, and display Properties.</li>
          <li>Deleted files go to the Recycle Bin, where they can be restored.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    body: (
      <>
        <h2 className="text-[14px] font-bold mb-2">Keyboard Shortcuts</h2>
        <table className="border-collapse">
          <tbody>
            {[
              ['Alt+Tab', 'Switch between open windows'],
              ['Alt+F4', 'Close the active window'],
              ['Ctrl+Esc', 'Open the Start menu'],
              ['Esc', 'Close menus and dialogs'],
            ].map(([key, desc]) => (
              <tr key={key}>
                <td className="pr-4 py-[2px] font-bold whitespace-nowrap">{key}</td>
                <td className="py-[2px]">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'files',
    title: 'Working with Files',
    body: (
      <>
        <h2 className="text-[14px] font-bold mb-2">Working with Files</h2>
        <p className="mb-2">
          Use Windows Explorer or My Computer to browse drive C:. Double-clicking a file opens it in its associated
          program — text files open in Notepad, pictures in Paint, and music in Winamp.
        </p>
        <p className="mb-2">
          Programs like Notepad save real files back to the drive, and your files survive restarting the computer.
        </p>
        <p>Use Start → Find → Files or Folders to search the drive by name or contents.</p>
      </>
    ),
  },
  {
    id: 'run',
    title: 'The Run Command',
    body: (
      <>
        <h2 className="text-[14px] font-bold mb-2">The Run Command</h2>
        <p className="mb-2">Choose Start → Run and type a program name, such as:</p>
        <ul className="list-disc pl-5 space-y-1 font-mono">
          <li>notepad</li>
          <li>calc</li>
          <li>winmine</li>
          <li>sol</li>
          <li>notepad C:\My Documents\readme.txt</li>
        </ul>
      </>
    ),
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    body: (
      <>
        <h2 className="text-[14px] font-bold mb-2">Troubleshooting</h2>
        <p className="mb-2">If your computer displays a blue screen, press any key to continue. This is normal.</p>
        <p className="mb-2">If you hear a modem noise, someone is using the Internet. This is also normal.</p>
        <p>If a purple gorilla appears and will not leave, this is unfortunately normal too.</p>
      </>
    ),
  },
];

export default function Help({}: AppComponentProps) {
  const [selectedId, setSelectedId] = useState('welcome');
  const topic = TOPICS.find((t) => t.id === selectedId) ?? TOPICS[0];

  return (
    <div className="flex-1 flex bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Topic list */}
      <div className="w-[180px] flex-shrink-0 m-1 bg-white overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className={cn(
              'flex items-center gap-1 w-full px-2 py-[3px] text-left cursor-default select-none',
              selectedId === t.id ? 'bg-[var(--win98-highlight)] text-white' : 'hover:bg-[var(--win98-button-face)]',
            )}
          >
            <span>📖</span>
            <span>{t.title}</span>
          </button>
        ))}
      </div>

      {/* Topic content */}
      <div className="flex-1 m-1 ml-0 p-3 bg-white overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] text-[12px] leading-relaxed">
        {topic.body}
      </div>
    </div>
  );
}
