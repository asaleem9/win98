'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { SYSTEM_SPECS } from '@/lib/constants';

interface InfoItem {
  label: string;
  value: string;
}

const INFO_DATA: Record<string, InfoItem[]> = {
  'system-summary': [
    { label: 'OS Name', value: 'Microsoft Windows 98' },
    { label: 'Version', value: '4.10.1998' },
    { label: 'OS Manufacturer', value: 'Microsoft Corporation' },
    { label: 'System Name', value: 'DESKTOP-WIN98' },
    { label: 'System Manufacturer', value: 'Generic PC' },
    { label: 'System Model', value: 'ATX Desktop' },
    { label: 'System Type', value: 'x86-based PC' },
    { label: 'Processor', value: SYSTEM_SPECS.processor },
    { label: 'BIOS Version/Date', value: SYSTEM_SPECS.bios },
    { label: 'Windows Directory', value: 'C:\\WINDOWS' },
    { label: 'System Directory', value: 'C:\\WINDOWS\\SYSTEM' },
    { label: 'Boot Device', value: '\\Device\\HarddiskVolume1' },
    { label: 'Total Physical Memory', value: SYSTEM_SPECS.ram },
    { label: 'Available Physical Memory', value: '72 MB' },
    { label: 'Total Virtual Memory', value: '512 MB' },
    { label: 'Available Virtual Memory', value: '384 MB' },
    { label: 'Page File Space', value: '384 MB' },
  ],
  'hardware-resources': [
    { label: 'IRQ 0', value: 'System timer' },
    { label: 'IRQ 1', value: 'Standard 101/102-Key Keyboard' },
    { label: 'IRQ 2', value: 'Programmable interrupt controller' },
    { label: 'IRQ 3', value: 'Communications Port (COM2)' },
    { label: 'IRQ 4', value: 'Communications Port (COM1)' },
    { label: 'IRQ 5', value: SYSTEM_SPECS.sound },
    { label: 'IRQ 6', value: 'Standard Floppy Disk Controller' },
    { label: 'IRQ 7', value: 'Printer Port (LPT1)' },
    { label: 'IRQ 8', value: 'System CMOS/real time clock' },
    { label: 'IRQ 9', value: 'Microsoft ACPI-Compliant System' },
    { label: 'IRQ 10', value: SYSTEM_SPECS.display },
    { label: 'IRQ 11', value: 'USB Universal Host Controller' },
    { label: 'IRQ 12', value: 'PS/2 Compatible Mouse' },
    { label: 'IRQ 13', value: 'Numeric data processor' },
    { label: 'IRQ 14', value: 'Primary IDE Channel' },
    { label: 'IRQ 15', value: 'Secondary IDE Channel' },
  ],
  'components-display': [
    { label: 'Name', value: SYSTEM_SPECS.display },
    { label: 'Adapter Type', value: 'NVIDIA Riva TNT2' },
    { label: 'Adapter RAM', value: '16.0 MB' },
    { label: 'Driver Version', value: '4.12.01.0832' },
    { label: 'Resolution', value: SYSTEM_SPECS.resolution },
    { label: 'Color Depth', value: SYSTEM_SPECS.colorDepth },
    { label: 'Monitor', value: SYSTEM_SPECS.monitor },
    { label: 'Refresh Rate', value: '75 Hz' },
  ],
  'components-sound': [
    { label: 'Name', value: SYSTEM_SPECS.sound },
    { label: 'Manufacturer', value: 'Creative Technology Ltd.' },
    { label: 'Status', value: 'OK' },
    { label: 'Driver', value: 'SBLIVE.VXD' },
    { label: 'Driver Version', value: '5.12.01.3511' },
  ],
  'components-network': [
    { label: 'Name', value: '3Com EtherLink XL 10/100 PCI' },
    { label: 'Adapter Type', value: 'Ethernet 802.3' },
    { label: 'Product Type', value: '3Com 3C905B-TX' },
    { label: 'IP Address', value: '192.168.1.100' },
    { label: 'Subnet Mask', value: '255.255.255.0' },
    { label: 'Default Gateway', value: '192.168.1.1' },
    { label: 'DHCP Enabled', value: 'Yes' },
    { label: 'DNS Server', value: '192.168.1.1' },
  ],
  'components-storage': [
    { label: 'Disk Drive', value: 'Maxtor 90648D4' },
    { label: 'Capacity', value: SYSTEM_SPECS.hardDisk },
    { label: 'Free Space', value: SYSTEM_SPECS.hardDiskFree },
    { label: 'File System', value: 'FAT32' },
    { label: 'Interface', value: 'IDE' },
    { label: 'CD-ROM', value: SYSTEM_SPECS.cdrom },
    { label: 'Floppy Drive', value: '3.5" 1.44 MB' },
  ],
  'components-input': [
    { label: 'Keyboard', value: 'Standard 101/102-Key or Microsoft Natural PS/2 Keyboard' },
    { label: 'Mouse', value: 'Microsoft PS/2 Mouse' },
    { label: 'Mouse Buttons', value: '2' },
    { label: 'Joystick', value: 'Not Connected' },
  ],
  'components-modem': [
    { label: 'Name', value: SYSTEM_SPECS.modem },
    { label: 'Device Type', value: 'External Modem' },
    { label: 'Attached To', value: 'COM2' },
    { label: 'Max Speed', value: '115200 bps' },
    { label: 'Status', value: 'OK' },
  ],
  'components-usb': [
    { label: 'USB Controller', value: 'Intel 82371AB/EB PCI to USB Universal Host Controller' },
    { label: 'Status', value: 'OK' },
    { label: 'USB Root Hub', value: '2 ports' },
  ],
  'software-drivers': [
    { label: 'HIMEM.SYS', value: 'Extended Memory Manager, Microsoft' },
    { label: 'EMM386.EXE', value: 'Expanded Memory Manager, Microsoft' },
    { label: 'IFSHLP.SYS', value: 'Installable File System Helper, Microsoft' },
    { label: 'SETVER.EXE', value: 'MS-DOS Version Table, Microsoft' },
    { label: 'DBLBUFF.SYS', value: 'Double Buffer Driver, Microsoft' },
    { label: 'NTKERN.VXD', value: 'Windows WDM Driver Manager' },
  ],
  'software-environment': [
    { label: 'COMSPEC', value: 'C:\\WINDOWS\\COMMAND.COM' },
    { label: 'PATH', value: 'C:\\WINDOWS;C:\\WINDOWS\\COMMAND' },
    { label: 'TEMP', value: 'C:\\WINDOWS\\TEMP' },
    { label: 'TMP', value: 'C:\\WINDOWS\\TEMP' },
    { label: 'windir', value: 'C:\\WINDOWS' },
    { label: 'winbootdir', value: 'C:\\WINDOWS' },
    { label: 'PROMPT', value: '$p$g' },
  ],
};

const TREE_NODES: TreeNode[] = [
  {
    id: 'system-summary',
    label: 'System Summary',
    icon: '/icons/my-computer-16.svg',
    children: [
      {
        id: 'hardware-resources',
        label: 'Hardware Resources',
        icon: '/icons/my-computer-16.svg',
      },
      {
        id: 'components',
        label: 'Components',
        icon: '/icons/folder-16.svg',
        children: [
          { id: 'components-display', label: 'Display', icon: '/icons/display-16.svg' },
          { id: 'components-sound', label: 'Sound', icon: '/icons/volume-16.svg' },
          { id: 'components-network', label: 'Network', icon: '/icons/network-16.svg' },
          { id: 'components-storage', label: 'Storage', icon: '/icons/defrag-16.svg' },
          { id: 'components-input', label: 'Input', icon: '/icons/settings-16.svg' },
          { id: 'components-modem', label: 'Modem', icon: '/icons/network-16.svg' },
          { id: 'components-usb', label: 'USB', icon: '/icons/settings-16.svg' },
        ],
      },
      {
        id: 'software',
        label: 'Software Environment',
        icon: '/icons/folder-16.svg',
        children: [
          { id: 'software-drivers', label: 'Drivers', icon: '/icons/settings-16.svg' },
          { id: 'software-environment', label: 'Environment Variables', icon: '/icons/msdos-16.svg' },
        ],
      },
    ],
  },
];

export default function SystemInformation({ windowId }: AppComponentProps) {
  const [selectedNode, setSelectedNode] = useState<string>('system-summary');

  const currentData = INFO_DATA[selectedNode] || [];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Toolbar area */}
      <div className="flex items-center h-[22px] px-2 border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]">
        <span className="font-bold text-[11px]">System Information</span>
      </div>

      {/* Main content: tree + details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree view */}
        <TreeView98
          nodes={TREE_NODES}
          selectedId={selectedNode}
          onSelect={(node) => setSelectedNode(node.id)}
          className="w-[200px] flex-shrink-0 m-1"
        />

        {/* Details panel */}
        <div className="flex-1 m-1 overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]">
          {/* Column headers */}
          <div className="flex border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] sticky top-0">
            <div className="flex-1 px-2 py-[2px] border-r border-[var(--win98-button-shadow)] font-bold">Item</div>
            <div className="flex-[2] px-2 py-[2px] font-bold">Value</div>
          </div>
          {currentData.length > 0 ? (
            currentData.map((item, i) => (
              <div key={i} className={`flex border-b border-[#eee] ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8f8f8]'}`}>
                <div className="flex-1 px-2 py-[2px] border-r border-[#eee] truncate">{item.label}</div>
                <div className="flex-[2] px-2 py-[2px] truncate">{item.value}</div>
              </div>
            ))
          ) : (
            <div className="p-3 text-[var(--win98-disabled-text)]">
              Select a category from the tree to view system information.
            </div>
          )}
        </div>
      </div>

      <StatusBar98 panels={[
        { content: selectedNode === 'system-summary' ? 'System Summary' : `Viewing: ${selectedNode.replace(/-/g, ' ').replace(/(^|\s)\w/g, (m) => m.toUpperCase())}` },
      ]} />
    </div>
  );
}
