import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ControlPanel from '../ControlPanel';

const { openWindow, showSystemError } = vi.hoisted(() => ({
  openWindow: vi.fn(),
  showSystemError: vi.fn(),
}));

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({ openWindow }),
}));
vi.mock('@/hooks/useFileOpener', () => ({
  showSystemError,
}));

describe('ControlPanel', () => {
  beforeEach(() => {
    openWindow.mockClear();
    showSystemError.mockClear();
  });

  const tiles: Array<[string, string]> = [
    ['Add/Remove Programs', 'add-remove-programs'],
    ['Display', 'display-properties'],
    ['Mouse', 'mouse-properties'],
    ['System', 'sysinfo'],
    ['Device Manager', 'device-manager'],
    ['Sounds', 'sounds-properties'],
    ['Regional Settings', 'regional-settings'],
    ['Internet', 'ie5'],
  ];

  it.each(tiles)('double-clicking %s opens %s', (label, appId) => {
    render(<ControlPanel windowId="w1" />);
    fireEvent.doubleClick(screen.getByText(label));
    expect(openWindow).toHaveBeenCalledWith(appId);
  });

  it('the Sounds tile no longer opens the volume mixer', () => {
    render(<ControlPanel windowId="w1" />);
    fireEvent.doubleClick(screen.getByText('Sounds'));
    expect(openWindow).toHaveBeenCalledWith('sounds-properties');
    expect(openWindow).not.toHaveBeenCalledWith('volume-control');
  });

  it('the Network tile shows the "not present" gag instead of a window', () => {
    render(<ControlPanel windowId="w1" />);
    fireEvent.doubleClick(screen.getByText('Network'));
    expect(showSystemError).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });
});
