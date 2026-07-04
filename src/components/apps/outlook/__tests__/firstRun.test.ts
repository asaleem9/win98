import { scheduleFirstRunMail, FIRST_RUN_MAIL_MS } from '../firstRun';
import { WELCOME_MAIL, SEED_INBOX } from '../mailboxReducer';

// Silence the chime; assert on the mock.
vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});
import { playSound } from '@/lib/sounds';

describe('scheduleFirstRunMail', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('plays "You\'ve Got Mail" about a minute into the first session', () => {
    const cancel = scheduleFirstRunMail();

    vi.advanceTimersByTime(FIRST_RUN_MAIL_MS - 1000);
    expect(playSound).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(playSound).toHaveBeenCalledWith('youveGotMail');

    cancel();
  });

  it('cancel() prevents the chime', () => {
    const cancel = scheduleFirstRunMail();
    cancel();
    vi.advanceTimersByTime(FIRST_RUN_MAIL_MS + 1000);
    expect(playSound).not.toHaveBeenCalled();
  });
});

describe('welcome mail seed', () => {
  it('is the freshest unread message waiting in the seeded inbox', () => {
    // It sorts to the top of the Inbox so it greets a new owner first.
    expect(SEED_INBOX[0]).toBe(WELCOME_MAIL);
    expect(WELCOME_MAIL.unread).toBe(true);
    expect(WELCOME_MAIL.from).toMatch(/PC Depot/);
    expect(WELCOME_MAIL.subject).toBe('Welcome to your new PC!');
    // The P.S. points the new owner at the era's download-everything site.
    expect(WELCOME_MAIL.body).toMatch(/downloads\.com/);
  });
});
