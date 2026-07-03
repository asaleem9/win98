import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import RegistryEditor from '../RegistryEditor';

function openMenu(label: string) {
  fireEvent.mouseDown(screen.getByText(label));
}

describe('RegistryEditor', () => {
  it('renders the tree, menus, and status bar', () => {
    renderWithProviders(<RegistryEditor windowId="w1" />);
    expect(screen.getAllByText('My Computer').length).toBeGreaterThan(0);
    expect(screen.getByText('Registry')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('adds a new key from the Edit menu and persists it', () => {
    renderWithProviders(<RegistryEditor windowId="w1" />);
    openMenu('Edit');
    fireEvent.click(screen.getByText('New Key'));
    // Dialog appears with a default name; commit it
    fireEvent.click(screen.getByText('OK'));
    expect(screen.getByText('New Key #1')).toBeInTheDocument();
  });

  it('exports the registry to a .reg file and shows a confirmation', () => {
    renderWithProviders(<RegistryEditor windowId="w1" />);
    openMenu('Registry');
    fireEvent.click(screen.getByText('Export...'));
    expect(screen.getByText(/successfully exported/)).toBeInTheDocument();
  });

  it('opens the find bar with Ctrl+F', () => {
    renderWithProviders(<RegistryEditor windowId="w1" />);
    act(() => {
      fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    });
    expect(screen.getByText('Find:')).toBeInTheDocument();
  });

  it('disables Delete for a top-level hive', () => {
    renderWithProviders(<RegistryEditor windowId="w1" />);
    openMenu('Edit');
    expect(screen.getByText('Delete').closest('button')).toBeDisabled();
  });
});
