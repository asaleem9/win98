'use client';

import { Fragment, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Toolbar98 } from '@/components/ui/Toolbar98';
import { Input98 } from '@/components/ui/Input98';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';
import {
  helpTopics,
  HelpTopic,
  HelpBlock,
  CATEGORY_ORDER,
  getTopic,
  getTopicsByCategory,
  parseBlocks,
  parseInline,
  searchTopics,
  buildIndex,
  filterIndex,
} from './helpContent';
import { HELP_TOPIC_EVENT, HelpTopicEventDetail } from './openHelp';

const APP_ID = 'help';
const FOLDER_ICON = '/icons/folder-16.svg';
const PAGE_ICON = '/icons/doc-16.svg';

type TabId = 'contents' | 'index' | 'search';

// ------------------------------------------------------------- body rendering

interface RenderCallbacks {
  onOpenTopic: (topicId: string) => void;
  onOpenApp: (appId: string) => void;
}

// Raised win98 button used for the classic "click here to open" Help shortcuts.
function ShortcutButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 align-middle mx-[2px] px-[6px] h-[19px]',
        'bg-[var(--win98-button-face)] text-[var(--win98-button-text)] cursor-default select-none',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
        'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
      )}
    >
      <span aria-hidden className="text-[10px] leading-none">↗</span>
      <span>{label}</span>
    </button>
  );
}

// Underlined jump link to another Help topic.
function TopicLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="align-baseline text-[var(--win98-link,#00007f)] underline cursor-pointer bg-transparent p-0"
    >
      {label}
    </button>
  );
}

function InlineNodes({ text, onOpenTopic, onOpenApp }: { text: string } & RenderCallbacks) {
  return (
    <>
      {parseInline(text).map((token, i) => {
        switch (token.type) {
          case 'bold':
            return (
              <strong key={i} className="font-bold">
                {token.text}
              </strong>
            );
          case 'italic':
            return (
              <em key={i} className="italic">
                {token.text}
              </em>
            );
          case 'topic': {
            const target = getTopic(token.target);
            if (!target) return <Fragment key={i}>{token.text}</Fragment>;
            return <TopicLink key={i} label={token.text} onClick={() => onOpenTopic(token.target)} />;
          }
          case 'app':
            return <ShortcutButton key={i} label={token.text} onClick={() => onOpenApp(token.target)} />;
          default:
            return <Fragment key={i}>{token.text}</Fragment>;
        }
      })}
    </>
  );
}

// The trailing "> Related Topics:" box that see-also's other topics by title.
function RelatedTopics({ topicIds, onOpenTopic }: { topicIds: string[]; onOpenTopic: (id: string) => void }) {
  const resolved = topicIds.map((id) => getTopic(id)).filter((t): t is HelpTopic => Boolean(t));
  if (resolved.length === 0) return null;
  return (
    <div className="mt-4 pt-2 border-t border-[var(--win98-button-shadow)]">
      <div className="font-bold mb-1">Related Topics</div>
      <ul className="space-y-[2px]">
        {resolved.map((t) => (
          <li key={t.id} className="flex items-start gap-1">
            <span aria-hidden className="text-[var(--win98-link,#00007f)]">•</span>
            <TopicLink label={t.title} onClick={() => onOpenTopic(t.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderBlocks(blocks: HelpBlock[], cb: RenderCallbacks): ReactNode {
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'list':
        return (
          <ul key={i} className="list-disc pl-5 space-y-1 mb-2">
            {block.items.map((item, j) => (
              <li key={j}>
                <InlineNodes text={item} {...cb} />
              </li>
            ))}
          </ul>
        );
      case 'ordered':
        return (
          <ol key={i} className="list-decimal pl-5 space-y-1 mb-2">
            {block.items.map((item, j) => (
              <li key={j}>
                <InlineNodes text={item} {...cb} />
              </li>
            ))}
          </ol>
        );
      case 'related':
        return <RelatedTopics key={i} topicIds={block.topicIds} onOpenTopic={cb.onOpenTopic} />;
      case 'paragraph':
      default: {
        const lines = block.text.split('\n');
        return (
          <p key={i} className="mb-2">
            {lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <InlineNodes text={line} {...cb} />
              </Fragment>
            ))}
          </p>
        );
      }
    }
  });
}

// ------------------------------------------------------------------ component

export default function Help({ launchParams, launchCount }: AppComponentProps) {
  const { openWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();

  // An explicit launch topic wins; otherwise resume the last topic viewed.
  const initialTopic = useMemo(() => {
    const requested = typeof launchParams?.topicId === 'string' ? launchParams.topicId : undefined;
    if (requested && getTopic(requested)) return requested;
    const last = getAppPref<string>(APP_ID, 'lastTopic', 'welcome');
    return getTopic(last) ? last : 'welcome';
    // Only compute once, on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser-style navigation history: a stack plus a cursor into it.
  const [nav, setNav] = useState<{ stack: string[]; index: number }>({ stack: [initialTopic], index: 0 });
  const currentId = nav.stack[nav.index];
  const topic = getTopic(currentId) ?? helpTopics[0];

  const [tab, setTab] = useState<TabId>(() => {
    const saved = getAppPref<TabId>(APP_ID, 'lastTab', 'contents');
    return saved === 'index' || saved === 'search' ? saved : 'contents';
  });
  const [panelVisible, setPanelVisible] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [indexFilter, setIndexFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpTopic[] | null>(null);

  const navigate = useCallback((id: string) => {
    if (!getTopic(id)) return;
    setNav((prev) => {
      if (prev.stack[prev.index] === id) return prev;
      const stack = prev.stack.slice(0, prev.index + 1);
      stack.push(id);
      return { stack, index: stack.length - 1 };
    });
  }, []);

  const canBack = nav.index > 0;
  const canForward = nav.index < nav.stack.length - 1;
  const goBack = useCallback(() => setNav((p) => (p.index > 0 ? { ...p, index: p.index - 1 } : p)), []);
  const goForward = useCallback(
    () => setNav((p) => (p.index < p.stack.length - 1 ? { ...p, index: p.index + 1 } : p)),
    [],
  );

  const selectTab = useCallback(
    (next: TabId) => {
      setTab(next);
      setAppPref(APP_ID, 'lastTab', next);
    },
    [setAppPref],
  );

  const openApp = useCallback((appId: string) => openWindow(appId), [openWindow]);

  // Keep the persisted "last topic" in step with whatever is on screen.
  useEffect(() => {
    setAppPref(APP_ID, 'lastTopic', currentId);
  }, [currentId, setAppPref]);

  // A fresh launch (or re-focus of this singleton) carries a topic id to show.
  useEffect(() => {
    const requested = typeof launchParams?.topicId === 'string' ? launchParams.topicId : undefined;
    if (requested && getTopic(requested)) navigate(requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  // Programs elsewhere ask Help to jump to a topic via a window event.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<HelpTopicEventDetail>).detail;
      if (detail?.topicId && getTopic(detail.topicId)) navigate(detail.topicId);
    };
    window.addEventListener(HELP_TOPIC_EVENT, handler);
    return () => window.removeEventListener(HELP_TOPIC_EVENT, handler);
  }, [navigate]);

  const renderCallbacks = useMemo<RenderCallbacks>(
    () => ({ onOpenTopic: navigate, onOpenApp: openApp }),
    [navigate, openApp],
  );

  const treeNodes = useMemo<TreeNode[]>(
    () =>
      CATEGORY_ORDER.map((category) => ({
        id: `cat:${category}`,
        label: category,
        icon: FOLDER_ICON,
        data: 'category',
        children: getTopicsByCategory(category).map((t) => ({
          id: t.id,
          label: t.title,
          icon: PAGE_ICON,
          data: 'topic',
        })),
      })),
    [],
  );

  const onTreeSelect = useCallback(
    (node: TreeNode) => {
      if (node.data === 'topic') navigate(node.id);
    },
    [navigate],
  );

  const indexEntries = useMemo(() => buildIndex(), []);
  const filteredIndex = useMemo(() => filterIndex(indexEntries, indexFilter), [indexEntries, indexFilter]);

  const runSearch = useCallback(() => setSearchResults(searchTopics(searchQuery)), [searchQuery]);

  const blocks = useMemo(() => parseBlocks(topic.body), [topic.body]);

  const toolbarItems = [
    {
      id: 'tabs',
      label: panelVisible ? 'Hide' : 'Show',
      icon: <span aria-hidden>≡</span>,
      onClick: () => setPanelVisible((v) => !v),
    },
    { id: 'sep1', separator: true },
    { id: 'back', label: 'Back', icon: <span aria-hidden>◀</span>, onClick: goBack, disabled: !canBack },
    {
      id: 'forward',
      label: 'Forward',
      icon: <span aria-hidden>▶</span>,
      onClick: goForward,
      disabled: !canForward,
    },
    { id: 'sep2', separator: true },
    {
      id: 'options',
      label: 'Options',
      icon: <span aria-hidden>▾</span>,
      onClick: () => setOptionsOpen((o) => !o),
      active: optionsOpen,
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] min-h-0">
      <div className="relative flex-shrink-0">
        <Toolbar98 items={toolbarItems} />
        {optionsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOptionsOpen(false)} />
            <div
              className={cn(
                'absolute right-1 top-full z-50 min-w-[150px] py-[2px]',
                'bg-[var(--win98-button-face)]',
                'border-2 border-solid',
                'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
                'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
                'shadow-[2px_2px_0_rgba(0,0,0,0.35)]',
              )}
            >
              <OptionsItem
                label={panelVisible ? 'Hide Tabs' : 'Show Tabs'}
                onClick={() => {
                  setPanelVisible((v) => !v);
                  setOptionsOpen(false);
                }}
              />
              <OptionsItem
                label="Home"
                onClick={() => {
                  navigate('welcome');
                  setOptionsOpen(false);
                }}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex min-h-0 p-1 gap-1">
        {panelVisible && (
          <div className="w-[210px] flex-shrink-0 flex flex-col min-h-0">
            <div className="flex">
              {(['contents', 'index', 'search'] as TabId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  className={cn(
                    'px-2 py-[3px] capitalize cursor-default select-none',
                    'border-2 border-solid border-b-0',
                    'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
                    'border-r-[var(--win98-button-dark-shadow)]',
                    tab === id
                      ? 'bg-[var(--win98-button-face)] relative z-10 -mb-[2px] pb-[5px]'
                      : 'bg-[var(--win98-button-shadow)]/20',
                  )}
                >
                  {id}
                </button>
              ))}
            </div>

            <div
              className={cn(
                'flex-1 min-h-0 flex flex-col p-1 gap-1',
                'border-2 border-solid',
                'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
                'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
                'bg-[var(--win98-button-face)]',
              )}
            >
              {tab === 'contents' && (
                <TreeView98
                  nodes={treeNodes}
                  onSelect={onTreeSelect}
                  selectedId={currentId}
                  className="flex-1 min-h-0"
                />
              )}

              {tab === 'index' && (
                <>
                  <label className="block">
                    Type a keyword to find:
                    <Input98
                      value={indexFilter}
                      onChange={(e) => setIndexFilter(e.target.value)}
                      className="w-full mt-[2px]"
                      aria-label="Index keyword"
                    />
                  </label>
                  <div className="flex-1 min-h-0 overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
                    {filteredIndex.length === 0 ? (
                      <div className="px-2 py-1 text-[var(--win98-disabled-text)]">No entries found.</div>
                    ) : (
                      filteredIndex.map((entry, i) => (
                        <button
                          key={`${entry.topicId}-${entry.label}-${i}`}
                          onClick={() => navigate(entry.topicId)}
                          className={cn(
                            'block w-full text-left px-2 py-[2px] cursor-default select-none',
                            entry.topicId === currentId
                              ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]'
                              : 'hover:bg-[var(--win98-button-face)]',
                          )}
                        >
                          {entry.label}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

              {tab === 'search' && (
                <>
                  <label className="block">
                    Type the word(s) to search for:
                    <Input98
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') runSearch();
                      }}
                      className="w-full mt-[2px]"
                      aria-label="Search words"
                    />
                  </label>
                  <button
                    onClick={runSearch}
                    className={cn(
                      'self-start px-3 py-[2px] cursor-default select-none',
                      'bg-[var(--win98-button-face)]',
                      'border-2 border-solid',
                      'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
                      'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
                      'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
                      'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
                      'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
                    )}
                  >
                    List Topics
                  </button>
                  <div className="flex-1 min-h-0 overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
                    {searchResults === null ? (
                      <div className="px-2 py-1 text-[var(--win98-disabled-text)]">
                        Type a word above and click List Topics.
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-2 py-1 text-[var(--win98-disabled-text)]">No topics found.</div>
                    ) : (
                      searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => navigate(result.id)}
                          className={cn(
                            'block w-full text-left px-2 py-[2px] cursor-default select-none',
                            result.id === currentId
                              ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]'
                              : 'hover:bg-[var(--win98-button-face)]',
                          )}
                        >
                          {result.title}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Topic pane: heading strip over a scrolling body */}
        <div className="flex-1 min-h-0 flex flex-col bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]">
            <h2 className="text-[13px] font-bold">{topic.title}</h2>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-3 text-[12px] leading-relaxed text-black">
            {renderBlocks(blocks, renderCallbacks)}
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionsItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left px-4 py-[2px] cursor-default select-none hover:bg-[var(--win98-highlight)] hover:text-[var(--win98-highlight-text)]"
    >
      {label}
    </button>
  );
}
