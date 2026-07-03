// Help topics as data. Bodies use a tiny markdown-lite convention: blank lines
// separate blocks, and a block whose every line starts with "- " is a bullet
// list. The Help component renders these blocks; see renderHelpBody there.

export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  body: string;
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'welcome',
    title: 'Welcome to Windows 98',
    category: 'Getting Started',
    keywords: ['welcome', 'introduction', 'start', 'basics', 'overview'],
    body: `Windows 98 makes your computer easier to use and more fun. This help system covers the basics of getting around the desktop, working with files, and using the included programs.

Select a topic on the left to learn more.`,
  },
  {
    id: 'desktop',
    title: 'Using the Desktop',
    category: 'The Basics',
    keywords: ['desktop', 'icons', 'recycle bin', 'drag', 'select'],
    body: `- Double-click an icon to open it.
- Drag icons to rearrange them — positions are remembered.
- Drag on an empty area to select several icons at once.
- Right-click the desktop for New Folder, New Text Document, and display Properties.
- Deleted files go to the Recycle Bin, where they can be restored.`,
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    category: 'The Basics',
    keywords: ['keyboard', 'shortcuts', 'alt+tab', 'alt+f4', 'keys'],
    body: `Common keyboard shortcuts:

- Alt+Tab — Switch between open windows
- Alt+F4 — Close the active window
- Ctrl+Esc — Open the Start menu
- Esc — Close menus and dialogs`,
  },
  {
    id: 'files',
    title: 'Working with Files',
    category: 'The Basics',
    keywords: ['files', 'explorer', 'my computer', 'notepad', 'save', 'find'],
    body: `Use Windows Explorer or My Computer to browse drive C:. Double-clicking a file opens it in its associated program — text files open in Notepad, pictures in Paint, and music in Winamp.

Programs like Notepad save real files back to the drive, and your files survive restarting the computer.

Use Start → Find → Files or Folders to search the drive by name or contents.`,
  },
  {
    id: 'run',
    title: 'The Run Command',
    category: 'Advanced',
    keywords: ['run', 'command', 'start menu', 'launch', 'program'],
    body: `Choose Start → Run and type a program name, such as:

- notepad
- calc
- winmine
- sol
- notepad C:\\My Documents\\readme.txt`,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    category: 'Advanced',
    keywords: ['troubleshooting', 'help', 'blue screen', 'modem', 'problems'],
    body: `If your computer displays a blue screen, press any key to continue. This is normal.

If you hear a modem noise, someone is using the Internet. This is also normal.

If a purple gorilla appears and will not leave, this is unfortunately normal too.`,
  },
];
