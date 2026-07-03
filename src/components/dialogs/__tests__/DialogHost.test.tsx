import { act } from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { DialogHost } from '../DialogHost';

function dispatch(type: string, detail: unknown) {
  act(() => {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  });
}

describe('DialogHost', () => {
  it('opens an About dialog on win98-about-dialog', () => {
    renderWithProviders(<DialogHost />);
    dispatch('win98-about-dialog', { appName: 'Calculator' });
    expect(screen.getByText('Microsoft Calculator')).toBeInTheDocument();
  });

  it('opens a Properties dialog on win98-properties-dialog', () => {
    renderWithProviders(<DialogHost />);
    dispatch('win98-properties-dialog', { path: 'C:\\My Documents\\readme.txt' });
    expect(screen.getByText('README.TXT')).toBeInTheDocument();
    expect(screen.getByText('Text Document')).toBeInTheDocument();
  });

  it('opens the error dialog on win98-app-error', () => {
    renderWithProviders(<DialogHost />);
    dispatch('win98-app-error', { appName: 'Paint', errorType: 'general-protection-fault' });
    expect(screen.getByText(/General Protection Fault/)).toBeInTheDocument();
  });

  it('still renders stacked system message boxes on win98-system-dialog', () => {
    renderWithProviders(<DialogHost />);
    dispatch('win98-system-dialog', { title: 'Error', message: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
