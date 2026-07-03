import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { useWindows } from '@/contexts/WindowContext';
import Help from '../Help';
import { openHelpTopic } from '../openHelp';

// Reads the live window count out of the shared WindowProvider so we can prove an
// app: shortcut actually opened a window.
function WindowCount() {
  const { windows } = useWindows();
  return <span data-testid="window-count">{windows.length}</span>;
}

describe('Help viewer', () => {
  it('opens on the Welcome topic and shows the Contents tree', () => {
    renderWithProviders(<Help windowId="w1" />);
    expect(screen.getByRole('heading', { name: 'Welcome to Windows 98' })).toBeInTheDocument();
    // Categories from the Contents tree.
    expect(screen.getByText('Programs')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
  });

  it('shows a topic when its Contents entry is clicked', () => {
    renderWithProviders(<Help windowId="w1" />);
    fireEvent.click(screen.getByText('Minesweeper'));
    expect(screen.getByRole('heading', { name: 'Minesweeper' })).toBeInTheDocument();
    expect(screen.getByText(/clear a minefield/)).toBeInTheDocument();
  });

  it('navigates Back and Forward through history', () => {
    renderWithProviders(<Help windowId="w1" />);
    fireEvent.click(screen.getByText('Calculator'));
    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByRole('heading', { name: 'Welcome to Windows 98' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Forward'));
    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument();
  });

  it('hides and shows the tabs pane', () => {
    renderWithProviders(<Help windowId="w1" />);
    expect(screen.getByText('Programs')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide'));
    expect(screen.queryByText('Programs')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Show'));
    expect(screen.getByText('Programs')).toBeInTheDocument();
  });

  it('opens a program from an app: shortcut button', () => {
    renderWithProviders(
      <>
        <Help windowId="w1" />
        <WindowCount />
      </>,
    );
    expect(screen.getByTestId('window-count')).toHaveTextContent('0');
    fireEvent.click(screen.getByText('Notepad')); // Contents entry
    fireEvent.click(screen.getByText('Open Notepad')); // in-body shortcut
    expect(screen.getByTestId('window-count')).toHaveTextContent('1');
  });

  it('lists ranked topics from the Search tab', () => {
    renderWithProviders(<Help windowId="w1" />);
    fireEvent.click(screen.getByText('search'));
    fireEvent.change(screen.getByLabelText('Search words'), { target: { value: 'minesweeper' } });
    fireEvent.click(screen.getByText('List Topics'));
    fireEvent.click(screen.getByText('Minesweeper')); // the result row
    expect(screen.getByRole('heading', { name: 'Minesweeper' })).toBeInTheDocument();
  });

  it('filters the Index and jumps to the chosen entry', () => {
    renderWithProviders(<Help windowId="w1" />);
    fireEvent.click(screen.getByText('index'));
    fireEvent.change(screen.getByLabelText('Index keyword'), { target: { value: 'copying' } });
    fireEvent.click(screen.getByText('copying files'));
    expect(screen.getByRole('heading', { name: 'Working with Files and Folders' })).toBeInTheDocument();
  });

  it('opens the topic named by launchParams and follows a re-launch', () => {
    const { rerender } = renderWithProviders(
      <Help windowId="w1" launchParams={{ topicId: 'minesweeper' }} launchCount={1} />,
    );
    expect(screen.getByRole('heading', { name: 'Minesweeper' })).toBeInTheDocument();

    rerender(<Help windowId="w1" launchParams={{ topicId: 'solitaire' }} launchCount={2} />);
    expect(screen.getByRole('heading', { name: 'Solitaire' })).toBeInTheDocument();
  });

  it('jumps to a topic when openHelpTopic is dispatched', () => {
    renderWithProviders(<Help windowId="w1" />);
    act(() => openHelpTopic('calculator'));
    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument();
    // An unknown id is ignored rather than blanking the view.
    act(() => openHelpTopic('no-such-topic'));
    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument();
  });

  it('remembers the last tab and topic across re-opens', () => {
    const first = renderWithProviders(<Help windowId="w1" />);
    fireEvent.click(screen.getByText('Calculator')); // remembers last topic
    fireEvent.click(screen.getByText('index')); // remembers last tab
    first.unmount();

    renderWithProviders(<Help windowId="w2" />);
    expect(screen.getByRole('heading', { name: 'Calculator' })).toBeInTheDocument();
    expect(screen.getByText('Type a keyword to find:')).toBeInTheDocument();
  });
});
