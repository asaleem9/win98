import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabControl98 } from '@/components/ui/TabControl98';

const tabs = [
  { id: 'general', label: 'General', content: <div>General Content</div> },
  { id: 'advanced', label: 'Advanced', content: <div>Advanced Content</div> },
  { id: 'about', label: 'About', content: <div>About Content</div> },
];

describe('TabControl98', () => {
  it('renders all tab labels', () => {
    render(<TabControl98 tabs={tabs} />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('first tab active by default', () => {
    render(<TabControl98 tabs={tabs} />);
    expect(screen.getByText('General Content')).toBeInTheDocument();
  });

  it('clicking tab switches content', async () => {
    const user = userEvent.setup();
    render(<TabControl98 tabs={tabs} />);
    await user.click(screen.getByText('Advanced'));
    expect(screen.getByText('Advanced Content')).toBeInTheDocument();
    expect(screen.queryByText('General Content')).not.toBeInTheDocument();
  });

  it('active tab has raised styling', () => {
    render(<TabControl98 tabs={tabs} />);
    const generalTab = screen.getByText('General');
    expect(generalTab.className).toMatch(/border-b-\[var\(--win98-button-face\)\]/);
    expect(generalTab.className).toMatch(/z-10/);
  });

  it('tab content is rendered for active tab', () => {
    render(<TabControl98 tabs={tabs} />);
    expect(screen.getByText('General Content')).toBeInTheDocument();
    expect(screen.queryByText('Advanced Content')).not.toBeInTheDocument();
  });

  it('defaultTab prop selects initial tab', () => {
    render(<TabControl98 tabs={tabs} defaultTab="about" />);
    expect(screen.getByText('About Content')).toBeInTheDocument();
    expect(screen.queryByText('General Content')).not.toBeInTheDocument();
  });
});
