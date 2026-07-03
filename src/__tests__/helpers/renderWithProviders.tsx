import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { WindowProvider } from '@/contexts/WindowContext';
import { FileSystemProvider } from '@/contexts/FileSystemContext';
import { SettingsProvider } from '@/contexts/SettingsContext';

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <FileSystemProvider>
        <WindowProvider>{children}</WindowProvider>
      </FileSystemProvider>
    </SettingsProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}
