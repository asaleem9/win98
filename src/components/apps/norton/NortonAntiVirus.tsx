'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';
import {
  Threat,
  quarantineThreats,
  markThreatsCleared,
  activeThreatPool,
  incrementScanCount,
  resetScanCount,
  isDefinitionsExpired,
} from './nortonLogic';
import { useSettings } from '@/contexts/SettingsContext';
import { emit } from '@/lib/eventBus';

const allThreats: Threat[] = [
  { name: 'ILOVEYOU.VBS', location: 'C:\\Windows\\System\\', risk: 'High', type: 'VBS.LoveLetter.A' },
  { name: 'HAPPY99.EXE', location: 'C:\\Windows\\Temp\\', risk: 'High', type: 'W32.Happy99.Worm' },
  { name: 'Melissa.doc', location: 'C:\\My Documents\\', risk: 'High', type: 'W97M.Melissa.A' },
  { name: 'CoolWebSearch', location: 'C:\\Program Files\\', risk: 'Medium', type: 'Adware.CoolWebSearch' },
];

const scanPaths = [
  'C:\\Windows\\System32\\kernel32.dll',
  'C:\\Windows\\System32\\user32.dll',
  'C:\\Windows\\System32\\advapi32.dll',
  'C:\\Windows\\explorer.exe',
  'C:\\Program Files\\Internet Explorer\\iexplore.exe',
  'C:\\Windows\\Temp\\~DF1234.tmp',
  'C:\\Windows\\System\\ILOVEYOU.VBS',
  'C:\\My Documents\\budget.xls',
  'C:\\My Documents\\Melissa.doc',
  'C:\\Windows\\Temp\\HAPPY99.EXE',
  'C:\\Program Files\\Common Files\\system.dll',
  'C:\\Program Files\\CoolWebSearch\\toolbar.dll',
  'C:\\Windows\\System32\\ntdll.dll',
  'C:\\Windows\\win.ini',
  'C:\\AUTOEXEC.BAT',
];

const buttonClass =
  'px-4 h-[24px] text-[11px] cursor-default font-bold bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] disabled:text-[var(--win98-button-shadow)]';

// Norton's real-time protection dropped a shield in the tray once the app had
// been launched, and left it there for the rest of the session.
let shieldRegistered = false;

export default function NortonAntiVirus({ windowId }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();

  useEffect(() => {
    if (shieldRegistered) return;
    shieldRegistered = true;
    emit('tray-register', { id: 'norton', icon: '/icons/norton-16.svg', tooltip: 'Norton AntiVirus' });
  }, []);

  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);
  const [foundThreats, setFoundThreats] = useState<Threat[]>([]);
  const [radarAngle, setRadarAngle] = useState(0);
  const [activeTab, setActiveTab] = useState<'scanner' | 'quarantine'>('scanner');

  const [clearedNames, setClearedNames] = useState<string[]>(() => getAppPref('norton', 'clearedNames', []));
  const [quarantine, setQuarantine] = useState<Threat[]>(() => getAppPref('norton', 'quarantine', []));
  const [scanCount, setScanCount] = useState<number>(() => getAppPref('norton', 'scanCount', 0));
  const [defsDate, setDefsDate] = useState<string>(() => getAppPref('norton', 'defsDate', 'March 15, 1999'));

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nagOpen, setNagOpen] = useState(false);
  const [liveUpdating, setLiveUpdating] = useState(false);
  const [liveUpdateProgress, setLiveUpdateProgress] = useState(0);
  const [liveUpdateDone, setLiveUpdateDone] = useState(false);

  const runScan = useCallback(() => {
    setActiveTab('scanner');
    setScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    setFilesScanned(0);
    setFoundThreats([]);
    setCurrentFile('');
  }, []);

  const startScan = useCallback(() => {
    if (isDefinitionsExpired(scanCount)) {
      setNagOpen(true);
      return;
    }
    runScan();
  }, [scanCount, runScan]);

  useEffect(() => {
    if (!scanning) return;
    const pool = activeThreatPool(allThreats, clearedNames);
    let fileIndex = 0;
    const interval = setInterval(() => {
      if (fileIndex >= scanPaths.length) {
        clearInterval(interval);
        setScanning(false);
        setScanComplete(true);
        setScanCount((prev) => {
          const next = incrementScanCount(prev);
          setAppPref('norton', 'scanCount', next);
          return next;
        });
        return;
      }
      const path = scanPaths[fileIndex];
      setCurrentFile(path);
      setFilesScanned((prev) => prev + Math.floor(Math.random() * 50) + 10);
      setScanProgress(((fileIndex + 1) / scanPaths.length) * 100);

      const threat = pool.find((t) => path.includes(t.name));
      if (threat) {
        setFoundThreats((prev) => [...prev, threat]);
      }
      fileIndex++;
    }, 400);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 6) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [scanning]);

  const handleQuarantineAll = useCallback(() => {
    const merged = quarantineThreats(quarantine, foundThreats);
    const cleared = markThreatsCleared(clearedNames, foundThreats);
    setQuarantine(merged);
    setClearedNames(cleared);
    setAppPref('norton', 'quarantine', merged);
    setAppPref('norton', 'clearedNames', cleared);
    setFoundThreats([]);
  }, [quarantine, clearedNames, foundThreats, setAppPref]);

  const handleDeleteAll = useCallback(() => {
    const cleared = markThreatsCleared(clearedNames, foundThreats);
    setClearedNames(cleared);
    setAppPref('norton', 'clearedNames', cleared);
    setFoundThreats([]);
    setConfirmDelete(false);
  }, [clearedNames, foundThreats, setAppPref]);

  const runLiveUpdate = useCallback(() => {
    setLiveUpdating(true);
    setLiveUpdateProgress(0);
    setLiveUpdateDone(false);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setLiveUpdateProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setLiveUpdating(false);
        setLiveUpdateDone(true);
        setDefsDate('July 3, 1998');
        setAppPref('norton', 'defsDate', 'July 3, 1998');
        const resetCount = resetScanCount();
        setScanCount(resetCount);
        setAppPref('norton', 'scanCount', resetCount);
      }
    }, 300);
  }, [setAppPref]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] relative">
      {/* Header */}
      <div className="bg-[#FFFF99] px-3 py-2 border-b-2 border-[#CC9900] flex items-center gap-2">
        <div className="text-2xl">🛡️</div>
        <div className="flex-1">
          <div className="font-bold text-[13px]">Norton AntiVirus 2000</div>
          <div className="text-[10px]">Virus Definitions: {defsDate}</div>
        </div>
        <button onClick={runLiveUpdate} disabled={liveUpdating} className={buttonClass}>
          LiveUpdate
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex border-b border-[var(--win98-button-shadow)]">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-3 py-1 text-[11px] cursor-default ${activeTab === 'scanner' ? 'bg-[var(--win98-button-face)] font-bold' : 'bg-[var(--win98-button-shadow)] text-white'}`}
        >
          Scanner
        </button>
        <button
          onClick={() => setActiveTab('quarantine')}
          className={`px-3 py-1 text-[11px] cursor-default ${activeTab === 'quarantine' ? 'bg-[var(--win98-button-face)] font-bold' : 'bg-[var(--win98-button-shadow)] text-white'}`}
        >
          Quarantine ({quarantine.length})
        </button>
      </div>

      {liveUpdating && (
        <div className="px-3 py-2 border-b border-[var(--win98-button-shadow)]">
          <div className="text-[10px] mb-1">Downloading virus definitions...</div>
          <ProgressBar98 value={liveUpdateProgress} />
        </div>
      )}

      {activeTab === 'scanner' && (
        <>
          {/* Shield / Radar area */}
          <div className="flex items-center justify-center py-3 border-b border-[var(--win98-button-shadow)]">
            <div className="relative w-[80px] h-[80px] rounded-full border-2 border-[#006600] bg-[#003300] overflow-hidden">
              {scanning && (
                <div
                  className="absolute top-1/2 left-1/2 w-[40px] h-[2px] bg-[#00FF00] origin-left"
                  style={{ transform: `rotate(${radarAngle}deg)`, opacity: 0.8 }}
                />
              )}
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#00FF00] rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute inset-0 border border-[#006600] rounded-full m-2" />
              <div className="absolute inset-0 border border-[#006600] rounded-full m-5" />
              <div className="absolute top-0 left-1/2 w-px h-full bg-[#006600]" />
              <div className="absolute top-1/2 left-0 w-full h-px bg-[#006600]" />
              {foundThreats.map((_, i) => (
                <div
                  key={i}
                  className="absolute w-[4px] h-[4px] bg-red-500 rounded-full animate-pulse"
                  style={{
                    top: `${25 + (i * 15) % 50}%`,
                    left: `${20 + (i * 20) % 60}%`,
                  }}
                />
              ))}
            </div>

            <div className="ml-4 text-center">
              {!scanning && !scanComplete && (
                <div className="text-[12px] font-bold text-[#006600]">System Protected</div>
              )}
              {scanning && <div className="text-[12px] font-bold text-[#CC6600]">Scanning...</div>}
              {scanComplete && (
                <div className={`text-[12px] font-bold ${foundThreats.length > 0 ? 'text-red-600' : 'text-[#006600]'}`}>
                  {foundThreats.length > 0 ? `${foundThreats.length} Threats Found!` : 'No Threats Found'}
                </div>
              )}
            </div>
          </div>

          {/* Scan controls */}
          <div className="px-3 py-2 border-b border-[var(--win98-button-shadow)]">
            <button onClick={startScan} disabled={scanning} className={buttonClass}>
              {scanning ? 'Scanning...' : scanComplete ? 'Rescan' : 'Scan Now'}
            </button>

            {(scanning || scanComplete) && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Files scanned: {filesScanned}</span>
                  <span>{Math.round(scanProgress)}%</span>
                </div>
                <div className="h-3 border border-solid border-[var(--win98-button-shadow)] bg-white">
                  <div className="h-full bg-[#006600] transition-all" style={{ width: `${scanProgress}%` }} />
                </div>
                {scanning && (
                  <div className="text-[10px] mt-1 truncate text-gray-600">Scanning: {currentFile}</div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {foundThreats.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 px-1 py-1">
              <div className="text-[10px] font-bold px-2 mb-1">Threats Detected:</div>
              <div className="flex-1 overflow-auto bg-white border border-solid border-[var(--win98-button-shadow)]">
                <table className="w-full text-[10px] border-collapse">
                  <thead className="sticky top-0 bg-[var(--win98-button-face)]">
                    <tr>
                      <th className="text-left px-2 py-[2px] font-normal border-b border-r border-[var(--win98-button-shadow)]">Threat</th>
                      <th className="text-left px-2 py-[2px] font-normal border-b border-r border-[var(--win98-button-shadow)]">Type</th>
                      <th className="text-left px-2 py-[2px] font-normal border-b border-r border-[var(--win98-button-shadow)]">Location</th>
                      <th className="text-center px-2 py-[2px] font-normal border-b border-[var(--win98-button-shadow)]">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foundThreats.map((threat) => (
                      <tr key={threat.name} className="hover:bg-[#FFFFCC]">
                        <td className="px-2 py-[2px]">⚠️ {threat.name}</td>
                        <td className="px-2 py-[2px]">{threat.type}</td>
                        <td className="px-2 py-[2px]">{threat.location}</td>
                        <td className="px-2 py-[2px] text-center">
                          <span className={threat.risk === 'High' ? 'text-red-600 font-bold' : 'text-[#CC6600]'}>
                            {threat.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {scanComplete && (
                <div className="flex gap-2 mt-1 px-1">
                  <button onClick={handleQuarantineAll} className="px-3 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]">
                    Quarantine All
                  </button>
                  <button onClick={() => setConfirmDelete(true)} className="px-3 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]">
                    Delete All
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'quarantine' && (
        <div className="flex-1 flex flex-col min-h-0 px-1 py-1">
          <div className="text-[10px] font-bold px-2 mb-1">Quarantined Items:</div>
          <div className="flex-1 overflow-auto bg-white border border-solid border-[var(--win98-button-shadow)]">
            {quarantine.length === 0 ? (
              <div className="p-3 text-[10px] text-gray-500">Nothing in quarantine.</div>
            ) : (
              <table className="w-full text-[10px] border-collapse">
                <thead className="sticky top-0 bg-[var(--win98-button-face)]">
                  <tr>
                    <th className="text-left px-2 py-[2px] font-normal border-b border-r border-[var(--win98-button-shadow)]">Threat</th>
                    <th className="text-left px-2 py-[2px] font-normal border-b border-[var(--win98-button-shadow)]">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {quarantine.map((threat) => (
                    <tr key={threat.name}>
                      <td className="px-2 py-[2px]">🔒 {threat.name}</td>
                      <td className="px-2 py-[2px]">{threat.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center px-2 py-[2px] border-t border-[var(--win98-button-highlight)]">
        <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px]">
          {scanning ? 'Scan in progress...' : scanComplete ? 'Scan complete' : 'Ready'}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50">
          <Dialog98
            title="Norton AntiVirus"
            icon="question"
            message={`Permanently delete ${foundThreats.length} threat(s)? This cannot be undone.`}
            buttons={[
              { label: 'Yes', onClick: handleDeleteAll, default: true },
              { label: 'No', onClick: () => setConfirmDelete(false) },
            ]}
          />
        </div>
      )}

      {nagOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50">
          <Dialog98
            title="Norton AntiVirus"
            icon="warning"
            message="Your virus definitions are out of date. Please run LiveUpdate before scanning."
            buttons={[{ label: 'OK', onClick: () => setNagOpen(false), default: true }]}
          />
        </div>
      )}

      {liveUpdateDone && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 z-50">
          <Dialog98
            title="LiveUpdate"
            icon="info"
            message="1998 virus definitions are up to date."
            buttons={[{ label: 'OK', onClick: () => setLiveUpdateDone(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
