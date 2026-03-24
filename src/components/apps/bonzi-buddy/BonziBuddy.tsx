'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

const messages = [
  "Hey! Want to hear a joke?",
  "Did you know I can search the web?",
  "Let me sing you a song!",
  "Would you like me to read your email?",
  "I can tell you the weather!",
  "Want to see a magic trick?",
  "You look like you need a friend!",
  "I know over 10,000 jokes!",
  "Let me help you surf the internet!",
  "Would you like to play a game?",
];

const adMessages = [
  "CONGRATULATIONS! You're the 1,000,000th visitor! Click HERE to claim your prize!",
  "FREE VACATION TO THE BAHAMAS! Just enter your credit card to confirm!",
  "HOT SINGLES IN YOUR AREA want to meet you! Click NOW!",
  "You have WON a FREE iPod Nano! Claim before midnight!",
  "WARNING: Your computer may be INFECTED! Download our FREE scanner!",
  "Make $5,000/week working from HOME! Doctors HATE this trick!",
  "URGENT: Your AOL account will be SUSPENDED! Verify your password NOW!",
];

function PopupAd({ message, onClose, style }: { message: string; onClose: () => void; style: React.CSSProperties }) {
  return (
    <div
      className="fixed z-[9999] bg-white border-2 border-solid border-[var(--win98-button-dark-shadow)] shadow-lg"
      style={{ width: 280, ...style }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-1 py-[2px] bg-[var(--win98-active-title)] text-white">
        <span className="text-[11px] font-[family-name:var(--win98-font)]">Special Offer!!!</span>
        <button
          onClick={onClose}
          className="w-[14px] h-[14px] text-[9px] leading-none flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
        >
          x
        </button>
      </div>
      <div className="p-3 font-[family-name:var(--win98-font)] text-[11px]">
        <div className="text-center">
          <div className="text-[16px] font-bold text-red-600 animate-pulse mb-2">
            ★ WINNER! ★
          </div>
          <p className="mb-2">{message}</p>
          <button className="px-4 py-1 bg-red-600 text-white font-bold text-[12px] border-none cursor-pointer animate-pulse">
            CLICK HERE!!!
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BonziBuddy({ windowId }: AppComponentProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [popups, setPopups] = useState<Array<{ id: number; message: string; style: React.CSSProperties }>>([]);
  const [nextId, setNextId] = useState(0);

  const spawnPopups = useCallback((count: number) => {
    const newPopups: Array<{ id: number; message: string; style: React.CSSProperties }> = [];
    for (let i = 0; i < count; i++) {
      newPopups.push({
        id: nextId + i,
        message: adMessages[Math.floor(Math.random() * adMessages.length)],
        style: {
          top: Math.random() * 300 + 50,
          left: Math.random() * 400 + 50,
        },
      });
    }
    setPopups(prev => [...prev, ...newPopups]);
    setNextId(prev => prev + count);
  }, [nextId]);

  const closePopup = useCallback((id: number) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const nextMessage = useCallback(() => {
    setCurrentMessage(prev => (prev + 1) % messages.length);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#9966CC] to-[#663399] font-[family-name:var(--win98-font)] text-[11px] relative">
      {/* Popups */}
      {popups.map(popup => (
        <PopupAd
          key={popup.id}
          message={popup.message}
          onClose={() => closePopup(popup.id)}
          style={popup.style}
        />
      ))}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Bonzi character */}
        <div className="relative mb-4">
          {/* Speech bubble */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white border-2 border-black rounded-lg px-3 py-2 min-w-[200px] text-center whitespace-nowrap">
            <div className="text-[12px] text-black">{messages[currentMessage]}</div>
            <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-black" />
          </div>

          {/* Gorilla */}
          <div className="w-[100px] h-[100px] bg-[#7B2FBE] rounded-full flex items-center justify-center text-[60px] border-4 border-[#5A1F8E] shadow-lg">
            🦍
          </div>
        </div>

        {/* Name */}
        <div className="text-white font-bold text-[14px] mb-4 drop-shadow-md">
          BonziBUDDY
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 w-[200px]">
          <button
            onClick={nextMessage}
            className="px-3 py-1 bg-[var(--win98-button-face)] text-black text-[11px] cursor-default border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
          >
            Talk to Bonzi!
          </button>
          <button
            onClick={() => nextMessage()}
            className="px-3 py-1 bg-[var(--win98-button-face)] text-black text-[11px] cursor-default border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
          >
            Tell me a joke!
          </button>
          <button
            onClick={() => nextMessage()}
            className="px-3 py-1 bg-[var(--win98-button-face)] text-black text-[11px] cursor-default border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
          >
            Search the web
          </button>
          <button
            onClick={() => spawnPopups(3)}
            className="px-3 py-1 bg-[var(--win98-button-face)] text-black text-[11px] cursor-default border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
          >
            Close BonziBUDDY
          </button>
          <button
            onClick={() => spawnPopups(6)}
            className="px-3 py-1 bg-red-100 text-red-800 text-[11px] cursor-default border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
          >
            Uninstall BonziBUDDY
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-purple-200 pb-2">
        BonziBUDDY v4.0 - Your Internet Friend!
      </div>
    </div>
  );
}
