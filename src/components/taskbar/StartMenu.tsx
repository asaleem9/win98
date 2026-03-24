'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { getStartMenuApps } from '@/lib/appRegistry';
import { AppDefinition } from '@/types/app';

interface StartMenuProps {
  onClose: () => void;
}

interface MenuGroup {
  label: string;
  icon?: string;
  apps?: AppDefinition[];
  children?: MenuGroup[];
  action?: () => void;
  separator?: boolean;
}

function buildStartMenuTree(apps: AppDefinition[]): MenuGroup[] {
  const groups: Record<string, MenuGroup> = {};

  for (const app of apps) {
    if (!app.startMenuPath) continue;
    const path = app.startMenuPath;

    if (path.length === 1 && path[0] === 'Programs') {
      if (!groups['__root']) groups['__root'] = { label: 'Programs', apps: [], children: [] };
      groups['__root'].apps!.push(app);
    } else if (path.length >= 2 && path[0] === 'Programs') {
      const subPath = path.slice(1).join(' > ');
      if (!groups[subPath]) groups[subPath] = { label: path[path.length - 1], apps: [] };
      groups[subPath].apps!.push(app);
    } else if (path[0] === 'Settings') {
      if (!groups['__settings']) groups['__settings'] = { label: 'Settings', apps: [] };
      groups['__settings'].apps!.push(app);
    }
  }

  return Object.values(groups);
}

export function StartMenu({ onClose }: StartMenuProps) {
  const { openWindow } = useWindows();
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);

  const startMenuApps = getStartMenuApps();
  const menuTree = buildStartMenuTree(startMenuApps);

  // Programs submenu items
  const programsRoot = menuTree.find((g) => g.label === 'Programs');
  const subfolders = menuTree.filter((g) => g.label !== 'Programs' && g.label !== 'Settings');
  const settingsGroup = menuTree.find((g) => g.label === 'Settings');

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleOpenApp = (appId: string) => {
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
          {/* Programs with submenu */}
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
              <img src="/icons/programs-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
              <span className="flex-1 font-bold">Programs</span>
              <span>▶</span>
            </div>

            {hoveredSubmenu === 'programs' && (
              <div
                className={cn(
                  'absolute left-full top-0 min-w-[180px]',
                  'bg-[var(--win98-button-face)] py-[2px]',
                  'border-2 border-solid',
                  'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
                  'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
                )}
              >
                {/* Subfolder groups */}
                {subfolders.map((group) => (
                  <div key={group.label} className="relative group/sub">
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-[2px] cursor-default select-none',
                        'hover:bg-[var(--win98-highlight)] hover:text-white',
                      )}
                    >
                      <img src="/icons/folder-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                      <span className="flex-1">{group.label}</span>
                      <span>▶</span>
                    </div>
                    {/* Subfolder apps */}
                    <div
                      className={cn(
                        'absolute left-full top-0 min-w-[160px] hidden group-hover/sub:block',
                        'bg-[var(--win98-button-face)] py-[2px]',
                        'border-2 border-solid',
                        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
                        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
                      )}
                    >
                      {group.apps?.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => handleOpenApp(app.id)}
                          className={cn(
                            'flex items-center gap-2 w-full px-3 py-[2px] cursor-default select-none text-left',
                            'hover:bg-[var(--win98-highlight)] hover:text-white',
                          )}
                        >
                          <img
                            src={app.icon16 || app.icon}
                            alt=""
                            className="w-4 h-4"
                            style={{ imageRendering: 'pixelated' }}
                          />
                          <span>{app.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {subfolders.length > 0 && programsRoot?.apps && programsRoot.apps.length > 0 && (
                  <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />
                )}

                {/* Root-level program items */}
                {programsRoot?.apps?.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleOpenApp(app.id)}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-[2px] cursor-default select-none text-left',
                      'hover:bg-[var(--win98-highlight)] hover:text-white',
                    )}
                  >
                    <img
                      src={app.icon16 || app.icon}
                      alt=""
                      className="w-4 h-4"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span>{app.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Favorites */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
            )}
            onClick={() => { handleOpenApp('ie5'); }}
          >
            <img src="/icons/ie-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
            <span>Favorites</span>
            <span className="ml-auto">▶</span>
          </div>

          {/* Documents */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
            )}
            onClick={() => { handleOpenApp('my-documents'); }}
          >
            <img src="/icons/my-documents-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
            <span>Documents</span>
          </div>

          {/* Separator */}
          <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />

          {/* Settings */}
          {settingsGroup && settingsGroup.apps && settingsGroup.apps.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
                'hover:bg-[var(--win98-highlight)] hover:text-white',
              )}
              onClick={() => { handleOpenApp('control-panel'); }}
            >
              <img src="/icons/settings-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
              <span>Settings</span>
              <span className="ml-auto">▶</span>
            </div>
          )}

          {/* Find */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
            )}
          >
            <img src="/icons/find-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
            <span>Find</span>
            <span className="ml-auto">▶</span>
          </div>

          {/* Help */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
            )}
          >
            <img src="/icons/find-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
            <span>Help</span>
          </div>

          {/* Run */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
            )}
          >
            <img src="/icons/run-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
            <span>Run...</span>
          </div>

          {/* Separator */}
          <div className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)]" />

          {/* Shut Down */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-[4px] cursor-default select-none',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
            )}
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('win98-shutdown'));
            }}
          >
            <img src="/icons/shutdown-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
            <span>Shut Down...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
