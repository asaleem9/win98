import { fireEvent, screen, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import MIRC from '../mIRC';
import { MOTD_LINES } from '../mircData';

// Keep the mention/kick beeps out of the tests.
vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});

// Time for the MOTD to finish streaming and the saved channels to auto-join.
const CONNECT_MS = MOTD_LINES.length * 55 + 700;

function connect() {
  const utils = renderWithProviders(<MIRC windowId="w1" />);
  act(() => {
    vi.advanceTimersByTime(CONNECT_MS);
  });
  return utils;
}

function send(text: string) {
  const input = screen.getByLabelText('mIRC message input') as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('mIRC client', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('streams the MOTD and auto-joins the default channels', () => {
    connect();
    expect(screen.getByText(/End of \/MOTD command/)).toBeTruthy();
    // #chat and #help are the default auto-join channels -> switchbar tabs.
    const tabNames = screen.getAllByRole('button').map((b) => b.textContent);
    expect(tabNames.some((t) => t?.includes('#chat'))).toBe(true);
    expect(tabNames.some((t) => t?.includes('#help'))).toBe(true);
  });

  it('echoes your own message into the active channel', () => {
    connect();
    send('ping test 123');
    expect(screen.getByText('ping test 123')).toBeTruthy();
  });

  it('gets a reply from the #help op bot when you ask for help', () => {
    connect();
    // Default active window is #help (last auto-joined); a greeting triggers a reply.
    send('hello, how do i join a channel?');
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByText(/\/join/)).toBeTruthy();
  });

  it('joins a new channel, adding a switchbar tab (channel state)', () => {
    connect();
    send('/join #warez-chat');
    const tabNames = screen.getAllByRole('button').map((b) => b.textContent);
    expect(tabNames.some((t) => t?.includes('#warez-chat'))).toBe(true);
    expect(screen.getByText(/Now talking in #warez-chat/)).toBeTruthy();
  });

  it('kicks you from #warez-chat when you beg for files, and offers a rejoin', () => {
    connect();
    send('/join #warez-chat');
    send('hey can someone send me some files pls');
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByText(/was kicked from #warez-chat/)).toBeTruthy();
    expect(screen.getByText(/You can rejoin #warez-chat/)).toBeTruthy();
  });

  it('reports unknown commands as errors', () => {
    connect();
    send('/frobnicate everything');
    expect(screen.getByText(/is an unknown command/)).toBeTruthy();
  });
});
