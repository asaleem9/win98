'use client';

// The file picker now lives in the shared dialog layer. This module stays as a
// compatibility re-export so the Office-style apps that reference it by path keep
// resolving to the single consolidated implementation.
export { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
export type { FilePickerDialogProps, FilePickerFilter } from '@/components/dialogs/FilePickerDialog';
