'use client';

import { useState, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { TabControl98 } from '@/components/ui/TabControl98';
import { Button98 } from '@/components/ui/Button98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { useWindows } from '@/contexts/WindowContext';
import { cn } from '@/lib/cn';
import {
  buildProcessList,
  isSystemProcessName,
  totalCpu,
  totalMemKB,
  ProcessInfo,
} from './processes';

function PerformanceGraph({ value }: { value: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(Array(60).fill(5));
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: ReturnType<typeof setTimeout>;

    function draw() {
      const data = dataRef.current;
      data.push(valueRef.current);
      if (data.length > 60) data.shift();

      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, w, h);

      ctx!.strokeStyle = '#003300';
      ctx!.lineWidth = 1;
      for (let y = 0; y < h; y += h / 5) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }
      for (let x = 0; x < w; x += w / 6) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
        ctx!.stroke();
      }

      ctx!.strokeStyle = '#00FF00';
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * w;
        const y = h - (data[i] / 100) * h;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      animId = setTimeout(() => requestAnimationFrame(draw), 500);
    }

    draw();
    return () => clearTimeout(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={120}
      className={cn(
        'border-2 border-solid',
        'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
      )}
    />
  );
}

export default function TaskManager({ windowId }: AppComponentProps) {
  const { windows, closeWindow } = useWindows();
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>(() =>
    buildProcessList(
      windows.map((w) => ({ id: w.id, appId: w.appId, title: w.title })),
      [],
    ),
  );
  const [accessDeniedFor, setAccessDeniedFor] = useState<string | null>(null);

  // Rebuild/wiggle the process list on a ~1s tick, folding in whatever windows
  // are currently open so the list stays in sync with the desktop.
  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses((prev) =>
        buildProcessList(
          windows.map((w) => ({ id: w.id, appId: w.appId, title: w.title })),
          prev,
        ),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [windows]);

  const cpuUsage = totalCpu(processes);
  const memKB = totalMemKB(processes);
  const memUsagePct = Math.min(99, Math.round((memKB / 131072) * 100));

  const handleEndProcess = (proc: ProcessInfo) => {
    if (proc.isWindow && proc.windowId) {
      closeWindow(proc.windowId);
      setSelectedProcess(null);
      return;
    }
    if (proc.name === 'KERNEL32.DLL') {
      window.dispatchEvent(
        new CustomEvent('win98-bsod', {
          detail: {
            message:
              'A fatal exception 0D has occurred at 0028:C0011E36 in VxD KERNEL32(01) + 00010E36. The current application will be terminated.',
          },
        }),
      );
      return;
    }
    if (isSystemProcessName(proc.name)) {
      setAccessDeniedFor(proc.name);
    }
  };

  const applicationsTab = (
    <div className="flex flex-col h-[200px]">
      <div
        className={cn(
          'flex-1 bg-white overflow-auto mb-2',
          'border-2 border-solid',
          'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
          'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        )}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--win98-button-face)] sticky top-0 border-b border-[var(--win98-button-shadow)]">
              <th className="text-left px-2 py-[2px] font-normal">Task</th>
              <th className="text-left px-2 py-[2px] font-normal w-[80px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {windows
              .filter((w) => w.state !== 'minimized')
              .map((w) => (
                <tr
                  key={w.id}
                  onClick={() => setSelectedWindow(w.id)}
                  className={cn(
                    'cursor-default',
                    selectedWindow === w.id && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
                  )}
                >
                  <td className="px-2 py-[1px]">{w.title}</td>
                  <td className="px-2 py-[1px]">Running</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <Button98
          disabled={!selectedWindow}
          onClick={() => {
            if (selectedWindow) closeWindow(selectedWindow);
            setSelectedWindow(null);
          }}
        >
          End Task
        </Button98>
      </div>
    </div>
  );

  const selectedProcInfo = processes.find((p) => p.key === selectedProcess) ?? null;

  const processesTab = (
    <div className="flex flex-col h-[200px]">
      <div
        className={cn(
          'flex-1 bg-white overflow-auto mb-2',
          'border-2 border-solid',
          'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
          'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        )}
      >
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--win98-button-face)] sticky top-0 border-b border-[var(--win98-button-shadow)]">
              <th className="text-left px-2 py-[2px] font-normal">Image Name</th>
              <th className="text-right px-2 py-[2px] font-normal w-[50px]">PID</th>
              <th className="text-right px-2 py-[2px] font-normal w-[50px]">CPU</th>
              <th className="text-right px-2 py-[2px] font-normal w-[70px]">Mem Usage</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((p) => (
              <tr
                key={p.key}
                onClick={() => setSelectedProcess(p.key)}
                className={cn(
                  'cursor-default',
                  selectedProcess === p.key && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
                )}
              >
                <td className="px-2 py-[1px]">{p.name}</td>
                <td className="px-2 py-[1px] text-right">{p.pid}</td>
                <td className="px-2 py-[1px] text-right">{p.cpu}%</td>
                <td className="px-2 py-[1px] text-right">{p.mem.toLocaleString()} K</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <Button98
          disabled={!selectedProcInfo}
          onClick={() => selectedProcInfo && handleEndProcess(selectedProcInfo)}
        >
          End Process
        </Button98>
      </div>
    </div>
  );

  const performanceTab = (
    <div className="flex flex-col gap-3 h-[200px]">
      <div className="flex gap-4">
        <div>
          <div className="mb-1 font-bold">CPU Usage</div>
          <PerformanceGraph value={cpuUsage} />
        </div>
        <div>
          <div className="mb-1 font-bold">Memory Usage</div>
          <div className="flex flex-col gap-1">
            <div
              className={cn(
                'w-[120px] h-[120px] flex flex-col justify-end',
                'border-2 border-solid bg-black',
                'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
                'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
              )}
            >
              <div
                className="bg-[#00FF00] w-full transition-all duration-500"
                style={{ height: `${memUsagePct}%` }}
              />
            </div>
            <span>{memUsagePct}% in use</span>
          </div>
        </div>
      </div>
      <div className="text-[10px]">
        <div>Physical Memory (K): Total: 131,072 — Available: {Math.max(0, 131072 - memKB).toLocaleString()}</div>
        <div>Kernel Memory (K): Total: 24,576 — Paged: 18,432</div>
        <div>Processes: {processes.length} — Threads: {processes.length * 3 + 12}</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 p-2 flex flex-col min-h-0">
        <TabControl98
          tabs={[
            { id: 'applications', label: 'Applications', content: applicationsTab },
            { id: 'processes', label: 'Processes', content: processesTab },
            { id: 'performance', label: 'Performance', content: performanceTab },
          ]}
        />
        <div className="flex justify-end mt-2">
          <Button98 onClick={() => window.dispatchEvent(new CustomEvent('win98-run-dialog'))}>
            New Task...
          </Button98>
        </div>
      </div>
      <StatusBar98
        panels={[
          { content: `Processes: ${processes.length}` },
          { content: `CPU Usage: ${cpuUsage}%`, width: 100 },
          { content: `Mem Usage: ${memUsagePct}%`, width: 100 },
        ]}
      />

      {accessDeniedFor && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title="Task Manager"
            icon="error"
            message={
              <>
                Unable to terminate process. Access is denied.
                <br />
                ({accessDeniedFor})
              </>
            }
            buttons={[{ label: 'OK', onClick: () => setAccessDeniedFor(null), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
