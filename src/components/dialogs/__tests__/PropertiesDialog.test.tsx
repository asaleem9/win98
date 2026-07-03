import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { PropertiesDialog } from '../PropertiesDialog';

describe('PropertiesDialog', () => {
  it('renders the file variant with type, location and MS-DOS name', () => {
    renderWithProviders(<PropertiesDialog path="C:\\My Documents\\readme.txt" onClose={() => {}} />);

    expect(screen.getByText('readme.txt')).toBeInTheDocument();
    expect(screen.getByText('Text Document')).toBeInTheDocument();
    expect(screen.getByText('C:\\My Documents')).toBeInTheDocument();
    expect(screen.getByText('README.TXT')).toBeInTheDocument();
    // Size row shows the byte count.
    expect(screen.getByText(/1,024 bytes/)).toBeInTheDocument();
  });

  it('shortens long folder names into 8.3 form', () => {
    renderWithProviders(<PropertiesDialog path="C:\\My Documents" onClose={() => {}} />);
    expect(screen.getByText('File Folder')).toBeInTheDocument();
    expect(screen.getByText('MYDOCU~1')).toBeInTheDocument();
  });

  it('renders the drive variant with usage figures and the pie chart', () => {
    renderWithProviders(<PropertiesDialog path="C:\\" onClose={() => {}} />);

    expect(screen.getByText('Local Disk')).toBeInTheDocument();
    expect(screen.getByText('FAT32')).toBeInTheDocument();
    expect(screen.getByText('Used space:')).toBeInTheDocument();
    expect(screen.getByText('Free space:')).toBeInTheDocument();
    expect(screen.getByText('Capacity:')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Disk usage' })).toBeInTheDocument();
  });

  it('closes via OK', async () => {
    const onClose = vi.fn();
    const { getByRole } = renderWithProviders(
      <PropertiesDialog path="C:\\My Documents\\readme.txt" onClose={onClose} />,
    );
    getByRole('button', { name: 'OK' }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
