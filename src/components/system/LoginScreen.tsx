'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { cn } from '@/lib/cn';
import { useSettings } from '@/contexts/SettingsContext';
import { Button98 } from '@/components/ui/Button98';
import { Input98 } from '@/components/ui/Input98';

interface LoginScreenProps {
  onLogin: () => void;
}

/**
 * The "Welcome to Windows" logon dialog that sits between the boot flag and the
 * desktop. Both fields come prefilled — the name with the saved user (or
 * "User") and the password with a stand-in — so a first-time visitor can just
 * press OK; the password accepts anything. OK saves the typed name (defaulting
 * to "User" when blank); Cancel and Esc log straight in without touching a
 * previously saved name — the period-accurate way to skip the prompt.
 */
export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { getAppPref, setAppPref } = useSettings();
  const savedName = getAppPref('system', 'userName', '');

  const [userName, setUserName] = useState(savedName || 'User');
  const [password, setPassword] = useState('password');
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  // Returning users land on the password field; new users on the name field.
  useEffect(() => {
    const target = savedName ? passRef.current : userRef.current;
    target?.focus();
    target?.select();
  }, [savedName]);

  const handleOk = (e?: FormEvent) => {
    e?.preventDefault();
    const name = userName.trim() || 'User';
    setAppPref('system', 'userName', name);
    onLogin();
  };

  // The gag: Cancel/Esc still logs you in, but never overwrites a saved name.
  const handleCancel = () => {
    onLogin();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // handleCancel only calls the stable onLogin prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLogin]);

  return (
    <div className="win98-booting fixed inset-0 z-[99999] bg-[var(--win98-desktop)] flex items-center justify-center">
      <form
        onSubmit={handleOk}
        className={cn(
          'w-[400px] bg-[var(--win98-button-face)]',
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
      >
        {/* Title bar */}
        <div className="flex items-center h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          Welcome to Windows
        </div>

        <div className="flex gap-4 p-4">
          {/* Left banner: Windows logo */}
          <div className="flex flex-col items-center pt-1 w-[56px] flex-shrink-0">
            <img
              src="/icons/windows-logo-32.svg"
              alt=""
              width={48}
              height={48}
              className="w-12 h-12"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Right: prompt + fields */}
          <div className="flex-1">
            <p className="mb-4 leading-snug">
              Type a user name and password to log on to Windows.
            </p>

            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-[6px]">
                <label className="flex items-center gap-2">
                  <span className="w-[70px]">User name:</span>
                  <Input98
                    ref={userRef}
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="flex-1"
                    aria-label="User name"
                    autoComplete="off"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-[70px]">Password:</span>
                  <Input98
                    ref={passRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1"
                    aria-label="Password"
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-[6px]">
                <Button98 type="submit" className="min-w-[75px]">
                  OK
                </Button98>
                <Button98 type="button" onClick={handleCancel} className="min-w-[75px]">
                  Cancel
                </Button98>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
