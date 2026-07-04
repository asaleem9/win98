'use client';

import { AppComponentProps } from '@/types/app';
import { Archiver } from './Archiver';

export default function WinZip(props: AppComponentProps) {
  return (
    <Archiver
      {...props}
      config={{
        kind: 'zip',
        productName: 'WinZip',
        ext: 'zip',
        accent: '#c8a415',
        columns: 'zip',
        toolbar: [
          { label: 'New', icon: '📄', action: 'new' },
          { label: 'Open', icon: '📂', action: 'open' },
          { label: 'Add', icon: '➕', action: 'add' },
          { label: 'Extract', icon: '📤', action: 'extract' },
          { label: 'View', icon: '👁️', action: 'view' },
          { label: 'CheckOut', icon: '✅', action: 'test' },
        ],
        nag: (
          <>
            <p className="font-bold mb-2">Thank you for trying WinZip!</p>
            <p className="mb-2">
              This is an evaluation version. Please purchase a license to
              continue using WinZip after the evaluation period.
            </p>
            <p className="mb-2">
              WinZip is not free software. You are encouraged to register your
              copy today.
            </p>
            <p className="text-[10px] text-gray-600">
              Days used: 8,751 &nbsp;&nbsp; Days remaining: -8,743
            </p>
          </>
        ),
      }}
    />
  );
}
