import { render, act } from '@testing-library/react';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { FirstRunHost } from '../FirstRunHost';
import { FIRST_RUN_AIM_SIGN_ON_MS } from '@/components/apps/aim/firstRun';
import { FIRST_RUN_MAIL_MS } from '@/components/apps/outlook/firstRun';

// Stub the window manager so we can watch AIM being opened.
const mockOpenWindow = vi.fn();
vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({ openWindow: mockOpenWindow }),
}));

// Silence + spy on the mail chime.
vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});
import { playSound } from '@/lib/sounds';

function renderHost() {
  return render(
    <SettingsProvider>
      <FirstRunHost />
    </SettingsProvider>,
  );
}

describe('FirstRunHost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('runs the welcome theater on the very first session', () => {
    renderHost();

    act(() => vi.advanceTimersByTime(FIRST_RUN_AIM_SIGN_ON_MS));
    expect(mockOpenWindow).toHaveBeenCalledWith('aim');

    act(() => vi.advanceTimersByTime(FIRST_RUN_MAIL_MS));
    expect(playSound).toHaveBeenCalledWith('youveGotMail');
  });

  it('stays quiet on later sessions once the first one is done', () => {
    // First mount marks the session done and persists it to localStorage.
    const first = renderHost();
    first.unmount();
    vi.clearAllMocks();

    // A later login reads the persisted guard and schedules nothing.
    renderHost();
    act(() => vi.advanceTimersByTime(FIRST_RUN_AIM_SIGN_ON_MS + FIRST_RUN_MAIL_MS));
    expect(mockOpenWindow).not.toHaveBeenCalled();
    expect(playSound).not.toHaveBeenCalledWith('youveGotMail');
  });
});
