'use client';

import { AppComponentProps } from '@/types/app';
import { Archiver } from '@/components/apps/winzip/Archiver';

export default function WinRAR(props: AppComponentProps) {
  return (
    <Archiver
      {...props}
      config={{
        kind: 'rar',
        productName: 'WinRAR',
        ext: 'rar',
        accent: '#7a2e8a',
        columns: 'rar',
        toolbar: [
          { label: 'Add', icon: '➕', action: 'add' },
          { label: 'Extract To', icon: '📤', action: 'extract' },
          { label: 'Test', icon: '🧪', action: 'test' },
          { label: 'View', icon: '👁️', action: 'view' },
          { label: 'Delete', icon: '❌', action: 'delete' },
        ],
        nag: (
          <>
            <p className="font-bold mb-2">Thank you for trying WinRAR!</p>
            <p className="mb-2">
              This is a 40-day evaluation copy of WinRAR archiver. Please
              purchase a license after the evaluation period.
            </p>
            <p className="mb-2">
              WinRAR is not free software. After a 40 day trial period you must
              either buy a license or remove it from your computer.
            </p>
            <p className="text-[10px] text-gray-600">
              Days used: 387 &nbsp;&nbsp; Days remaining: -347
            </p>
          </>
        ),
      }}
    />
  );
}
