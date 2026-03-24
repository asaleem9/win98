import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { WindowProvider } from '@/contexts/WindowContext';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <WindowProvider>{children}</WindowProvider>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}
