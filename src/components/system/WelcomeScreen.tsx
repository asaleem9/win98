'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useSettings } from '@/contexts/SettingsContext';
import { useWindows } from '@/contexts/WindowContext';
import { Button98 } from '@/components/ui/Button98';
import { Checkbox98 } from '@/components/ui/Checkbox98';
import { Input98 } from '@/components/ui/Input98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';
import { playSound } from '@/lib/sounds';

interface WelcomeScreenProps {
  onClose: () => void;
}

type View = 'main' | 'register' | 'tour';

interface WelcomeOption {
  id: string;
  icon: string;
  title: string;
  description: string;
  onSelect: () => void;
}

const raisedBorder = cn(
  'border-2 border-solid',
  'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
  'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
  'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
);

/**
 * The "Welcome to Windows 98" splash that greets a new desktop. It is a
 * system-level overlay (not a registry app) so it can float above the shell and
 * reach into the window manager to launch AOL / ScanDisk. Register Now and
 * Discover Windows 98 are self-contained gags.
 */
export function WelcomeScreen({ onClose }: WelcomeScreenProps) {
  const { getAppPref, setAppPref } = useSettings();
  const { openWindow } = useWindows();
  const [view, setView] = useState<View>('main');
  const [showAtStartup, setShowAtStartup] = useState(() =>
    getAppPref('system', 'showWelcome', true),
  );

  const toggleStartup = (checked: boolean) => {
    setShowAtStartup(checked);
    setAppPref('system', 'showWelcome', checked);
  };

  const launch = (appId: string) => {
    openWindow(appId);
    onClose();
  };

  const options: WelcomeOption[] = [
    {
      id: 'register',
      icon: '/icons/regedit-32.svg',
      title: 'Register Now',
      description: 'Register your copy of Windows 98 with Microsoft.',
      onSelect: () => setView('register'),
    },
    {
      id: 'connect',
      icon: '/icons/aol-32.svg',
      title: 'Connect to the Internet',
      description: 'Get online for the first time with the Connection Wizard.',
      onSelect: () => launch('aol'),
    },
    {
      id: 'discover',
      icon: '/icons/windows-logo-32.svg',
      title: 'Discover Windows 98',
      description: 'Take a quick tour of what is new in Windows 98.',
      onSelect: () => setView('tour'),
    },
    {
      id: 'maintain',
      icon: '/icons/scandisk-32.svg',
      title: 'Maintain Your Computer',
      description: 'Keep your computer running smoothly with ScanDisk.',
      onSelect: () => launch('scandisk'),
    },
  ];

  if (view === 'tour') {
    return <DiscoverTour onClose={() => setView('main')} />;
  }

  return (
    // z-[5] keeps the splash above the desktop icons but below every real
    // window (the manager starts at z-10) — like the real Welcome.exe, anything
    // you open lands on top of it.
    <div className="fixed inset-0 z-[5] flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto w-[560px] bg-[var(--win98-button-face)]',
          raisedBorder,
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span className="truncate">Welcome to Windows 98</span>
          <button
            className={cn(
              'w-[16px] h-[14px] flex items-center justify-center text-black text-[9px] leading-none',
              'bg-[var(--win98-button-face)] border border-solid',
              'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
              'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
            )}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex">
          {/* Left gradient banner */}
          <div
            className="w-[150px] flex-shrink-0 p-3 flex flex-col justify-between text-white select-none"
            style={{
              background:
                'linear-gradient(160deg, var(--win98-titlebar-active-start) 0%, #000080 60%, #000040 100%)',
            }}
          >
            <div>
              <div className="text-[26px] italic leading-none font-bold [text-shadow:1px_1px_0_rgba(0,0,0,0.5)]">
                Welcome
              </div>
              <div className="mt-1 text-[13px] leading-tight">
                to Windows<span className="align-super text-[9px]">®</span> 98
              </div>
            </div>
            <img
              src="/icons/windows-logo-32.svg"
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 self-end opacity-90"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Right content */}
          {view === 'register' ? (
            <RegisterWizard
              userName={getAppPref('system', 'userName', 'User')}
              onDone={() => setView('main')}
            />
          ) : (
            <div className="flex-1 p-4 bg-white">
              <p className="mb-3 leading-snug text-black">
                Welcome. This screen introduces you to Windows and helps you get
                started. Choose an option below to begin.
              </p>
              <div className="flex flex-col">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={opt.onSelect}
                    className={cn(
                      'flex items-start gap-3 p-2 text-left w-full',
                      'border border-transparent',
                      'hover:bg-[var(--win98-highlight)] hover:text-[var(--win98-highlight-text)]',
                      'focus-visible:outline-1 focus-visible:outline-dotted focus-visible:outline-black',
                    )}
                  >
                    <img
                      src={opt.icon}
                      alt=""
                      width={32}
                      height={32}
                      className="w-8 h-8 flex-shrink-0"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span>
                      <span className="block font-bold">{opt.title}</span>
                      <span className="block leading-snug">{opt.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--win98-button-shadow)]">
          <Checkbox98
            checked={showAtStartup}
            onChange={(e) => toggleStartup(e.target.checked)}
            label="Show this screen each time Windows starts"
          />
          <Button98 onClick={onClose} className="min-w-[75px]">
            Close
          </Button98>
        </div>
      </div>
    </div>
  );
}

/** Three-step registration gag that "uploads" over the modem and always fails. */
function RegisterWizard({ userName, onDone }: { userName: string; onDone: () => void }) {
  // steps 0-2 are form pages; 'uploading' and 'failed' are the payoff.
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'form' | 'uploading' | 'failed'>('form');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase !== 'uploading') return;
    playSound('modemDial');
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase('failed'), 400);
          return 100;
        }
        return prev + 5;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'uploading') {
    return (
      <div className="flex-1 p-4 bg-white flex flex-col justify-center gap-3">
        <p className="text-black">Connecting to the Microsoft Registration Wizard...</p>
        <ProgressBar98 value={progress} />
        <p className="text-[var(--win98-disabled-text)]">
          Sending your registration over the modem. Please do not pick up the phone.
        </p>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className="flex-1 p-4 bg-white flex flex-col justify-center gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-[26px]">
            ⛔
          </div>
          <div className="text-black">
            <p className="font-bold mb-1">Registration Failed</p>
            <p>Registration could not be completed. Please try again in 1998.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button98 onClick={onDone} className="min-w-[75px]">
            OK
          </Button98>
        </div>
      </div>
    );
  }

  const pages = [
    {
      title: 'Registration Wizard',
      body: (
        <>
          <p className="text-black">Welcome, {userName}. Let&apos;s register your copy of Windows 98.</p>
          <label className="flex items-center gap-2 text-black">
            <span className="w-[80px]">Full name:</span>
            <Input98 defaultValue={userName} className="flex-1" aria-label="Full name" />
          </label>
          <label className="flex items-center gap-2 text-black">
            <span className="w-[80px]">Company:</span>
            <Input98 className="flex-1" aria-label="Company" />
          </label>
        </>
      ),
    },
    {
      title: 'Contact Information',
      body: (
        <>
          <p className="text-black">How can Microsoft reach you with exciting offers?</p>
          <label className="flex items-center gap-2 text-black">
            <span className="w-[80px]">Address:</span>
            <Input98 className="flex-1" aria-label="Address" />
          </label>
          <label className="flex items-center gap-2 text-black">
            <span className="w-[80px]">Country:</span>
            <Input98 defaultValue="United States" className="flex-1" aria-label="Country" />
          </label>
        </>
      ),
    },
    {
      title: 'Ready to Register',
      body: (
        <p className="text-black">
          Your registration is ready to send. Make sure your modem is connected,
          then choose Finish to dial Microsoft.
        </p>
      ),
    },
  ];

  const page = pages[step];
  const isLast = step === pages.length - 1;

  return (
    <div className="flex-1 p-4 bg-white flex flex-col gap-3">
      <p className="font-bold text-black">{page.title}</p>
      <div className="flex flex-col gap-3 flex-1">{page.body}</div>
      <div className="flex justify-end gap-[6px] border-t border-[var(--win98-button-shadow)] pt-3">
        <Button98
          onClick={() => (step === 0 ? onDone() : setStep((s) => s - 1))}
          className="min-w-[75px]"
        >
          {step === 0 ? 'Cancel' : '< Back'}
        </Button98>
        <Button98
          onClick={() => (isLast ? setPhase('uploading') : setStep((s) => s + 1))}
          className="min-w-[75px]"
        >
          {isLast ? 'Finish' : 'Next >'}
        </Button98>
      </div>
    </div>
  );
}

interface TourStep {
  text: string;
  highlight?: { top?: number; left?: number; right?: number; bottom?: number; width?: number; height?: number };
  tip: { top?: number; left?: number; right?: number; bottom?: number };
}

// Coach-mark tour. Positions are pinned to the shell's known geometry (Start
// button bottom-left, taskbar along the bottom, My Computer top-left) rather
// than measured from the DOM — informational only, no event hijacking.
const TOUR_STEPS: TourStep[] = [
  {
    text: 'Click here to begin. The Start button opens your programs, documents, and settings.',
    highlight: { left: 2, bottom: 2, width: 56, height: 24 },
    tip: { bottom: 36, left: 8 },
  },
  {
    text: 'This is the taskbar. Every program you open gets a button here so you can switch between them.',
    highlight: { left: 0, right: 0, bottom: 0, height: 28 },
    tip: { bottom: 40, left: 8 },
  },
  {
    text: 'Double-click My Computer to browse the drives and files on your PC.',
    highlight: { left: 6, top: 6, width: 70, height: 78 },
    tip: { top: 96, left: 8 },
  },
  {
    text: "That's it! You're ready to explore Windows 98. Have fun.",
    tip: { top: 0, left: 0, right: 0, bottom: 0 },
  },
];

function DiscoverTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const centered = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9100] pointer-events-none">
      {/* Highlight ring around the target */}
      {current.highlight && (
        <div
          className="absolute border-2 border-dotted border-white animate-pulse"
          style={{
            top: current.highlight.top,
            left: current.highlight.left,
            right: current.highlight.right,
            bottom: current.highlight.bottom,
            width: current.highlight.width,
            height: current.highlight.height,
            boxShadow: '0 0 0 2px rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className={cn(
          'absolute pointer-events-auto w-[240px] bg-[var(--win98-button-face)] p-3',
          raisedBorder,
          'font-[family-name:var(--win98-font)] text-[11px]',
          centered && 'flex flex-col',
        )}
        style={
          centered
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : { top: current.tip.top, left: current.tip.left, bottom: current.tip.bottom, right: current.tip.right }
        }
      >
        <p className="mb-3 leading-snug">{current.text}</p>
        <div className="flex justify-between items-center">
          <span className="text-[var(--win98-disabled-text)]">
            {step + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex gap-[6px]">
            <Button98 onClick={onClose} variant="default" className="min-w-[64px]">
              {isLast ? 'Done' : 'Close'}
            </Button98>
            {!isLast && (
              <Button98 onClick={() => setStep((s) => s + 1)} className="min-w-[64px]">
                Next &gt;
              </Button98>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
