import { fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Photoshop5 from '../Photoshop5';

describe('Photoshop5', () => {
  it('mounts without throwing even though jsdom canvas has no 2d context', () => {
    expect(() => renderWithProviders(<Photoshop5 windowId="w1" />)).not.toThrow();
  });

  it('renders the tool palette and menu bar', () => {
    const { getByTitle, getByText } = renderWithProviders(<Photoshop5 windowId="w1" />);
    expect(getByTitle('Brush')).toBeTruthy();
    expect(getByText('Filter')).toBeTruthy();
  });

  it('lets you add and delete layers via the layers panel', () => {
    const { getByTitle, getAllByText, queryAllByText } = renderWithProviders(<Photoshop5 windowId="w1" />);
    expect(queryAllByText('Layer 1')).toHaveLength(0);
    fireEvent.click(getByTitle('New Layer'));
    expect(getAllByText('Layer 1').length).toBeGreaterThan(0);
    fireEvent.click(getByTitle('Delete Layer'));
    expect(queryAllByText('Layer 1')).toHaveLength(0);
  });

  it('shows the program error dialog for non-implemented filters', () => {
    const { getByText, queryByText } = renderWithProviders(<Photoshop5 windowId="w1" />);
    fireEvent.click(getByText('Filter'));
    fireEvent.click(getByText('Sharpen...'));
    expect(queryByText(/program error/)).toBeTruthy();
  });
});
