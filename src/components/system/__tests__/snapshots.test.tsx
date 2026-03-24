import { render, cleanup } from '@testing-library/react';
import { BootSequence } from '../BootSequence';
import { BSOD } from '../BSOD';
import { ShutdownScreen } from '../ShutdownScreen';
import { ErrorDialog } from '../ErrorDialog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BootSequence snapshots', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial POST phase render', () => {
    const { container } = render(<BootSequence onComplete={vi.fn()} />);
    expect(container).toMatchSnapshot();
  });
});

describe('BSOD snapshots', () => {
  it('default error message', () => {
    const { container } = render(<BSOD onDismiss={vi.fn()} />);
    expect(container).toMatchSnapshot();
  });

  it('custom error message', () => {
    const { container } = render(
      <BSOD message="A problem has been detected and Windows has been shut down" onDismiss={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('ShutdownScreen snapshots', () => {
  it('default render', () => {
    const { container } = render(<ShutdownScreen onRestart={vi.fn()} />);
    expect(container).toMatchSnapshot();
  });
});

describe('ErrorDialog snapshots', () => {
  it('default illegal-operation type', () => {
    const { container } = render(
      <ErrorDialog appName="Notepad" onClose={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });

  it('not-responding type', () => {
    const { container } = render(
      <ErrorDialog appName="Internet Explorer" errorType="not-responding" onClose={vi.fn()} />
    );
    expect(container).toMatchSnapshot();
  });
});
