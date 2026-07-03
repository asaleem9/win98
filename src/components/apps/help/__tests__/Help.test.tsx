import { render, screen, fireEvent } from '@testing-library/react';
import Help from '../Help';
import { helpTopics } from '../helpContent';

describe('helpContent data model', () => {
  it('keeps the original six topics with unique ids', () => {
    expect(helpTopics).toHaveLength(6);
    const ids = helpTopics.map((t) => t.id);
    expect(new Set(ids).size).toBe(6);
    expect(ids).toContain('welcome');
    expect(ids).toContain('troubleshooting');
  });

  it('gives every topic a title, category, keywords, and body', () => {
    for (const t of helpTopics) {
      expect(t.title).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(t.body.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Help', () => {
  it('lists every topic and shows the welcome topic by default', () => {
    render(<Help windowId="w1" />);
    for (const t of helpTopics) {
      // titles appear in the sidebar (welcome also appears as the heading)
      expect(screen.getAllByText(t.title).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/Windows 98 makes your computer easier to use/)).toBeInTheDocument();
  });

  it('switches content when another topic is selected', () => {
    render(<Help windowId="w1" />);
    fireEvent.click(screen.getByText('Keyboard Shortcuts'));
    expect(screen.getByText(/Switch between open windows/)).toBeInTheDocument();
    expect(screen.getByText(/Close the active window/)).toBeInTheDocument();
  });

  it('renders bullet lists from markdown-lite bodies', () => {
    render(<Help windowId="w1" />);
    fireEvent.click(screen.getByText('Using the Desktop'));
    expect(screen.getByText('Double-click an icon to open it.')).toBeInTheDocument();
  });
});
