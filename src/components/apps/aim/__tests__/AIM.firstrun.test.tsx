import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import AIM, { __resetAimLinkDrop } from '../AIM';
import {
  scheduleFirstRunAim,
  FIRST_RUN_AIM_SIGN_ON_MS,
  FIRST_RUN_AIM_IM_DELAY_MS,
  AIM_WELCOME_EVENT,
} from '../firstRun';

// Keep the door-open/message sounds out of the test.
vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});
import { playSound } from '@/lib/sounds';

describe('scheduleFirstRunAim', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('opens AIM ~45s after login, then fires the welcome event once its window is up', () => {
    const openWindow = vi.fn();
    const welcomes: Event[] = [];
    const onWelcome = (e: Event) => welcomes.push(e);
    window.addEventListener(AIM_WELCOME_EVENT, onWelcome);

    const cancel = scheduleFirstRunAim(openWindow);

    // Nothing until the sign-on delay elapses.
    vi.advanceTimersByTime(FIRST_RUN_AIM_SIGN_ON_MS - 1000);
    expect(openWindow).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(openWindow).toHaveBeenCalledWith('aim');
    // The IM waits a beat so the freshly opened window can register its listener.
    expect(welcomes).toHaveLength(0);

    vi.advanceTimersByTime(FIRST_RUN_AIM_IM_DELAY_MS);
    expect(welcomes).toHaveLength(1);

    cancel();
    window.removeEventListener(AIM_WELCOME_EVENT, onWelcome);
  });

  it('cancel() stops a pending sign-on', () => {
    const openWindow = vi.fn();
    const cancel = scheduleFirstRunAim(openWindow);
    cancel();
    vi.advanceTimersByTime(FIRST_RUN_AIM_SIGN_ON_MS + FIRST_RUN_AIM_IM_DELAY_MS);
    expect(openWindow).not.toHaveBeenCalled();
  });
});

describe('AIM first-session welcome IM', () => {
  // jsdom doesn't implement scrollIntoView, which the chat view calls on new messages.
  beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
  beforeEach(() => { vi.clearAllMocks(); __resetAimLinkDrop(); });

  it('drops the "games" IM with the door-open sound when the welcome event fires', () => {
    renderWithProviders(<AIM windowId="w1" />);

    // Quiet until the welcome event lands.
    expect(screen.queryByText(/came with games/)).toBeNull();

    act(() => { window.dispatchEvent(new CustomEvent(AIM_WELCOME_EVENT)); });

    expect(screen.getByText(/came with games/)).toBeTruthy();
    expect(playSound).toHaveBeenCalledWith('aimDoorOpen');
  });
});
