import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Paint from '../Paint';

// jsdom doesn't implement ResizeObserver; Paint uses it to size the canvas
// to its container, so stub it out for the purposes of this test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
  }
});

describe('Paint', () => {
  it('mounts without throwing even though jsdom canvas has no 2d context', () => {
    expect(() => renderWithProviders(<Paint windowId="w1" />)).not.toThrow();
  });

  it('renders the menu bar and tool sidebar', () => {
    const { getByText, getByTitle } = renderWithProviders(<Paint windowId="w1" />);
    expect(getByText('File')).toBeTruthy();
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Image')).toBeTruthy();
    expect(getByTitle('pencil')).toBeTruthy();
  });
});
