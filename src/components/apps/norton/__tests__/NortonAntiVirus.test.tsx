import { fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import NortonAntiVirus from '../NortonAntiVirus';

const PREFS_KEY = 'win98-prefs-v1';

const threat = {
  name: 'ILOVEYOU.VBS',
  location: 'C:\\Windows\\System\\',
  risk: 'High',
  type: 'VBS.LoveLetter.A',
};

function seedQuarantine() {
  localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({ norton: { quarantine: [threat], clearedNames: [threat.name] } }),
  );
}

function readNortonPrefs() {
  const raw = localStorage.getItem(PREFS_KEY);
  return raw ? (JSON.parse(raw).norton ?? {}) : {};
}

describe('Norton AntiVirus menus', () => {
  beforeEach(() => localStorage.clear());

  it('renders the File, View and Help top-level menus', () => {
    const { getByRole } = renderWithProviders(<NortonAntiVirus windowId="w1" />);
    expect(getByRole('menuitem', { name: 'File' })).toBeTruthy();
    expect(getByRole('menuitem', { name: 'View' })).toBeTruthy();
    expect(getByRole('menuitem', { name: 'Help' })).toBeTruthy();
  });

  it('exposes Scan Now, LiveUpdate and Exit under File', () => {
    const { getByRole } = renderWithProviders(<NortonAntiVirus windowId="w1" />);
    fireEvent.mouseDown(getByRole('menuitem', { name: 'File' }));
    expect(getByRole('menuitem', { name: 'Scan Now' })).toBeTruthy();
    expect(getByRole('menuitem', { name: 'LiveUpdate...' })).toBeTruthy();
    expect(getByRole('menuitem', { name: 'Exit' })).toBeTruthy();
  });

  it('exposes the Quarantine viewer entry under View', () => {
    const { getByRole } = renderWithProviders(<NortonAntiVirus windowId="w1" />);
    fireEvent.mouseDown(getByRole('menuitem', { name: 'View' }));
    expect(getByRole('menuitem', { name: 'Quarantine' })).toBeTruthy();
  });
});

describe('Norton AntiVirus quarantine viewer', () => {
  beforeEach(() => localStorage.clear());

  function openQuarantine(getByRole: (role: string, opts: { name: string }) => HTMLElement) {
    fireEvent.mouseDown(getByRole('menuitem', { name: 'View' }));
    fireEvent.click(getByRole('menuitem', { name: 'Quarantine' }));
  }

  it('lists seeded quarantined items', () => {
    seedQuarantine();
    const { getByRole, getByText } = renderWithProviders(<NortonAntiVirus windowId="w1" />);
    openQuarantine(getByRole);
    expect(getByText(/ILOVEYOU\.VBS/)).toBeTruthy();
  });

  it('Restore removes the item from quarantine and un-clears it, surviving a remount', () => {
    seedQuarantine();
    const { getByRole, getByText, queryByText, unmount } = renderWithProviders(
      <NortonAntiVirus windowId="w1" />,
    );
    openQuarantine(getByRole);
    fireEvent.click(getByText('Restore'));

    expect(queryByText(/ILOVEYOU\.VBS/)).toBeNull();
    const prefs = readNortonPrefs();
    expect(prefs.quarantine).toEqual([]);
    // Restoring hands the file back, so the name is no longer cleared.
    expect(prefs.clearedNames).toEqual([]);

    unmount();
    const remount = renderWithProviders(<NortonAntiVirus windowId="w1" />);
    openQuarantine(remount.getByRole);
    expect(remount.queryByText(/ILOVEYOU\.VBS/)).toBeNull();
  });

  it('Delete permanently removes the item but keeps it cleared, surviving a remount', () => {
    seedQuarantine();
    const { getByRole, getByText, queryByText, unmount } = renderWithProviders(
      <NortonAntiVirus windowId="w1" />,
    );
    openQuarantine(getByRole);
    fireEvent.click(getByText('Delete'));

    expect(queryByText(/ILOVEYOU\.VBS/)).toBeNull();
    const prefs = readNortonPrefs();
    expect(prefs.quarantine).toEqual([]);
    // A permanent delete leaves the threat name on the cleared list.
    expect(prefs.clearedNames).toEqual([threat.name]);

    unmount();
    const remount = renderWithProviders(<NortonAntiVirus windowId="w1" />);
    openQuarantine(remount.getByRole);
    expect(remount.queryByText(/ILOVEYOU\.VBS/)).toBeNull();
  });
});
