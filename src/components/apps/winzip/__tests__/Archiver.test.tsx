import { useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { FileSystemProvider, useFileSystem, FileSystemContextType } from '@/contexts/FileSystemContext';
import { WindowProvider } from '@/contexts/WindowContext';
import WinZip from '../WinZip';
import { parseArchive } from '@/lib/archive';
import '@/lib/appRegistry';

const captured: { fs: FileSystemContextType } = { fs: null as unknown as FileSystemContextType };
function Probe() {
  const value = useFileSystem();
  useEffect(() => { captured.fs = value; });
  return null;
}

function renderZip() {
  return render(
    <SettingsProvider>
      <FileSystemProvider>
        <WindowProvider>
          <Probe />
          <WinZip windowId="wz" />
        </WindowProvider>
      </FileSystemProvider>
    </SettingsProvider>,
  );
}

describe('WinZip archiver round-trip', () => {
  it('creates a new archive, adds a real file, and extracts it back to the disk', async () => {
    renderZip();
    // Clear the shareware nag.
    fireEvent.click(screen.getByText('Continue'));

    // 1) New Archive -> file picker (save) -> C:\My Documents\Test.zip
    fireEvent.click(screen.getByText('New'));
    fireEvent.change(screen.getByDisplayValue('Archive.zip'), { target: { value: 'Test.zip' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      const content = captured.fs.readFile('C:\\My Documents\\Test.zip');
      expect(parseArchive(content)).toEqual({ archive: true, entries: [] });
    });
    fireEvent.click(screen.getByText('OK')); // dismiss "Created" notice

    // 2) Add -> file picker (open) -> double-click readme.txt
    fireEvent.click(screen.getByText('Add'));
    fireEvent.doubleClick(screen.getByText('readme.txt'));
    await waitFor(() => {
      const parsed = parseArchive(captured.fs.readFile('C:\\My Documents\\Test.zip'));
      expect(parsed?.entries.map((e) => e.name)).toEqual(['readme.txt']);
    });
    fireEvent.click(screen.getByText('OK')); // dismiss "Added" notice

    // 3) Extract To -> C:\TEMP -> real file written
    fireEvent.click(screen.getByText('Extract'));
    fireEvent.change(screen.getByDisplayValue('C:\\My Documents'), { target: { value: 'C:\\TEMP' } });
    fireEvent.click(screen.getByText('OK')); // extract dialog OK
    await waitFor(
      () => {
        const extracted = captured.fs.getNode('C:\\TEMP\\readme.txt');
        expect(extracted).not.toBeNull();
        expect(extracted?.type).toBe('file');
      },
      { timeout: 2000 },
    );
  });
});
