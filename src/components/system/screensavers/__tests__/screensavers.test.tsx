import { render, act } from '@testing-library/react';
import Starfield from '../Starfield';
import FlyingWindows from '../FlyingWindows';
import Pipes3D from '../Pipes3D';
import Mystify from '../Mystify';
import Marquee from '../Marquee';
import Maze3D from '../Maze3D';
import { hexToRgb, shade } from '../common';

// A stand-in for CanvasRenderingContext2D that records the calls each saver
// makes, so we can assert a frame was drawn without a real canvas.
function makeCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 120 })),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
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

const SAVERS = [
  { name: 'Starfield', Comp: Starfield },
  { name: 'FlyingWindows', Comp: FlyingWindows },
  { name: 'Pipes3D', Comp: Pipes3D },
  { name: 'Mystify', Comp: Mystify },
  { name: 'Marquee', Comp: Marquee },
  { name: 'Maze3D', Comp: Maze3D },
] as const;

describe('screensaver pack', () => {
  let ctx: MockCtx;

  beforeEach(() => {
    ctx = makeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    // Keep the animation loop to a single synchronous frame.
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  for (const { name, Comp } of SAVERS) {
    it(`${name} mounts, draws a frame, and unmounts cleanly in preview`, () => {
      const { container, unmount } = render(<Comp preview />);
      expect(container.querySelector('canvas')).toBeInTheDocument();
      // Every saver paints a background/frame with fillRect
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(() => unmount()).not.toThrow();
    });
  }

  it('savers do not crash when the 2D context is unavailable (jsdom)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    for (const { Comp } of SAVERS) {
      const { container, unmount } = render(<Comp preview />);
      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    }
  });

  it('Marquee renders its text into the canvas', () => {
    render(<Marquee preview marqueeText="Hello Windows 98" marqueeSpeed={5} />);
    expect(ctx.fillText).toHaveBeenCalledWith(
      'Hello Windows 98',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('Marquee falls back to default text when none is supplied', () => {
    render(<Marquee preview />);
    expect(ctx.fillText).toHaveBeenCalledWith(
      'Your message here.',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('Pipes3D shades tubes with cylinder gradients', () => {
    render(<Pipes3D preview />);
    expect(ctx.createLinearGradient).toHaveBeenCalled();
  });

  it('dismisses on user input when running fullscreen', () => {
    const onDismiss = vi.fn();
    render(<Starfield onDismiss={onDismiss} />);
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('ignores input in preview mode (no dismiss handler wired)', () => {
    const onDismiss = vi.fn();
    render(<Starfield onDismiss={onDismiss} preview />);
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('screensaver colour helpers', () => {
  it('parses hex colours', () => {
    expect(hexToRgb('#ff8040')).toEqual([255, 128, 64]);
  });

  it('falls back to white on malformed input', () => {
    expect(hexToRgb('nope')).toEqual([255, 255, 255]);
  });

  it('scales brightness and clamps to the byte range', () => {
    expect(shade('#808080', 2)).toBe('rgb(255,255,255)');
    expect(shade('#808080', 0)).toBe('rgb(0,0,0)');
  });
});
