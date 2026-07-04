import { render, screen, fireEvent } from '@testing-library/react';
import { TaskbarProperties } from '../TaskbarProperties';
import { addRecentDoc, getRecentDocs } from '@/lib/recentDocs';

interface MockTaskbar {
  autoHide: boolean;
  smallIcons: boolean;
  showClock: boolean;
}

let mockTaskbar: MockTaskbar;
const mockSetSetting = vi.fn();

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { taskbar: mockTaskbar },
    setSetting: mockSetSetting,
  }),
}));

describe('TaskbarProperties', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    mockTaskbar = { autoHide: false, smallIcons: false, showClock: true };
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders both tabs with the Taskbar Options checkboxes', () => {
    render(<TaskbarProperties onClose={onClose} />);
    expect(screen.getByText('Taskbar Options')).toBeInTheDocument();
    expect(screen.getByText('Start Menu Programs')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Auto hide' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show small icons in Start menu' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Show clock' })).toBeInTheDocument();
  });

  it('shows Always on top as checked and disabled (cosmetic)', () => {
    render(<TaskbarProperties onClose={onClose} />);
    const alwaysOnTop = screen.getByRole('checkbox', { name: 'Always on top' });
    expect(alwaysOnTop).toBeChecked();
    expect(alwaysOnTop).toBeDisabled();
  });

  it('reflects current settings in the checkboxes', () => {
    mockTaskbar = { autoHide: true, smallIcons: true, showClock: false };
    render(<TaskbarProperties onClose={onClose} />);
    expect(screen.getByRole('checkbox', { name: 'Auto hide' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show small icons in Start menu' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Show clock' })).not.toBeChecked();
  });

  it('persists changes and closes on OK', () => {
    render(<TaskbarProperties onClose={onClose} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto hide' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show clock' }));
    fireEvent.click(screen.getByText('OK'));
    expect(mockSetSetting).toHaveBeenCalledWith('taskbar', { autoHide: true, smallIcons: false, showClock: false });
    expect(onClose).toHaveBeenCalled();
  });

  it('applies without closing on Apply', () => {
    render(<TaskbarProperties onClose={onClose} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show small icons in Start menu' }));
    fireEvent.click(screen.getByText('Apply'));
    expect(mockSetSetting).toHaveBeenCalledWith('taskbar', { autoHide: false, smallIcons: true, showClock: true });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('discards changes on Cancel', () => {
    render(<TaskbarProperties onClose={onClose} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto hide' }));
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockSetSetting).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('clears the Documents menu from the Start Menu Programs tab', () => {
    addRecentDoc('C:\\My Documents\\resume.doc');
    addRecentDoc('C:\\My Documents\\notes.txt');
    expect(getRecentDocs()).toHaveLength(2);

    render(<TaskbarProperties onClose={onClose} />);
    fireEvent.click(screen.getByText('Start Menu Programs'));

    const clear = screen.getByText('Clear');
    expect(clear).toBeEnabled();
    fireEvent.click(clear);
    expect(getRecentDocs()).toHaveLength(0);
  });

  it('disables Clear when there are no recent documents', () => {
    render(<TaskbarProperties onClose={onClose} />);
    fireEvent.click(screen.getByText('Start Menu Programs'));
    expect(screen.getByText('Clear')).toBeDisabled();
    expect(screen.getByText('Add...')).toBeDisabled();
    expect(screen.getByText('Remove...')).toBeDisabled();
    expect(screen.getByText('Advanced...')).toBeDisabled();
  });
});
