import { lazy } from 'react';
import { AppDefinition } from '@/types/app';

const NotepadApp = lazy(() => import('@/components/apps/notepad/Notepad'));
const CalculatorApp = lazy(() => import('@/components/apps/calculator/Calculator'));
const PaintApp = lazy(() => import('@/components/apps/paint/Paint'));
const WordPadApp = lazy(() => import('@/components/apps/wordpad/WordPad'));
const CharacterMapApp = lazy(() => import('@/components/apps/character-map/CharacterMap'));
const SoundRecorderApp = lazy(() => import('@/components/apps/sound-recorder/SoundRecorder'));

export const accessoriesApps: Record<string, AppDefinition> = {
  'notepad': {
    id: 'notepad',
    name: 'Notepad',
    icon: '/icons/notepad-32.svg',
    icon16: '/icons/notepad-16.svg',
    category: 'accessories',
    component: NotepadApp,
    defaultWindow: { title: 'Untitled - Notepad', width: 500, height: 400, minWidth: 250, minHeight: 200 },
    startMenuPath: ['Programs', 'Accessories'],
    singleton: false,
  },
  'calculator': {
    id: 'calculator',
    name: 'Calculator',
    icon: '/icons/calculator-32.svg',
    icon16: '/icons/calculator-16.svg',
    category: 'accessories',
    component: CalculatorApp,
    defaultWindow: { title: 'Calculator', width: 400, height: 300, minWidth: 260, minHeight: 300, resizable: false },
    startMenuPath: ['Programs', 'Accessories'],
    singleton: true,
  },
  'paint': {
    id: 'paint',
    name: 'Paint',
    icon: '/icons/paint-32.svg',
    icon16: '/icons/paint-16.svg',
    category: 'accessories',
    component: PaintApp,
    defaultWindow: { title: 'untitled - Paint', width: 600, height: 480, minWidth: 300, minHeight: 250 },
    startMenuPath: ['Programs', 'Accessories'],
    singleton: true,
  },
  'wordpad': {
    id: 'wordpad',
    name: 'WordPad',
    icon: '/icons/wordpad-32.svg',
    icon16: '/icons/wordpad-16.svg',
    category: 'accessories',
    component: WordPadApp,
    defaultWindow: { title: 'Document - WordPad', width: 600, height: 450, minWidth: 350, minHeight: 250 },
    startMenuPath: ['Programs', 'Accessories'],
    singleton: false,
  },
  'character-map': {
    id: 'character-map',
    name: 'Character Map',
    icon: '/icons/charmap-32.svg',
    icon16: '/icons/charmap-16.svg',
    category: 'accessories',
    component: CharacterMapApp,
    defaultWindow: { title: 'Character Map', width: 380, height: 340, minWidth: 320, minHeight: 280, resizable: false },
    startMenuPath: ['Programs', 'Accessories'],
    singleton: true,
  },
  'sound-recorder': {
    id: 'sound-recorder',
    name: 'Sound Recorder',
    icon: '/icons/soundrec-32.svg',
    icon16: '/icons/soundrec-16.svg',
    category: 'accessories',
    component: SoundRecorderApp,
    defaultWindow: { title: 'Sound - Sound Recorder', width: 280, height: 220, minWidth: 280, minHeight: 220, resizable: false },
    startMenuPath: ['Programs', 'Accessories', 'Multimedia'],
    singleton: true,
  },
};
