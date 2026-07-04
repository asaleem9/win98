import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import FindFiles from '../FindFiles';
import '@/lib/appRegistry';

describe('FindFiles', () => {
  it('finds files by wildcard and reports the count', () => {
    renderWithProviders(<FindFiles windowId="ff" />);
    fireEvent.change(screen.getByLabelText('Named:'), { target: { value: '*.txt' } });
    fireEvent.click(screen.getByText('Find Now'));

    expect(screen.getByText('readme.txt')).toBeInTheDocument();
    expect(screen.getByText('passwords.txt')).toBeInTheDocument();
    // The virtual C: drive only holds .txt files under My Documents.
    expect(screen.getByText(/2 file\(s\) found/)).toBeInTheDocument();
  });

  it('filters out non-matching files (no .doc when searching *.txt)', () => {
    renderWithProviders(<FindFiles windowId="ff" />);
    fireEvent.change(screen.getByLabelText('Named:'), { target: { value: '*.txt' } });
    fireEvent.click(screen.getByText('Find Now'));

    expect(screen.queryByText('letter.doc')).not.toBeInTheDocument();
  });

  it('a size floor drops small files from the results', () => {
    renderWithProviders(<FindFiles windowId="ff" />);
    // readme.txt is ~1KB, passwords.txt ~0.5KB; require >= 1KB.
    fireEvent.change(screen.getByLabelText('Named:'), { target: { value: '*.txt' } });
    fireEvent.change(screen.getByLabelText('Minimum size in KB'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Find Now'));

    expect(screen.getByText('readme.txt')).toBeInTheDocument();
    expect(screen.queryByText('passwords.txt')).not.toBeInTheDocument();
  });
});
