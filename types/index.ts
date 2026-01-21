export interface InternProfile {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  gender?: "M" | "F" | "O";
  position?: string;
  isStudent?: boolean;
  hasWifi?: boolean;
  location?: string;
  mobile?: string;
  audioIntroUrl?: string;
  audioIntroUploadedAt?: string;
  social?: {
    linkedin?: string;
    github?: string;
    twitter?: string;
    website?: string;
    instagram?: string;
    tasks?: string;
  };
  typingStats?: TypingStats;
}

export interface TypingStats {
  bestWPM: number;
  bestAccuracy: number;
  lastPlayed?: string; // ISO timestamp
  totalGamesPlayed?: number;
  gamesThisMonth?: number;
}

export interface GameResult {
  wpm: number;
  accuracy: number;
  correctChars: number;
  totalChars: number;
  isNewRecord: boolean;
  timestamp: string;
}
