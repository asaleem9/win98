'use client';

import { useState, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { TabControl98 } from '@/components/ui/TabControl98';
import { Button98 } from '@/components/ui/Button98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { useWindows } from '@/contexts/WindowContext';
import { cn } from '@/lib/cn';

const FAKE_PROCESSES = [
  { name: 'Explorer.exe', pid: 1024, cpu: 2, mem: 8432 },
  { name: 'Systray.exe', pid: 1056, cpu: 0, mem: 2104 },
  { name: 'Kernel32.dll', pid: 4, cpu: 1, mem: 1520 },
  { name: 'Msgsrv32.exe', pid: 512, cpu: 0, mem: 3208 },
  { name: 'Mprexe.exe', pid: 768, cpu: 0, mem: 1840 },
  { name: 'Mmtask.tsk', pid: 256, cpu: 0, mem: 960 },
  { name: 'Rnaapp.exe', pid: 1280, cpu: 0, mem: 2560 },
  { name: 'Spool32.exe', pid: 1536, cpu: 1, mem: 4096 },
  { name: 'Winoldap.mod', pid: 2048, cpu: 0, mem: 1280 },
  { name: 'Rundll32.exe', pid: 1792, cpu: 3, mem: 5120 },
  { name: 'Internat.exe', pid: 2304, cpu: 0, mem: 1024 },
  { name: 'Loadwc.exe', pid: 2560, cpu: 0, mem: 768 },
];

function PerformanceGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(Array(60).fill(5));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: ReturnType<typeof setTimeout>;

    function draw() {
      const data = dataRef.current;
      // Add new data point
      const last = data[data.length - 1];
      const next = Math.max(2, Math.min(98, last + (Math.random() - 0.45) * 20));
      data.push(next);
      if (data.length > 60) data.shift();

      const w = canvas!.width;
      const h = canvas!.height;

      // Background
      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, w, h);

      // Grid
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

      // Line
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
  const [memUsage] = useState(Math.floor(Math.random() * 30 + 50));
  const [processes, setProcesses] = useState(FAKE_PROCESSES);

  // Fluctuate CPU usage
  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses((prev) =>
        prev.map((p) => ({
          ...p,
          cpu: Math.max(0, Math.min(99, p.cpu + Math.floor((Math.random() - 0.5) * 4))),
        })),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

  const processesTab = (
    <div className="flex flex-col h-[200px]">
      <div
        className={cn(
          'flex-1 bg-white overflow-auto',
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
                key={p.pid}
                onClick={() => setSelectedProcess(p.name)}
                className={cn(
                  'cursor-default',
                  selectedProcess === p.name && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
                )}
              >
                <td className="px-2 py-[1px]">{p.name}</td>
                <td className="px-2 py-[1px] text-right">{p.pid}</td>
                <td className="px-2 py-[1px] text-right">{p.cpu}%</td>
                <td className="px-2 py-[1px] text-right">{p.mem} K</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const performanceTab = (
    <div className="flex flex-col gap-3 h-[200px]">
      <div className="flex gap-4">
        <div>
          <div className="mb-1 font-bold">CPU Usage</div>
          <PerformanceGraph />
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
                style={{ height: `${memUsage}%` }}
              />
            </div>
            <span>{memUsage}% in use</span>
          </div>
        </div>
      </div>
      <div className="text-[10px]">
        <div>Physical Memory (K): Total: 131,072 — Available: {Math.floor(131072 * (1 - memUsage / 100)).toLocaleString()}</div>
        <div>Kernel Memory (K): Total: 24,576 — Paged: 18,432</div>
        <div>Processes: {processes.length} — Threads: {processes.length * 3 + 12}</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 p-2">
        <TabControl98
          tabs={[
            { id: 'applications', label: 'Applications', content: applicationsTab },
            { id: 'processes', label: 'Processes', content: processesTab },
            { id: 'performance', label: 'Performance', content: performanceTab },
          ]}
        />
      </div>
      <StatusBar98
        panels={[
          { content: `Processes: ${processes.length}` },
          { content: `CPU Usage: ${processes.reduce((s, p) => s + p.cpu, 0)}%`, width: 100 },
          { content: `Mem: ${memUsage}%`, width: 80 },
        ]}
      />
    </div>
  );
}
