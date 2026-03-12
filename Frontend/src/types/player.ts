export interface Track {
  id: string | number;
  name: string;
  title?: string;
  artist: string;
  album?: string;
  cover_photo?: string;
  artworkUrl?: string; // Appears some parts use cover_photo, some use artworkUrl, we will normalize.
  hlsUrl?: string;
  audio_file?: string;
  hlsFailed?: boolean;
  duration?: number;
  genre?: string;
  year?: number | null;
  contextId?: string | number; // Added to identify which album/playlist the track came from
  [key: string]: any;
}

export type RepeatMode = 'off' | 'one' | 'all';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering';

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];
  queueIndex: number;
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  dominantColor: string;
  isFullPlayerOpen: boolean;
  isQueueOpen: boolean;
  userQueue: Track[]; // Tracks manually added by user
  history: Track[]; // Tracks already played
}
