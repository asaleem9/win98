'use client';

import { AppComponentProps } from '@/types/app';
import Explorer from '@/components/apps/explorer/Explorer';

/** My Documents is Windows Explorer opened at C:\My Documents. */
export default function MyDocuments({ windowId, launchCount }: AppComponentProps) {
  return <Explorer windowId={windowId} launchParams={{ filePath: 'C:\\My Documents' }} launchCount={launchCount} />;
}
