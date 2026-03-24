import { render, screen } from '@testing-library/react';
import { WindowManager } from '../WindowManager';
import { createMockWindowState } from '@/__tests__/helpers/windowTestUtils';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const mockWindows: ReturnType<typeof createMockWindowState>[] = [];

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({
    windows: mockWindows,
    openWindow: vi.fn(),
    closeWindow: vi.fn(),
    focusWindow: vi.fn(),
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    restoreWindow: vi.fn(),
    moveWindow: vi.fn(),
    resizeWindow: vi.fn(),
    updateTitle: vi.fn(),
  }),
}));

// Control whether the mock component should suspend
let shouldSuspend = false;
const suspensePromise = new Promise(() => {});

const MockComponent = ({ windowId }: { windowId: string }) => {
  if (shouldSuspend) throw suspensePromise;
  return <div data-testid={`app-${windowId}`}>App content</div>;
};

vi.mock('@/lib/appRegistry', () => ({
  getApp: (appId: string) => {
    if (appId === 'unknown-app') return undefined;
    return {
      id: appId,
      name: appId,
      icon: '/icons/test-32.svg',
      icon16: '/icons/test-16.svg',
      component: MockComponent,
    };
  },
}));

describe('WindowManager', () => {
  beforeEach(() => {
    mockWindows.length = 0;
    vi.clearAllMocks();
  });

  it('renders nothing when no windows open', () => {
    const { container } = render(<WindowManager />);
    // Fragment should be empty
    expect(container.children).toHaveLength(0);
  });

  it('renders correct number of Window components for open windows', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', appId: 'notepad', title: 'Window 1' }),
      createMockWindowState({ id: 'w2', appId: 'paint', title: 'Window 2', isFocused: false }),
    );
    render(<WindowManager />);
    expect(screen.getByText('Window 1')).toBeInTheDocument();
    expect(screen.getByText('Window 2')).toBeInTheDocument();
  });

  it('unknown appId renders nothing for that window', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', appId: 'unknown-app', title: 'Unknown' }),
    );
    const { container } = render(<WindowManager />);
    expect(container.children).toHaveLength(0);
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('has Suspense fallback while lazy component loads', () => {
    shouldSuspend = true;
    mockWindows.push(
      createMockWindowState({ id: 'w1', appId: 'notepad', title: 'Test' }),
    );
    render(<WindowManager />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    shouldSuspend = false;
  });

  it('passes windowId prop to each app component', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', appId: 'notepad' }),
    );
    render(<WindowManager />);
    expect(screen.getByTestId('app-w1')).toBeInTheDocument();
  });
});
