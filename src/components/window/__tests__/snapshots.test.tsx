import { cleanup } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { createMockWindowState } from '@/__tests__/helpers/windowTestUtils';
import { TitleBar } from '../TitleBar';
import { Window } from '../Window';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TitleBar snapshots', () => {
  const baseProps = {
    title: 'Notepad',
    icon16: '/icons/notepad-16.svg',
    windowState: 'normal' as const,
    onMinimize: vi.fn(),
    onMaximize: vi.fn(),
    onRestore: vi.fn(),
    onClose: vi.fn(),
    onDoubleClick: vi.fn(),
    onPointerDown: vi.fn(),
  };

  it('active (focused) state', () => {
    const { container } = renderWithProviders(
      <TitleBar {...baseProps} isFocused={true} />
    );
    expect(container).toMatchSnapshot();
  });

  it('inactive (unfocused) state', () => {
    const { container } = renderWithProviders(
      <TitleBar {...baseProps} isFocused={false} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Window snapshots', () => {
  it('normal state', () => {
    const windowState = createMockWindowState({ state: 'normal', isFocused: true });
    const { container } = renderWithProviders(
      <Window windowState={windowState} icon16="/icons/notepad-16.svg">
        <div>Window content</div>
      </Window>
    );
    expect(container).toMatchSnapshot();
  });

  it('maximized state', () => {
    const windowState = createMockWindowState({ state: 'maximized', isFocused: true });
    const { container } = renderWithProviders(
      <Window windowState={windowState} icon16="/icons/notepad-16.svg">
        <div>Maximized content</div>
      </Window>
    );
    expect(container).toMatchSnapshot();
  });
});
