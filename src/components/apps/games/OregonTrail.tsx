'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

type GameState = 'start' | 'playing' | 'dead';

interface GameData {
  oxen: number;
  food: number;
  miles: number;
  health: string;
}

const OUTCOMES = {
  hunt: [
    'You shot a buffalo! +100 lbs of food.',
    'You found nothing. The plains are empty.',
    'You bagged 3 squirrels. +20 lbs of food.',
    'A snake bit you while hunting! Health worsening.',
    'You shot a deer! +60 lbs of food.',
  ],
  rest: [
    'You rested for a day. Health improving.',
    'A thief stole 50 lbs of food while you slept!',
    'You feel much better after resting.',
    'Resting, but the weather is terrible.',
    'Your oxen are grateful for the rest.',
  ],
  continue: [
    'You traveled 20 miles. The trail is rough.',
    'Good weather! You covered 35 miles.',
    'A river crossing cost you an ox.',
    'You traveled 25 miles. Found wild berries! +15 lbs food.',
    'Wagon wheel broke. Lost a day fixing it.',
    'You have died of dysentery.',
    'You traveled 30 miles without incident.',
    'Bad water! Everyone is feeling ill.',
  ],
};

const DEATH_MESSAGES = [
  'You have died of dysentery.',
  'You have died of cholera.',
  'You have died of typhoid.',
  'You have died of exhaustion.',
  'Your oxen have all died. You are stranded.',
];

export default function OregonTrail({ windowId }: AppComponentProps) {
  const [state, setState] = useState<GameState>('start');
  const [log, setLog] = useState<string[]>([]);
  const [data, setData] = useState<GameData>({ oxen: 3, food: 200, miles: 0, health: 'Good' });
  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-12), msg]);
  }, []);

  const startGame = useCallback(() => {
    setState('playing');
    setLog(['March 1, 1848 - Independence, Missouri', 'Your journey on the Oregon Trail begins.', '']);
    setData({ oxen: 3, food: 200, miles: 0, health: 'Good' });
  }, []);

  const doAction = useCallback((action: 'hunt' | 'rest' | 'continue') => {
    const outcomes = OUTCOMES[action];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    const newData = { ...data };

    if (action === 'hunt') {
      newData.food -= 10;
      if (outcome.includes('+100')) newData.food += 100;
      else if (outcome.includes('+20')) newData.food += 20;
      else if (outcome.includes('+60')) newData.food += 60;
      else if (outcome.includes('snake')) newData.health = 'Poor';
    } else if (action === 'rest') {
      newData.food -= 15;
      if (outcome.includes('stole')) newData.food -= 50;
      if (outcome.includes('improving') || outcome.includes('better')) newData.health = 'Good';
    } else {
      newData.food -= 20;
      const milesMatch = outcome.match(/(\d+) miles/);
      if (milesMatch) newData.miles += parseInt(milesMatch[1]);
      if (outcome.includes('cost you an ox')) newData.oxen -= 1;
      if (outcome.includes('+15')) newData.food += 15;
      if (outcome.includes('dysentery')) {
        addLog(outcome);
        setState('dead');
        setData(newData);
        return;
      }
      if (outcome.includes('ill')) newData.health = 'Poor';
    }

    newData.food = Math.max(0, newData.food);

    if (newData.food <= 0 || newData.oxen <= 0 || (newData.health === 'Poor' && Math.random() < 0.3)) {
      const deathMsg = newData.oxen <= 0
        ? DEATH_MESSAGES[4]
        : newData.food <= 0
          ? 'You have starved to death.'
          : DEATH_MESSAGES[Math.floor(Math.random() * 4)];
      addLog(outcome);
      addLog('');
      addLog(deathMsg);
      setState('dead');
      setData(newData);
      return;
    }

    if (newData.miles >= 2000) {
      addLog(outcome);
      addLog('');
      addLog('*** You have reached Oregon! Congratulations! ***');
      setState('dead');
      setData(newData);
      return;
    }

    addLog(outcome);
    setData(newData);
  }, [data, addLog]);

  return (
    <div className="flex flex-col h-full bg-black text-[#33ff33] font-[family-name:monospace] text-[13px] p-4 overflow-hidden">
      {state === 'start' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <pre className="text-center text-[#33ff33] text-[11px] leading-tight">{`
 _____ _            ___                            _____          _ _
|_   _| |__   ___  / _ \\ _ __ ___  __ _  ___  _ _|_   _| __ __ _(_) |
  | | | '_ \\ / _ \\| | | | '__/ _ \\/ _\` |/ _ \\| '_ \\| || '__/ _\` | | |
  | | | | | |  __/| |_| | | |  __/ (_| | (_) | | | | || | | (_| | | |
  |_| |_| |_|\\___| \\___/|_|  \\___|\\__, |\\___/|_| |_|_||_|  \\__,_|_|_|
                                   |___/
          `}</pre>
          <p className="mt-4">You may:</p>
          <p>1. Travel the trail</p>
          <p>2. Learn about the trail</p>
          <p>3. See the top scores</p>
          <button
            onClick={startGame}
            className="mt-4 text-[#33ff33] bg-transparent border border-[#33ff33] px-4 py-1 cursor-pointer hover:bg-[#33ff33] hover:text-black"
          >
            Press ENTER to start
          </button>
        </div>
      )}

      {state === 'playing' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-[#33ff33] pb-2 mb-2 flex gap-6 text-[11px]">
            <span>Oxen: {data.oxen}</span>
            <span>Food: {data.food} lbs</span>
            <span>Miles: {data.miles}/2000</span>
            <span>Health: {data.health}</span>
          </div>
          <div className="flex-1 overflow-y-auto mb-3">
            {log.map((line, i) => (
              <div key={i} className="min-h-[18px]">{line}</div>
            ))}
          </div>
          <div className="border-t border-[#33ff33] pt-2">
            <p className="mb-2">What do you want to do?</p>
            <div className="flex gap-3">
              {(['hunt', 'rest', 'continue'] as const).map(action => (
                <button
                  key={action}
                  onClick={() => doAction(action)}
                  className="text-[#33ff33] bg-transparent border border-[#33ff33] px-3 py-1 cursor-pointer hover:bg-[#33ff33] hover:text-black capitalize"
                >
                  [{action.charAt(0).toUpperCase()}] {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state === 'dead' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div className="text-center">
            {log.slice(-3).map((line, i) => (
              <div key={i} className="text-[16px] mb-1">{line}</div>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-center">
            <p>Miles traveled: {data.miles}</p>
            <p>Food remaining: {data.food} lbs</p>
          </div>
          <button
            onClick={startGame}
            className="mt-4 text-[#33ff33] bg-transparent border border-[#33ff33] px-4 py-1 cursor-pointer hover:bg-[#33ff33] hover:text-black"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
