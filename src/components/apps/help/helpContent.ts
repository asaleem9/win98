// Help topics as data. Bodies use a tiny markdown-lite convention:
//
//   - blank lines separate blocks
//   - a block whose every line starts with "- " is a bullet list
//   - a block that starts with "> Related Topics:" is a see-also list; each
//     following "- " line is a topic id, rendered as a jump link
//   - inline **text** is bold
//   - inline [label](topic:id) jumps to another Help topic
//   - inline [label](app:appId) draws a shortcut button that opens the program
//
// The parsing here is pure so it can be unit-tested; the Help component turns
// the parsed blocks and inline tokens into React nodes (see renderBody there).

export type HelpCategory = 'Welcome' | 'Programs' | 'Games' | 'System' | 'Troubleshooting';

// Order the Contents tree follows, top to bottom.
export const CATEGORY_ORDER: HelpCategory[] = ['Welcome', 'Programs', 'Games', 'System', 'Troubleshooting'];

export interface HelpTopic {
  id: string;
  title: string;
  category: HelpCategory;
  keywords: string[];
  // Alphabetical Index entries that point at this topic, e.g. 'copying files',
  // 'shortcuts, keyboard'. One topic can be reachable from several entries.
  indexEntries?: string[];
  body: string;
}

export const helpTopics: HelpTopic[] = [
  // ------------------------------------------------------------------ Welcome
  {
    id: 'welcome',
    title: 'Welcome to Windows 98',
    category: 'Welcome',
    keywords: ['welcome', 'introduction', 'start', 'basics', 'overview', 'getting started'],
    indexEntries: ['Welcome', 'getting started', 'introduction'],
    body: `Welcome. Windows 98 makes your computer easier to use and more fun, and this Help system is here whenever you get stuck.

To find your way around:

- Click the **Contents** tab on the left to browse Help by subject, the way you would flip through a book.
- Click the **Index** tab to look up a word alphabetically.
- Click the **Search** tab to type a word or two and find every topic that mentions it.

New to all of this? Start with [Using the Desktop](topic:desktop) and [Working with Files and Folders](topic:files). When you are comfortable, [Tips and Tricks](topic:tips-and-tricks) has shortcuts that make everyday tasks faster.

> Related Topics:
- desktop
- tips-and-tricks
- keyboard
- files`,
  },
  {
    id: 'tips-and-tricks',
    title: 'Tips and Tricks',
    category: 'Welcome',
    keywords: ['tips', 'tricks', 'shortcuts', 'hints', 'productivity', 'right-click'],
    indexEntries: ['tips and tricks', 'hints'],
    body: `A few habits that make Windows 98 quicker to use:

- **Right-click almost anything.** Files, the desktop, the taskbar, and the title bar all have a shortcut menu with the commands that make sense for that item.
- **Drag to organize.** You can drag a file into a folder, drag a window by its title bar, and drag desktop icons wherever you like — their positions are remembered.
- **Double-click to open.** One click selects; two clicks opens. This is true for icons, files, and folders alike.
- **The taskbar remembers everything you have open.** Click a button on the taskbar to jump straight to that window, even if it is buried behind others.
- **Hold Ctrl while clicking** to pick out several files that are not next to each other.

Want to open a program the fast way? Try the [Run command](topic:run), or memorize a handful of [keyboard shortcuts](topic:keyboard).

> Related Topics:
- keyboard
- run
- desktop
- taskbar`,
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    category: 'Welcome',
    keywords: ['keyboard', 'shortcuts', 'alt+tab', 'alt+f4', 'keys', 'hotkeys', 'ctrl'],
    indexEntries: ['shortcuts, keyboard', 'keyboard shortcuts', 'Alt+Tab', 'Alt+F4'],
    body: `You can do most things without reaching for the mouse. The shortcuts below work almost everywhere in Windows.

Getting around:

- **Alt+Tab** — Switch between open windows
- **Ctrl+Esc** — Open the Start menu
- **Alt+F4** — Close the active window
- **Esc** — Close a menu or cancel a dialog box

Working with documents:

- **Ctrl+C** — Copy the selection
- **Ctrl+X** — Cut the selection
- **Ctrl+V** — Paste
- **Ctrl+Z** — Undo the last change
- **Ctrl+A** — Select everything
- **Ctrl+S** — Save
- **Ctrl+P** — Print

Note: In a menu, the underlined letter is its keyboard shortcut. Hold **Alt** and press that letter to choose the command.

> Related Topics:
- tips-and-tricks
- windows-basics
- files`,
  },
  {
    id: 'mouse-basics',
    title: 'Using Your Mouse',
    category: 'Welcome',
    keywords: ['mouse', 'click', 'double-click', 'right-click', 'drag', 'pointer', 'select'],
    indexEntries: ['mouse', 'clicking', 'double-clicking', 'dragging'],
    body: `The mouse moves the pointer on screen. There are four moves worth knowing:

- **Point** — Move the mouse so the pointer rests on an item.
- **Click** — Press and release the left button once. Use this to select an item or press a button.
- **Double-click** — Click the left button twice, quickly. Use this to open an icon, file, or folder.
- **Right-click** — Press and release the right button once. A shortcut menu appears listing the things you can do with the item you clicked.

To **drag**, point at an item, hold down the left button, move the mouse, and let go where you want the item to land. Dragging moves files, windows, and desktop icons.

> Related Topics:
- desktop
- windows-basics
- files`,
  },
  {
    id: 'desktop',
    title: 'Using the Desktop',
    category: 'Welcome',
    keywords: ['desktop', 'icons', 'recycle bin', 'drag', 'select', 'wallpaper', 'background'],
    indexEntries: ['desktop', 'icons, desktop', 'arranging icons'],
    body: `The desktop is the background you see when no window covers it. It holds icons for programs and folders you use often.

- **Double-click an icon** to open it.
- **Drag icons** to rearrange them. Their positions are remembered the next time you visit.
- **Drag a box** across an empty area to select several icons at once.
- **Right-click the desktop** for New Folder, New Text Document, and Properties.

Deleted files land in the [Recycle Bin](topic:recycle-bin), where you can restore them until you empty it. To change the wallpaper and colors, open [Display Properties](topic:display-properties) — or just [open it now](app:display-properties).

> Related Topics:
- start-menu
- taskbar
- recycle-bin
- display-properties`,
  },
  {
    id: 'start-menu',
    title: 'Using the Start Menu',
    category: 'Welcome',
    keywords: ['start', 'menu', 'programs', 'run', 'find', 'shut down', 'launch'],
    indexEntries: ['Start menu', 'starting programs', 'Start button'],
    body: `The **Start** button sits at the left end of the taskbar. Click it (or press **Ctrl+Esc**) and a menu slides up. From here you can reach everything on the computer:

1. Click **Start**.
2. Point to **Programs** to open the list of installed programs. Folders such as Accessories and Games open further menus when you point at them.
3. Click the program you want.

The Start menu also offers:

- **Documents** — the files you opened most recently.
- **Settings** — the Control Panel and other setup tools.
- **Find** — search the drive for a file. See [Finding Files](topic:find-files).
- **Run** — type a program name to start it. See [The Run Command](topic:run).
- **Shut Down** — close everything and turn off the computer.

> Related Topics:
- taskbar
- run
- find-files`,
  },
  {
    id: 'taskbar',
    title: 'Using the Taskbar',
    category: 'Welcome',
    keywords: ['taskbar', 'clock', 'tray', 'quick launch', 'minimize', 'switch', 'buttons'],
    indexEntries: ['taskbar', 'switching between windows', 'clock'],
    body: `The taskbar is the bar along the bottom of the screen. It shows a button for every window you have open, so you always know what is running and can switch in a single click.

- **Click a taskbar button** to bring that window to the front. Click it again to minimize the window out of the way.
- The **Quick Launch** icons next to the Start button open your favorite programs with one click.
- The **clock** at the far right shows the time. Rest the pointer on it to see today's date.

Tip: When windows pile up, right-click an empty part of the taskbar to tidy them — you can tile them or minimize everything at once.

> Related Topics:
- start-menu
- windows-basics
- desktop`,
  },
  {
    id: 'windows-basics',
    title: 'Working with Windows',
    category: 'Welcome',
    keywords: ['window', 'move', 'resize', 'minimize', 'maximize', 'close', 'title bar'],
    indexEntries: ['windows, moving', 'windows, resizing', 'minimizing windows', 'maximizing windows'],
    body: `Almost everything you open appears in a window. The three buttons at the top-right corner of a window control it:

- **Minimize** (the underscore) hides the window down to its taskbar button without closing it.
- **Maximize** (the box) makes the window fill the screen. Click it again, and the window returns to its former size.
- **Close** (the X) shuts the window. If you have unsaved work, you will be asked whether to save first.

To **move** a window, drag it by its blue title bar. To **resize** one, drag any edge or corner. Double-clicking the title bar is a shortcut for Maximize and Restore.

Only one window is active at a time — its title bar is highlighted. Click any window, or press **Alt+Tab**, to make it the active one.

> Related Topics:
- taskbar
- keyboard
- mouse-basics`,
  },
  {
    id: 'files',
    title: 'Working with Files and Folders',
    category: 'Welcome',
    keywords: ['files', 'folders', 'explorer', 'my computer', 'save', 'copy', 'move', 'delete'],
    indexEntries: ['files', 'folders', 'copying files', 'moving files', 'deleting files'],
    body: `Your documents, pictures, and programs are stored as **files**. Files live inside **folders**, and folders live on drive **C:**.

To browse them, open [My Computer](app:my-computer) or [Windows Explorer](app:explorer) and double-click a drive or folder to look inside. Double-clicking a file opens it in the right program — text files in [Notepad](topic:notepad), pictures in [Paint](topic:paint), music in [Winamp](topic:winamp).

Everyday tasks:

- **Copy a file** — Right-click it, choose Copy, open the destination folder, then right-click and choose Paste.
- **Move a file** — Drag it into another folder, or use Cut instead of Copy.
- **Rename a file** — Right-click it and choose Rename, or click its name once when it is selected.
- **Delete a file** — Select it and press Delete. It goes to the [Recycle Bin](topic:recycle-bin).

Note: Programs such as Notepad and Paint save real files to the drive, and your files survive restarting the computer. To hunt for one by name, use [Finding Files](topic:find-files).

> Related Topics:
- explorer
- find-files
- recycle-bin`,
  },
  {
    id: 'run',
    title: 'The Run Command',
    category: 'Welcome',
    keywords: ['run', 'command', 'start menu', 'launch', 'program', 'open'],
    indexEntries: ['Run command', 'running programs by name'],
    body: `The Run command starts a program the moment you type its name — handy once you know the shortcuts.

1. Click **Start**, then **Run**.
2. Type the name of a program.
3. Click **OK** or press Enter.

Some names to try:

- **notepad** — the text editor
- **calc** — the calculator
- **winmine** — Minesweeper
- **sol** — Solitaire
- **mspaint** — Paint
- **notepad C:\\My Documents\\readme.txt** — open a specific file in Notepad

Tip: You can also reach these programs through the [Start menu](topic:start-menu), but the Run box is faster when your hands are already on the keyboard.

> Related Topics:
- start-menu
- msdos
- keyboard`,
  },

  // ----------------------------------------------------------------- Programs
  {
    id: 'notepad',
    title: 'Notepad',
    category: 'Programs',
    keywords: ['notepad', 'text', 'editor', 'txt', 'write', 'word wrap', 'find'],
    indexEntries: ['Notepad', 'text files, editing', 'word wrap'],
    body: `Notepad is a plain text editor — perfect for quick notes, lists, and readme files. [Open Notepad](app:notepad) to try it.

To create a document:

1. Open Notepad. A blank page appears.
2. Type your text.
3. On the **File** menu, click **Save**. Choose a folder and a name, then click Save.

Handy features:

- **Word Wrap** (on the Format menu) folds long lines to the width of the window so you never scroll sideways. It is on by default.
- **Find** (Ctrl+F) locates a word in the document. **Time/Date** (press **F5**) drops the current time and date at the cursor — useful for a log.
- **Undo** (Ctrl+Z) reverses your last change.

Note: Choosing **Print** sends your document to the printer and delivers the pages to C:\\My Documents\\Printed Documents — see [Printing](topic:printing).

> Related Topics:
- wordpad
- files
- keyboard`,
  },
  {
    id: 'wordpad',
    title: 'WordPad',
    category: 'Programs',
    keywords: ['wordpad', 'formatting', 'bold', 'italic', 'font', 'rich text', 'write'],
    indexEntries: ['WordPad', 'formatting text', 'fonts'],
    body: `WordPad is a step up from Notepad: it keeps **bold**, *italic*, fonts, and colors, so it suits letters and reports rather than plain notes. [Open WordPad](app:wordpad) to begin.

To format text:

1. Select the words you want to change by dragging across them.
2. Click **Bold**, **Italic**, or **Underline** on the toolbar, or pick a font and size from the boxes beside them.

Other things to try:

- Change text color and alignment from the toolbar.
- Save your work from the **File** menu. WordPad remembers formatting that Notepad would throw away.

If all you need is quick, unformatted text, [Notepad](topic:notepad) is lighter and faster.

> Related Topics:
- notepad
- word
- files`,
  },
  {
    id: 'paint',
    title: 'Paint',
    category: 'Programs',
    keywords: ['paint', 'draw', 'picture', 'image', 'brush', 'pencil', 'fill', 'color'],
    indexEntries: ['Paint', 'drawing pictures', 'images, creating'],
    body: `Paint lets you draw and color pictures. [Open Paint](app:paint) and pick a tool from the box on the left.

The tools:

- **Pencil** — draw thin freehand lines.
- **Brush** — paint thicker strokes. Change the width with the size control.
- **Eraser** — paint over your work with the background color.
- **Fill** (the paint bucket) — flood an enclosed area with the current color.
- **Line**, **Rectangle**, and **Ellipse** — drag to draw straight lines and shapes.
- **Text** — click and type words onto the picture.
- **Pick Color** (the eyedropper) — grab a color already in the picture.

To choose a color, click it in the palette along the bottom. To start over, choose **New** on the File menu. When you are happy, use **Save** to keep the picture as a file that opens again later.

> Related Topics:
- files
- photoshop
- character-map`,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    category: 'Programs',
    keywords: ['calculator', 'calc', 'math', 'scientific', 'memory', 'arithmetic'],
    indexEntries: ['Calculator', 'arithmetic', 'scientific calculator'],
    body: `Calculator does everyday arithmetic and, in Scientific view, quite a bit more. [Open Calculator](app:calculator) to follow along.

To do a calculation, click the number and operator buttons — for example, 12, then +, then 8, then =. You can also type on the keyboard.

Two views, chosen from the **View** menu:

- **Standard** — add, subtract, multiply, divide, percent, and square root.
- **Scientific** — adds sin, cos, tan, log, ln, square root, and powers, with a choice of degrees or radians.

The memory keys hold a number for later:

- **MS** stores the displayed number in memory.
- **MR** recalls it. **M+** adds to it. **MC** clears it.

> Related Topics:
- run
- keyboard`,
  },
  {
    id: 'explorer',
    title: 'Windows Explorer',
    category: 'Programs',
    keywords: ['explorer', 'files', 'folders', 'browse', 'my computer', 'tree', 'navigate'],
    indexEntries: ['Windows Explorer', 'browsing folders', 'folder tree'],
    body: `Windows Explorer shows the whole drive at once: a folder tree on the left, and the contents of the selected folder on the right. [Open Explorer](app:explorer) to look around.

To move through your folders:

1. Click a folder in the left pane to see what it contains on the right.
2. Double-click a folder on the right to open it.
3. Use the **Up** button to climb to the folder that contains the current one, and **Back** to return where you were.

You can copy, move, rename, and delete files here exactly as described in [Working with Files and Folders](topic:files). For a simpler window that starts at the drives, open [My Computer](app:my-computer) instead.

> Related Topics:
- files
- find-files
- recycle-bin`,
  },
  {
    id: 'internet-explorer',
    title: 'Internet Explorer',
    category: 'Programs',
    keywords: ['internet', 'explorer', 'browser', 'web', 'ie', 'address', 'surf', 'website'],
    indexEntries: ['Internet Explorer', 'browsing the web', 'World Wide Web'],
    body: `Internet Explorer is your window onto the World Wide Web. [Open Internet Explorer](app:ie5) and the world is a few clicks away.

To visit a page:

1. Click in the **Address** bar at the top.
2. Type the address of a site, such as www.example.com.
3. Press Enter.

While you browse:

- **Back** and **Forward** retrace the pages you have seen.
- **Stop** halts a page that is taking too long; **Refresh** loads it again.
- **Home** returns to your starting page.

Note: If your modem is squealing, that is the sound of it dialing the Internet — see [Common Questions](topic:common-questions). To read electronic mail, use [Outlook Express](topic:outlook-express).

> Related Topics:
- outlook-express
- aim
- common-questions`,
  },
  {
    id: 'outlook-express',
    title: 'Outlook Express',
    category: 'Programs',
    keywords: ['outlook', 'express', 'email', 'mail', 'message', 'inbox', 'send'],
    indexEntries: ['Outlook Express', 'e-mail', 'sending mail'],
    body: `Outlook Express handles your electronic mail. [Open Outlook Express](app:outlook-express) to read and write messages.

To read your mail, click **Inbox** in the folder list on the left, then click a message to show it in the reading pane below.

To send a message:

1. Click **New Mail** (or **Compose**).
2. Type the recipient's address in the **To** box and a subject on the Subject line.
3. Write your message, then click **Send**.

Messages you have written wait in the **Outbox**, and copies of what you send are kept in **Sent Items**.

> Related Topics:
- internet-explorer
- aim`,
  },
  {
    id: 'aim',
    title: 'AOL Instant Messenger',
    category: 'Programs',
    keywords: ['aim', 'instant', 'messenger', 'chat', 'buddy', 'aol', 'away'],
    indexEntries: ['AOL Instant Messenger', 'instant messaging', 'buddy list'],
    body: `AOL Instant Messenger (AIM) lets you chat in real time with friends on your **Buddy List**. [Open AIM](app:aim) to sign on.

To send an instant message:

1. Find a buddy who is online in your Buddy List.
2. Double-click their name to open a message window.
3. Type your message and press Enter to send it.

When you step away from the computer, set an **Away** message so buddies know you are not ignoring them. The familiar door sound plays when a buddy signs on or off.

> Related Topics:
- outlook-express
- internet-explorer`,
  },
  {
    id: 'winamp',
    title: 'Winamp',
    category: 'Programs',
    keywords: ['winamp', 'music', 'mp3', 'play', 'playlist', 'audio', 'sound', 'volume'],
    indexEntries: ['Winamp', 'playing music', 'MP3 files', 'playlists'],
    body: `Winamp plays your music. It really whips the llama's... well, it plays MP3s beautifully. [Open Winamp](app:winamp) to start listening.

To play a song:

1. Double-click a music file in [Explorer](topic:explorer), or add files to Winamp's playlist.
2. Press the **Play** button (the triangle).
3. Use **Stop**, **Pause**, and the previous/next buttons to control playback.

Drag the volume slider to make it louder or softer, and drag the position bar to jump around within a track. Songs you line up appear in the **Playlist**, and they play one after another.

> Related Topics:
- files
- keyboard`,
  },
  {
    id: 'word',
    title: 'Microsoft Word',
    category: 'Programs',
    keywords: ['word', 'document', 'write', 'letter', 'format', 'bold', 'office'],
    indexEntries: ['Microsoft Word', 'documents, writing', 'word processing'],
    body: `Microsoft Word is a full word processor for letters, essays, and reports. [Open Word](app:word97) to write a document.

To write and format:

1. Start typing. Word wraps each line and moves to the next page for you.
2. Select text by dragging across it, then use the toolbar to make it **bold**, *italic*, or a different font and size.
3. On the **File** menu, click **Save** to keep your document.

For short, plain notes you do not need all this power — [Notepad](topic:notepad) or [WordPad](topic:wordpad) will do. Word shines when a document needs real formatting.

> Related Topics:
- wordpad
- excel
- powerpoint`,
  },
  {
    id: 'excel',
    title: 'Microsoft Excel',
    category: 'Programs',
    keywords: ['excel', 'spreadsheet', 'formula', 'cell', 'sum', 'chart', 'office', 'row', 'column'],
    indexEntries: ['Microsoft Excel', 'spreadsheets', 'formulas', 'cells'],
    body: `Microsoft Excel arranges numbers in a grid of **cells** and does the math for you. [Open Excel](app:excel) to build a spreadsheet.

The basics:

1. Click a cell and type a number or a label. Press Enter to move down, or Tab to move right.
2. To calculate, start a cell with an equals sign. For example, type =A1+A2 to add the two cells above, or =SUM(A1:A10) to total a range.
3. When you change a number, every formula that depends on it updates instantly.

Each cell is named by its column letter and row number — the cell in column B, row 3, is **B3**. Save your workbook from the **File** menu.

> Related Topics:
- word
- powerpoint`,
  },
  {
    id: 'powerpoint',
    title: 'Microsoft PowerPoint',
    category: 'Programs',
    keywords: ['powerpoint', 'presentation', 'slides', 'slideshow', 'office', 'present'],
    indexEntries: ['Microsoft PowerPoint', 'presentations', 'slide shows'],
    body: `Microsoft PowerPoint builds slide presentations. [Open PowerPoint](app:powerpoint) to make one.

To create a slide show:

1. Start with the title slide and type a title.
2. Add a new slide for each point you want to make, and type your text into the placeholders.
3. Run the show to see your slides fill the screen one after another.

Keep each slide short — a few lines of large text read far better from across a room than a wall of small print.

> Related Topics:
- word
- excel`,
  },
  {
    id: 'photoshop',
    title: 'Adobe Photoshop',
    category: 'Programs',
    keywords: ['photoshop', 'adobe', 'image', 'edit', 'photo', 'layers', 'filter', 'graphics'],
    indexEntries: ['Adobe Photoshop', 'editing photos', 'image editing'],
    body: `Adobe Photoshop is a professional image editor — far more powerful than [Paint](topic:paint) for retouching photographs and building graphics. [Open Photoshop](app:photoshop5) to explore.

To work on an image:

1. Choose a tool from the toolbox — a brush to paint, the marquee to select an area, or the eraser to remove pixels.
2. Pick a color and adjust the brush before you paint.
3. Apply changes only to the part of the image you have selected.

Note: Photoshop rewards patience. If you only need to jot a quick drawing, [Paint](topic:paint) opens faster and is simpler to learn.

> Related Topics:
- paint
- files`,
  },
  {
    id: 'character-map',
    title: 'Character Map',
    category: 'Programs',
    keywords: ['character', 'map', 'symbol', 'special', 'accent', 'copyright', 'unicode'],
    indexEntries: ['Character Map', 'special characters', 'symbols'],
    body: `Character Map finds letters and symbols that are not printed on the keyboard — accented letters, the copyright sign, arrows, and more.

To insert a special character:

1. Open Character Map and choose a font at the top.
2. Click a character to enlarge it, then click **Select** to add it to the Characters to copy box.
3. Click **Copy**.
4. Switch to your document and paste with **Ctrl+V**.

This works in [Notepad](topic:notepad), [WordPad](topic:wordpad), and most other programs.

> Related Topics:
- notepad
- wordpad`,
  },
  {
    id: 'archives',
    title: 'WinZip and WinRAR',
    category: 'Programs',
    keywords: ['zip', 'winzip', 'winrar', 'archive', 'compress', 'extract', 'unzip', 'rar'],
    indexEntries: ['WinZip', 'WinRAR', 'compressed files', 'extracting archives'],
    body: `A **.zip** or **.rar** file is an archive — one file that holds many others, squeezed smaller so they are easier to store and send. WinZip and WinRAR open them.

To see what is inside an archive, double-click it and the program lists its contents.

To **extract** the files:

1. Open the archive.
2. Click **Extract**.
3. Choose the folder where the files should land, and confirm.

The files are unpacked into that folder, ready to use. Note: the evaluation reminder that greets you is part of the era's charm — click past it to continue.

> Related Topics:
- files
- explorer`,
  },
  {
    id: 'msdos',
    title: 'MS-DOS Prompt',
    category: 'Programs',
    keywords: ['ms-dos', 'dos', 'command', 'prompt', 'dir', 'cd', 'type', 'terminal'],
    indexEntries: ['MS-DOS Prompt', 'command prompt', 'DOS commands'],
    body: `The MS-DOS Prompt lets you command the computer by typing instead of clicking. [Open the MS-DOS Prompt](app:msdos) and type a command, then press Enter.

Everyday commands:

- **dir** — list the files in the current folder
- **cd foldername** — change into a folder; **cd ..** goes up one level
- **type filename** — show the contents of a text file
- **copy a b** — copy file a to b; **del filename** deletes a file
- **md name** and **rd name** — make and remove a folder
- **cls** — clear the screen
- **tree** — draw the folder structure as a diagram
- **ver** — show the Windows version
- **exit** — close the MS-DOS Prompt

For the full list, type **help** and press Enter. Type a command name with **/?** to see how it is used.

> Related Topics:
- run
- explorer
- regedit`,
  },
  {
    id: 'regedit',
    title: 'Registry Editor',
    category: 'Programs',
    keywords: ['registry', 'regedit', 'advanced', 'settings', 'warning', 'keys', 'values'],
    indexEntries: ['Registry Editor', 'registry, editing', 'Regedit'],
    body: `**Warning: Using Registry Editor incorrectly can cause serious problems that may require you to reinstall Windows.** Change a value only when you know exactly what it does.

The Registry is the central database where Windows and your programs keep their settings. Registry Editor shows it as a tree of **keys** on the left, with the **values** inside each key on the right.

To look around safely:

1. Open Registry Editor.
2. Click the plus sign beside a key to expand it, and click a key to see its values.
3. Browse without changing anything until you are sure what a value controls.

Note: There is rarely a reason to edit the Registry by hand. Almost every setting has a friendlier home in the [Control Panel](topic:control-panel) or in a program's own Options.

> Related Topics:
- control-panel
- msdos`,
  },

  // -------------------------------------------------------------------- Games
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    category: 'Games',
    keywords: ['minesweeper', 'mines', 'flag', 'chord', 'winmine', 'bombs', 'game'],
    indexEntries: ['Minesweeper', 'chording', 'flagging mines'],
    body: `The goal of Minesweeper is to clear a minefield without stepping on a mine. [Open Minesweeper](app:minesweeper) to play.

How to play:

1. **Left-click** a square to uncover it. If a mine is hidden there, the game ends.
2. An uncovered square shows a number — how many mines touch it, counting all eight neighbors. A blank square touches no mines, so its neighbors open automatically.
3. **Right-click** a square you believe hides a mine to plant a flag. Right-click again for a question mark, and once more to clear it.
4. Flag every mine and uncover every safe square to win.

**Chording** — the expert's trick: once a numbered square has exactly that many flags around it, click the number with the **left and right buttons together** (or the middle button) to open all its remaining neighbors at once. Chord on a wrong flag, though, and you will set off a mine.

Choose your field from the Game menu: **Beginner** is 9 by 9 with 10 mines, **Intermediate** is 16 by 16 with 40 mines, and **Expert** is 16 by 30 with 99 mines. The fastest times are saved as best times.

> Related Topics:
- solitaire
- freecell`,
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    category: 'Games',
    keywords: ['solitaire', 'klondike', 'cards', 'sol', 'patience', 'game', 'vegas', 'score'],
    indexEntries: ['Solitaire', 'Klondike', 'card games', 'Vegas scoring'],
    body: `Solitaire (Klondike) is the classic card game. The aim is to build all four suits up from Ace to King on the **foundations** in the top-right corner. [Open Solitaire](app:solitaire) to deal.

How to play:

1. Move cards between the seven **tableau** columns to build downward in alternating colors — a red six goes on a black seven.
2. Move any **Ace** to a foundation, then build each foundation upward in suit: Ace, 2, 3, and so on to King.
3. Click the **stock** (the face-down pile) to turn up new cards when you are stuck. Only a King may fill an empty column.
4. Double-click a card to send it straight to its foundation.

Two choices on the Game menu change the challenge:

- **Draw** — turn cards from the stock **one at a time** (easier) or **three at a time** (the traditional, harder game).
- **Scoring** — in **Standard** you earn points for good moves; in **Vegas** you buy the deck for $52 and win $5 for each card you get home, so the goal is to finish in the black.

Win, and the cards bounce off the table in celebration.

> Related Topics:
- freecell
- hearts
- minesweeper`,
  },
  {
    id: 'freecell',
    title: 'FreeCell',
    category: 'Games',
    keywords: ['freecell', 'cards', 'solitaire', 'strategy', 'free cells', 'game'],
    indexEntries: ['FreeCell', 'card games'],
    body: `FreeCell is a solitaire game where every card is dealt face up — with careful thought, almost every deal can be won. [Open FreeCell](app:freecell) to try one.

The layout has three areas: eight **tableau** columns of cards, four **free cells** in the top-left, and four **home** foundations in the top-right.

How to play:

1. Build the tableau downward in alternating colors, as in Solitaire.
2. Use the four **free cells** as temporary parking — each holds one card while you rearrange the columns.
3. Move Aces, then 2s, and so on up to the **home** cells to build each suit.
4. Win by sending all 52 cards home.

Strategy: the free cells are precious. Empty them as soon as you can, and plan several moves ahead — the cards you need are all in plain sight.

> Related Topics:
- solitaire
- minesweeper`,
  },
  {
    id: 'hearts',
    title: 'Hearts',
    category: 'Games',
    keywords: ['hearts', 'cards', 'trick', 'queen of spades', 'pass', 'shoot the moon', 'game'],
    indexEntries: ['Hearts', 'card games', 'shooting the moon'],
    body: `Hearts is a game for four players in which you want the **fewest** points. Each heart is worth one point and the **Queen of Spades** is worth thirteen, so you try to avoid taking them in tricks. [Open Hearts](app:hearts) to play against three opponents.

Each round:

1. **Pass three cards.** Choose three cards to hand to another player. The direction rotates each round — left, right, across, and then a round with no passing at all.
2. **Play tricks.** The player with the two of clubs leads it. Everyone must follow the suit led if they can; the highest card of that suit wins the trick and leads the next.
3. You cannot lead a heart until hearts have been "broken" by being discarded on an earlier trick.

At the end, count your points. The game ends when someone reaches 100, and the player with the **lowest** score wins.

**Shooting the Moon:** if you manage to take *every* heart and the Queen of Spades in a single round, the tables turn — you score zero and all three opponents take 26 points instead. It is risky, but gloriously satisfying.

> Related Topics:
- solitaire
- freecell`,
  },
  {
    id: 'pinball',
    title: '3D Pinball: Space Cadet',
    category: 'Games',
    keywords: ['pinball', 'space cadet', 'flipper', 'ball', 'tilt', 'missions', 'game', 'launch'],
    indexEntries: ['Pinball', 'Space Cadet', 'flippers'],
    body: `3D Pinball: Space Cadet puts a pinball table on your screen. Keep the ball in play, complete missions, and rack up a high score. [Open Pinball](app:pinball) to launch a game.

The controls:

- **Space bar** — pull back and release the plunger to launch the ball. Hold longer for more power.
- **Z** or the **Left Arrow** — the left flipper.
- **/** (slash) or the **Right Arrow** — the right flipper.
- **F2** — start a fresh game at any time.

How to play:

1. Launch the ball with the plunger.
2. Use the flippers to keep the ball from falling between them, and aim for the lit targets.
3. Take on the **missions** shown in the message bar — Target Practice, Re-entry, Bumper Storm, Spin Cycle, and the Hyperspace Chase. Each one you finish lifts your rank from Cadet to Ensign, Lieutenant, and on up the ladder.

Finish the Hyperspace Chase and a second ball drops for **multiball**: every point counts double while more than one ball is on the table, and you keep playing until the last one drains.

You get three balls per game. Nudging the table can save a ball, but shove too hard and it will **TILT**, freezing the flippers until the ball drains.

> Related Topics:
- minesweeper
- classic-games`,
  },
  {
    id: 'classic-games',
    title: 'Classic Games Collection',
    category: 'Games',
    keywords: ['games', 'oregon trail', 'simcity', 'age of empires', 'starcraft', 'diablo', 'tony hawk', 'rollercoaster', 'skifree', 'bunker', 'yeti'],
    indexEntries: ['games, classic', 'Oregon Trail', 'SimCity', 'StarCraft', 'SkiFree', 'Bunker 98'],
    body: `Beyond the card and puzzle games, a shelf of era favorites is installed. Each opens from the Games menu.

- **The Oregon Trail** — lead a wagon party west in 1848. Buy supplies, ford rivers, and try not to die of dysentery.
- **SimCity** — found a city, zone it for homes, shops, and industry, and keep the citizens happy as it grows.
- **RollerCoaster Tycoon** — build and run an amusement park, coasters and all.
- **Age of Empires II**, **StarCraft**, and **Command & Conquer** — gather resources, build a base, and send an army to crush your rival.
- **Diablo II** — descend into the dungeons, battle monsters, and gather loot.
- **[Tony Hawk's Pro Skater 2](topic:tony-hawk)** — chain tricks, grinds, and manuals into one huge combo.
- **[SkiFree](topic:skifree)** — bomb down an endless slope and stay ahead of the yeti.
- **[Bunker 98](topic:bunker-98)** — a first-person shooter through corridors full of hostile drones.

Each game explains its own controls when it starts, and the action games all take **F2** to start over. Save often, and have fun.

> Related Topics:
- pinball
- skifree
- bunker-98`,
  },
  {
    id: 'skifree',
    title: 'SkiFree',
    category: 'Games',
    keywords: ['skifree', 'ski', 'yeti', 'slalom', 'downhill', 'snow', 'style', 'tricks', 'game'],
    indexEntries: ['SkiFree', 'yeti', 'skiing'],
    body: `SkiFree sends you straight down a snowy mountain. Dodge the trees, thread the flags, and — sooner or later — outrun the yeti. [Open SkiFree](app:skifree) to hit the slope.

Pick a mode from the title screen:

- **Free Style** — an endless run with no finish line. Rack up distance and style, but the yeti wakes at 2,000 metres and comes hungry.
- **Slalom** — race the clock to 1,500 metres, threading every gate. Missing one adds a time penalty.
- **Tree Slalom** — the same gates, hidden in a thick stand of pines.

The controls:

- **Left** and **Right arrows** (or the mouse) — steer.
- **Down arrow** — tuck and point straight downhill for more speed.
- **F** — a burst of extra speed.
- **Up arrow** or **Space** — flip off a jump for style points. Land it clean or you wipe out.
- **F2** — start a fresh run.

Style points come from tricks off the ramps. The yeti can only grab you on the ground, so a well-timed jump buys you a few precious metres — but nobody outruns him forever.

> Related Topics:
- classic-games
- bunker-98`,
  },
  {
    id: 'bunker-98',
    title: 'Bunker 98',
    category: 'Games',
    keywords: ['bunker', 'bunker 98', 'shooter', 'first person', '3d', 'doom', 'blaster', 'keycard', 'sector', 'game'],
    indexEntries: ['Bunker 98', 'first-person shooter'],
    body: `Bunker 98 is a first-person shooter. You are sealed inside an underground complex with an energy blaster and a horde of maintenance drones that have turned hostile. [Open Bunker 98](app:bunker-98) to drop in.

Your objective in each sector is to reach the exit lift. Some are sealed behind blast doors — find the matching **silver** or **gold** keycard before you can open them.

The controls:

- **W A S D** — move; **A** and **D** also strafe side to side.
- **Left/Right arrows** or the **mouse** — turn. Click the window first to lock the mouse for smooth aiming.
- **Ctrl** or **click** — fire the blaster.
- **E** or **Space** — open doors and throw the exit lever.
- **Tab** — show the overhead map.
- **F2** — restart the current sector.

Clear each sector to see your rating for kills, items, and secrets. Data caches tucked off the main path are worth a fortune and count toward that secret score, so it pays to explore.

> Related Topics:
- classic-games
- skifree`,
  },
  {
    id: 'tony-hawk',
    title: "Tony Hawk's Pro Skater 2",
    category: 'Games',
    keywords: ['tony hawk', 'pro skater', 'skateboard', 'skating', 'tricks', 'combo', 'grind', 'manual', 'special', 'thps', 'game'],
    indexEntries: ["Tony Hawk's Pro Skater", 'skateboarding', 'combos'],
    body: `Tony Hawk's Pro Skater 2 drops you into a skate park with one job: string tricks together for the biggest score before the run clock runs out. [Open the game](app:tony-hawk-2) to skate.

The controls:

- **Space** — ollie. Time it off a ramp or ledge to launch into the air.
- **Left** and **Right arrows** — flip tricks while airborne.
- **Up arrow** — a grab.
- **Down arrow** — a judo.
- **Up, Up** (double-tap) — a special trick, once your special meter is charged.
- Land into **Down, Up** to hold a **manual** and keep the combo running between obstacles.
- **F2** — restart the run.

Ride onto a rail or ledge to **grind** it, and keep your balance to hold the grind. The real points come from chaining ollies, flips, grinds, and manuals into one long combo before you touch down — but a hard landing bails the trick and drops everything you banked. Collect the **S-K-A-T-E** letters and hit the score goals to clear each level.

> Related Topics:
- classic-games
- pinball`,
  },

  // ------------------------------------------------------------------- System
  {
    id: 'display-properties',
    title: 'Display Properties',
    category: 'System',
    keywords: ['display', 'properties', 'wallpaper', 'background', 'screen saver', 'appearance', 'colors'],
    indexEntries: ['Display Properties', 'wallpaper', 'screen saver', 'colors, changing'],
    body: `Display Properties controls how the desktop looks. [Open Display Properties](app:display-properties), or right-click the desktop and choose Properties.

The tabs let you personalize your workspace:

- **Background** — choose a wallpaper picture or a solid desktop color.
- **Screen Saver** — pick a moving picture that appears when the computer sits idle, and set how many minutes to wait.
- **Appearance** — change the color scheme of windows, menus, and buttons.

Click **Apply** to preview a change, or **OK** to keep it and close the window.

> Related Topics:
- desktop
- control-panel`,
  },
  {
    id: 'control-panel',
    title: 'Control Panel',
    category: 'System',
    keywords: ['control panel', 'settings', 'configure', 'system', 'add remove', 'options'],
    indexEntries: ['Control Panel', 'settings, system', 'configuring Windows'],
    body: `The Control Panel is where you adjust how Windows works. Open it from **Start**, then **Settings**, then **Control Panel**.

Double-click an icon to change that part of the system, for example:

- **Display** — wallpaper, screen saver, and colors. See [Display Properties](topic:display-properties).
- **Add/Remove Programs** — install a new program or uninstall one you no longer want.
- **Sounds** — choose which sound plays for events like starting up or emptying the Recycle Bin.
- **System** — view information about the computer and its hardware.

Note: For most everyday changes there is no need to come here — programs keep their own settings on an Options or Preferences menu.

> Related Topics:
- display-properties
- task-manager
- regedit`,
  },
  {
    id: 'task-manager',
    title: 'Task Manager',
    category: 'System',
    keywords: ['task manager', 'ctrl+alt+del', 'end task', 'not responding', 'close', 'processes'],
    indexEntries: ['Task Manager', 'ending a task', 'Ctrl+Alt+Del'],
    body: `Task Manager lists every program that is running and lets you close one that has stopped responding. Open it by pressing **Ctrl+Alt+Delete**, or [open Task Manager](app:task-manager) directly.

If a program is stuck:

1. Open Task Manager.
2. Find the program in the list. A frozen one is usually marked **not responding**.
3. Select it and click **End Task**.
4. Wait a moment — if the program does not close on its own, confirm that you want to end it.

Note: Ending a task discards any unsaved work in that program, so try to save first when you can. See [If Windows Stops Responding](topic:not-responding).

> Related Topics:
- not-responding
- improving-performance`,
  },
  {
    id: 'scandisk',
    title: 'ScanDisk',
    category: 'System',
    keywords: ['scandisk', 'disk', 'errors', 'repair', 'check', 'drive', 'maintenance'],
    indexEntries: ['ScanDisk', 'disk errors', 'checking a disk'],
    body: `ScanDisk checks drive C: for errors and repairs the ones it can. Run it now and then, and especially if the computer was turned off without shutting down properly.

To check your disk:

1. Open ScanDisk.
2. Choose the drive to check.
3. Pick **Standard** for a quick check of the files and folders, or **Thorough** to also test the disk surface (this takes longer).
4. Click **Start** and let it work.

When it finishes, ScanDisk reports what it found and fixed. For a disk that feels sluggish, follow up with [Disk Defragmenter](topic:defrag).

> Related Topics:
- defrag
- improving-performance`,
  },
  {
    id: 'defrag',
    title: 'Disk Defragmenter',
    category: 'System',
    keywords: ['defrag', 'defragmenter', 'disk', 'speed', 'optimize', 'fragmented', 'maintenance'],
    indexEntries: ['Disk Defragmenter', 'defragmenting', 'disk performance'],
    body: `Over time, files get scattered across the disk in pieces, and the drive works harder to gather them. Disk Defragmenter rearranges the pieces so each file sits in one place, which can make the computer feel quicker.

To defragment drive C::

1. Open Disk Defragmenter and choose the drive.
2. Click **Start**.
3. Watch the colored blocks reshuffle as files are tidied. You can keep using the computer, but it goes faster if you leave it alone.

Note: This is worth doing every so often, not every day. Pair it with [ScanDisk](topic:scandisk) as part of routine upkeep.

> Related Topics:
- scandisk
- improving-performance`,
  },
  {
    id: 'recycle-bin',
    title: 'The Recycle Bin',
    category: 'System',
    keywords: ['recycle bin', 'delete', 'restore', 'trash', 'empty', 'undelete'],
    indexEntries: ['Recycle Bin', 'restoring deleted files', 'emptying the Recycle Bin'],
    body: `When you delete a file it is not gone at once — it goes to the **Recycle Bin**, giving you a chance to change your mind.

To bring a file back:

1. Double-click the **Recycle Bin** on the desktop to open it.
2. Select the file you want to recover.
3. Right-click it and choose **Restore**. The file returns to the folder it came from.

To reclaim the space for good, right-click the Recycle Bin and choose **Empty Recycle Bin**. Note: once you empty it, those files really are gone, so look before you empty.

> Related Topics:
- files
- desktop`,
  },
  {
    id: 'find-files',
    title: 'Finding Files',
    category: 'System',
    keywords: ['find', 'search', 'files', 'locate', 'lost', 'folders'],
    indexEntries: ['finding files', 'searching for files', 'Find command'],
    body: `Misplaced a file? The Find tool searches the whole drive for you. Open it from **Start**, then **Find**, then **Files or Folders** — or [open Find now](app:find-files).

To search:

1. In the **Named** box, type all or part of the file's name.
2. To search by contents instead, type a word from inside the file in the **Containing text** box.
3. Click **Find Now**.

Matching files appear in the list below. Double-click one to open it, right where it was found.

> Related Topics:
- files
- explorer`,
  },
  {
    id: 'printing',
    title: 'Printing',
    category: 'System',
    keywords: ['print', 'printer', 'page', 'setup', 'paper', 'queue', 'spooler'],
    indexEntries: ['printing', 'printers', 'print queue'],
    body: `Most programs print from the **File** menu, or with **Ctrl+P**. Choose a printer, set the number of copies, and click OK.

1. On the **File** menu, click **Print**. Programs such as [Notepad](topic:notepad), Paint, and WordPad all print.
2. Pick a printer — the HP LaserJet 4L on LPT1: is a fine choice — set your page range and copies, then click **OK**.
3. While a document prints, a printer icon appears in the taskbar tray. Point to **Settings** on the Start menu and click **Printers** to watch the queue; you can pause or cancel documents there.
4. Finished pages are delivered to **C:\\My Documents\\Printed Documents**, where you can open and admire them.

Tip: Check **Print to file** in the Print dialog to produce a .prn file instead of printed pages, exactly as a real print shop would want.

> Related Topics:
- notepad
- files`,
  },

  // ----------------------------------------------------------- Troubleshooting
  {
    id: 'not-responding',
    title: 'If Windows Stops Responding',
    category: 'Troubleshooting',
    keywords: ['frozen', 'hang', 'not responding', 'stuck', 'crash', 'ctrl+alt+del', 'reboot'],
    indexEntries: ['Windows stops responding', 'frozen programs', 'hangs'],
    body: `Every so often a program stops responding and just sits there. Usually only that one program is stuck, and the rest of Windows is fine. Work through these steps in order:

1. **Wait a moment.** A busy program may simply be thinking. Give it a little time before deciding it is truly frozen.
2. **Close the stuck program.** Press **Ctrl+Alt+Delete** to open [Task Manager](topic:task-manager), select the program marked *not responding*, and click **End Task**.
3. **Save your other work.** With the offender closed, switch to your other programs and save, in case more trouble follows.
4. **Restart Windows** only if the whole screen stops responding. Use Start, then Shut Down, then Restart if you can; a proper restart is gentler than switching the power off.

Note: If the same program freezes again and again, it may need more memory to run comfortably — see [Improving Performance](topic:improving-performance).

> Related Topics:
- task-manager
- improving-performance
- error-messages`,
  },
  {
    id: 'improving-performance',
    title: 'Improving Performance',
    category: 'Troubleshooting',
    keywords: ['performance', 'slow', 'speed', 'memory', 'ram', 'faster', 'optimize'],
    indexEntries: ['performance, improving', 'slow computer', 'memory, adding'],
    body: `Is the computer feeling sluggish? A few steps can help it run more smoothly:

1. **Close programs you are not using.** Every open window uses memory; closing a few frees it for the rest.
2. **Tidy the disk.** Run [ScanDisk](topic:scandisk) to fix errors, then [Disk Defragmenter](topic:defrag) so files are quicker to read.
3. **Empty the [Recycle Bin](topic:recycle-bin)** to reclaim disk space.
4. **Restart** now and then. A fresh start clears out memory that programs forgot to give back.

Still not enough? The surest cure for a slow computer is **more RAM** (memory). More RAM means more programs can run at once without the disk grinding.

Note: You can order more from the popular site **www.downloadmoreram.com** — visit it in [Internet Explorer](app:ie5) and see for yourself how much faster your PC could be. (Results, as with much of the era's Web, may vary.)

> Related Topics:
- scandisk
- defrag
- not-responding`,
  },
  {
    id: 'year-2000',
    title: 'Preparing for the Year 2000',
    category: 'Troubleshooting',
    keywords: ['y2k', 'year 2000', 'millennium', 'bug', 'date', 'clock', 'two thousand'],
    indexEntries: ['Year 2000', 'Y2K', 'millennium bug'],
    body: `As the year 2000 approaches, you may have heard about the "millennium bug" — the worry that some older programs, which stored years as just two digits, will read "00" as 1900 instead of 2000.

To put your mind at ease:

1. **Check the clock.** Rest the pointer on the taskbar clock to confirm today's date is correct.
2. **Set the date if needed.** Double-click the clock to open the date and time, and make sure the year reads in full.
3. **Save your important files** before the New Year, as a sensible precaution — the same advice that is wise any night.

Note: Windows 98 itself understands four-digit years perfectly well. When midnight arrives, the most likely outcome is that the clock ticks over to the year 2000 and absolutely nothing else happens. Enjoy the fireworks.

> Related Topics:
- common-questions
- files`,
  },
  {
    id: 'error-messages',
    title: 'Understanding Error Messages',
    category: 'Troubleshooting',
    keywords: ['error', 'message', 'blue screen', 'warning', 'dialog', 'ok', 'illegal operation'],
    indexEntries: ['error messages', 'blue screen', 'warnings'],
    body: `From time to time a message box appears to tell you something. Do not panic — most are simply asking a question or reporting something ordinary.

- **A question** (Save changes? Are you sure?) waits for you to choose **Yes**, **No**, or **Cancel**. Read it, then answer.
- **An information message** (such as "There is no printer installed") is just letting you know. Click **OK** to dismiss it.
- **A warning** deserves a careful read before you click anything, especially in [Registry Editor](topic:regedit).

If the whole screen turns blue with white text, that is the famous blue screen. Press any key to continue, or restart if it will not respond. Note where it happened — if it keeps returning in one program, that program is the place to look.

> Related Topics:
- not-responding
- common-questions`,
  },
  {
    id: 'common-questions',
    title: 'Common Questions',
    category: 'Troubleshooting',
    keywords: ['questions', 'faq', 'modem', 'noise', 'sound', 'problems', 'normal', 'help'],
    indexEntries: ['common questions', 'frequently asked questions', 'modem noise'],
    body: `A few things that surprise newcomers, and why there is nothing to worry about:

- **My modem screeches when I go online.** That squeal and hiss is the modem dialing and shaking hands with the other end. It is completely normal. Once connected, it goes quiet.
- **The screen went blank on its own.** That is the [screen saver](topic:display-properties), waking after the computer sat idle. Move the mouse and everything returns.
- **I printed something but no paper came out of my monitor.** Printed pages are delivered to C:\\My Documents\\Printed Documents. See [Printing](topic:printing).
- **A program stopped responding.** Usually just that one program; see [If Windows Stops Responding](topic:not-responding).
- **A purple gorilla appeared and will not leave.** This is, unfortunately, also normal.

If you cannot find an answer here, browse the [Contents](topic:welcome) or try the **Search** tab with a word or two.

> Related Topics:
- not-responding
- error-messages
- printing`,
  },
];

// -------------------------------------------------------------- lookups / tree

export function getTopic(id: string): HelpTopic | undefined {
  return helpTopics.find((t) => t.id === id);
}

export function getTopicsByCategory(category: HelpCategory): HelpTopic[] {
  return helpTopics.filter((t) => t.category === category);
}

// ------------------------------------------------------------- inline markup

export type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'app'; text: string; target: string }
  | { type: 'topic'; text: string; target: string };

// Matches, in priority order: **bold**, *italic*, or [label](app:id) /
// [label](topic:id). App and topic ids are lowercase words with dashes, matching
// the ids used throughout the registry. Bold is tried before italic so that a
// "**" run is never mistaken for an empty italic pair.
const INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((app|topic):([a-z0-9-]+)\)/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > last) tokens.push({ type: 'text', text: text.slice(last, match.index) });
    if (match[1] !== undefined) {
      tokens.push({ type: 'bold', text: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ type: 'italic', text: match[2] });
    } else {
      const kind = match[4] as 'app' | 'topic';
      tokens.push({ type: kind, text: match[3], target: match[5] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', text: text.slice(last) });
  return tokens;
}

// -------------------------------------------------------------- block markup

export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'ordered'; items: string[] }
  | { type: 'related'; topicIds: string[] };

export function parseBlocks(body: string): HelpBlock[] {
  const raw = body.trim().split(/\n\s*\n/);
  return raw.map((block): HelpBlock => {
    const lines = block.split('\n');
    if (lines[0].trim().toLowerCase().startsWith('> related topics')) {
      const topicIds = lines
        .slice(1)
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
      return { type: 'related', topicIds };
    }
    if (lines.every((line) => line.startsWith('- '))) {
      return { type: 'list', items: lines.map((line) => line.slice(2)) };
    }
    if (lines.every((line) => /^\d+\.\s/.test(line))) {
      return { type: 'ordered', items: lines.map((line) => line.replace(/^\d+\.\s/, '')) };
    }
    return { type: 'paragraph', text: block };
  });
}

// The topic ids named in every "> Related Topics:" block of a body. Used both
// for rendering and for the content-validation test that catches typos.
export function parseRelatedTopics(body: string): string[] {
  return parseBlocks(body).flatMap((block) => (block.type === 'related' ? block.topicIds : []));
}

// ------------------------------------------------------------------- search

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function termMatches(topic: HelpTopic, term: string): boolean {
  return (
    topic.title.toLowerCase().includes(term) ||
    topic.keywords.some((keyword) => keyword.toLowerCase().includes(term)) ||
    topic.body.toLowerCase().includes(term)
  );
}

// Title hit outranks a keyword hit, which outranks a body-only mention.
function scoreTopic(topic: HelpTopic, terms: string[]): number {
  const title = topic.title.toLowerCase();
  const keywords = topic.keywords.map((keyword) => keyword.toLowerCase());
  const body = topic.body.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 100;
    if (keywords.some((keyword) => keyword === term)) score += 50;
    else if (keywords.some((keyword) => keyword.includes(term))) score += 25;
    if (body.includes(term)) score += 5;
  }
  return score;
}

// Rank by title > keyword > body. Prefer topics matching ALL query words; if
// none do, fall back to any word so a search never comes up empty by accident.
export function searchTopics(query: string, topics: HelpTopic[] = helpTopics): HelpTopic[] {
  const terms = tokenizeQuery(query);
  if (terms.length === 0) return [];
  let matched = topics.filter((topic) => terms.every((term) => termMatches(topic, term)));
  if (matched.length === 0) {
    matched = topics.filter((topic) => terms.some((term) => termMatches(topic, term)));
  }
  return matched
    .map((topic) => ({ topic, score: scoreTopic(topic, terms) }))
    .sort((a, b) => b.score - a.score || a.topic.title.localeCompare(b.topic.title))
    .map((entry) => entry.topic);
}

// -------------------------------------------------------------------- index

export interface IndexEntry {
  label: string;
  topicId: string;
}

// Flatten every topic's indexEntries into one alphabetical list. The same label
// can appear for more than one topic; each becomes its own row.
export function buildIndex(topics: HelpTopic[] = helpTopics): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const topic of topics) {
    for (const label of topic.indexEntries ?? []) {
      entries.push({ label, topicId: topic.id });
    }
  }
  return entries.sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
}

export function filterIndex(entries: IndexEntry[], filter: string): IndexEntry[] {
  const needle = filter.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => entry.label.toLowerCase().includes(needle));
}
