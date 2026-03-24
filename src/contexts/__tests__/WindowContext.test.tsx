import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { WindowProvider, useWindows } from '../WindowContext';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

describe('WindowContext', () => {
  it('WindowProvider provides context values to children', () => {
    function TestConsumer() {
      const ctx = useWindows();
      return <div data-testid="has-context">{typeof ctx.openWindow}</div>;
    }
    render(
      <WindowProvider>
        <TestConsumer />
      </WindowProvider>,
    );
    expect(screen.getByTestId('has-context').textContent).toBe('function');
  });

  it('useWindows throws error when used outside WindowProvider', () => {
    function BadConsumer() {
      useWindows();
      return <div />;
    }
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow(
      'useWindows must be used within WindowProvider',
    );
    spy.mockRestore();
  });

  it('all 9 functions are available in context', () => {
    function TestConsumer() {
      const ctx = useWindows();
      const fns = [
        ctx.openWindow,
        ctx.closeWindow,
        ctx.focusWindow,
        ctx.minimizeWindow,
        ctx.maximizeWindow,
        ctx.restoreWindow,
        ctx.moveWindow,
        ctx.resizeWindow,
        ctx.updateTitle,
      ];
      return <div data-testid="count">{fns.filter((f) => typeof f === 'function').length}</div>;
    }
    render(
      <WindowProvider>
        <TestConsumer />
      </WindowProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('9');
  });

  it('children render inside the provider', () => {
    render(
      <WindowProvider>
        <div data-testid="child">Hello</div>
      </WindowProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
