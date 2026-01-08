
export enum FeedbackColor {
  GREEN = 'bg-green-600',
  BLUE = 'bg-blue-600',
  YELLOW = 'bg-yellow-500',
  PURPLE = 'bg-purple-600',
  RED = 'bg-red-600',
}

export interface Clue {
  text: string;
  category: string;
}

export interface Race {
  year: number;
  gpName: string;
  winner: string;
  country: string;
  clues: Clue[];
  summary: string;
  facts: string[];
}

export interface Guess {
  year: number;
  gpName: string;
  feedback: FeedbackColor;
}

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: number[];
  currentStreak: number;
  maxStreak: number;
}

export interface GameState {
  currentRace: Race | null;
  guesses: Guess[];
  status: 'playing' | 'won' | 'lost';
  mode: 'daily' | 'practice';
  lastPlayedDate?: string;
  hintsRevealed: {
    winner: boolean;
    country: boolean;
  };
}
