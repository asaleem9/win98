'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getStartMenuApps } from '@/lib/appRegistry';
import { AppDefinition } from '@/types/app';
import { getRecentDocs, requestOpenFile } from '@/lib/recentDocs';
import { playSound } from '@/lib/sounds';

interface StartMenuProps {
  onClose: () => void;
}

export interface MenuNode {
  label: string;
  apps: AppDefinition[];
  children: MenuNode[];
}

/**
 * Builds a true nested tree from startMenuPath arrays, so
 * ['Programs', 'Accessories', 'Multimedia'] nests Multimedia inside
 * Accessories (and stays distinct from ['Programs', 'Multimedia']).
 */
export function buildStartMenuTree(apps: AppDefinition[]): { programs: MenuNode; settingsApps: AppDefinition[] } {
  const programs: MenuNode = { label: 'Programs', apps: [], children: [] };
  const settingsApps: AppDefinition[] = [];

  for (const app of apps) {
    if (!app.startMenuPath || app.startMenuPath.length === 0) continue;
    const [head, ...rest] = app.startMenuPath;

    if (head === 'Settings') {
      settingsApps.push(app);
      continue;
    }
    if (head !== 'Programs') continue;

    let node = programs;
    for (const segment of rest) {
      let child = node.children.find((c) => c.label === segment);
      if (!child) {
        child = { label: segment, apps: [], children: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.apps.push(app);
  }

  const sortTree = (node: MenuNode) => {
    node.children.sort((a, b) => a.label.localeCompare(b.label));
    node.apps.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortTree);
  };
  sortTree(programs);

  return { programs, settingsApps };
}

const flyoutClass = cn(
  // NOTE: no overflow-y here — it would clip nested flyouts positioned outside
  // this box. Anchored bottom so long lists grow upward from the taskbar.
  'absolute left-full bottom-0 min-w-[180px]',
  'bg-[var(--win98-button-face)] py-[2px]',
  'border-2 border-solid',
  'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
  'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
);

function AppItem({ app, onOpen }: { app: AppDefinition; onOpen: (appId: string) => void }) {
  return (
    <button
      onClick={() => onOpen(app.id)}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-[2px] cursor-default select-none text-left',
        'hover:bg-[var(--win98-highlight)] hover:text-white',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={app.icon16 || app.icon} alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
      <span>{app.name}</span>
    </button>
  );
}

/** A folder row that opens its own flyout on hover; recursive for any depth. */
function MenuFolder({ node, onOpen }: { node: MenuNode; onOpen: (appId: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-[2px] cursor-default select-none',
          open && 'bg-[var(--win98-highlight)] text-white',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/folder-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
        <span className="flex-1">{node.label}</span>
        <span>▶</span>
      </div>
      {open && (
        <div className={flyoutClass}>
          {node.children.map((child) => (
            <MenuFolder key={child.label} node={child} onOpen={onOpen} />
          ))}
          {node.children.length > 0 && node.apps.length > 0 && (
            <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />
          )}
          {node.apps.map((app) => (
            <AppItem key={app.id} app={app} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A top-level Start menu row (bold label, 16px icon) with an optional flyout. */
function TopRow({
  icon,
  label,
  arrow,
  onClick,
  flyout,
}: {
  icon: string;
  label: string;
  arrow?: boolean;
  onClick?: () => void;
  flyout?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => flyout && setOpen(true)}
      onMouseLeave={() => flyout && setOpen(false)}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
          open ? 'bg-[var(--win98-highlight)] text-white' : 'hover:bg-[var(--win98-highlight)] hover:text-white',
        )}
        onClick={onClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
        <span className="flex-1">{label}</span>
        {arrow && <span className="ml-auto">▶</span>}
      </div>
      {open && flyout}
    </div>
  );
}

const FAVORITE_SITES: Array<{ label: string; url: string }> = [
  { label: 'Yahoo!', url: 'www.yahoo.com' },
  { label: 'GeoCities', url: 'www.geocities.com' },
  { label: 'AltaVista', url: 'www.altavista.com' },
];

export function StartMenu({ onClose }: StartMenuProps) {
  const { openWindow } = useWindows();
  const { getAppPref } = useSettings();
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);

  // Apps removed via Add/Remove Programs drop out of the Programs tree.
  const uninstalledApps = getAppPref<Record<string, boolean>>('system', 'uninstalledApps', {});
  const { programs, settingsApps } = buildStartMenuTree(
    getStartMenuApps().filter((a) => !uninstalledApps[a.id]),
  );
  const recentDocs = getRecentDocs();

  useEffect(() => {
    playSound('menuOpen');
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleOpenApp = (appId: string) => {
    playSound('menuClick');
    openWindow(appId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute bottom-full left-0 mb-0',
        'bg-[var(--win98-button-face)] min-w-[180px]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
    >
      <div className="flex">
        {/* Blue sidebar */}
        <div className="w-[24px] bg-gradient-to-t from-[#000080] to-[#1084d0] flex items-end p-[2px]">
          <span
            className="text-white text-[11px] font-bold whitespace-nowrap origin-bottom-left -rotate-90 translate-y-[2px]"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Windows 98
          </span>
        </div>

        {/* Menu items */}
        <div className="flex-1 py-[2px]">
          {/* Programs with recursive submenu */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredSubmenu('programs')}
            onMouseLeave={() => setHoveredSubmenu(null)}
          >
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
                hoveredSubmenu === 'programs' && 'bg-[var(--win98-highlight)] text-white',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/programs-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
              <span className="flex-1 font-bold">Programs</span>
              <span>▶</span>
            </div>

            {hoveredSubmenu === 'programs' && (
              <div className={flyoutClass}>
                {programs.children.map((child) => (
                  <MenuFolder key={child.label} node={child} onOpen={handleOpenApp} />
                ))}
                {programs.children.length > 0 && programs.apps.length > 0 && (
                  <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />
                )}
                {programs.apps.map((app) => (
                  <AppItem key={app.id} app={app} onOpen={handleOpenApp} />
                ))}
              </div>
            )}
          </div>

          {/* Favorites */}
          <TopRow
            icon="/icons/ie-16.svg"
            label="Favorites"
            arrow
            flyout={
              <div className={flyoutClass}>
                {FAVORITE_SITES.map((site) => (
                  <button
                    key={site.url}
                    onClick={() => {
                      playSound('menuClick');
                      openWindow('ie5', { launchParams: { url: site.url } });
                      onClose();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-[2px] cursor-default select-none text-left hover:bg-[var(--win98-highlight)] hover:text-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/ie-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                    <span>{site.label}</span>
                  </button>
                ))}
              </div>
            }
          />

          {/* Documents */}
          <TopRow
            icon="/icons/my-documents-16.svg"
            label="Documents"
            arrow
            flyout={
              <div className={flyoutClass}>
                <button
                  onClick={() => handleOpenApp('my-documents')}
                  className="flex items-center gap-2 w-full px-3 py-[2px] cursor-default select-none text-left hover:bg-[var(--win98-highlight)] hover:text-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/my-documents-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                  <span>My Documents</span>
                </button>
                {recentDocs.length > 0 && (
                  <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />
                )}
                {recentDocs.map((path) => (
                  <button
                    key={path}
                    onClick={() => {
                      playSound('menuClick');
                      requestOpenFile(path);
                      onClose();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-[2px] cursor-default select-none text-left hover:bg-[var(--win98-highlight)] hover:text-white"
                    title={path}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/txt-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                    <span className="truncate max-w-[160px]">{path.split('\\').pop()}</span>
                  </button>
                ))}
              </div>
            }
          />

          {/* Separator */}
          <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />

          {/* Settings */}
          {settingsApps.length > 0 && (
            <TopRow
              icon="/icons/settings-16.svg"
              label="Settings"
              arrow
              flyout={
                <div className={flyoutClass}>
                  {settingsApps.map((app) => (
                    <AppItem key={app.id} app={app} onOpen={handleOpenApp} />
                  ))}
                </div>
              }
            />
          )}

          {/* Find */}
          <TopRow
            icon="/icons/find-16.svg"
            label="Find"
            arrow
            flyout={
              <div className={flyoutClass}>
                <button
                  onClick={() => handleOpenApp('find-files')}
                  className="flex items-center gap-2 w-full px-3 py-[2px] cursor-default select-none text-left hover:bg-[var(--win98-highlight)] hover:text-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/find-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                  <span>Files or Folders...</span>
                </button>
              </div>
            }
          />

          {/* Help */}
          <TopRow icon="/icons/find-16.svg" label="Help" onClick={() => handleOpenApp('help')} />

          {/* Run */}
          <TopRow
            icon="/icons/run-16.svg"
            label="Run..."
            onClick={() => {
              playSound('menuClick');
              onClose();
              window.dispatchEvent(new CustomEvent('win98-run-dialog'));
            }}
          />

          {/* Separator */}
          <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />

          {/* Shut Down */}
          <TopRow
            icon="/icons/shutdown-16.svg"
            label="Shut Down..."
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('win98-shutdown-dialog'));
            }}
          />
        </div>
      </div>
    </div>
  );
}
