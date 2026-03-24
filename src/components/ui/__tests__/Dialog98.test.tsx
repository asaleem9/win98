import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog98 } from '@/components/ui/Dialog98';

const defaultProps = {
  title: 'Error',
  message: 'Something went wrong',
  buttons: [
    { label: 'OK', onClick: vi.fn() },
    { label: 'Cancel', onClick: vi.fn() },
  ],
};

describe('Dialog98', () => {
  it('renders title in titlebar', () => {
    render(<Dialog98 {...defaultProps} />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('error icon type renders error icon', () => {
    render(<Dialog98 {...defaultProps} icon="error" />);
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('warning icon type', () => {
    render(<Dialog98 {...defaultProps} icon="warning" />);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('info icon type', () => {
    render(<Dialog98 {...defaultProps} icon="info" />);
    expect(screen.getByText('i')).toBeInTheDocument();
  });

  it('question icon type', () => {
    render(<Dialog98 {...defaultProps} icon="question" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<Dialog98 {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('button onClick fires callback', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Dialog98 {...defaultProps} buttons={[{ label: 'OK', onClick }]} />);
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
