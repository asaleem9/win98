'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { virtualFileSystem, resolvePath } from '@/lib/filesystem';
import { FSNode } from '@/types/filesystem';

interface OutputLine {
  text: string;
}

function formatDosDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function formatDosTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatSize(bytes: number): string {
  return bytes.toLocaleString().padStart(14);
}

function buildTree(node: FSNode, prefix: string, isLast: boolean, depth: number): string[] {
  const lines: string[] = [];
  const connector = depth === 0 ? '' : isLast ? '└───' : '├───';
  const name = depth === 0 ? node.name + '\\' : node.name;
  lines.push(prefix + connector + name);

  if (node.children && depth < 3) {
    const childDirs = node.children.filter((c) => c.type === 'directory');
    childDirs.forEach((child, i) => {
      const childPrefix = depth === 0 ? '' : prefix + (isLast ? '    ' : '│   ');
      const childIsLast = i === childDirs.length - 1;
      lines.push(...buildTree(child, childPrefix, childIsLast, depth + 1));
    });
  }
  return lines;
}

export default function MSDOSPrompt({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const [output, setOutput] = useState<OutputLine[]>([
    { text: 'Microsoft(R) Windows 98' },
    { text: '   (C)Copyright Microsoft Corp 1981-1999.' },
    { text: '' },
  ]);
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState('C:\\WINDOWS');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [output]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addOutput = useCallback((lines: string[]) => {
    setOutput((prev) => [...prev, ...lines.map((text) => ({ text }))]);
  }, []);

  const processCommand = useCallback((rawCmd: string) => {
    const trimmed = rawCmd.trim();
    const promptLine = `${currentPath}>`;
    addOutput([promptLine + trimmed]);

    if (!trimmed) return;

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case 'cls':
        setOutput([]);
        break;

      case 'dir': {
        const targetPath = args ? (args.startsWith('C:') ? args : currentPath + '\\' + args) : currentPath;
        const node = resolvePath(targetPath);
        if (!node || node.type !== 'directory') {
          addOutput(['File Not Found']);
          break;
        }
        const lines: string[] = [
          ' Volume in drive C has no label',
          ' Volume Serial Number is 0A4E-19B2',
          ` Directory of ${targetPath}`,
          '',
        ];
        let fileCount = 0, dirCount = 0, totalSize = 0;
        if (node.children) {
          for (const child of node.children) {
            const date = formatDosDate(child.modified);
            const time = formatDosTime(child.modified);
            if (child.type === 'directory') {
              lines.push(`${date}  ${time}    <DIR>          ${child.name}`);
              dirCount++;
            } else {
              const size = formatSize(child.size || 0);
              lines.push(`${date}  ${time}    ${size} ${child.name}`);
              fileCount++;
              totalSize += child.size || 0;
            }
          }
        }
        lines.push(`        ${fileCount} File(s)  ${totalSize.toLocaleString()} bytes`);
        lines.push(`        ${dirCount} Dir(s)   1,073,741,824 bytes free`);
        addOutput(lines);
        break;
      }

      case 'cd':
      case 'chdir': {
        if (!args || args === '.') break;
        if (args === '..') {
          const lastSlash = currentPath.lastIndexOf('\\');
          if (lastSlash > 2) setCurrentPath(currentPath.substring(0, lastSlash));
          else setCurrentPath('C:\\');
          break;
        }
        if (args === '\\' || args === '/') {
          setCurrentPath('C:\\');
          break;
        }
        const newPath = args.startsWith('C:') ? args : currentPath + '\\' + args;
        const node = resolvePath(newPath);
        if (node && node.type === 'directory') {
          setCurrentPath(newPath.replace(/\\+$/, ''));
        } else {
          addOutput(['Invalid directory']);
        }
        break;
      }

      case 'help':
        addOutput([
          'For more information on a specific command, type HELP command-name',
          '',
          'CD       Displays the name of or changes the current directory.',
          'CLS      Clears the screen.',
          'DATE     Displays the date.',
          'DIR      Displays a list of files and subdirectories in a directory.',
          'ECHO     Displays messages.',
          'EXIT     Quits the MS-DOS prompt.',
          'FORMAT   Formats a disk for use with MS-DOS.',
          'HELP     Provides Help information for MS-DOS commands.',
          'TIME     Displays the system time.',
          'TREE     Graphically displays the directory structure of a drive.',
          'TYPE     Displays the contents of a text file.',
          'VER      Displays the MS-DOS version.',
        ]);
        break;

      case 'ver':
        addOutput(['', 'Windows 98 [Version 4.10.2222]', '']);
        break;

      case 'echo':
        addOutput([args || '']);
        break;

      case 'date':
        addOutput([`Current date is ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' })}`]);
        break;

      case 'time':
        addOutput([`Current time is ${new Date().toLocaleTimeString('en-US')}`]);
        break;

      case 'type': {
        if (!args) { addOutput(['Required parameter missing']); break; }
        const filePath = args.startsWith('C:') ? args : currentPath + '\\' + args;
        const fileNode = resolvePath(filePath);
        if (!fileNode || fileNode.type !== 'file') {
          addOutput(['File not found - ' + args]);
        } else if (fileNode.content) {
          addOutput(fileNode.content.split('\n'));
        } else {
          addOutput(['[Binary file]']);
        }
        break;
      }

      case 'tree': {
        const targetPath = args || currentPath;
        const node = resolvePath(targetPath);
        if (!node || node.type !== 'directory') {
          addOutput(['Invalid path']);
          break;
        }
        const lines = buildTree(node, '', true, 0);
        addOutput(lines);
        break;
      }

      case 'format': {
        if (args.toLowerCase().startsWith('c:')) {
          addOutput([
            'WARNING, ALL DATA ON NON-REMOVABLE DISK',
            'DRIVE C: WILL BE LOST!',
            'Proceed with Format (Y/N)?',
            '',
            'Formatting...',
          ]);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('win98-bsod', {
              detail: { message: 'A fatal exception 0E has occurred at 0028:C0011E36 in VxD VMM(01) + 00010E36. The current application will be terminated.' },
            }));
          }, 1500);
        } else {
          addOutput(['Required parameter missing']);
        }
        break;
      }

      case 'exit':
        closeWindow(windowId);
        break;

      default:
        addOutput([`Bad command or file name`]);
    }
  }, [currentPath, addOutput, closeWindow, windowId]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(history[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    }
  }, [input, history, historyIndex, processCommand]);

  return (
    <div
      className="flex flex-col h-full bg-black text-[#C0C0C0] font-[family-name:var(--win98-font-mono)] text-[14px] leading-[18px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-auto p-[4px] min-h-0">
        {output.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line.text || '\u00A0'}
          </div>
        ))}
        <div className="flex">
          <span className="whitespace-pre">{currentPath}&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[#C0C0C0] font-[family-name:var(--win98-font-mono)] text-[14px] leading-[18px] p-0 m-0 caret-[#C0C0C0]"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
