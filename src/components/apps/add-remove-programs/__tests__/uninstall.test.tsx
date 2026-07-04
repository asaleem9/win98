import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { WindowProvider } from '@/contexts/WindowContext';
import { StartMenu } from '@/components/taskbar/StartMenu';
import { InstallShieldWizard } from '../InstallShieldWizard';
import AddRemovePrograms from '../AddRemovePrograms';
import '@/lib/appRegistry';

const PREFS_KEY = 'win98-prefs-v1';

function seedPrefs(prefs: unknown) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
function readPrefs(): { system?: { installedApps?: Record<string, boolean>; uninstalledApps?: Record<string, boolean> } } {
  const raw = localStorage.getItem(PREFS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function openProgramsFlyout() {
  const row = screen.getByText('Programs').closest('.relative')!;
  fireEvent.mouseEnter(row);
}

describe('Start menu uninstall filter', () => {
  it('lists an app that has not been uninstalled', () => {
    render(
      <SettingsProvider>
        <WindowProvider>
          <StartMenu onClose={() => {}} />
        </WindowProvider>
      </SettingsProvider>,
    );
    openProgramsFlyout();
    expect(screen.getByText('Internet Explorer')).toBeInTheDocument();
  });

  it('hides an app flagged in system/uninstalledApps', () => {
    seedPrefs({ system: { uninstalledApps: { ie5: true } } });
    render(
      <SettingsProvider>
        <WindowProvider>
          <StartMenu onClose={() => {}} />
        </WindowProvider>
      </SettingsProvider>,
    );
    openProgramsFlyout();
    expect(screen.queryByText('Internet Explorer')).not.toBeInTheDocument();
  });
});

describe('InstallShield wizard', () => {
  it('records the install and clears the uninstall flag on Finish', () => {
    seedPrefs({ system: { uninstalledApps: { winzip: true } } });
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <SettingsProvider>
        <InstallShieldWizard slug="winzip" onClose={onClose} />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByText('Next >'));
    act(() => { vi.advanceTimersByTime(90 * 40); });
    fireEvent.click(screen.getByText('Finish'));
    vi.useRealTimers();

    const prefs = readPrefs();
    expect(prefs.system?.installedApps?.winzip).toBe(true);
    expect(prefs.system?.uninstalledApps?.winzip).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Add/Remove Programs real uninstall', () => {
  it('flags a removed program and drops it from the list', () => {
    vi.useFakeTimers();
    render(
      <SettingsProvider>
        <AddRemovePrograms windowId="arp" />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByText('WinZip 7.0'));
    fireEvent.click(screen.getByText('Add/Remove...'));
    act(() => { vi.advanceTimersByTime(80 * 25); });
    vi.useRealTimers();

    expect(readPrefs().system?.uninstalledApps?.winzip).toBe(true);
    expect(screen.queryByText('WinZip 7.0')).not.toBeInTheDocument();
  });

  it('BonziBUDDY refuses removal and is never flagged', () => {
    vi.useFakeTimers();
    render(
      <SettingsProvider>
        <AddRemovePrograms windowId="arp" />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByText('BonziBUDDY'));
    fireEvent.click(screen.getByText('Add/Remove...'));
    act(() => { vi.advanceTimersByTime(80 * 30); });
    vi.useRealTimers();

    expect(screen.getByText(/does not want to leave/i)).toBeInTheDocument();
    expect(readPrefs().system?.uninstalledApps?.['bonzi-buddy']).toBeUndefined();
  });
});
