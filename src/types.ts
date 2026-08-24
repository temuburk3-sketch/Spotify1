export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  youtubeId?: string;
  startOffset?: number;
  source?: 'spotify' | 'local' | 'stream' | 'synth';
  spotifyId?: string;
  isOfflineCached?: boolean;
  fileBlob?: Blob;
  lyrics?: string[];
  timedLyrics?: { time: number; text: string }[];
  addedAt: string;
  addedBy?: {
    id: string;
    name: string;
    avatar: string;
  };
  upvotes?: number;
  genre?: string;
  recommendationReason?: string;
  matchScore?: number;
}

export interface ListeningHistoryItem {
  trackId: string;
  title: string;
  artist: string;
  genre: string;
  playedAt: string;
  durationSeconds: number;
  completed: boolean;
}

export interface ListeningHabitsSummary {
  totalPlays: number;
  totalDurationSeconds: number;
  topGenres: { genre: string; count: number; percentage: number }[];
  topArtists: { artist: string; count: number }[];
  recentTracks: { title: string; artist: string; playedAt: string }[];
  dominantVibe: string;
}

export interface SmartRecommendationOptions {
  mood?: 'all' | 'energetic' | 'chill' | 'focus' | 'acoustic' | 'retro' | 'driving' | 'turkish';
  count?: number;
  targetPlaylistId?: string;
  playlistTracks?: { title: string; artist: string; genre?: string }[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  coverConfig?: {
    type: 'gradient' | 'image' | 'solid';
    gradientStart?: string;
    gradientEnd?: string;
    gradientAngle?: number;
    icon?: string;
    text?: string;
    textColor?: string;
  };
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
  isCollaborative: boolean;
  roomCode?: string;
  collaborators?: Collaborator[];
  isDownloadedOffline?: boolean;
  spotifySourceUrl?: string;
  colorTheme?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastActive: string;
}

export interface CollaborationEvent {
  id: string;
  playlistId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'track_added' | 'track_removed' | 'track_reordered' | 'cover_updated' | 'track_upvoted' | 'user_joined';
  data: any;
  timestamp: string;
}

export interface AudioSettings {
  volume: number;
  muted: boolean;
  playbackRate: number;
  crossfade: number; // in seconds (0 to 12)
  eqPreset: string;
  eqBands: {
    bass: number;
    midLow: number;
    mid: number;
    midHigh: number;
    treble: number;
  };
  bassBoost: boolean;
  spatialAudio: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';
