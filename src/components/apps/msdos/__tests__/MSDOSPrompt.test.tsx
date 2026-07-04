import { useEffect } from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { WindowProvider } from '@/contexts/WindowContext';
import { FileSystemProvider, useFileSystem, FileSystemContextType } from '@/contexts/FileSystemContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import MSDOSPrompt from '../MSDOSPrompt';
import '@/lib/appRegistry';

// jsdom doesn't implement scrollTo; the prompt calls it on every output change.
beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
});

const captured: { fs: FileSystemContextType } = { fs: null as unknown as FileSystemContextType };
function Probe() {
  const value = useFileSystem();
  useEffect(() => { captured.fs = value; });
  return null;
}

function renderDos() {
  const utils = render(
    <SettingsProvider>
      <FileSystemProvider>
        <WindowProvider>
          <Probe />
          <MSDOSPrompt windowId="dos-1" />
        </WindowProvider>
      </FileSystemProvider>
    </SettingsProvider>,
  );
  const input = utils.getByRole('textbox') as HTMLInputElement;
  return { ...utils, input };
}

function run(input: HTMLInputElement, cmd: string) {
  fireEvent.change(input, { target: { value: cmd } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('MSDOSPrompt commands', () => {
  it('deltree C:\\WINDOWS flags a dirty shutdown and raises a BSOD', async () => {
    const bsod = vi.fn();
    window.addEventListener('win98-bsod', bsod);
    const { input } = renderDos();

    run(input, 'deltree C:\\WINDOWS');
    run(input, 'y');

    const prefs = JSON.parse(localStorage.getItem('win98-prefs-v1')!);
    expect(prefs.system.dirtyShutdown).toBe(true);
    await waitFor(() => expect(bsod).toHaveBeenCalled(), { timeout: 2000 });

    window.removeEventListener('win98-bsod', bsod);
  });

  it('deltree on an ordinary folder deletes it to the recycle bin', () => {
    const { input } = renderDos();
    expect(captured.fs.getNode('C:\\TEMP')).not.toBeNull();
    run(input, 'deltree C:\\TEMP');
    run(input, 'y');
    expect(captured.fs.getNode('C:\\TEMP')).toBeNull();
  });

  it('deltree answered with n leaves the folder intact', () => {
    const { input } = renderDos();
    run(input, 'deltree C:\\TEMP');
    run(input, 'n');
    expect(captured.fs.getNode('C:\\TEMP')).not.toBeNull();
  });

  it('move relocates a file into a target directory', () => {
    const { input } = renderDos();
    run(input, 'move C:\\AUTOEXEC.BAT C:\\TEMP');
    expect(captured.fs.getNode('C:\\TEMP\\AUTOEXEC.BAT')).not.toBeNull();
    expect(captured.fs.getNode('C:\\AUTOEXEC.BAT')).toBeNull();
  });

  it('xcopy /s recreates a directory tree at the destination', async () => {
    const { input } = renderDos();
    const seed: Array<() => void> = [
      () => captured.fs.createFolder('C:\\', 'SRC'),
      () => captured.fs.createFile('C:\\SRC', 'a.txt', 'A'),
      () => captured.fs.createFolder('C:\\SRC', 'nested'),
      () => captured.fs.createFile('C:\\SRC\\nested', 'b.txt', 'B'),
    ];
    for (const op of seed) {
      await act(async () => { op(); await tick(); });
    }

    run(input, 'xcopy C:\\SRC C:\\TEMP\\OUT /s');

    await waitFor(() => {
      expect(captured.fs.getNode('C:\\TEMP\\OUT\\a.txt')).not.toBeNull();
      expect(captured.fs.getNode('C:\\TEMP\\OUT\\nested\\b.txt')).not.toBeNull();
    }, { timeout: 2000 });
  });

  it('label sets the volume label reported by vol and dir', () => {
    const { input, container } = renderDos();
    run(input, 'label MYDISK');
    run(input, 'vol');
    expect(container.textContent).toContain('Volume in drive C is MYDISK');
  });

  it('running an installer file dispatches the installer event', () => {
    const installer = vi.fn();
    window.addEventListener('win98-installer', installer);
    const { input } = renderDos();

    act(() => { captured.fs.writeFile('C:\\TEMP\\winzip70.exe', 'installer:winzip'); });
    run(input, 'start C:\\TEMP\\winzip70.exe');

    expect(installer).toHaveBeenCalledTimes(1);
    expect((installer.mock.calls[0][0] as CustomEvent).detail).toEqual({ slug: 'winzip' });

    window.removeEventListener('win98-installer', installer);
  });

  it('help lists the newly added commands', () => {
    const { input, container } = renderDos();
    run(input, 'help');
    const text = container.textContent ?? '';
    for (const cmd of ['DELTREE', 'MOVE', 'XCOPY', 'DOSKEY', 'VOL', 'LABEL', 'WIN']) {
      expect(text).toContain(cmd);
    }
  });
});
