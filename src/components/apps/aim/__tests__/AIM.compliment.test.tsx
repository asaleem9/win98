import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import AIM from '../AIM';

// Keep the door-open/message sounds out of the test.
vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});

describe('AIM publish compliment', () => {
  // jsdom doesn't implement scrollIntoView, which the chat view calls on new
  // messages.
  beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('IMs a clickable link to the freshly published page about a minute later', async () => {
    renderWithProviders(<AIM windowId="w1" />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('frontpage-published', { detail: { url: 'www.geocities.com/~surfdude98' } }),
      );
    });

    // Nothing yet — the buddy needs a moment to notice.
    expect(screen.queryByText(/lol nice page/)).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });

    expect(screen.getByText(/lol nice page/)).toBeTruthy();
    const link = screen.getByText('www.geocities.com/~surfdude98');
    expect(link.getAttribute('role')).toBe('link');
  });
});
