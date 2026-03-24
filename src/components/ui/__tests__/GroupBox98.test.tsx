import { render, screen } from '@testing-library/react';
import { GroupBox98 } from '@/components/ui/GroupBox98';

describe('GroupBox98', () => {
  it('renders as fieldset element', () => {
    const { container } = render(<GroupBox98 label="Options">Content</GroupBox98>);
    expect(container.querySelector('fieldset')).toBeInTheDocument();
  });

  it('legend shows label text', () => {
    render(<GroupBox98 label="Settings">Content</GroupBox98>);
    expect(screen.getByText('Settings').tagName).toBe('LEGEND');
  });

  it('children render inside', () => {
    render(<GroupBox98 label="Group"><span>Inner content</span></GroupBox98>);
    expect(screen.getByText('Inner content')).toBeInTheDocument();
  });

  it('no legend when label is omitted', () => {
    const { container } = render(<GroupBox98>No label</GroupBox98>);
    expect(container.querySelector('legend')).not.toBeInTheDocument();
  });
});
