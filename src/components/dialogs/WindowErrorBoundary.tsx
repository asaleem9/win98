'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDialog } from '@/components/system/ErrorDialog';

interface WindowErrorBoundaryProps {
  appName: string;
  windowId: string;
  /** Called when the user dismisses the crash dialog; wire to closeWindow. */
  onClose?: () => void;
  children: ReactNode;
}

interface WindowErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render/runtime errors thrown by an app and, instead of taking the whole
 * shell down, shows the classic General Protection Fault dialog inside the window.
 * Dismissing it closes the offending window via the supplied onClose handler.
 */
export class WindowErrorBoundary extends Component<WindowErrorBoundaryProps, WindowErrorBoundaryState> {
  state: WindowErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WindowErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the failure for debugging without crashing the desktop.
    console.error(`[${this.props.appName}] crashed`, error, info.componentStack);
  }

  handleClose = () => {
    this.setState({ hasError: false });
    this.props.onClose?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDialog
          appName={this.props.appName}
          errorType="general-protection-fault"
          onClose={this.handleClose}
        />
      );
    }
    return this.props.children;
  }
}
