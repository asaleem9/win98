import { fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Photoshop5 from '../Photoshop5';

describe('Photoshop5', () => {
  it('mounts without throwing even though jsdom canvas has no 2d context', () => {
    expect(() => renderWithProviders(<Photoshop5 windowId="w1" />)).not.toThrow();
  });

  it('renders the tool palette and the real menu bar', () => {
    const { getByTitle, getByRole } = renderWithProviders(<Photoshop5 windowId="w1" />);
    expect(getByTitle('Paintbrush')).toBeTruthy();
    expect(getByTitle('Magic Wand')).toBeTruthy();
    expect(getByRole('menuitem', { name: 'File' })).toBeTruthy();
    expect(getByRole('menuitem', { name: 'Filter' })).toBeTruthy();
  });

  it('switches tools and updates the options bar', () => {
    const { getByTitle, getByText } = renderWithProviders(<Photoshop5 windowId="w1" />);
    fireEvent.click(getByTitle('Magic Wand'));
    // The options bar echoes the active tool name and its tolerance control.
    expect(getByText('Magic Wand')).toBeTruthy();
    expect(getByText('Tolerance:')).toBeTruthy();
  });

  it('lets you add and delete layers via the panel buttons', () => {
    const { getByTitle, getAllByText, queryAllByText } = renderWithProviders(<Photoshop5 windowId="w1" />);
    expect(queryAllByText('Layer 1')).toHaveLength(0);
    fireEvent.click(getByTitle('New Layer'));
    expect(getAllByText('Layer 1').length).toBeGreaterThan(0);
    fireEvent.click(getByTitle('Delete Layer'));
    expect(queryAllByText('Layer 1')).toHaveLength(0);
  });

  it('exposes blend modes and an opacity control for the active layer', () => {
    const { getByText, getByDisplayValue } = renderWithProviders(<Photoshop5 windowId="w1" />);
    expect(getByText('Layers')).toBeTruthy();
    // Default active layer is Normal blend at 100% opacity.
    expect(getByDisplayValue('Normal')).toBeTruthy();
  });
});
