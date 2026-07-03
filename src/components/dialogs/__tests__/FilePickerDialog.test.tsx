import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { FilePickerDialog } from '../FilePickerDialog';

describe('FilePickerDialog', () => {
  it('lists directories and only files matching the extension filter (open mode)', () => {
    renderWithProviders(
      <FilePickerDialog mode="open" extensions={['txt']} onConfirm={() => {}} onCancel={() => {}} />,
    );

    // Directories always show; readme.txt matches; other files are filtered out.
    expect(screen.getByText('readme.txt')).toBeInTheDocument();
    expect(screen.getByText('My Pictures')).toBeInTheDocument();
    expect(screen.queryByText('letter.doc')).not.toBeInTheDocument();
    expect(screen.queryByText('budget.xls')).not.toBeInTheDocument();
  });

  it('auto-appends defaultExtension on save when the typed name lacks an allowed one', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(
      <FilePickerDialog
        mode="save"
        extensions={['htm', 'html']}
        defaultExtension="htm"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByRole('textbox'), 'report');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onConfirm).toHaveBeenCalledWith('C:\\My Documents\\report.htm');
  });

  it('keeps an already-valid extension untouched on save', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(
      <FilePickerDialog
        mode="save"
        extensions={['htm', 'html']}
        defaultExtension="htm"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );

    await user.type(screen.getByRole('textbox'), 'page.html');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onConfirm).toHaveBeenCalledWith('C:\\My Documents\\page.html');
  });

  it('falls back to the first extension when saving without defaultExtension', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(
      <FilePickerDialog mode="save" extensions={['txt']} onConfirm={onConfirm} onCancel={() => {}} />,
    );

    await user.type(screen.getByRole('textbox'), 'notes');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onConfirm).toHaveBeenCalledWith('C:\\My Documents\\notes.txt');
  });

  it('renders a Files of type dropdown that re-filters the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FilePickerDialog
        mode="open"
        filters={[
          { label: 'HTML Files (*.htm;*.html)', extensions: ['htm', 'html'] },
          { label: 'All Files (*.*)', extensions: [] },
        ]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );

    // My Documents has no HTML files, so the txt file is hidden under the HTML filter.
    expect(screen.queryByText('readme.txt')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox'), '1');
    expect(screen.getByText('readme.txt')).toBeInTheDocument();
  });

  it('invokes onCancel from the Cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithProviders(
      <FilePickerDialog mode="open" onConfirm={() => {}} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
