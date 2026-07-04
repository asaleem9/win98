import { render, screen, fireEvent, act } from '@testing-library/react';
import { SystemTray } from '../SystemTray';
import { emit } from '@/lib/eventBus';

const mockOpenWindow = vi.fn();

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({ openWindow: mockOpenWindow }),
}));

// The tray reads the Regional clock-format pref; stub it to the 12-hour default.
vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    getAppPref: (_appId: string, _key: string, fallback: unknown) => fallback,
  }),
}));

// Emitting an event synchronously updates React state via the tray's listeners,
// so wrap dispatches in act to flush.
function register(icon: { id: string; icon: string; tooltip?: string }) {
  act(() => emit('tray-register', icon));
}

describe('SystemTray dynamic tray icons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the volume icon and clock intact', () => {
    render(<SystemTray />);
    expect(screen.getByAltText('Volume')).toBeInTheDocument();
    expect(screen.getByTitle('Volume')).toBeInTheDocument();
  });

  it('renders a registered tray icon with its tooltip', () => {
    render(<SystemTray />);
    register({ id: 'aim', icon: '/icons/aim-16.svg', tooltip: 'AIM - SurfDude98' });
    const icon = screen.getByTitle('AIM - SurfDude98');
    expect(icon).toHaveAttribute('src', '/icons/aim-16.svg');
  });

  it('dedupes by id and updates the icon in place on re-register', () => {
    render(<SystemTray />);
    register({ id: 'norton', icon: '/icons/norton-16.svg', tooltip: 'Norton' });
    register({ id: 'norton', icon: '/icons/norton-16.svg', tooltip: 'Norton AntiVirus' });
    expect(screen.getAllByTitle(/Norton/)).toHaveLength(1);
    expect(screen.getByTitle('Norton AntiVirus')).toBeInTheDocument();
  });

  it('removes an icon on unregister', () => {
    render(<SystemTray />);
    register({ id: 'aim', icon: '/icons/aim-16.svg', tooltip: 'AIM' });
    expect(screen.getByTitle('AIM')).toBeInTheDocument();
    act(() => emit('tray-unregister', { id: 'aim' }));
    expect(screen.queryByTitle('AIM')).not.toBeInTheDocument();
  });

  it('clicking a dynamic icon opens the matching window via tray-activate', () => {
    render(<SystemTray />);
    register({ id: 'aim', icon: '/icons/aim-16.svg', tooltip: 'AIM' });
    fireEvent.click(screen.getByTitle('AIM'));
    expect(mockOpenWindow).toHaveBeenCalledWith('aim');
  });

  it('a tray-activate event alone opens the matching window', () => {
    render(<SystemTray />);
    act(() => emit('tray-activate', { id: 'norton' }));
    expect(mockOpenWindow).toHaveBeenCalledWith('norton');
  });

  it('double-clicking the network icon opens Network Neighborhood', () => {
    render(<SystemTray />);
    fireEvent.doubleClick(screen.getByTitle('Dial-Up Networking'));
    expect(mockOpenWindow).toHaveBeenCalledWith('network-neighborhood');
  });
});
