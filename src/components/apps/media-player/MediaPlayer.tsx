'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';

export default function MediaPlayer({ windowId }: AppComponentProps) {
  const [status, setStatus] = useState<'Stopped' | 'Playing' | 'Paused' | 'Ready'>('Ready');
  const [volume, setVolume] = useState(75);
  const [seekPos, setSeekPos] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <span className="cursor-default"><u>F</u>ile</span>
        <span className="cursor-default"><u>V</u>iew</span>
        <span className="cursor-default"><u>P</u>lay</span>
        <span className="cursor-default"><u>G</u>o</span>
        <span className="cursor-default">F<u>a</u>vorites</span>
        <span className="cursor-default"><u>H</u>elp</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="px-2 h-[20px] text-[10px] cursor-default bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
        >
          Playlist
        </button>
      </div>

      {/* Video area */}
      <div className="flex-1 bg-black flex items-center justify-center min-h-[100px] relative">
        <div className="text-gray-600 text-[14px] select-none">
          {status === 'Ready' || status === 'Stopped' ? (
            <div className="text-center">
              <div className="text-[32px] mb-1">🎬</div>
              <div className="text-gray-500 text-[11px]">Windows Media Player</div>
              <div className="text-gray-600 text-[10px]">Version 6.4</div>
            </div>
          ) : status === 'Playing' ? (
            <div className="text-center">
              <div className="text-[24px] animate-pulse">▶</div>
              <div className="text-gray-400 text-[10px]">No video</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[24px]">⏸</div>
              <div className="text-gray-400 text-[10px]">Paused</div>
            </div>
          )}
        </div>

        {/* Logo watermark */}
        <div className="absolute bottom-1 right-2 text-[9px] text-gray-700">
          Windows Media Player
        </div>
      </div>

      {/* Status display */}
      <div className="bg-[#1a1a2e] text-[#00FF00] px-2 py-[2px] text-[10px] font-mono border-t border-[var(--win98-button-shadow)]">
        {status}
      </div>

      {/* Seek bar */}
      <div className="px-2 py-1 bg-[var(--win98-button-face)]">
        <input
          type="range"
          min="0"
          max="100"
          value={seekPos}
          onChange={e => setSeekPos(parseInt(e.target.value))}
          className="w-full h-[14px]"
        />
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-[var(--win98-button-highlight)]">
        <div className="flex items-center gap-[2px]">
          {/* Play */}
          <button
            onClick={() => setStatus('Playing')}
            className="w-[26px] h-[22px] flex items-center justify-center cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[12px]"
            title="Play"
          >
            ▶
          </button>
          {/* Pause */}
          <button
            onClick={() => setStatus(status === 'Playing' ? 'Paused' : status)}
            className="w-[26px] h-[22px] flex items-center justify-center cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[12px]"
            title="Pause"
          >
            ⏸
          </button>
          {/* Stop */}
          <button
            onClick={() => { setStatus('Stopped'); setSeekPos(0); }}
            className="w-[26px] h-[22px] flex items-center justify-center cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[12px]"
            title="Stop"
          >
            ⏹
          </button>

          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-1" />

          {/* Prev */}
          <button
            className="w-[26px] h-[22px] flex items-center justify-center cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[10px]"
            title="Previous"
          >
            ⏮
          </button>
          {/* Next */}
          <button
            className="w-[26px] h-[22px] flex items-center justify-center cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[10px]"
            title="Next"
          >
            ⏭
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1">
          <span className="text-[10px]">🔊</span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={e => setVolume(parseInt(e.target.value))}
            className="w-[60px] h-[14px]"
          />
        </div>
      </div>
    </div>
  );
}
