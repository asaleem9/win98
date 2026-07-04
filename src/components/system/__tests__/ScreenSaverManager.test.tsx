import { render, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { ScreenSaverManager, ScreenSaverView } from '../ScreenSaverManager';
import { SettingsProvider, ScreenSaverId } from '@/contexts/SettingsContext';

function makeCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 120 })),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textBaseline: 'alphabetic',
  };
}

type MockCtx = ReturnType<typeof makeCtx>;

function Wrap({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe('ScreenSaverView', () => {
  let ctx: MockCtx;

  beforeEach(() => {
    ctx = makeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const IDS: Array<Exclude<ScreenSaverId, 'none'>> = [
    'starfield',
    'flying-windows',
    'mystify',
    'pipes',
    'marquee',
    'maze',
  ];

  for (const id of IDS) {
    it(`renders a canvas for "${id}"`, async () => {
      const { container } = render(<ScreenSaverView id={id} preview />, { wrapper: Wrap });
      await waitFor(() => expect(container.querySelector('canvas')).toBeInTheDocument());
    });
  }

  it('renders nothing for "none"', () => {
    const { container } = render(<ScreenSaverView id="none" preview />, { wrapper: Wrap });
    expect(container.querySelector('canvas')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unknown id from a foreign save', async () => {
    const { container } = render(
      <ScreenSaverView id={'ancient-flag' as ScreenSaverId} preview />,
      { wrapper: Wrap },
    );
    // Give any lazy resolution a chance; it should stay empty.
    await Promise.resolve();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('routes marquee text through to the Marquee saver', async () => {
    render(<ScreenSaverView id="marquee" preview marqueeText="Routed text" />, { wrapper: Wrap });
    await waitFor(() =>
      expect(ctx.fillText).toHaveBeenCalledWith('Routed text', expect.any(Number), expect.any(Number)),
    );
  });
});

describe('ScreenSaverManager', () => {
  let ctx: MockCtx;

  beforeEach(() => {
    ctx = makeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders immediately when forceActive is set', async () => {
    const { container } = render(
      <ScreenSaverManager selectedSaver="starfield" forceActive />,
      { wrapper: Wrap },
    );
    await waitFor(() => expect(container.querySelector('canvas')).toBeInTheDocument());
  });

  it('renders nothing while idle (no timeout elapsed) and stays inactive for "none"', () => {
    const { container } = render(<ScreenSaverManager selectedSaver="none" forceActive />, {
      wrapper: Wrap,
    });
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('sources marquee text from settings when no prop override is given', async () => {
    // Persisted marquee text (older-style save without a marqueeSpeed field)
    window.localStorage.setItem(
      'win98-settings-v1',
      JSON.stringify({ screenSaver: { id: 'marquee', timeoutMinutes: 5, marqueeText: 'From settings' } }),
    );
    render(<ScreenSaverManager selectedSaver="marquee" forceActive />, { wrapper: Wrap });
    await waitFor(() =>
      expect(ctx.fillText).toHaveBeenCalledWith(
        'From settings',
        expect.any(Number),
        expect.any(Number),
      ),
    );
  });

  it('activates after the idle timeout elapses', async () => {
    const { container } = render(
      <ScreenSaverManager selectedSaver="starfield" timeoutMs={10} />,
      { wrapper: Wrap },
    );
    expect(container.querySelector('canvas')).toBeNull();
    await waitFor(() => expect(container.querySelector('canvas')).toBeInTheDocument());
  });
});
