'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';
import { Button98 } from '@/components/ui/Button98';
import { TabControl98 } from '@/components/ui/TabControl98';
import { SYSTEM_SPECS } from '@/lib/constants';

interface DeviceInfo {
  name: string;
  manufacturer: string;
  status: string;
  driver: string;
  driverVersion: string;
  resources?: string;
}

const DEVICE_DATA: Record<string, DeviceInfo> = {
  'computer': { name: 'Standard PC', manufacturer: 'Generic', status: 'This device is working properly.', driver: 'N/A', driverVersion: 'N/A' },
  'disk-maxtor': { name: 'Maxtor 90648D4', manufacturer: 'Maxtor Corporation', status: 'This device is working properly.', driver: 'ESDI_506.PDR', driverVersion: '4.10.1998', resources: 'IRQ 14' },
  'disk-floppy': { name: 'Standard Floppy Disk Controller', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'HSFLOP.PDR', driverVersion: '4.10.1998', resources: 'IRQ 6, DMA 2' },
  'display-nvidia': { name: SYSTEM_SPECS.display, manufacturer: 'NVIDIA Corporation', status: 'This device is working properly.', driver: 'NV4_DISP.DRV', driverVersion: '4.12.01.0832', resources: 'IRQ 10, Memory 0xE0000000-0xE0FFFFFF' },
  'keyboard-ps2': { name: 'Standard 101/102-Key or Microsoft Natural PS/2 Keyboard', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'KEYBOARD.DRV', driverVersion: '4.10.1998', resources: 'IRQ 1' },
  'modem-usr': { name: SYSTEM_SPECS.modem, manufacturer: 'U.S. Robotics', status: 'This device is working properly.', driver: 'USBSER.SYS', driverVersion: '4.10.1998', resources: 'COM2, IRQ 3' },
  'monitor-pnp': { name: SYSTEM_SPECS.monitor, manufacturer: '(Standard monitor types)', status: 'This device is working properly.', driver: 'MONITOR.DRV', driverVersion: '4.10.1998' },
  'mouse-ps2': { name: 'PS/2 Compatible Mouse', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'MOUSE.DRV', driverVersion: '4.10.1998', resources: 'IRQ 12' },
  'network-3com': { name: '3Com EtherLink XL 10/100 PCI (3C905B-TX)', manufacturer: '3Com Corporation', status: 'This device is working properly.', driver: 'EL90XBC5.SYS', driverVersion: '5.1.2.0', resources: 'IRQ 11, I/O 0xA000-0xA07F' },
  'sound-sblive': { name: SYSTEM_SPECS.sound, manufacturer: 'Creative Technology Ltd.', status: 'This device is working properly.', driver: 'SBLIVE.VXD', driverVersion: '5.12.01.3511', resources: 'IRQ 5, I/O 0x220-0x22F, DMA 1' },
  'cdrom-atapi': { name: SYSTEM_SPECS.cdrom, manufacturer: 'Generic', status: 'This device is working properly.', driver: 'CDROM.SYS', driverVersion: '4.10.1998', resources: 'IRQ 15' },
  'sys-pci': { name: 'PCI Bus', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'PCI.VXD', driverVersion: '4.10.1998' },
  'sys-dma': { name: 'Direct memory access controller', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'ISAPNP.VXD', driverVersion: '4.10.1998' },
  'sys-pic': { name: 'Programmable interrupt controller', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'ISAPNP.VXD', driverVersion: '4.10.1998' },
  'sys-timer': { name: 'System timer', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'VTIMER.VXD', driverVersion: '4.10.1998', resources: 'IRQ 0' },
  'sys-cmos': { name: 'System CMOS/real time clock', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'ISAPNP.VXD', driverVersion: '4.10.1998', resources: 'IRQ 8' },
  'sys-speaker': { name: 'System speaker', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'N/A', driverVersion: 'N/A' },
  'usb-controller': { name: 'Intel 82371AB/EB PCI to USB Universal Host Controller', manufacturer: 'Intel Corporation', status: 'This device is working properly.', driver: 'UHCD.SYS', driverVersion: '4.10.1998', resources: 'IRQ 11' },
  'usb-hub': { name: 'USB Root Hub', manufacturer: 'Microsoft', status: 'This device is working properly.', driver: 'USBHUB.SYS', driverVersion: '4.10.1998' },
};

const TREE_NODES: TreeNode[] = [
  {
    id: 'root',
    label: 'DESKTOP-WIN98',
    icon: '/icons/my-computer-16.svg',
    children: [
      { id: 'cat-computer', label: 'Computer', children: [
        { id: 'computer', label: 'Standard PC' },
      ]},
      { id: 'cat-cdrom', label: 'CDROM', children: [
        { id: 'cdrom-atapi', label: SYSTEM_SPECS.cdrom },
      ]},
      { id: 'cat-disk', label: 'Disk drives', children: [
        { id: 'disk-maxtor', label: 'Maxtor 90648D4' },
      ]},
      { id: 'cat-display', label: 'Display adapters', children: [
        { id: 'display-nvidia', label: SYSTEM_SPECS.display },
      ]},
      { id: 'cat-floppy', label: 'Floppy disk controllers', children: [
        { id: 'disk-floppy', label: 'Standard Floppy Disk Controller' },
      ]},
      { id: 'cat-keyboard', label: 'Keyboard', children: [
        { id: 'keyboard-ps2', label: 'Standard 101/102-Key Keyboard' },
      ]},
      { id: 'cat-modem', label: 'Modem', children: [
        { id: 'modem-usr', label: SYSTEM_SPECS.modem },
      ]},
      { id: 'cat-monitor', label: 'Monitors', children: [
        { id: 'monitor-pnp', label: SYSTEM_SPECS.monitor },
      ]},
      { id: 'cat-mouse', label: 'Mouse', children: [
        { id: 'mouse-ps2', label: 'PS/2 Compatible Mouse' },
      ]},
      { id: 'cat-network', label: 'Network adapters', children: [
        { id: 'network-3com', label: '3Com EtherLink XL 10/100 PCI' },
      ]},
      { id: 'cat-sound', label: 'Sound, video and game controllers', children: [
        { id: 'sound-sblive', label: SYSTEM_SPECS.sound },
      ]},
      { id: 'cat-system', label: 'System devices', children: [
        { id: 'sys-pci', label: 'PCI Bus' },
        { id: 'sys-dma', label: 'Direct memory access controller' },
        { id: 'sys-pic', label: 'Programmable interrupt controller' },
        { id: 'sys-timer', label: 'System timer' },
        { id: 'sys-cmos', label: 'System CMOS/real time clock' },
        { id: 'sys-speaker', label: 'System speaker' },
      ]},
      { id: 'cat-usb', label: 'Universal Serial Bus controllers', children: [
        { id: 'usb-controller', label: 'Intel 82371AB/EB PCI to USB' },
        { id: 'usb-hub', label: 'USB Root Hub' },
      ]},
    ],
  },
];

export default function DeviceManager({ windowId }: AppComponentProps) {
  const [selectedNode, setSelectedNode] = useState<string>('root');
  const [showProperties, setShowProperties] = useState(false);

  const deviceInfo = DEVICE_DATA[selectedNode];
  const isDevice = !!deviceInfo;

  const propertiesTabs = deviceInfo ? [
    {
      id: 'general',
      label: 'General',
      content: (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--win98-button-shadow)]">
            <div className="w-8 h-8 bg-[var(--win98-button-face)] border border-[var(--win98-button-shadow)] flex items-center justify-center text-[16px]">
              {'\u2699'}
            </div>
            <div>
              <div className="font-bold">{deviceInfo.name}</div>
              <div className="text-[var(--win98-disabled-text)]">Device type: Hardware</div>
            </div>
          </div>
          <div><span className="font-bold">Manufacturer: </span>{deviceInfo.manufacturer}</div>
          <div className="mt-2 p-2 border border-[var(--win98-button-shadow)] bg-white">
            <div className="font-bold mb-1">Device status</div>
            <div>{deviceInfo.status}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'driver',
      label: 'Driver',
      content: (
        <div className="flex flex-col gap-2">
          <div className="font-bold pb-2 border-b border-[var(--win98-button-shadow)]">Driver Information</div>
          <div><span className="font-bold">Driver Provider: </span>{deviceInfo.manufacturer}</div>
          <div><span className="font-bold">Driver File: </span>{deviceInfo.driver}</div>
          <div><span className="font-bold">Driver Version: </span>{deviceInfo.driverVersion}</div>
          <div className="mt-3 flex gap-2">
            <Button98 disabled>Update Driver...</Button98>
          </div>
        </div>
      ),
    },
    {
      id: 'resources',
      label: 'Resources',
      content: (
        <div className="flex flex-col gap-2">
          <div className="font-bold pb-2 border-b border-[var(--win98-button-shadow)]">Resource Settings</div>
          {deviceInfo.resources ? (
            <div className="p-2 border border-[var(--win98-button-shadow)] bg-white font-[family-name:var(--win98-font-mono)]">
              {deviceInfo.resources}
            </div>
          ) : (
            <div className="text-[var(--win98-disabled-text)]">This device is not using any resources.</div>
          )}
          <div className="mt-2 p-2 border border-[var(--win98-button-shadow)] bg-white">
            <div className="font-bold mb-1">Conflicting device list:</div>
            <div>No conflicts.</div>
          </div>
        </div>
      ),
    },
  ] : [];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Header */}
      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
        <img src="/icons/my-computer-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
        <span className="font-bold">Device Manager</span>
      </div>

      <div className="px-3 pb-1 text-[10px] text-[var(--win98-disabled-text)]">
        View devices by type. Select a device and click Properties for more information.
      </div>

      {/* Tree view */}
      <div className="flex-1 mx-3 mb-1 overflow-auto">
        <TreeView98
          nodes={TREE_NODES}
          selectedId={selectedNode}
          onSelect={(node) => setSelectedNode(node.id)}
          className="h-full"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 px-3 py-2 border-t border-[var(--win98-button-shadow)]">
        <Button98 onClick={() => isDevice && setShowProperties(true)} disabled={!isDevice}>
          Properties
        </Button98>
        <Button98 disabled>Refresh</Button98>
        <Button98 disabled>Print...</Button98>
      </div>

      {/* Properties dialog overlay */}
      {showProperties && deviceInfo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)] w-[340px]">
            {/* Dialog titlebar */}
            <div className="flex items-center h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white text-[11px] font-bold select-none">
              <span className="truncate">{deviceInfo.name} Properties</span>
              <button
                onClick={() => setShowProperties(false)}
                className="ml-auto w-[14px] h-[14px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] flex items-center justify-center text-black text-[10px] leading-none"
              >
                x
              </button>
            </div>

            {/* Tabs */}
            <div className="p-3">
              <TabControl98 tabs={propertiesTabs} />
            </div>

            {/* Bottom buttons */}
            <div className="flex justify-end gap-2 px-3 pb-3">
              <Button98 onClick={() => setShowProperties(false)}>OK</Button98>
              <Button98 onClick={() => setShowProperties(false)}>Cancel</Button98>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
