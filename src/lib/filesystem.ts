import { FSNode } from '@/types/filesystem';
import { resolvePathIn } from '@/lib/fs/fsOperations';

// ---------------------------------------------------------------------------
// First-run staged content. A fresh install lands the new owner on a desktop
// with a hand-written tour note, a starter homepage in My Documents, and a
// little mixtape Winamp can play. Everything the note points at is real and
// reachable in the code — no vaporware.
// ---------------------------------------------------------------------------

const DESKTOP_README = `           Hey — welcome to your new computer! :)

I set a few things up before I handed it over. Here's the good stuff,
roughly in the order I'd try it. Have fun. Don't break anything.
(Okay... maybe break one thing. Keep reading.)


  1. BUILD A ROLLER COASTER
     Start > Programs > Games > RollerCoaster Tycoon. Grab a piece of
     track and click on the ground to lay it down. Loop it back to the
     station and your ride opens for business.

  2. SKI UNTIL THE YETI FINDS YOU
     Start > Programs > Games > SkiFree. Point yourself downhill and
     don't stop. Somewhere down the mountain an Abominable Snow Monster
     turns up, and he is FAST. You can't outrun him. Nobody can.

  3. PRINT SOMETHING AND WATCH IT SPOOL
     Open Notepad (Start > Programs > Accessories), type a note, then
     File > Print. To watch the job go through the queue, open
     Start > Settings > Printers and double-click the printer.

  4. PUBLISH YOUR HOMEPAGE
     I left you a starter page: "My Homepage.htm" in My Documents. Open
     Microsoft FrontPage (Start > Programs), choose File > Open and pull
     it up from My Documents. Change whatever you want, then hit
     File > Publish Web. After that, keep an eye on AIM — someone always
     notices a new page.

  5. DELETE WINDOWS (IF YOU DARE)
     Start > Programs > MS-DOS Prompt. Type this and answer Y:

         deltree C:\\WINDOWS

     I'm not going to tell you what happens. Save your work first. Don't
     say I didn't warn you.

  6. RECORD YOUR OWN STARTUP SOUND
     Your own voice can greet you at boot. Open Sound Recorder
     (Start > Programs > Accessories > Multimedia), hit the red button,
     say something, and File > Save As a .wav. Then go to Start >
     Settings > Control Panel > Sounds, pick "Start Windows" from the
     list, click Browse, and choose your recording.

  7. THAT PASSWORD FILE
     There's a "passwords.txt" sitting in My Documents that you were
     absolutely not supposed to find. One of those passwords opens a
     locked share over in Network Neighborhood. I'll let you work out
     which one.

  8. PLAY THE MIXTAPE
     I burned you a few tracks — My Documents > My Mixtape. Double-click
     any of them and Winamp takes it from there. It really whips the
     llama's behind.

  9. CHECK YOUR MAIL
     There's a welcome message waiting in Outlook Express. The spam is
     worth reading for a laugh — but the one titled "ILOVEYOU" is
     trouble. You'll see.

 10. THE CLASSICS
     Minesweeper, Solitaire, FreeCell, Hearts and 3D Pinball are all
     under Start > Programs > Games. And if the screen ever goes quiet,
     the flying-through-space thing lives in Display Properties >
     Screen Saver > Preview.


That's the tour. The rest you'll find on your own.

                                                      - a friend
`;

const MY_HOMEPAGE_HTML = `<html>
<head>
  <title>Welcome to My Homepage!</title>
</head>
<body bgcolor="#000000" text="#00FF00">
  <center>
    <h1><font color="#FFFF00" face="Comic Sans MS">~*~ Welcome 2 My Homepage ~*~</font></h1>
    <marquee behavior="alternate"><font color="#FF00FF">*** Under Construction *** Best viewed at 800x600 *** Sign my guestbook! ***</font></marquee>
    <hr>
    <p><font face="Arial" size="3">Hi and welcome to my little corner of the World Wide Web!</font></p>
    <h2><font color="#00FFFF">About Me</font></h2>
    <ul>
      <li>Got this computer brand new and it RULES</li>
      <li>Favorite band: whatever's on TRL</li>
      <li>Favorite site: <a href="http://www.geocities.com">GeoCities</a></li>
    </ul>
    <h2><font color="#00FFFF">My Cool Links</font></h2>
    <p>
      <a href="http://www.yahoo.com">Yahoo!</a> |
      <a href="http://www.altavista.com">AltaVista</a> |
      <a href="http://www.hampsterdance.com">The Hampster Dance</a>
    </p>
    <hr>
    <p><font size="1">You are visitor number 000001</font></p>
    <p><font size="1">This page hosted by GeoCities. Get your own free homepage today!</font></p>
  </center>
</body>
</html>`;

export const virtualFileSystem: FSNode = {
  name: 'C:',
  type: 'directory',
  icon: '/icons/drive-16.svg',
  created: '1998-06-25',
  modified: '1999-03-14',
  children: [
    {
      name: 'My Documents',
      type: 'directory',
      icon: '/icons/my-documents-16.svg',
      created: '1998-06-25',
      modified: '1999-03-10',
      children: [
        {
          name: 'My Pictures',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-07-01',
          modified: '1999-02-14',
          children: [
            { name: 'vacation.bmp', type: 'file', icon: '/icons/image-16.svg', created: '1999-01-15', modified: '1999-01-15', size: 1572864, content: '[Bitmap Image - 1024x768]' },
            { name: 'family.bmp', type: 'file', icon: '/icons/image-16.svg', created: '1999-02-14', modified: '1999-02-14', size: 2359296, content: '[Bitmap Image - 1280x960]' },
          ],
        },
        {
          name: 'Downloads',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1999-01-01',
          modified: '1999-03-14',
          children: [],
        },
        { name: 'letter.doc', type: 'file', icon: '/icons/doc-16.svg', created: '1999-03-01', modified: '1999-03-10', size: 28672, content: 'Dear Sir/Madam,\n\nI am writing to inform you that my Y2K preparations are complete. I have stockpiled 47 cans of beans and printed out the entire internet.\n\nSincerely,\nA Concerned Citizen' },
        { name: 'budget.xls', type: 'file', icon: '/icons/xls-16.svg', created: '1999-02-20', modified: '1999-03-05', size: 45056, content: '[Excel Spreadsheet]' },
        { name: 'readme.txt', type: 'file', icon: '/icons/txt-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1024, content: 'Welcome to Windows 98!\n\nThis is your My Documents folder.\nYou can store your personal files here.' },
        { name: 'passwords.txt', type: 'file', icon: '/icons/txt-16.svg', created: '1999-01-04', modified: '1999-03-12', size: 512, content: 'My Passwords - KEEP SECRET\n\nAOL: CoolDad1962 / goldenretriever\nHotmail: dad_1962@hotmail.com / buster1988\nCompuServe: 70210,244 / access99\nATM PIN: 4592\ndads secret share: hunter2' },
        // Starter homepage the README points at — opened/edited in FrontPage
        // (File > Open), then Publish Web mirrors it into IE5's GeoCities page.
        { name: 'My Homepage.htm', type: 'file', icon: '/icons/ie-16.svg', created: '1999-03-13', modified: '1999-03-14', size: MY_HOMEPAGE_HTML.length, content: MY_HOMEPAGE_HTML },
        {
          name: 'My Mixtape',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1999-03-14',
          modified: '1999-03-14',
          children: [
            // 'track:<id>' content resolves to a real bundled track in tracks.ts
            // via Winamp's resolveTrackFromContent, so these actually play.
            { name: '01 - Dial-Up Dreams.mp3', type: 'file', icon: '/icons/winamp-16.svg', created: '1999-03-14', modified: '1999-03-14', size: 2883584, content: 'track:dial-up-dreams' },
            { name: '02 - Midnight MIDI.mp3', type: 'file', icon: '/icons/winamp-16.svg', created: '1999-03-14', modified: '1999-03-14', size: 3014656, content: 'track:midnight-midi' },
            { name: '03 - Screensaver Groove.mp3', type: 'file', icon: '/icons/winamp-16.svg', created: '1999-03-14', modified: '1999-03-14', size: 2752512, content: 'track:screensaver-groove' },
            { name: '04 - Y2K Panic.mp3', type: 'file', icon: '/icons/winamp-16.svg', created: '1999-03-14', modified: '1999-03-14', size: 3145728, content: 'track:y2k-panic' },
          ],
        },
      ],
    },
    {
      name: 'Program Files',
      type: 'directory',
      icon: '/icons/folder-16.svg',
      created: '1998-06-25',
      modified: '1999-01-20',
      children: [
        {
          name: 'Accessories',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1998-06-25',
          children: [
            { name: 'WORDPAD.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 196608 },
            { name: 'CALC.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 114688 },
            { name: 'MSPAINT.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 344064 },
          ],
        },
        {
          name: 'Internet Explorer',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-01-20',
          children: [
            { name: 'IEXPLORE.EXE', type: 'file', icon: '/icons/ie-16.svg', created: '1998-06-25', modified: '1999-01-20', size: 77824 },
            { name: 'CONNECTION WIZARD', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
          ],
        },
        {
          name: 'Windows Media Player',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1998-06-25',
          children: [
            { name: 'WMPLAYER.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 278528 },
          ],
        },
      ],
    },
    {
      name: 'Windows',
      type: 'directory',
      icon: '/icons/folder-16.svg',
      created: '1998-06-25',
      modified: '1999-03-14',
      children: [
        {
          name: 'System',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-03-14',
          children: [
            { name: 'KERNEL32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 413696, readOnly: true },
            { name: 'USER32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 401408, readOnly: true },
            { name: 'GDI32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 225280, readOnly: true },
            { name: 'SHELL32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1306624, readOnly: true },
            { name: 'ADVAPI32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 163840, readOnly: true },
          ],
        },
        {
          name: 'Fonts',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1998-06-25',
          children: [
            { name: 'ARIAL.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 266076 },
            { name: 'TIMES.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 326068 },
            { name: 'COUR.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 262740 },
            { name: 'TAHOMA.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 288872 },
          ],
        },
        {
          name: 'Desktop',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-03-14',
          children: [
            // Surfaces as a desktop icon (Desktop.tsx lists this dir); opens in
            // Notepad via the .txt association.
            { name: 'README - START HERE.txt', type: 'file', icon: '/icons/txt-16.svg', created: '1999-03-14', modified: '1999-03-14', size: DESKTOP_README.length, content: DESKTOP_README },
          ],
        },
        {
          name: 'Start Menu',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-01-10',
          children: [
            {
              name: 'Programs',
              type: 'directory',
              icon: '/icons/folder-16.svg',
              created: '1998-06-25',
              modified: '1999-01-10',
              children: [
                { name: 'Accessories', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
                { name: 'Games', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
                { name: 'StartUp', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
              ],
            },
          ],
        },
        { name: 'NOTEPAD.EXE', type: 'file', icon: '/icons/notepad-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 53248 },
        { name: 'EXPLORER.EXE', type: 'file', icon: '/icons/explorer-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 204800 },
        { name: 'WIN.INI', type: 'file', icon: '/icons/ini-16.svg', created: '1998-06-25', modified: '1999-03-14', size: 2048, content: '[windows]\nload=\nrun=\nNullPort=None\n\n[Desktop]\nWallpaper=(None)\nTileWallpaper=0' },
        { name: 'SYSTEM.INI', type: 'file', icon: '/icons/ini-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1536, content: '[boot]\nshell=Explorer.exe\nsystem.drv=system.drv\ndrivers=mmsystem.dll' },
      ],
    },
    {
      name: 'TEMP',
      type: 'directory',
      icon: '/icons/folder-16.svg',
      created: '1998-06-25',
      modified: '1999-03-14',
      children: [],
    },
    { name: 'AUTOEXEC.BAT', type: 'file', icon: '/icons/bat-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 512, content: '@ECHO OFF\nPROMPT $p$g\nSET TEMP=C:\\TEMP\nSET TMP=C:\\TEMP\nPATH C:\\WINDOWS;C:\\WINDOWS\\COMMAND' },
    { name: 'CONFIG.SYS', type: 'file', icon: '/icons/sys-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 256, content: 'DEVICE=C:\\WINDOWS\\HIMEM.SYS\nDEVICE=C:\\WINDOWS\\EMM386.EXE\nDOS=HIGH,UMB\nFILES=60\nBUFFERS=40' },
    { name: 'IO.SYS', type: 'file', icon: '/icons/sys-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 222390, readOnly: true },
    { name: 'MSDOS.SYS', type: 'file', icon: '/icons/sys-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1536, readOnly: true },
  ],
};

export function resolvePath(path: string): FSNode | null {
  return resolvePathIn(virtualFileSystem, path);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return `${kb.toLocaleString()}KB`;
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${mb}MB`;
}

export function getParentPath(path: string): string {
  const normalized = path.replace(/\//g, '\\').replace(/\\+$/, '');
  const lastSlash = normalized.lastIndexOf('\\');
  if (lastSlash <= 2) return 'C:\\';
  return normalized.substring(0, lastSlash);
}

// ---------------------------------------------------------------------------
// Network Neighborhood — a fake LAN that lives OUTSIDE the C: drive.
//
// Path representation: shares are addressed UNC-style, e.g.
// `\\DADS-COMPUTER\shared\taxes_1997.xls`. `normalizePath` folds a UNC path
// into `C:\DADS-COMPUTER\shared\...`, so after normalization the first segment
// is always the machine name. `resolveNetworkPath` walks `networkFileSystem`
// (whose children are exactly the machines) using that same normalization, and
// returns null for anything that isn't a network path. FileSystemContext.getNode
// consults it before the C: root, which lets every content-consuming app
// (Notepad, Winamp, Paint, WordPad, Excel) open network files through the
// normal openFile → association → readFile pipeline with zero app changes.
//
// Because this tree is a separate static export it is (a) invisible to Explorer
// and the desktop — nothing ever lists it as a child of C: — and (b) always
// present regardless of the persisted localStorage filesystem, so returning
// users get the LAN too. A machine name can never collide with a real C: child,
// so C: paths always fall through to the real root untouched.
// ---------------------------------------------------------------------------

function svgPhoto(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

// Tiny "pixel-art" family photos, authored as SVGs so Paint can open them.
const PHOTO_BACKYARD = svgPhoto(`
  <svg xmlns='http://www.w3.org/2000/svg' width='96' height='72' shape-rendering='crispEdges'>
    <rect width='96' height='72' fill='#8ec7e8'/>
    <rect y='50' width='96' height='22' fill='#5aa02c'/>
    <circle cx='80' cy='16' r='9' fill='#f7d708'/>
    <rect x='24' y='30' width='34' height='22' fill='#c9824f'/>
    <polygon points='20,30 62,30 41,14' fill='#8f3722'/>
    <rect x='36' y='40' width='10' height='12' fill='#5a3b21'/>
    <rect x='28' y='34' width='8' height='8' fill='#bfe6f5'/>
    <rect x='48' y='34' width='8' height='8' fill='#bfe6f5'/>
  </svg>`);

const PHOTO_BIRTHDAY = svgPhoto(`
  <svg xmlns='http://www.w3.org/2000/svg' width='96' height='72' shape-rendering='crispEdges'>
    <rect width='96' height='72' fill='#efe4cf'/>
    <rect x='26' y='36' width='44' height='24' fill='#f4a7c0'/>
    <rect x='26' y='30' width='44' height='8' fill='#ffffff'/>
    <rect x='36' y='16' width='3' height='14' fill='#4a7fd0'/>
    <rect x='56' y='16' width='3' height='14' fill='#4a7fd0'/>
    <circle cx='37.5' cy='14' r='3' fill='#ffcf3f'/>
    <circle cx='57.5' cy='14' r='3' fill='#ffcf3f'/>
    <rect x='46' y='16' width='3' height='14' fill='#4a7fd0'/>
    <circle cx='47.5' cy='14' r='3' fill='#ffcf3f'/>
  </svg>`);

const PHOTO_FISHING = svgPhoto(`
  <svg xmlns='http://www.w3.org/2000/svg' width='96' height='72' shape-rendering='crispEdges'>
    <rect width='96' height='72' fill='#a9dcef'/>
    <rect y='44' width='96' height='28' fill='#2f6f8f'/>
    <circle cx='18' cy='16' r='7' fill='#f7d708'/>
    <rect x='40' y='24' width='4' height='26' fill='#6b4423'/>
    <line x1='44' y1='26' x2='66' y2='48' stroke='#333' stroke-width='1'/>
    <circle cx='30' cy='32' r='4' fill='#3a3a3a'/>
    <rect x='26' y='36' width='8' height='12' fill='#264d99'/>
    <ellipse cx='70' cy='52' rx='6' ry='3' fill='#c96'/>
  </svg>`);

export const networkFileSystem: FSNode = {
  name: 'Network',
  type: 'directory',
  icon: '/icons/network-16.svg',
  created: '1998-06-25',
  modified: '1999-03-14',
  children: [
    {
      name: 'DADS-COMPUTER',
      type: 'directory',
      icon: '/icons/my-computer-16.svg',
      created: '1998-06-25',
      modified: '1999-03-14',
      children: [
        {
          name: 'shared',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-08-01',
          modified: '1999-03-12',
          children: [
            { name: 'DO-NOT-OPEN.txt', type: 'file', icon: '/icons/txt-16.svg', readOnly: true, created: '1999-02-01', modified: '1999-03-12', size: 42, content: "I know you're reading this. Dinner at 6." },
            { name: 'taxes_1997.xls', type: 'file', icon: '/icons/xls-16.svg', readOnly: true, created: '1998-04-13', modified: '1998-04-14', size: 18432, content: '[Microsoft Excel]\n\nDEDUCTIONS\n  Home office (the whole basement)....... $4,000\n  "Business lunches"..................... $3,120\n  New golf clubs (client relations)...... $899\n  Dial-up internet (essential).......... $251.40\n\nREFUND EXPECTED: a lot\nNOTE: do NOT let the accountant see the golf thing' },
            { name: 'solitaire_tips.doc', type: 'file', icon: '/icons/doc-16.svg', readOnly: true, created: '1999-01-20', modified: '1999-01-20', size: 6144, content: "DAD'S UNBEATABLE SOLITAIRE STRATEGY\n\n1. Always move aces up first. Always.\n2. Don't empty a column unless you have a King ready.\n3. If you're stuck, right-click to see if you missed a move.\n4. Timed games are for showoffs.\n5. If all else fails, deal again. Nobody is watching.\n\nWin rate since retirement: 61%" },
          ],
        },
        {
          name: 'photos',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-08-01',
          modified: '1999-02-14',
          children: [
            { name: 'backyard_bbq.bmp', type: 'file', icon: '/icons/image-16.svg', readOnly: true, created: '1998-07-04', modified: '1998-07-04', size: 4096, content: PHOTO_BACKYARD },
            { name: 'your_birthday.bmp', type: 'file', icon: '/icons/image-16.svg', readOnly: true, created: '1998-09-12', modified: '1998-09-12', size: 4096, content: PHOTO_BIRTHDAY },
            { name: 'fishing_trip.bmp', type: 'file', icon: '/icons/image-16.svg', readOnly: true, created: '1998-06-20', modified: '1998-06-20', size: 4096, content: PHOTO_FISHING },
          ],
        },
        {
          name: 'SECRET-SHARE',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-12-24',
          modified: '1999-03-01',
          children: [
            { name: 'secret_song.mp3', type: 'file', icon: '/icons/winamp-16.svg', readOnly: true, created: '1999-02-28', modified: '1999-02-28', size: 3145728, content: 'track:compuserve-sunset' },
            { name: 'im_proud_of_you.txt', type: 'file', icon: '/icons/txt-16.svg', readOnly: true, created: '1999-03-01', modified: '1999-03-01', size: 320, content: "If you found this, you figured out the password. I always knew you were clever.\n\nI'm proud of you. Not for cracking my password — for everything else.\n\nGo easy on your mother about the phone bill.\n\n- Dad" },
          ],
        },
      ],
    },
    {
      name: 'FAMILY-PC',
      type: 'directory',
      icon: '/icons/my-computer-16.svg',
      created: '1998-06-25',
      modified: '1999-03-14',
      children: [
        {
          name: 'homework',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-09-08',
          modified: '1999-03-10',
          children: [
            { name: 'homework.doc', type: 'file', icon: '/icons/doc-16.svg', readOnly: true, created: '1999-03-09', modified: '1999-03-10', size: 5120, content: 'History Report - by Kevin\n\nThe Civil War was started because of a lot of reasons. The first reason was that the North and the South did not agree on things. Also there was' },
            { name: 'book_report_FINAL_v2_REAL.doc', type: 'file', icon: '/icons/doc-16.svg', readOnly: true, created: '1999-02-15', modified: '1999-02-16', size: 7168, content: 'Book Report: "The Giver"\n\nby Kevin\n\nThe Giver is a book about a boy named Jonas who lives in a community with no color. I would rate this book 4 out of 5 stars.\n\n(Mrs. Peterson, if you are reading this, I really did read the whole book and not just the back cover.)' },
          ],
        },
        {
          name: 'mp3s',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1999-01-05',
          modified: '1999-03-14',
          children: [
            { name: 'best_song_ever.mp3', type: 'file', icon: '/icons/winamp-16.svg', readOnly: true, created: '1999-03-01', modified: '1999-03-01', size: 2621440, content: 'track:y2k-panic' },
            { name: 'download_dont_tell_mom.mp3', type: 'file', icon: '/icons/winamp-16.svg', readOnly: true, created: '1999-03-14', modified: '1999-03-14', size: 3670016, content: 'track:pentium-power' },
          ],
        },
      ],
    },
  ],
};

/** UNC keys ("HOST\\SHARE") that require a password, and the password itself. */
export const networkSharePasswords: Record<string, string> = {
  'DADS-COMPUTER\\SECRET-SHARE': 'hunter2',
};

/**
 * Resolve a network (UNC or normalized `C:\<machine>\...`) path against the
 * network filesystem. Returns null when the path isn't a network path, so
 * callers can fall through to the real C: root. Never resolves the bare root.
 */
export function resolveNetworkPath(path: string): FSNode | null {
  const parts = path
    .replace(/\//g, '\\')
    .replace(/\\+/g, '\\')
    .replace(/^C:\\?/i, '')
    .replace(/^\\+/, '')
    .split('\\')
    .filter(Boolean);
  if (parts.length === 0) return null;
  return resolvePathIn(networkFileSystem, `C:\\${parts.join('\\')}`);
}
