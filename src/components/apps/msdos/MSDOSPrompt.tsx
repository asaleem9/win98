'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getParentPath } from '@/lib/filesystem';
import { getAppIdForFile } from '@/lib/fileAssociations';
import { normalizePath, joinPath } from '@/lib/fs/fsOperations';
import { installerSlug, runInstaller } from '@/components/apps/add-remove-programs/installerData';
import { FSNode } from '@/types/filesystem';
import {
  parseCommand,
  resolveDosPath,
  formatDirWide,
  matchCompletions,
  splitForCompletion,
  isAffirmative,
  planXcopyDir,
} from './dosUtils';

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
  const { closeWindow, openWindow } = useWindows();
  const fs = useFileSystem();
  const { getAppPref, setAppPref } = useSettings();
  const [output, setOutput] = useState<OutputLine[]>([
    { text: 'Microsoft(R) Windows 98' },
    { text: '   (C)Copyright Microsoft Corp 1981-1999.' },
    { text: '' },
  ]);
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState('C:\\WINDOWS');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Set while a DELTREE confirmation prompt is showing; the next line answers it.
  const [pendingDeltree, setPendingDeltree] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentPathRef = useRef(currentPath);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [output]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addOutput = useCallback((lines: string[]) => {
    setOutput((prev) => [...prev, ...lines.map((text) => ({ text }))]);
  }, []);

  // Each FS mutation replaces the whole store root from a snapshot, so a run of
  // creates/writes in one tick keeps only the last. Yield between ops so the
  // store commits and the next op sees the updated tree.
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  const runXcopy = useCallback(
    async (srcNode: FSNode, destPath: string, recursive: boolean) => {
      const steps: Array<() => boolean> = [];
      let fileCount = 0;

      if (srcNode.type === 'file') {
        const destNode = fs.getNode(destPath);
        const target = destNode?.type === 'directory' ? joinPath(destPath, srcNode.name) : destPath;
        steps.push(() => fs.createFile(getParentPath(target), target.split('\\').pop()!, srcNode.content ?? '').ok);
        fileCount = 1;
      } else {
        const destNode = fs.getNode(destPath);
        if (destNode && destNode.type !== 'directory') {
          addOutput(['Cannot perform a cyclic copy']);
          return;
        }
        if (!destNode) {
          steps.push(() => fs.createFolder(getParentPath(destPath), destPath.split('\\').pop()!).ok);
        }
        for (const op of planXcopyDir(srcNode, destPath, recursive)) {
          if (op.kind === 'folder') {
            steps.push(() => fs.createFolder(op.parent, op.name).ok);
          } else {
            fileCount++;
            steps.push(() => fs.createFile(op.parent, op.name, op.content).ok);
          }
        }
      }

      for (const step of steps) {
        step();
        await nextTick();
      }
      addOutput([`${fileCount} File(s) copied`]);
    },
    [fs, addOutput],
  );

  const resolveDeltree = useCallback(
    (target: string, confirmed: boolean) => {
      if (!confirmed) return;
      const catastrophic = target.toUpperCase() === 'C:\\WINDOWS' || target === 'C:\\';
      if (catastrophic) {
        // Groundwork for the dirty-shutdown boot path — flag it, fake the wipe,
        // and fall over. The real filesystem is left intact behind the BSOD.
        addOutput([
          `Deleting ${target}\\SYSTEM...`,
          `Deleting ${target}\\SYSTEM\\VMM32...`,
          `Deleting ${target}\\COMMAND...`,
          `Deleting ${target}\\WIN.COM...`,
          `Deleting ${target}\\USER.EXE...`,
          `Deleting ${target}\\GDI.EXE...`,
          `Deleting ${target}...`,
        ]);
        setAppPref('system', 'dirtyShutdown', true);
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('win98-bsod', {
              detail: {
                message:
                  'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36. Windows has been shut down to protect your computer.',
              },
            }),
          );
        }, 1200);
        return;
      }
      const res = fs.deleteToRecycleBin(target);
      if (!res.ok) addOutput([res.error]);
      else addOutput([`Deleting ${target}...`]);
    },
    [fs, addOutput, setAppPref],
  );

  const processCommand = useCallback((rawCmd: string) => {
    // A pending DELTREE prompt swallows the next line as its Y/N answer.
    if (pendingDeltree !== null) {
      const answer = rawCmd.trim();
      addOutput([`${currentPath}>${answer}`]);
      resolveDeltree(pendingDeltree, isAffirmative(answer));
      setPendingDeltree(null);
      return;
    }
    const promptLine = `${currentPath}>`;
    const parsed = parseCommand(rawCmd);
    addOutput([promptLine + rawCmd.trim()]);

    if (!parsed) return;

    setHistory((prev) => [...prev, parsed.raw]);
    setHistoryIndex(-1);

    const { cmd, args, rest } = parsed;

    switch (cmd) {
      case 'cls':
        setOutput([]);
        break;

      case 'dir': {
        const wide = args.includes('/w') || args.includes('/W');
        const pathArg = args.filter((a) => !a.startsWith('/')).join(' ');
        const targetPath = pathArg ? resolveDosPath(currentPath, pathArg) : currentPath;
        const node = fs.getNode(targetPath);
        if (!node || node.type !== 'directory') {
          addOutput(['File Not Found']);
          break;
        }
        const volLabel = getAppPref<string>('system', 'volumeLabel', '');
        const lines: string[] = [
          volLabel ? ` Volume in drive C is ${volLabel}` : ' Volume in drive C has no label',
          ' Volume Serial Number is 0A4E-19B2',
          ` Directory of ${targetPath}`,
          '',
        ];
        let fileCount = 0, dirCount = 0, totalSize = 0;
        const children = node.children ?? [];
        for (const child of children) {
          if (child.type === 'directory') dirCount++;
          else { fileCount++; totalSize += child.size || 0; }
        }
        if (wide) {
          lines.push(...formatDirWide(children.map((c) => ({ name: c.name, isDir: c.type === 'directory' }))));
        } else {
          for (const child of children) {
            const date = formatDosDate(child.modified);
            const time = formatDosTime(child.modified);
            if (child.type === 'directory') {
              lines.push(`${date}  ${time}    <DIR>          ${child.name}`);
            } else {
              const size = formatSize(child.size || 0);
              lines.push(`${date}  ${time}    ${size} ${child.name}`);
            }
          }
        }
        lines.push('');
        lines.push(`        ${fileCount} File(s)  ${totalSize.toLocaleString()} bytes`);
        lines.push(`        ${dirCount} Dir(s)   1,073,741,824 bytes free`);
        addOutput(lines);
        break;
      }

      case 'cd':
      case 'chdir': {
        if (!rest || rest === '.') break;
        const newPath = resolveDosPath(currentPath, rest);
        const node = fs.getNode(newPath);
        if (node && node.type === 'directory') {
          setCurrentPath(newPath.replace(/\\+$/, '') || 'C:\\');
        } else {
          addOutput(['Invalid directory']);
        }
        break;
      }

      case 'md':
      case 'mkdir': {
        if (!rest) { addOutput(['Required parameter missing']); break; }
        const newPath = resolveDosPath(currentPath, rest);
        const dirPath = getParentPath(newPath);
        const name = newPath.split('\\').pop()!;
        const result = fs.createFolder(dirPath, name);
        if (!result.ok) addOutput([result.error]);
        break;
      }

      case 'rd':
      case 'rmdir': {
        if (!rest) { addOutput(['Required parameter missing']); break; }
        const target = resolveDosPath(currentPath, rest);
        const node = fs.getNode(target);
        if (!node) { addOutput(['Invalid path']); break; }
        if (node.type !== 'directory') { addOutput(['The directory name is invalid.']); break; }
        const result = fs.deleteToRecycleBin(target);
        if (!result.ok) addOutput([result.error]);
        break;
      }

      case 'del':
      case 'erase': {
        if (!rest) { addOutput(['Required parameter missing']); break; }
        const target = resolveDosPath(currentPath, rest);
        const node = fs.getNode(target);
        if (!node || node.type !== 'file') { addOutput(['File not found - ' + rest]); break; }
        const result = fs.deleteToRecycleBin(target);
        if (!result.ok) addOutput([result.error]);
        break;
      }

      case 'ren':
      case 'rename': {
        if (args.length < 2) { addOutput(['Required parameter missing']); break; }
        const target = resolveDosPath(currentPath, args[0]);
        const result = fs.rename(target, args[1]);
        if (!result.ok) addOutput([result.error]);
        break;
      }

      case 'copy': {
        if (args.length < 2) { addOutput(['Required parameter missing']); break; }
        const srcPath = resolveDosPath(currentPath, args[0]);
        const srcNode = fs.getNode(srcPath);
        if (!srcNode || srcNode.type !== 'file') { addOutput(['File not found - ' + args[0]]); break; }
        let destPath = resolveDosPath(currentPath, args[1]);
        const destNode = fs.getNode(destPath);
        if (destNode && destNode.type === 'directory') {
          destPath = `${destPath}\\${srcNode.name}`;
        }
        const destDir = getParentPath(destPath);
        const destName = destPath.split('\\').pop()!;
        const result = fs.createFile(destDir, destName, srcNode.content ?? '');
        if (!result.ok) addOutput([result.error]);
        else addOutput(['        1 file(s) copied.']);
        break;
      }

      case 'move': {
        if (args.length < 2) { addOutput(['Required parameter missing']); break; }
        const src = resolveDosPath(currentPath, args[0]);
        const srcNode = fs.getNode(src);
        if (!srcNode) { addOutput(['The system cannot find the file specified.']); break; }
        const destArg = resolveDosPath(currentPath, args[1]);
        const destNode = fs.getNode(destArg);
        if (destNode && destNode.type === 'directory') {
          const res = fs.move(src, destArg);
          if (!res.ok) { addOutput([res.error]); break; }
        } else {
          const destDir = getParentPath(destArg);
          const destName = destArg.split('\\').pop()!;
          if (normalizePath(destDir) === normalizePath(getParentPath(src))) {
            const res = fs.rename(src, destName);
            if (!res.ok) { addOutput([res.error]); break; }
          } else {
            const res = fs.move(src, destDir);
            if (!res.ok) { addOutput([res.error]); break; }
          }
        }
        addOutput([`        1 file(s) moved.`]);
        break;
      }

      case 'xcopy': {
        const recursive = args.some((a) => /^\/s$/i.test(a));
        const positional = args.filter((a) => !a.startsWith('/'));
        if (positional.length < 2) { addOutput(['Invalid number of parameters']); break; }
        const src = resolveDosPath(currentPath, positional[0]);
        const srcNode = fs.getNode(src);
        if (!srcNode) { addOutput([`File not found - ${positional[0]}`]); break; }
        const dest = resolveDosPath(currentPath, positional[1]);
        void runXcopy(srcNode, dest, recursive);
        break;
      }

      case 'deltree': {
        const pathArg = args.filter((a) => !a.startsWith('/')).join(' ');
        if (!pathArg) { addOutput(['Required parameter missing']); break; }
        const target = resolveDosPath(currentPath, pathArg);
        const node = fs.getNode(target);
        if (!node || node.type !== 'directory') { addOutput([`Path not found - ${pathArg}`]); break; }
        const norm = normalizePath(target);
        addOutput([`Delete directory "${norm}" and all its subdirectories? [yn] `]);
        setPendingDeltree(norm);
        break;
      }

      case 'doskey':
        addOutput(['DOSKey installed.']);
        break;

      case 'vol': {
        const label = getAppPref<string>('system', 'volumeLabel', '');
        addOutput([
          label ? ` Volume in drive C is ${label}` : ' Volume in drive C has no label',
          ' Volume Serial Number is 0A4E-19B2',
        ]);
        break;
      }

      case 'label': {
        const newLabel = rest.trim();
        if (!newLabel) {
          const cur = getAppPref<string>('system', 'volumeLabel', '');
          addOutput([
            cur ? ` Volume in drive C is ${cur}` : ' Volume in drive C has no label',
            ' Volume Serial Number is 0A4E-19B2',
          ]);
          break;
        }
        setAppPref('system', 'volumeLabel', newLabel.toUpperCase());
        break;
      }

      case 'win':
        addOutput(['Starting Windows 98...']);
        setTimeout(() => setOutput([]), 800);
        break;

      case 'edit': {
        if (!rest) { addOutput(['Required parameter missing']); break; }
        const target = resolveDosPath(currentPath, rest);
        const node = fs.getNode(target);
        if (!node || node.type !== 'file') { addOutput(['File not found - ' + rest]); break; }
        openWindow('notepad', { launchParams: { filePath: target } });
        break;
      }

      case 'start': {
        if (!rest) { addOutput(['Required parameter missing']); break; }
        const target = resolveDosPath(currentPath, args[0]);
        const slug = installerSlug(fs.getNode(target)?.content);
        if (slug) { runInstaller(slug); break; }
        const appId = getAppIdForFile(args[0]);
        if (!appId) { addOutput(['The system cannot find the file specified.']); break; }
        openWindow(appId);
        break;
      }

      case 'attrib': {
        const targetPath = rest ? resolveDosPath(currentPath, rest) : currentPath;
        const node = fs.getNode(targetPath);
        if (!node) { addOutput(['File not found']); break; }
        const list = node.type === 'directory' ? (node.children ?? []) : [node];
        addOutput(list.map((c) => `${c.readOnly ? 'R' : ' '}  ${c.type === 'directory' ? '<DIR>' : '     '}  ${c.name}`));
        break;
      }

      case 'mem':
        addOutput([
          'Memory Type        Total       Used       Free',
          '----------------  --------  --------  --------',
          'Conventional         640K       98K       542K',
          'Upper                  0K        0K         0K',
          'Reserved               0K        0K         0K',
          'Extended (XMS)     63,488K    12,336K    51,152K',
          '',
          'Total memory       64,128K    12,434K    51,694K',
          '',
          'Largest executable program size       542K',
          'Largest free upper memory block         0K',
        ]);
        break;

      case 'ipconfig':
        addOutput([
          '',
          'Windows 98 IP Configuration',
          '',
          '        Host Name . . . . . . . . . : WIN98-PC',
          '        IP Address. . . . . . . . . : 192.168.0.42',
          '        Subnet Mask . . . . . . . . : 255.255.255.0',
          '        Default Gateway . . . . . . : 192.168.0.1',
          '',
        ]);
        break;

      case 'ping': {
        if (!rest) { addOutput(['Usage: ping hostname']); break; }
        const host = args[0];
        addOutput([`Pinging ${host} with 32 bytes of data:`, '']);
        for (let i = 0; i < 4; i++) {
          const ms = 20 + Math.floor(Math.random() * 60);
          addOutput([`Reply from 192.168.0.1: bytes=32 time=${ms}ms TTL=128`]);
        }
        addOutput([
          '',
          `Ping statistics for ${host}:`,
          '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),',
        ]);
        break;
      }

      case 'help':
        addOutput([
          'For more information on a specific command, type HELP command-name',
          '',
          'ATTRIB   Displays or changes file attributes.',
          'CD       Displays the name of or changes the current directory.',
          'CLS      Clears the screen.',
          'COPY     Copies one or more files to another location.',
          'DATE     Displays the date.',
          'DEL      Deletes one or more files.',
          'DELTREE  Deletes a directory and all its subdirectories.',
          'DIR      Displays a list of files and subdirectories in a directory.',
          'DOSKEY   Edits command lines and recalls Windows commands.',
          'ECHO     Displays messages.',
          'EDIT     Opens a text file for editing.',
          'EXIT     Quits the MS-DOS prompt.',
          'FORMAT   Formats a disk for use with MS-DOS.',
          'HELP     Provides Help information for MS-DOS commands.',
          'IPCONFIG Displays network configuration.',
          'LABEL    Creates or changes the volume label of a disk.',
          'MD       Creates a directory.',
          'MEM      Displays the amount of used and free memory.',
          'MOVE     Moves files and renames files and directories.',
          'PING     Sends ICMP echo requests to a host.',
          'RD       Removes a directory.',
          'REN      Renames a file or files.',
          'START    Starts a program.',
          'TIME     Displays the system time.',
          'TREE     Graphically displays the directory structure of a drive.',
          'TYPE     Displays the contents of a text file.',
          'VER      Displays the MS-DOS version.',
          'VOL      Displays the disk volume label and serial number.',
          'WIN      Starts Windows.',
          'XCOPY    Copies files and directory trees.',
        ]);
        break;

      case 'ver':
        addOutput(['', 'Windows 98 [Version 4.10.2222]', '']);
        break;

      case 'echo':
        addOutput([rest || '']);
        break;

      case 'date':
        addOutput([`Current date is ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' })}`]);
        break;

      case 'time':
        addOutput([`Current time is ${new Date().toLocaleTimeString('en-US')}`]);
        break;

      case 'type': {
        if (!rest) { addOutput(['Required parameter missing']); break; }
        const filePath = resolveDosPath(currentPath, rest);
        const fileNode = fs.getNode(filePath);
        if (!fileNode || fileNode.type !== 'file') {
          addOutput(['File not found - ' + rest]);
        } else if (fileNode.content) {
          addOutput(fileNode.content.split('\n'));
        } else {
          addOutput(['[Binary file]']);
        }
        break;
      }

      case 'tree': {
        const targetPath = rest ? resolveDosPath(currentPath, rest) : currentPath;
        const node = fs.getNode(targetPath);
        if (!node || node.type !== 'directory') {
          addOutput(['Invalid path']);
          break;
        }
        const lines = buildTree(node, '', true, 0);
        addOutput(lines);
        break;
      }

      case 'format': {
        if (args[0]?.toLowerCase().startsWith('c:')) {
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

      default: {
        // Running a downloaded setup file by name launches its installer.
        const token = parsed.raw.split(/\s+/)[0];
        const slug = installerSlug(fs.getNode(resolveDosPath(currentPath, token))?.content);
        if (slug) { runInstaller(slug); break; }
        addOutput([`Bad command or file name`]);
      }
    }
  }, [
    currentPath, addOutput, closeWindow, windowId, fs, openWindow,
    getAppPref, setAppPref, pendingDeltree, resolveDeltree, runXcopy,
  ]);

  const handleTabCompletion = useCallback(() => {
    const { prefix, partial } = splitForCompletion(input);
    if (!partial) return;
    const dirEntries = fs.listDir(currentPathRef.current) ?? [];
    const names = dirEntries.map((n) => n.name);
    const matches = matchCompletions(names, partial);
    if (matches.length === 1) {
      const entry = dirEntries.find((n) => n.name === matches[0]);
      const suffix = entry?.type === 'directory' ? '\\' : '';
      setInput(prefix + matches[0] + suffix);
    } else if (matches.length > 1) {
      addOutput([matches.join('   ')]);
    }
  }, [input, fs, addOutput]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processCommand(input);
      setInput('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
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
  }, [input, history, historyIndex, processCommand, handleTabCompletion]);

  return (
    <div
      className="flex flex-col h-full bg-black text-[#C0C0C0] font-[family-name:var(--win98-font-mono)] text-[14px] leading-[18px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-auto p-[4px] min-h-0">
        {output.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line.text || ' '}
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
