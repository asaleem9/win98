import { act, fireEvent, render, screen } from '@testing-library/react';
import { WindowProvider, useWindows } from '@/contexts/WindowContext';
import { setAppRegistry } from '@/hooks/useWindowManager';
import { ShellShortcuts } from '@/components/system/ShellShortcuts';
import { useEffect } from 'react';

const mockRegistry = {
  'test-app': {
    defaultWindow: { title: 'Test App', width: 400, height: 300 },
    singleton: false,
  },
};

beforeAll(() => {
  setAppRegistry(mockRegistry);
});

function Opener({ count }: { count: number }) {
  const { openWindow } = useWindows();
  useEffect(() => {
    for (let i = 0; i < count; i++) openWindow('test-app', { title: `Win ${i + 1}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function WindowProbe() {
  const { windows } = useWindows();
  return (
    <div data-testid="probe">
      {windows.map((w) => (
        <span key={w.id} data-testid={w.isFocused ? 'focused' : 'unfocused'}>
          {w.title}
        </span>
      ))}
    </div>
  );
}

function renderShell(count: number) {
  return render(
    <WindowProvider>
      <Opener count={count} />
      <WindowProbe />
      <ShellShortcuts />
    </WindowProvider>,
  );
}

describe('useKeyboardShortcuts', () => {
  it('Alt+Tab shows the switcher and commits focus on Alt release', () => {
    renderShell(2);
    expect(screen.getByTestId('focused')).toHaveTextContent('Win 2');

    act(() => {
      fireEvent.keyDown(window, { key: 'Tab', altKey: true });
    });
    // Switcher overlay shows the selected (previous) window title
    expect(screen.getAllByText('Win 1').length).toBeGreaterThan(1);

    act(() => {
      fireEvent.keyUp(window, { key: 'Alt' });
    });
    expect(screen.getByTestId('focused')).toHaveTextContent('Win 1');
  });

  it('Alt+Tab with no windows does nothing', () => {
    renderShell(0);
    act(() => {
      fireEvent.keyDown(window, { key: 'Tab', altKey: true });
      fireEvent.keyUp(window, { key: 'Alt' });
    });
    expect(screen.getByTestId('probe')).toBeEmptyDOMElement();
  });

  it('Alt+F4 closes the focused window', () => {
    renderShell(2);
    act(() => {
      fireEvent.keyDown(window, { key: 'F4', altKey: true });
    });
    expect(screen.queryByText('Win 2')).toBeNull();
    expect(screen.getByTestId('focused')).toHaveTextContent('Win 1');
  });

  it('Alt+F4 with no windows dispatches the shutdown dialog event', () => {
    renderShell(0);
    const listener = vi.fn();
    window.addEventListener('win98-shutdown-dialog', listener);
    act(() => {
      fireEvent.keyDown(window, { key: 'F4', altKey: true });
    });
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('win98-shutdown-dialog', listener);
  });

  it('Ctrl+Esc dispatches the toggle-start event', () => {
    renderShell(0);
    const listener = vi.fn();
    window.addEventListener('win98-toggle-start', listener);
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape', ctrlKey: true });
    });
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('win98-toggle-start', listener);
  });
});
