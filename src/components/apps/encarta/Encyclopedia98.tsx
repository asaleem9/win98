'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { standardFileMenu, standardEditMenu } from '@/lib/menus';
import { usePrint } from '@/components/dialogs/PrintDialog';
import { setClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/cn';
import {
  ARTICLES,
  CATEGORIES,
  getArticle,
  getCategory,
  articlesInCategory,
  type Article,
  type CategoryId,
} from './articles';
import { searchArticles } from './search';
import { articleOfDay } from './articleOfDay';
import { Illustration } from './illustrations';
import {
  createHistory,
  push,
  back,
  forward,
  current as currentLocation,
  canGoBack,
  canGoForward,
  type Location,
} from './navHistory';
import { TriviaGame } from './TriviaGame';

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function ToolButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center gap-1 px-2 h-[20px] text-[11px] border border-transparent select-none',
        disabled
          ? 'text-[var(--win98-disabled-text)]'
          : 'hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)] hover:border-b-[var(--win98-button-shadow)] hover:border-r-[var(--win98-button-shadow)] active:border-t-[var(--win98-button-shadow)] active:border-l-[var(--win98-button-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-pointer',
      )}
    >
      {children}
    </button>
  );
}

const insetPanel =
  'border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]';

function SeeAlsoChips({ ids, onOpen }: { ids: string[]; onOpen: (id: string) => void }) {
  const links = ids.map(getArticle).filter((a): a is Article => !!a);
  if (links.length === 0) return null;
  return (
    <div className="mt-4 pt-2 border-t border-[#c8c8b0]">
      <div className="text-[10px] uppercase tracking-wide text-[#666] mb-1">See also</div>
      <div className="flex flex-wrap gap-1">
        {links.map((a) => (
          <button
            key={a.id}
            onClick={() => onOpen(a.id)}
            className="px-2 py-[2px] text-[11px] bg-[#eef3ff] border border-[#7a90c8] text-[#1a3a8a] hover:bg-[#dbe6ff] cursor-pointer rounded-[1px]"
          >
            {a.title} &rsaquo;
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function ArticleView({ article, onOpen }: { article: Article; onOpen: (id: string) => void }) {
  const cat = getCategory(article.category);
  return (
    <div className="p-4 max-w-[560px]">
      <div className="text-[10px] uppercase tracking-wide text-[#8a6a2a] font-bold">{cat?.name}</div>
      <h1 className="font-serif text-[26px] leading-tight text-[#1a2a5a] border-b-2 border-[#c0a060] pb-1 mb-3">
        {article.title}
      </h1>

      {article.factbox && (
        <div className={cn('float-right ml-3 mb-2 w-[150px] bg-[#f6f2e2] p-2', 'border border-[#c0a060]')}>
          <div className="text-[10px] font-bold text-[#8a6a2a] uppercase mb-1 border-b border-[#d8c890] pb-[2px]">
            Quick Facts
          </div>
          {article.factbox.map((f) => (
            <div key={f.label} className="text-[10px] mb-[3px] leading-tight">
              <span className="text-[#666]">{f.label}: </span>
              <span className="font-bold text-[#333]">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {article.body.map((para, i) => (
        <p
          key={i}
          className={cn(
            'text-[12px] leading-[1.55] text-[#1a1a1a] mb-3',
            i === 0 &&
              'first-letter:float-left first-letter:font-serif first-letter:text-[38px] first-letter:leading-[0.82] first-letter:pr-[3px] first-letter:pt-[2px] first-letter:text-[#1a2a5a] first-letter:font-bold',
          )}
        >
          {para}
        </p>
      ))}

      {article.media && (
        <figure className="clear-both my-3 bg-white border border-[#a0a0a0] p-2 shadow-[2px_2px_0_#c8c8b0]">
          <Illustration name={article.media.illustration} />
          <figcaption className="text-[10px] italic text-[#555] mt-2 px-1 leading-snug">
            {article.media.caption}
          </figcaption>
        </figure>
      )}

      <SeeAlsoChips ids={article.seeAlso} onOpen={onOpen} />
    </div>
  );
}

function ArticleList({
  title,
  articles,
  onOpen,
  emptyText,
}: {
  title: string;
  articles: Article[];
  onOpen: (id: string) => void;
  emptyText?: string;
}) {
  return (
    <div className="p-3">
      <h2 className="font-serif text-[18px] text-[#1a2a5a] border-b border-[#c0a060] pb-1 mb-2">{title}</h2>
      {articles.length === 0 ? (
        <div className="text-[11px] text-[#666] italic p-2">{emptyText ?? 'No articles found.'}</div>
      ) : (
        <div className="flex flex-col">
          {articles.map((a) => (
            <button
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="text-left px-2 py-[5px] border-b border-[#e4e4d4] hover:bg-[#dbe6ff] cursor-pointer group"
            >
              <div className="flex items-baseline gap-1">
                <span className="text-[#c0a060] group-hover:text-[#8a6a2a]">&#128196;</span>
                <span className="text-[12px] font-bold text-[#1a3a8a] group-hover:underline">{a.title}</span>
              </div>
              <div className="text-[10px] text-[#555] leading-snug ml-4">{a.summary}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HomeView({
  onOpen,
  onCategory,
  onTrivia,
}: {
  onOpen: (id: string) => void;
  onCategory: (id: CategoryId) => void;
  onTrivia: () => void;
}) {
  const featured = useMemo(() => articleOfDay(ARTICLES, new Date()), []);
  return (
    <div className="p-0">
      {/* Marble / globe splash banner */}
      <div
        className="relative px-4 py-5 text-white overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, #3a5a9a 0%, #1a2a5a 45%, #0e1636 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[40px] drop-shadow-[2px_2px_0_rgba(0,0,0,0.4)]" aria-hidden>&#127760;</span>
          <div>
            <div className="font-serif text-[24px] leading-none tracking-wide drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
              Encyclopedia <span className="text-[#e8c874]">98</span>
            </div>
            <div className="text-[11px] text-[#b8c8f0] italic">The Complete Multimedia Reference &mdash; 1998 Edition</div>
          </div>
        </div>
        <div className="text-[10px] text-[#95a8d8] mt-2">{ARTICLES.length} articles &bull; 7 subjects &bull; MindMaze trivia</div>
      </div>

      <div className="p-4">
        {/* Article of the Day */}
        <div className="bg-[#f6f2e2] border border-[#c0a060] p-3 mb-4 shadow-[2px_2px_0_#d8d0b0]">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#8a6a2a] font-bold mb-1">
            <span aria-hidden>&#9733;</span> Article of the Day
          </div>
          <button onClick={() => onOpen(featured.id)} className="text-left cursor-pointer group">
            <div className="font-serif text-[18px] text-[#1a2a5a] group-hover:underline">{featured.title}</div>
            <div className="text-[11px] text-[#444] leading-snug mt-[2px]">{featured.summary}</div>
            <div className="text-[10px] text-[#1a3a8a] mt-1 group-hover:underline">Read the full article &rsaquo;</div>
          </button>
        </div>

        {/* Category grid */}
        <div className="text-[11px] font-bold text-[#333] mb-2">Explore the Encyclopedia</div>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCategory(c.id)}
              className={cn('text-left p-2 bg-white hover:bg-[#dbe6ff] cursor-pointer', insetPanel)}
            >
              <div className="text-[12px] font-bold text-[#1a3a8a]">{c.name}</div>
              <div className="text-[10px] text-[#555] leading-snug">{c.blurb}</div>
            </button>
          ))}
        </div>

        <button
          onClick={onTrivia}
          className="mt-3 w-full p-2 text-left bg-[#2a1a4a] text-white hover:bg-[#3a2a5a] cursor-pointer border border-[#6a5a9a]"
        >
          <div className="flex items-center gap-2">
            <span className="text-[20px]" aria-hidden>&#127983;</span>
            <div>
              <div className="text-[12px] font-bold text-[#e8c874] font-serif">Enter the MindMaze</div>
              <div className="text-[10px] text-[#c8b8e8]">Ten questions from across the encyclopedia. Can you escape the castle?</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Encyclopedia98({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const { openPrint, printDialog } = usePrint(windowId, 'Encyclopedia 98');

  const [history, setHistory] = useState(() => createHistory());
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState('Ready');
  const [showAbout, setShowAbout] = useState(false);
  const [findTick, setFindTick] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const loc = currentLocation(history);

  const go = useCallback((location: Location) => {
    setHistory((h) => push(h, location));
  }, []);

  const openArticle = useCallback(
    (id: string) => {
      const a = getArticle(id);
      if (!a) return;
      go({ kind: 'article', articleId: id });
      setStatus(a.title);
    },
    [go],
  );

  const openCategory = useCallback(
    (id: CategoryId) => {
      go({ kind: 'category', categoryId: id });
      setStatus(getCategory(id)?.name ?? 'Category');
    },
    [go],
  );

  const goHome = useCallback(() => {
    go({ kind: 'home' });
    setStatus('Home');
  }, [go]);

  const goTrivia = useCallback(() => {
    go({ kind: 'trivia' });
    setStatus('MindMaze Trivia');
  }, [go]);

  const runSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      go({ kind: 'search', query: q });
      setStatus(`Search: ${q}`);
    },
    [go],
  );

  const activeArticle = loc.kind === 'article' ? getArticle(loc.articleId) : undefined;

  // Plain handlers (the compiler auto-memoizes): the active article is an object
  // that flows into the rendered view, which the React Compiler cannot reconcile
  // with manual memoization here — so we let it do the work.
  const copyArticle = () => {
    if (!activeArticle) {
      setStatus('Open an article first to copy it.');
      return;
    }
    const seeAlso = activeArticle.seeAlso
      .map((id) => getArticle(id)?.title)
      .filter(Boolean)
      .join(', ');
    const text = [
      activeArticle.title.toUpperCase(),
      '',
      ...activeArticle.body,
      seeAlso ? `\nSee also: ${seeAlso}` : '',
      '\nFrom Encyclopedia 98 (1998 Edition)',
    ].join('\n');
    setClipboard({ kind: 'text', text });
    setStatus(`Copied "${activeArticle.title}" to the Clipboard.`);
  };

  const printArticle = () => {
    if (!activeArticle) {
      setStatus('Open an article first to print it.');
      return;
    }
    const bodyHtml = activeArticle.body.map((p) => `<p>${p}</p>`).join('');
    const html = `<h1>${activeArticle.title}</h1><p><em>Encyclopedia 98 &mdash; ${getCategory(activeArticle.category)?.name}</em></p>${bodyHtml}`;
    openPrint(() => ({ kind: 'html', html }), activeArticle.title);
  };

  // Focus is requested by bumping a tick; the effect does the ref work, keeping
  // ref access out of render (and out of the menus built during it).
  const focusSearch = useCallback(() => setFindTick((n) => n + 1), []);
  useEffect(() => {
    if (findTick === 0) return;
    searchRef.current?.focus();
    searchRef.current?.select();
  }, [findTick]);

  // --- Menus ---------------------------------------------------------------
  const menus: MenuDefinition[] = [
    standardFileMenu({ onPrint: printArticle, onExit: () => closeWindow(windowId) }),
    standardEditMenu({ onCopy: copyArticle, onFind: focusSearch }),
    {
      label: '&Go',
      items: [
        { label: '&Home', onClick: goHome },
        { label: '&Back', shortcut: 'Alt+Left', onClick: () => setHistory(back), disabled: !canGoBack(history) },
        { label: '&Forward', shortcut: 'Alt+Right', onClick: () => setHistory(forward), disabled: !canGoForward(history) },
      ],
    },
    {
      label: '&Tools',
      items: [{ label: '&MindMaze Trivia...', onClick: goTrivia }],
    },
    {
      label: '&Help',
      items: [
        { label: 'Encyclopedia &Contents', onClick: goHome },
        { label: '', separator: true },
        { label: '&About Encyclopedia 98...', onClick: () => setShowAbout(true) },
      ],
    },
  ];

  // --- Keyboard shortcuts (within the app) ---------------------------------
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setHistory(back);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setHistory(forward);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        focusSearch();
      }
    },
    [focusSearch],
  );

  // --- Main content --------------------------------------------------------
  let content: React.ReactNode;
  if (loc.kind === 'home') {
    content = <HomeView onOpen={openArticle} onCategory={openCategory} onTrivia={goTrivia} />;
  } else if (loc.kind === 'trivia') {
    content = <TriviaGame windowId={windowId} onOpenArticle={openArticle} onExit={goHome} />;
  } else if (loc.kind === 'category') {
    const cat = getCategory(loc.categoryId as CategoryId);
    content = (
      <ArticleList
        title={cat?.name ?? 'Category'}
        articles={articlesInCategory(loc.categoryId as CategoryId)}
        onOpen={openArticle}
      />
    );
  } else if (loc.kind === 'search') {
    const results = searchArticles(ARTICLES, loc.query);
    content = (
      <ArticleList
        title={`Search results for "${loc.query}"`}
        articles={results.map((r) => r.article)}
        onOpen={openArticle}
        emptyText={`No articles matched "${loc.query}". Try another word.`}
      />
    );
  } else if (activeArticle) {
    content = <ArticleView article={activeArticle} onOpen={openArticle} />;
  } else {
    content = <div className="p-4 text-[11px] text-[#666]">Article not found.</div>;
  }

  const activeCategory =
    loc.kind === 'category'
      ? (loc.categoryId as CategoryId)
      : activeArticle
        ? activeArticle.category
        : null;

  return (
    <div
      className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]"
      onKeyDown={onKeyDown}
    >
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar */}
      <div className="flex items-center gap-[2px] px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <ToolButton title="Back" onClick={() => setHistory(back)} disabled={!canGoBack(history)}>
          <span aria-hidden>&larr;</span> Back
        </ToolButton>
        <ToolButton title="Forward" onClick={() => setHistory(forward)} disabled={!canGoForward(history)}>
          Forward <span aria-hidden>&rarr;</span>
        </ToolButton>
        <div className="w-[1px] h-[16px] bg-[var(--win98-button-shadow)] mx-1" />
        <ToolButton title="Home" onClick={goHome}>
          <span aria-hidden>&#127968;</span> Home
        </ToolButton>
        <ToolButton title="Print this article" onClick={printArticle} disabled={!activeArticle}>
          <span aria-hidden>&#128424;</span> Print
        </ToolButton>
        <div className="flex-1" />
        <input
          ref={searchRef}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch(searchText);
          }}
          placeholder="Search articles..."
          className={cn('w-[130px] px-1 py-[1px] text-[11px] outline-none bg-white', insetPanel)}
        />
        <ToolButton title="Search" onClick={() => runSearch(searchText)}>
          <span aria-hidden>&#128269;</span>
        </ToolButton>
      </div>

      {/* Body: category rail + content */}
      <div className="flex-1 flex min-h-0">
        {/* Left navigation rail */}
        <div className={cn('w-[132px] shrink-0 bg-white overflow-auto m-1 mr-0', insetPanel)}>
          <div className="bg-[#1a2a5a] text-white text-[11px] font-bold px-2 py-1 font-serif">Contents</div>
          <button
            onClick={goHome}
            className={cn(
              'w-full text-left px-2 py-[3px] text-[11px] hover:bg-[#dbe6ff] cursor-pointer flex items-center gap-1',
              loc.kind === 'home' && 'bg-[#000080] text-white hover:bg-[#000080]',
            )}
          >
            <span aria-hidden>&#127968;</span> Home
          </button>
          <div className="text-[9px] uppercase tracking-wide text-[#888] px-2 pt-2 pb-[2px]">Subjects</div>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => openCategory(c.id)}
              className={cn(
                'w-full text-left px-2 py-[3px] text-[11px] hover:bg-[#dbe6ff] cursor-pointer flex items-center gap-1',
                activeCategory === c.id && 'bg-[#000080] text-white hover:bg-[#000080]',
              )}
            >
              <span className="text-[#c0a060]" aria-hidden>&#9632;</span> {c.name}
            </button>
          ))}
          <div className="text-[9px] uppercase tracking-wide text-[#888] px-2 pt-2 pb-[2px]">Features</div>
          <button
            onClick={goTrivia}
            className={cn(
              'w-full text-left px-2 py-[3px] text-[11px] hover:bg-[#dbe6ff] cursor-pointer flex items-center gap-1',
              loc.kind === 'trivia' && 'bg-[#000080] text-white hover:bg-[#000080]',
            )}
          >
            <span aria-hidden>&#127983;</span> MindMaze
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 bg-white overflow-auto m-1 border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          {content}
        </div>
      </div>

      <StatusBar98 panels={[{ content: status }, { content: `${ARTICLES.length} articles`, width: 96, align: 'center' }]} />

      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {printDialog}
    </div>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-[280px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[3px_3px_8px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#000080] text-white text-[11px] font-bold px-2 py-1 flex items-center justify-between">
          <span>About Encyclopedia 98</span>
          <button onClick={onClose} className="px-[6px] bg-[var(--win98-button-face)] text-black border border-[#808080] leading-none">&times;</button>
        </div>
        <div
          className="p-4 text-center text-white"
          style={{ background: 'radial-gradient(circle at 30% 25%, #3a5a9a, #0e1636)' }}
        >
          <div className="text-[44px] leading-none" aria-hidden>&#127760;</div>
          <div className="font-serif text-[20px] mt-1">Encyclopedia <span className="text-[#e8c874]">98</span></div>
          <div className="text-[10px] text-[#b8c8f0] italic">Multimedia Reference Edition</div>
        </div>
        <div className="p-3 text-[11px] leading-relaxed">
          <p className="mb-2">Version 1.0 &mdash; 1998 Edition</p>
          <p className="text-[10px] text-[#444]">
            {ARTICLES.length} articles across 7 subjects, with the MindMaze trivia challenge. Knowledge current as of 1998.
            All facts believed accurate at the dawn of the new millennium.
          </p>
        </div>
        <div className="flex justify-center pb-3">
          <button
            onClick={onClose}
            className="min-w-[70px] px-3 py-[2px] text-[11px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
