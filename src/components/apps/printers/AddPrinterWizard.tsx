'use client';

import { useState } from 'react';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Select98 } from '@/components/ui/Select98';

interface AddPrinterWizardProps {
  onClose: () => void;
}

const MANUFACTURERS = ['HP', 'Epson', 'Canon', 'Lexmark', 'Brother', 'Generic'];
const PORTS = ['LPT1:', 'LPT2:', 'LPT3:', 'COM1:', 'FILE:'];

/** The classic three-step Add Printer wizard — all show, no new printer. */
export function AddPrinterWizard({ onClose }: AddPrinterWizardProps) {
  const [step, setStep] = useState(0);
  const [port, setPort] = useState('LPT1:');

  if (step === 3) {
    return (
      <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
        <Dialog98
          title="Add Printer Wizard"
          icon="warning"
          message={
            <span>
              The printer could not be found on {port}
              <br />
              Windows will pretend it exists.
            </span>
          }
          buttons={[{ label: 'OK', default: true, onClick: onClose }]}
        />
      </div>
    );
  }

  const steps = [
    {
      message: (
        <div className="space-y-2 max-w-[220px]">
          <p className="font-bold">Add Printer Wizard</p>
          <p>This wizard helps you install a printer or make printer connections.</p>
          <p>Click Next to continue.</p>
        </div>
      ),
      buttons: [
        { label: 'Next >', default: true, onClick: () => setStep(1) },
        { label: 'Cancel', onClick: onClose },
      ],
    },
    {
      message: (
        <div className="space-y-2 max-w-[220px]">
          <p>Select the manufacturer and model of your printer.</p>
          <Select98 defaultValue="HP" className="w-full">
            {MANUFACTURERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select98>
        </div>
      ),
      buttons: [
        { label: '< Back', onClick: () => setStep(0) },
        { label: 'Next >', default: true, onClick: () => setStep(2) },
        { label: 'Cancel', onClick: onClose },
      ],
    },
    {
      message: (
        <div className="space-y-2 max-w-[220px]">
          <p>Click the port you want to use with this printer.</p>
          <Select98 value={port} onChange={(e) => setPort(e.target.value)} className="w-full">
            {PORTS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select98>
        </div>
      ),
      buttons: [
        { label: '< Back', onClick: () => setStep(1) },
        { label: 'Finish', default: true, onClick: () => setStep(3) },
        { label: 'Cancel', onClick: onClose },
      ],
    },
  ];

  const current = steps[step];

  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
      <Dialog98 title="Add Printer Wizard" message={current.message} buttons={current.buttons} />
    </div>
  );
}
