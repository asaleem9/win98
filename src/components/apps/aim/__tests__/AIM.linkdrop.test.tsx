import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import AIM, { __resetAimLinkDrop } from '../AIM';

// Keep the door-open/message sounds out of the test.
vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});

describe('AIM link drop', () => {
  // jsdom doesn't implement scrollIntoView, which the chat view calls on new messages.
  beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
  beforeEach(() => { __resetAimLinkDrop(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('drops a clickable hamster dance link about 90 seconds after sign-on', async () => {
    renderWithProviders(<AIM windowId="w1" />);

    // Nothing this early — the buddy hasn't sent it yet.
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.queryByText(/hampsterdance/)).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });

    expect(screen.getByText(/check this out/)).toBeTruthy();
    const link = screen.getByText('www.hampsterdance.com');
    expect(link.getAttribute('role')).toBe('link');
  });

  it('only drops the link once per session', async () => {
    const { unmount } = renderWithProviders(<AIM windowId="w1" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(91_000); });
    expect(screen.getAllByText('www.hampsterdance.com').length).toBe(1);
    unmount();

    // Re-opening AIM later in the same session doesn't drop it again.
    renderWithProviders(<AIM windowId="w2" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(91_000); });
    expect(screen.queryByText('www.hampsterdance.com')).toBeNull();
  });
});
