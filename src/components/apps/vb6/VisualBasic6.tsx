'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { setClipboard, getClipboard, subscribe, readSystemText } from '@/lib/clipboard';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { normalizePath } from '@/lib/fs/fsOperations';
import { playSound } from '@/lib/sounds';
import {
  VbControl,
  ControlType,
  AlignEdge,
  ControlSeed,
  addControl,
  updateControl,
  defaultControl,
  snapToGrid,
  nextName,
  nextControlId,
  alignControls,
  serializeFrm,
  deserializeFrm,
  encodeControlsClipboard,
  decodeControlsClipboard,
} from './vb6Helpers';

const NAME_PREFIX: Record<ControlType, string> = {
  CommandButton: 'Command',
  Label: 'Label',
  TextBox: 'Text',
  CheckBox: 'Check',
};

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Form1';
}

const TOOLBOX_ITEMS: { icon: string; label: string; type?: ControlType }[] = [
  { icon: '➔', label: 'Pointer' },
  { icon: 'A', label: 'Label', type: 'Label' },
  { icon: '⬚', label: 'Frame' },
  { icon: '☑', label: 'CheckBox', type: 'CheckBox' },
  { icon: '◉', label: 'ComboBox' },
  { icon: '⏱', label: 'Timer' },
  { icon: '▤', label: 'DirListBox' },
  { icon: '═', label: 'HScrollBar' },
  { icon: '📋', label: 'OLE' },
  { icon: 'ab|', label: 'TextBox', type: 'TextBox' },
  { icon: '▭', label: 'CommandButton', type: 'CommandButton' },
  { icon: '○', label: 'OptionButton' },
  { icon: '☰', label: 'ListBox' },
  { icon: '║', label: 'VScrollBar' },
  { icon: '🎯', label: 'DriveListBox' },
  { icon: '▥', label: 'FileListBox' },
  { icon: '━', label: 'Line' },
  { icon: '▮', label: 'Shape' },
  { icon: '🖼', label: 'Image' },
  { icon: '📊', label: 'Data' },
];

const FORM_PROPERTIES = [
  { name: 'BackColor', value: '&H8000000F&' },
  { name: 'BorderStyle', value: '2 - Sizable' },
  { name: 'Enabled', value: 'True' },
  { name: 'Font', value: 'MS Sans Serif' },
  { name: 'Height', value: '3600' },
  { name: 'Left', value: '0' },
  { name: 'ScaleMode', value: '1 - Twip' },
  { name: 'StartUpPosition', value: '3 - Windows Default' },
  { name: 'Top', value: '0' },
  { name: 'Visible', value: 'True' },
  { name: 'Width', value: '4800' },
];

type Selection = 'form' | string;

interface DragState {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

export default function VisualBasic6({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();

  const [selectedTool, setSelectedTool] = useState(0);
  const [activeView, setActiveView] = useState<'design' | 'code'>('design');
  const [showError, setShowError] = useState(false);

  const [controls, setControls] = useState<VbControl[]>([]);
  const [selection, setSelection] = useState<Selection>('form');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formName, setFormName] = useState('Form1');
  const [formCaption, setFormCaption] = useState('Form1');

  const [editingField, setEditingField] = useState<'name' | 'caption' | null>(null);
  const [editValue, setEditValue] = useState('');

  const [drag, setDrag] = useState<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [runMode, setRunMode] = useState(false);
  const [broken, setBroken] = useState(false);
  const [runTextValues, setRunTextValues] = useState<Record<string, string>>({});
  const [runCheckValues, setRunCheckValues] = useState<Record<string, boolean>>({});
  const [runClickCounts, setRunClickCounts] = useState<Record<string, number>>({});
  const [msgBox, setMsgBox] = useState<string | null>(null);

  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Form1');
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [canPaste, setCanPaste] = useState(false);

  const selectedControl = selection !== 'form' ? controls.find((c) => c.id === selection) ?? null : null;

  useEffect(() => {
    updateTitle(windowId, `Project1 - Microsoft Visual Basic [${runMode ? (broken ? 'break' : 'run') : 'design'}]`);
  }, [windowId, updateTitle, runMode, broken]);

  // Enable Paste only when the clipboard holds encoded controls.
  useEffect(() => {
    const update = () => {
      const clip = getClipboard();
      setCanPaste(clip?.kind === 'text' && decodeControlsClipboard(clip.text) !== null);
    };
    update();
    return subscribe(update);
  }, []);

  const selectOnly = useCallback((id: string) => {
    setSelection(id);
    setSelectedIds([id]);
  }, []);

  const toggleInSelection = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSelection(id);
  }, []);

  const selectForm = useCallback(() => {
    setSelection('form');
    setSelectedIds([]);
  }, []);

  const handleRun = () => {
    // Resume from a break rather than restarting.
    if (runMode && broken) {
      setBroken(false);
      return;
    }
    if (runMode) return;
    if (controls.length === 0) {
      playSound('error');
      setShowError(true);
      return;
    }
    const texts: Record<string, string> = {};
    const checks: Record<string, boolean> = {};
    const clicks: Record<string, number> = {};
    controls.forEach((c) => {
      if (c.type === 'TextBox') texts[c.id] = c.caption;
      if (c.type === 'CheckBox') checks[c.id] = false;
      if (c.type === 'CommandButton') clicks[c.id] = 0;
    });
    setRunTextValues(texts);
    setRunCheckValues(checks);
    setRunClickCounts(clicks);
    setMsgBox(null);
    setBroken(false);
    setRunMode(true);
    playSound('chord');
  };

  const handleBreak = () => {
    if (runMode && !broken) setBroken(true);
  };

  const handleStop = () => {
    setRunMode(false);
    setBroken(false);
    setMsgBox(null);
  };

  const alignSelection = useCallback((edge: AlignEdge) => {
    setControls((cs) => alignControls(cs, selectedIds, edge));
  }, [selectedIds]);

  // --- control clipboard -----------------------------------------------------

  const copySelection = useCallback(() => {
    const seeds: ControlSeed[] = controls
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => ({ type: c.type, x: c.x, y: c.y, width: c.width, height: c.height, caption: c.caption }));
    if (seeds.length) setClipboard({ kind: 'text', text: encodeControlsClipboard(seeds) });
  }, [controls, selectedIds]);

  const deleteSelection = useCallback(() => {
    if (!selectedIds.length) return;
    setControls((cs) => cs.filter((c) => !selectedIds.includes(c.id)));
    selectForm();
  }, [selectedIds, selectForm]);

  const cutSelection = useCallback(() => {
    copySelection();
    deleteSelection();
  }, [copySelection, deleteSelection]);

  const pasteControls = useCallback(async () => {
    const clip = getClipboard();
    const text = clip && clip.kind === 'text' ? clip.text : (await readSystemText()) ?? '';
    const seeds = decodeControlsClipboard(text);
    if (!seeds || !seeds.length) return;
    setControls((cs) => {
      let next = cs;
      const created: string[] = [];
      for (const seed of seeds) {
        const control: VbControl = {
          id: nextControlId(),
          type: seed.type,
          x: snapToGrid(seed.x + 16),
          y: snapToGrid(seed.y + 16),
          width: seed.width,
          height: seed.height,
          caption: seed.caption,
          name: nextName(next, NAME_PREFIX[seed.type]),
        };
        next = addControl(next, control);
        created.push(control.id);
      }
      setSelectedIds(created);
      setSelection(created[created.length - 1] ?? 'form');
      return next;
    });
  }, []);

  const handleNewProject = useCallback(() => {
    setControls([]);
    setFormName('Form1');
    setFormCaption('Form1');
    setFileName('Form1');
    setFilePath(null);
    selectForm();
    handleStop();
  }, [selectForm]);

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('Microsoft Visual Basic', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    const form = deserializeFrm(node.content ?? '');
    if (!form) {
      showSystemError('Microsoft Visual Basic', `${baseName(path)} could not be loaded. The file may not be a valid form.`);
      return;
    }
    setControls(form.controls);
    setFormName(form.formName || 'Form1');
    setFormCaption(form.formCaption || 'Form1');
    setFilePath(path);
    setFileName(baseName(path));
    setSelection('form');
    setSelectedIds([]);
    addRecentDoc(path);
  }, [getNode]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const payload = serializeFrm({ app: 'vb6', version: 1, formName, formCaption, controls });
    const result = writeFile(path, payload);
    if (!result.ok) {
      showSystemError('Microsoft Visual Basic', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
    playSound('ding');
  }, [formName, formCaption, controls, writeFile]);

  const handleSave = useCallback(() => {
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave]);

  // Esc stops a running form; Delete/Backspace removes the selected control in design mode.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (runMode) {
        if (e.key === 'Escape') handleStop();
        return;
      }
      const target = e.target as HTMLElement | null;
      const isEditing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditing) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) {
        setControls((cs) => cs.filter((c) => !selectedIds.includes(c.id)));
        selectForm();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runMode, selectedIds, selectForm]);

  const creatableType = TOOLBOX_ITEMS[selectedTool]?.type;

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (creatableType) {
      const rect = canvasRef.current?.getBoundingClientRect();
      const x = rect ? e.clientX - rect.left : 0;
      const y = rect ? e.clientY - rect.top : 0;
      const control = defaultControl(creatableType, controls, x, y);
      setControls((cs) => addControl(cs, control));
      selectOnly(control.id);
      setSelectedTool(0);
    } else {
      selectForm();
    }
  };

  const startDrag = (e: React.PointerEvent, control: VbControl) => {
    if (selectedTool !== 0) return;
    e.stopPropagation();
    if (!(e.ctrlKey && selectedIds.includes(control.id))) selectOnly(control.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: control.id, startX: e.clientX, startY: e.clientY, origX: control.x, origY: control.y });
  };

  const onDragMove = (e: React.PointerEvent, control: VbControl) => {
    if (!drag || drag.id !== control.id) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const newX = snapToGrid(Math.max(0, drag.origX + dx));
    const newY = snapToGrid(Math.max(0, drag.origY + dy));
    setControls((cs) => updateControl(cs, control.id, { x: newX, y: newY }));
  };

  const endDrag = () => setDrag(null);

  const selectControl = (e: React.MouseEvent, control: VbControl) => {
    e.stopPropagation();
    if (e.ctrlKey) toggleInSelection(control.id);
    else selectOnly(control.id);
  };

  const beginEdit = (field: 'name' | 'caption') => {
    if (runMode) return;
    setEditingField(field);
    if (selection === 'form') {
      setEditValue(field === 'name' ? formName : formCaption);
    } else if (selectedControl) {
      setEditValue(field === 'name' ? selectedControl.name : selectedControl.caption);
    }
  };

  const commitEdit = () => {
    if (!editingField) return;
    if (selection === 'form') {
      if (editingField === 'name') setFormName(editValue || formName);
      else setFormCaption(editValue);
    } else if (selectedControl) {
      if (editingField === 'name') {
        setControls((cs) => updateControl(cs, selectedControl.id, { name: editValue || selectedControl.name }));
      } else {
        setControls((cs) => updateControl(cs, selectedControl.id, { caption: editValue }));
      }
    }
    setEditingField(null);
  };

  const renderControl = (control: VbControl) => {
    const isSelected = selectedIds.includes(control.id);
    const style: React.CSSProperties = {
      left: control.x,
      top: control.y,
      width: control.width,
      height: control.height,
    };
    const common = {
      onPointerDown: (e: React.PointerEvent) => startDrag(e, control),
      onPointerMove: (e: React.PointerEvent) => onDragMove(e, control),
      onPointerUp: endDrag,
      onClick: (e: React.MouseEvent) => selectControl(e, control),
    };

    let body: React.ReactNode;
    switch (control.type) {
      case 'CommandButton':
        body = (
          <div
            {...common}
            className="absolute win98-raised bg-[var(--win98-button-face)] flex items-center justify-center cursor-move text-[11px]"
            style={style}
          >
            <span>{control.caption}</span>
          </div>
        );
        break;
      case 'Label':
        body = (
          <div {...common} className="absolute flex items-center cursor-move text-[11px] text-black" style={style}>
            {control.caption}
          </div>
        );
        break;
      case 'TextBox':
        body = (
          <input
            {...common}
            readOnly
            value={control.caption}
            onChange={() => {}}
            className="absolute win98-sunken bg-white px-1 text-[11px] cursor-move"
            style={style}
          />
        );
        break;
      case 'CheckBox':
        body = (
          <div {...common} className="absolute flex items-center gap-1 cursor-move text-[11px] text-black" style={style}>
            <input type="checkbox" readOnly checked={false} className="pointer-events-none" />
            <span>{control.caption}</span>
          </div>
        );
        break;
      default:
        body = null;
    }

    const handle = (hx: number, hy: number) => (
      <div className="absolute w-[6px] h-[6px] bg-black pointer-events-none" style={{ left: hx - 3, top: hy - 3 }} />
    );

    return (
      <div key={control.id}>
        {body}
        {isSelected && (
          <>
            {handle(control.x, control.y)}
            {handle(control.x + control.width, control.y)}
            {handle(control.x, control.y + control.height)}
            {handle(control.x + control.width, control.y + control.height)}
            {handle(control.x + control.width / 2, control.y)}
            {handle(control.x + control.width / 2, control.y + control.height)}
            {handle(control.x, control.y + control.height / 2)}
            {handle(control.x + control.width, control.y + control.height / 2)}
          </>
        )}
      </div>
    );
  };

  const renderLiveControl = (control: VbControl) => {
    const style: React.CSSProperties = { left: control.x, top: control.y, width: control.width, height: control.height };
    switch (control.type) {
      case 'CommandButton':
        return (
          <button
            key={control.id}
            className="absolute win98-raised bg-[var(--win98-button-face)] flex items-center justify-center text-[11px] active:win98-pressed"
            style={style}
            onClick={() => {
              const next = (runClickCounts[control.id] ?? 0) + 1;
              setRunClickCounts((prev) => ({ ...prev, [control.id]: next }));
              playSound('ding');
              setMsgBox(`${control.caption} clicked ${next} time${next === 1 ? '' : 's'}`);
            }}
          >
            {control.caption}
          </button>
        );
      case 'Label':
        return (
          <div key={control.id} className="absolute flex items-center text-[11px] text-black" style={style}>
            {control.caption}
          </div>
        );
      case 'TextBox':
        return (
          <input
            key={control.id}
            value={runTextValues[control.id] ?? ''}
            onChange={(e) => setRunTextValues((prev) => ({ ...prev, [control.id]: e.target.value }))}
            className="absolute win98-sunken bg-white px-1 text-[11px]"
            style={style}
          />
        );
      case 'CheckBox':
        return (
          <label key={control.id} className="absolute flex items-center gap-1 text-[11px] text-black" style={style}>
            <input
              type="checkbox"
              checked={runCheckValues[control.id] ?? false}
              onChange={(e) => setRunCheckValues((prev) => ({ ...prev, [control.id]: e.target.checked }))}
            />
            <span>{control.caption}</span>
          </label>
        );
      default:
        return null;
    }
  };

  // Property rows for the currently selected object (form or control), alphabetic-ish ordering preserved.
  type PropRow = { key: string; label: string; value: string; editable: boolean };
  let propertyRows: PropRow[];
  let propertyHeader: string;
  if (selection === 'form') {
    propertyHeader = `${formName} Form`;
    const rows: PropRow[] = [{ key: 'name', label: '(Name)', value: formName, editable: true }];
    FORM_PROPERTIES.forEach((p) => {
      if (p.name === 'Caption') return;
      rows.push({ key: p.name.toLowerCase(), label: p.name, value: p.value, editable: false });
      if (p.name === 'BorderStyle') rows.push({ key: 'caption', label: 'Caption', value: formCaption, editable: true });
    });
    propertyRows = rows;
  } else if (selectedControl) {
    const isText = selectedControl.type === 'TextBox';
    propertyHeader = `${selectedControl.name} ${selectedControl.type}`;
    propertyRows = [
      { key: 'name', label: '(Name)', value: selectedControl.name, editable: true },
      { key: 'caption', label: isText ? 'Text' : 'Caption', value: selectedControl.caption, editable: true },
      { key: 'height', label: 'Height', value: String(selectedControl.height * 15), editable: false },
      { key: 'left', label: 'Left', value: String(selectedControl.x * 15), editable: false },
      { key: 'top', label: 'Top', value: String(selectedControl.y * 15), editable: false },
      { key: 'width', label: 'Width', value: String(selectedControl.width * 15), editable: false },
    ];
  } else {
    propertyHeader = `${formName} Form`;
    propertyRows = [];
  }

  const hasSelection = selectedIds.length > 0;
  const canAlign = selectedIds.length >= 2;

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New Project', shortcut: 'Ctrl+N', onClick: handleNewProject },
        { label: '&Open Form...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: '', separator: true },
        { label: '&Save Form', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save Form &As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', disabled: true },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Undo', shortcut: 'Ctrl+Z', disabled: true },
        { label: '', separator: true },
        { label: 'Cu&t', shortcut: 'Ctrl+X', onClick: cutSelection, disabled: !hasSelection },
        { label: '&Copy', shortcut: 'Ctrl+C', onClick: copySelection, disabled: !hasSelection },
        { label: '&Paste', shortcut: 'Ctrl+V', onClick: () => void pasteControls(), disabled: !canPaste },
        { label: '&Delete', shortcut: 'Del', onClick: deleteSelection, disabled: !hasSelection },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Object', shortcut: 'Shift+F7', radio: true, checked: activeView === 'design', onClick: () => setActiveView('design') },
        { label: '&Code', shortcut: 'F7', radio: true, checked: activeView === 'code', onClick: () => setActiveView('code') },
      ],
    },
    {
      label: '&Project',
      items: [
        { label: 'Add &Form', disabled: true },
        { label: '&References...', disabled: true },
        { label: 'Project1 &Properties...', disabled: true },
      ],
    },
    {
      label: 'F&ormat',
      items: [
        {
          label: '&Align',
          submenu: [
            { label: '&Lefts', onClick: () => alignSelection('lefts'), disabled: !canAlign },
            { label: '&Rights', onClick: () => alignSelection('rights'), disabled: !canAlign },
            { label: '&Tops', onClick: () => alignSelection('tops'), disabled: !canAlign },
            { label: '&Bottoms', onClick: () => alignSelection('bottoms'), disabled: !canAlign },
          ],
        },
      ],
    },
    {
      label: '&Run',
      items: [
        { label: '&Start', shortcut: 'F5', onClick: handleRun, disabled: runMode && !broken },
        { label: '&Break', shortcut: 'Ctrl+Break', onClick: handleBreak, disabled: !runMode || broken },
        { label: '&End', onClick: handleStop, disabled: !runMode },
      ],
    },
    standardHelpMenu('Visual Basic'),
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId}>
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="New Project" onClick={handleNewProject}>📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Open Form" onClick={() => setPicker('open')}>📁</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Save Form" onClick={handleSave}>💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] disabled:text-[var(--win98-disabled-text)]" title="Cut" onClick={cutSelection} disabled={!hasSelection}>✂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] disabled:text-[var(--win98-disabled-text)]" title="Copy" onClick={copySelection} disabled={!hasSelection}>📋</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[14px] disabled:text-[var(--win98-disabled-text)]" onClick={handleRun} title="Start (F5)" disabled={runMode && !broken}>▶</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] disabled:text-[var(--win98-disabled-text)]" title="Break" onClick={handleBreak} disabled={!runMode || broken}>⏸</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] disabled:text-[var(--win98-disabled-text)]" title="End" onClick={handleStop} disabled={!runMode}>⏹</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button
          className={`w-[23px] h-[22px] flex items-center justify-center text-[11px] ${activeView === 'design' ? 'win98-flat-sunken' : 'border border-transparent hover:win98-flat-raised'}`}
          onClick={() => setActiveView('design')}
          title="Object"
        >
          🖼
        </button>
        <button
          className={`w-[23px] h-[22px] flex items-center justify-center text-[11px] ${activeView === 'code' ? 'win98-flat-sunken' : 'border border-transparent hover:win98-flat-raised'}`}
          onClick={() => setActiveView('code')}
          title="View Code"
        >
          📝
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbox */}
        <div className="w-[50px] flex-shrink-0 border-r border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]">
          <div className="h-[16px] flex items-center justify-center text-[9px] font-bold border-b border-[var(--win98-button-shadow)]">
            General
          </div>
          <div className="grid grid-cols-2 gap-[1px] p-[2px]">
            {TOOLBOX_ITEMS.map((tool, i) => (
              <button
                key={i}
                className={`w-[22px] h-[22px] flex items-center justify-center text-[11px] ${
                  selectedTool === i
                    ? 'win98-pressed bg-[var(--win98-button-face)]'
                    : 'win98-raised bg-[var(--win98-button-face)]'
                }`}
                onClick={() => setSelectedTool(i)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Form designer or code editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeView === 'design' ? (
            /* Form Designer */
            <div className="flex-1 overflow-auto" style={{ backgroundColor: '#808080' }}>
              <div className="p-4">
                {/* Form window */}
                <div className="win98-window inline-block">
                  <div className="win98-titlebar px-2">
                    <span className="text-[11px] font-bold text-white flex-1">{formCaption}</span>
                    <div className="flex gap-[2px]">
                      <button className="win98-title-button text-[8px]">_</button>
                      <button className="win98-title-button text-[8px]">□</button>
                      <button className="win98-title-button text-[8px]">×</button>
                    </div>
                  </div>

                  {/* Form canvas with grid dots */}
                  <div
                    ref={canvasRef}
                    data-vb6-canvas
                    className="relative"
                    style={{
                      width: '320px',
                      height: '240px',
                      backgroundColor: '#c0c0c0',
                      backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)',
                      backgroundSize: '8px 8px',
                      cursor: creatableType ? 'crosshair' : 'default',
                    }}
                    onClick={handleCanvasClick}
                  >
                    {controls.map((control) => renderControl(control))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Code Editor */
            <div className="flex-1 flex flex-col">
              {/* Object/Proc dropdowns */}
              <div className="flex items-center h-[22px] px-1 gap-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">
                <select className="h-[18px] win98-sunken bg-white text-[11px] flex-1 px-1">
                  <option>Command1</option>
                  <option>(General)</option>
                  <option>Form</option>
                </select>
                <select className="h-[18px] win98-sunken bg-white text-[11px] flex-1 px-1">
                  <option>Click</option>
                  <option>DblClick</option>
                  <option>MouseDown</option>
                  <option>MouseUp</option>
                </select>
              </div>

              {/* Code area */}
              <div className="flex-1 overflow-auto bg-white">
                <pre className="p-2 text-[11px] font-[family-name:var(--win98-font-mono)] text-black whitespace-pre-wrap leading-relaxed">
                  <span className="text-[#0000ff]">Option</span> <span className="text-[#0000ff]">Explicit</span>{'\n'}
                  {'\n'}
                  <span className="text-[#0000ff]">Private Sub</span> Command1_Click(){'\n'}
                  {'    '}<span className="text-[#000000]">MsgBox</span> <span className="text-[#ff0000]">&quot;Hello, World!&quot;</span>, vbInformation, <span className="text-[#ff0000]">&quot;My Application&quot;</span>{'\n'}
                  <span className="text-[#0000ff]">End Sub</span>{'\n'}
                  {'\n'}
                  <span className="text-[#0000ff]">Private Sub</span> Form_Load(){'\n'}
                  {'    '}<span className="text-[#0000ff]">Me</span>.Caption = <span className="text-[#ff0000]">&quot;My First VB App&quot;</span>{'\n'}
                  {'    '}Command1.Caption = <span className="text-[#ff0000]">&quot;Click Me!&quot;</span>{'\n'}
                  <span className="text-[#0000ff]">End Sub</span>
                </pre>
              </div>
            </div>
          )}

          {/* Immediate Window */}
          <div className="h-[60px] border-t border-[var(--win98-button-shadow)]">
            <div className="h-[16px] bg-[var(--win98-titlebar-active-start)] text-white px-2 flex items-center text-[10px] font-bold">
              Immediate
            </div>
            <div className="bg-white h-[calc(100%-16px)] p-1 text-[11px] font-[family-name:var(--win98-font-mono)]" contentEditable suppressContentEditableWarning />
          </div>
        </div>

        {/* Right panels */}
        <div className="w-[180px] flex-shrink-0 flex flex-col border-l border-[var(--win98-button-shadow)]">
          {/* Project Explorer */}
          <div className="h-[120px] border-b border-[var(--win98-button-shadow)]">
            <div className="h-[16px] bg-[var(--win98-titlebar-active-start)] text-white px-2 flex items-center text-[10px] font-bold">
              Project - Project1
            </div>
            <div className="bg-white flex-1 p-1 text-[10px] h-[calc(100%-16px)] overflow-auto">
              <div className="flex items-center gap-1">
                <span>📁</span>
                <span className="font-bold">Project1 (Project1)</span>
              </div>
              <div className="flex items-center gap-1 pl-3">
                <span>📁</span>
                <span>Forms</span>
              </div>
              <div className="flex items-center gap-1 pl-6 bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]">
                <span>📄</span>
                <span>{formName} ({formName})</span>
              </div>
            </div>
          </div>

          {/* Properties Window */}
          <div className="flex-1 flex flex-col">
            <div className="h-[16px] bg-[var(--win98-titlebar-active-start)] text-white px-2 flex items-center text-[10px] font-bold">
              Properties - {formName}
            </div>
            <div className="bg-[var(--win98-button-face)] px-1 py-[2px]">
              <select
                className="w-full h-[18px] win98-sunken bg-white text-[10px] px-1"
                value={selection === 'form' ? '__form__' : selection}
                onChange={(e) => (e.target.value === '__form__' ? selectForm() : selectOnly(e.target.value))}
              >
                <option value="__form__">{formName} Form</option>
                {controls.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.type}
                  </option>
                ))}
              </select>
            </div>
            {/* Tab bar */}
            <div className="flex border-b border-[var(--win98-button-shadow)]">
              <button className="px-2 py-[1px] text-[10px] font-bold bg-[var(--win98-button-face)] border-t border-x border-[var(--win98-button-shadow)] relative -bottom-px">Alphabetic</button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0] border-t border-x border-[var(--win98-button-shadow)]">Categorized</button>
            </div>
            {/* Property grid */}
            <div className="flex-1 bg-white overflow-auto">
              {propertyRows.map((prop) => (
                <div
                  key={prop.key}
                  className="flex text-[10px] border-b border-[#c0c0c0] cursor-default"
                >
                  <div className="w-[80px] px-1 py-[1px] border-r border-[#c0c0c0] truncate">{prop.label}</div>
                  {prop.editable && editingField === prop.key ? (
                    <input
                      autoFocus
                      className="flex-1 px-1 py-0 text-[10px] win98-sunken"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                    />
                  ) : (
                    <div
                      className={`flex-1 px-1 py-[1px] truncate ${prop.editable ? 'cursor-text hover:bg-[var(--win98-highlight)] hover:text-[var(--win98-highlight-text)]' : ''}`}
                      onClick={() => prop.editable && beginEdit(prop.key as 'name' | 'caption')}
                    >
                      {prop.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Property description */}
            <div className="h-[36px] border-t border-[var(--win98-button-shadow)] p-1 text-[10px]">
              <div className="font-bold">{propertyHeader}</div>
              <div className="text-[9px] text-[var(--win98-disabled-text)]">Returns/sets the text displayed in the title bar.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-[2]">{activeView === 'design' ? `${formName} - Form (Design)` : `${formName} - Form (Code)`}</span>
        <span className="win98-sunken px-2 py-0 w-[80px]">3600 x 2400</span>
      </div>

      {/* Compile Error Dialog */}
      {showError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="win98-window p-0 w-[380px]">
            <div className="win98-titlebar px-2">
              <span className="flex-1 text-[11px] font-bold text-white">Microsoft Visual Basic</span>
            </div>
            <div className="p-4 flex gap-3 items-start bg-[var(--win98-button-face)]">
              <span className="text-[24px]">⛔</span>
              <div>
                <p className="text-[11px] font-bold mb-1">Compile error:</p>
                <p className="text-[11px]">Expected: end of statement</p>
              </div>
            </div>
            <div className="flex justify-center gap-2 pb-3 bg-[var(--win98-button-face)]">
              <button className="win98-raised px-6 py-1 text-[11px]" onClick={() => setShowError(false)}>OK</button>
              <button className="win98-raised px-4 py-1 text-[11px]" onClick={() => setShowError(false)}>Help</button>
            </div>
          </div>
        </div>
      )}

      {/* Running form */}
      {runMode && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30">
          <div className="win98-window p-0 inline-block">
            <div className="win98-titlebar px-2">
              <span className="text-[11px] font-bold text-white flex-1">{formCaption}{broken ? ' [break]' : ''}</span>
              <div className="flex gap-[2px]">
                <button className="win98-title-button text-[8px]" onClick={handleStop} title="Close">×</button>
              </div>
            </div>
            <div
              className={`relative ${broken ? 'pointer-events-none opacity-90' : ''}`}
              style={{ width: '320px', height: '240px', backgroundColor: '#c0c0c0' }}
            >
              {controls.map((control) => renderLiveControl(control))}
            </div>
          </div>
        </div>
      )}

      {/* MsgBox */}
      {msgBox && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="win98-window p-0 w-[280px]">
            <div className="win98-titlebar px-2">
              <span className="flex-1 text-[11px] font-bold text-white">{formCaption}</span>
            </div>
            <div className="p-4 flex gap-3 items-start bg-[var(--win98-button-face)]">
              <span className="text-[24px]">ℹ️</span>
              <p className="text-[11px]">{msgBox}</p>
            </div>
            <div className="flex justify-center gap-2 pb-3 bg-[var(--win98-button-face)]">
              <button className="win98-raised px-6 py-1 text-[11px]" onClick={() => setMsgBox(null)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['frm']}
          defaultName={picker === 'save' ? (fileName.includes('.') ? fileName : `${fileName}.frm`) : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') loadPath(path);
            else doSave(path);
          }}
        />
      )}
    </div>
  );
}
