
import React, { useState, useEffect, useCallback } from 'react';
import { generateRace } from './geminiService';
import { Race, Guess, GameState, FeedbackColor, Stats } from './types';
import { GuessInput } from './components/GuessInput';
import { FEEDBACK_LEGEND } from './constants';

const DEFAULT_STATS: Stats = {
  gamesPlayed: 0,
  gamesWon: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  currentStreak: 0,
  maxStreak: 0,
};

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    currentRace: null,
    guesses: [],
    status: 'playing',
    mode: 'daily',
    hintsRevealed: { winner: false, country: false },
  });
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [countdown, setCountdown] = useState<string>('');

  // Countdown timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedStats = localStorage.getItem('guessthegp_stats');
    if (savedStats) setStats(JSON.parse(savedStats));
  }, []);

  const updateStats = (won: boolean, attempts: number) => {
    const newStats = { ...stats };
    newStats.gamesPlayed += 1;
    if (won) {
      newStats.gamesWon += 1;
      newStats.guessDistribution[attempts - 1] += 1;
      newStats.currentStreak += 1;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
    } else {
      newStats.currentStreak = 0;
    }
    setStats(newStats);
    localStorage.setItem('guessthegp_stats', JSON.stringify(newStats));
  };

  const initGame = useCallback(async (mode: 'daily' | 'practice') => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (mode === 'daily') {
        const saved = localStorage.getItem('guessthegp_daily_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.lastPlayedDate === today) {
            setState(parsed);
            setLoading(false);
            if (parsed.status !== 'playing') setShowStats(true);
            return;
          }
        }
      }

      const race = await generateRace();
      const newState: GameState = {
        currentRace: race,
        guesses: [],
        status: 'playing',
        mode: mode,
        lastPlayedDate: mode === 'daily' ? today : undefined,
        hintsRevealed: { winner: false, country: false },
      };
      setState(newState);
      if (mode === 'daily') {
        localStorage.setItem('guessthegp_daily_state', JSON.stringify(newState));
      }
    } catch (err) {
      setError("Failed to load race data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initGame('daily');
  }, [initGame]);

  const handleGuess = (year: number, gpName: string) => {
    if (!state.currentRace || state.status !== 'playing') return;

    const isCorrectRace = gpName.toLowerCase() === state.currentRace.gpName.toLowerCase();
    const isCorrectYear = year === state.currentRace.year;
    
    let feedback: FeedbackColor = FeedbackColor.RED;
    const diff = Math.abs(year - state.currentRace.year);

    if (isCorrectRace && isCorrectYear) {
      feedback = FeedbackColor.GREEN;
    } else if (isCorrectRace) {
      if (diff >= 3) feedback = FeedbackColor.PURPLE;
      else if (diff > 0) feedback = FeedbackColor.YELLOW;
      else feedback = FeedbackColor.BLUE;
    }

    const newGuess: Guess = { year, gpName, feedback };
    const newGuesses = [...state.guesses, newGuess];
    
    let newStatus = state.status;
    if (feedback === FeedbackColor.GREEN) {
      newStatus = 'won';
      updateStats(true, newGuesses.length);
      setTimeout(() => setShowStats(true), 1200);
    } else if (newGuesses.length >= 6) {
      newStatus = 'lost';
      updateStats(false, 6);
      setTimeout(() => setShowStats(true), 1200);
    }

    const newState: GameState = {
      ...state,
      guesses: newGuesses,
      status: newStatus
    };

    setState(newState);
    if (state.mode === 'daily') {
      localStorage.setItem('guessthegp_daily_state', JSON.stringify(newState));
    }
  };

  const getEmojiGrid = () => {
    return state.guesses.map(g => {
      const legend = FEEDBACK_LEGEND.find(l => l.color === g.feedback);
      return legend?.emoji || '⬜';
    }).join('\n');
  };

  const shareResults = () => {
    const attempts = state.status === 'won' ? state.guesses.length : 'X';
    const text = `GuessTheGP ${state.mode === 'daily' ? 'Daily' : 'Practice'} ${attempts}/6\n\n${getEmojiGrid()}\n\nhttps://guessthegp.app`;
    
    if (navigator.share) {
      navigator.share({ text: text }).catch(() => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    }
  };

  const toggleHint = (type: 'winner' | 'country') => {
    const newState = {
      ...state,
      hintsRevealed: { ...state.hintsRevealed, [type]: true }
    };
    setState(newState);
    if (state.mode === 'daily') {
      localStorage.setItem('guessthegp_daily_state', JSON.stringify(newState));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-2 border-zinc-800 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Preparing Challenge...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-32 px-4 overflow-x-hidden selection:bg-red-900 selection:text-white flex flex-col">
      {/* Header: Simplified without attribution link */}
      <header className="max-w-xl mx-auto w-full py-4 flex items-center justify-between border-b border-zinc-900 mb-8 sticky top-0 bg-[#050505]/95 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center font-black italic tracking-tighter text-base">GP</div>
          <h1 className="text-lg font-black uppercase tracking-tighter">GuessTheGP</h1>
        </div>

        <div className="flex gap-1.5 items-center">
          <button onClick={() => setShowHelp(true)} className="p-2 text-zinc-500 hover:text-white transition-colors"><HelpIcon /></button>
          <button onClick={() => setShowHints(true)} className="p-2 text-zinc-500 hover:text-yellow-500 transition-colors"><BulbIcon /></button>
          <button onClick={() => setShowStats(true)} className="p-2 text-zinc-500 hover:text-white transition-colors"><StatsIcon /></button>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full flex-grow space-y-10">
        {/* Clues Section */}
        <div className="space-y-4">
          <h2 className="text-zinc-700 font-black text-[10px] uppercase tracking-[0.3em] text-center mb-6">Clues</h2>
          <div className="grid gap-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isUnlocked = state.guesses.length >= idx;
              const clue = state.currentRace?.clues[idx];
              const neonColor = idx % 2 === 0 ? 'rgba(220, 38, 38, 0.4)' : 'rgba(147, 51, 234, 0.4)';
              const neonBorder = idx % 2 === 0 ? 'border-red-900/50' : 'border-purple-900/50';

              return (
                <div 
                  key={idx} 
                  className={`p-5 rounded-2xl border transition-all duration-500 ${isUnlocked ? `bg-zinc-900/40 ${neonBorder} shadow-[0_0_15px_${neonColor}]` : 'bg-transparent border-zinc-900/30 opacity-20 select-none grayscale'}`}
                >
                  <div className="flex gap-5">
                    <span className="text-zinc-700 font-black text-sm pt-1 mono">0{idx + 1}</span>
                    <div className="flex-1">
                      {isUnlocked ? (
                        <>
                          <span className={`text-[9px] font-black uppercase tracking-widest mb-2 block ${idx % 2 === 0 ? 'text-red-500' : 'text-purple-500'}`}>{clue?.category}</span>
                          <p className="text-zinc-100 text-[15px] leading-relaxed font-medium">{clue?.text}</p>
                        </>
                      ) : <div className="h-4 w-1/3 bg-zinc-900 rounded-full animate-pulse" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guess History */}
        {state.guesses.length > 0 && (
          <div className="pt-8 border-t border-zinc-900/50">
            <h2 className="text-zinc-800 font-black text-[10px] uppercase tracking-[0.3em] text-center mb-6">Guess History</h2>
            <div className="grid gap-2.5">
              {state.guesses.map((g, i) => (
                <div key={i} className="flex items-center gap-4 bg-zinc-900/20 rounded-xl p-4 border border-zinc-900 animate-in slide-in-from-bottom-3 duration-500">
                  <div className={`w-2.5 h-10 rounded-full ${g.feedback} shadow-lg shadow-black/50`}></div>
                  <div className="flex-1 font-black text-sm tracking-tight text-zinc-100 uppercase">{g.year} {g.gpName}</div>
                  <span className="mono text-[10px] text-zinc-700 font-bold tracking-widest">TRY {i+1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input or End Game Screen */}
        {state.status === 'playing' ? (
          <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black to-transparent z-30">
            <div className="max-w-xl mx-auto">
              <GuessInput onGuess={handleGuess} disabled={state.guesses.length >= 6} />
            </div>
          </div>
        ) : (
          <div className="p-10 bg-zinc-950 rounded-[2.5rem] border border-zinc-900 space-y-8 text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
            
            <div className="space-y-2">
              <h3 className={`text-4xl font-black uppercase tracking-tighter ${state.status === 'won' ? 'text-green-500' : 'text-red-600'}`}>
                {state.status === 'won' ? 'Perfect Lap' : 'Retired'}
              </h3>
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
                Identity: <span className="text-white font-black">{state.currentRace?.year} {state.currentRace?.gpName}</span>
              </p>
            </div>

            <div className="p-6 bg-black rounded-3xl text-left border border-zinc-900 shadow-inner">
               <p className="text-xs text-zinc-400 leading-relaxed mb-6 italic">{state.currentRace?.summary}</p>
               <div className="space-y-3">
                  {state.currentRace?.facts.map((f, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1 shrink-0"></div>
                      <p className="text-[11px] text-zinc-500 font-medium leading-normal">{f}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="grid gap-3">
              <button onClick={shareResults} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-500 transition-all uppercase tracking-[0.2em] text-xs active:scale-95 shadow-lg shadow-red-900/20">Share Performance</button>
              
              <div className="py-2 border-y border-zinc-900 my-2">
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Next Challenge Starts In</p>
                <p className="text-2xl font-black mono tracking-tighter text-white">{countdown}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer with attribution link */}
      <footer className="max-w-xl mx-auto w-full py-12 flex flex-col items-center gap-2 border-t border-zinc-900/50 mt-12 mb-20">
        <a 
          href="https://github.com/azmath97" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[10px] font-black text-zinc-600 hover:text-red-600 transition-all uppercase tracking-[0.3em] active:scale-95"
        >
          Made by Azmath
        </a>
      </footer>

      {/* Modals */}
      {showHelp && <Modal title="Instructions" onClose={() => setShowHelp(false)}>
        <div className="space-y-6 text-zinc-400 text-sm leading-relaxed">
          <p>Deduce the mystery race from 2000-2025 using 6 hints. Clues unlock after each failed attempt.</p>
          <div className="space-y-3 pt-2">
            {FEEDBACK_LEGEND.map(l => (
              <div key={l.label} className="flex gap-5 items-center">
                <div className={`w-8 h-8 rounded-lg ${l.color} flex items-center justify-center text-lg shadow-lg`}>{l.emoji}</div>
                <p className="text-xs font-bold text-zinc-300">{l.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>}

      {showStats && <Modal title="Results" onClose={() => setShowStats(false)}>
        <div className="space-y-10">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50"><div className="text-xl font-black text-white">{stats.gamesPlayed}</div><div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Played</div></div>
            <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50"><div className="text-xl font-black text-white">{stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}</div><div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Win %</div></div>
            <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50"><div className="text-xl font-black text-white">{stats.currentStreak}</div><div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Streak</div></div>
            <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50"><div className="text-xl font-black text-white">{stats.maxStreak}</div><div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Best</div></div>
          </div>
          
          <div>
            <h4 className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] mb-4">Attempt Distribution</h4>
            <div className="space-y-2">
              {stats.guessDistribution.map((count, i) => {
                const max = Math.max(...stats.guessDistribution, 1);
                const width = `${Math.max(10, (count / max) * 100)}%`;
                const isCurrent = state.status === 'won' && state.guesses.length === i + 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-zinc-800 w-3">{i + 1}</span>
                    <div 
                      className={`h-6 flex items-center justify-end px-3 text-[10px] font-black rounded-lg transition-all duration-1000 ${isCurrent ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-zinc-900 text-zinc-500'}`} 
                      style={{ width }}
                    >
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex items-center justify-between">
            <button 
              onClick={shareResults} 
              className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
            >
              Share Results
            </button>
            <div className="text-right">
              <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Next Challenge</p>
              <p className="text-xl font-black mono text-white">{countdown}</p>
            </div>
          </div>
        </div>
      </Modal>}

      {showHints && <Modal title="Intelligence" onClose={() => setShowHints(false)}>
        <div className="space-y-8">
          <p className="text-[10px] text-zinc-700 uppercase tracking-widest text-center font-black">Request Field Intel</p>
          <div className="space-y-4">
             <button 
              disabled={state.hintsRevealed.country}
              onClick={() => toggleHint('country')}
              className="w-full flex items-center justify-between p-5 bg-black border border-zinc-900 rounded-2xl hover:border-red-600/50 transition-all group disabled:opacity-30 disabled:grayscale"
             >
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-red-500">Venue Region</span>
               <span className="text-sm font-black text-white">{state.hintsRevealed.country ? state.currentRace?.country : 'Unlock'}</span>
             </button>
             <button 
              disabled={state.hintsRevealed.winner}
              onClick={() => toggleHint('winner')}
              className="w-full flex items-center justify-between p-5 bg-black border border-zinc-900 rounded-2xl hover:border-red-600/50 transition-all group disabled:opacity-30 disabled:grayscale"
             >
               <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-red-500">Top Finisher</span>
               <span className="text-sm font-black text-white">{state.hintsRevealed.winner ? state.currentRace?.winner : 'Unlock'}</span>
             </button>
          </div>
          <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest text-center leading-relaxed">Revealing intel does not count as a guess attempt.</p>
        </div>
      </Modal>}
    </div>
  );
};

const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
    <div className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[3rem] p-10 shadow-[0_0_50px_rgba(0,0,0,1)] relative overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">{title}</h2>
        <button onClick={onClose} className="text-zinc-700 hover:text-red-600 p-2 transition-colors"><XIcon /></button>
      </div>
      {children}
    </div>
  </div>
);

const HelpIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const StatsIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>;
const BulbIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.32 1.25 4.34 3.12 5.5L9 18h6l.88-3.5A7 7 0 0 0 12 2z"/></svg>;
const XIcon = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default App;
