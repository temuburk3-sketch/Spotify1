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
  matchedLyric?: string;
  isOriginal?: boolean;
  popularity?: number;
  chartRank?: number;
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

export interface PlaylistFolder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  folderId?: string;
  group?: string;
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
  pitch?: number;
  crossfade: number; // in seconds (0 to 12)
  eqPreset: string;
  // 10-Band Parametric Equalizer: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz
  eq10Bands: {
    b32: number;
    b64: number;
    b125: number;
    b250: number;
    b500: number;
    b1k: number;
    b2k: number;
    b4k: number;
    b8k: number;
    b16k: number;
  };
  eqBands: {
    bass: number;
    midLow: number;
    mid: number;
    midHigh: number;
    treble: number;
  };
  bassBoost: boolean;
  subBassBoost: boolean;
  spatialAudio: boolean;
  spatial8DSpeed: number; // 0.1 to 2.0
  vocalRemover: boolean; // Karaoke vocal isolation / cancellation
  volumeNormalization: boolean; // ReplayGain Dynamics Compressor
  highQualityAudio: boolean; // 320kbps HD Audio preference
  slowedReverb: boolean; // Lo-fi Slowed & Reverb effect
}

export type RepeatMode = 'off' | 'all' | 'one';
export type ShuffleMode = 'off' | 'smart' | 'random';
