import { Track } from '../types';

const FOLLOWED_TRACKS_KEY = 'soundpulse_followed_tracks_v1';
const FOLLOWED_ARTISTS_KEY = 'soundpulse_followed_artists_v1';

type FollowListener = () => void;
const listeners = new Set<FollowListener>();

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeToFollowChanges(callback: FollowListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Get all followed tracks
 */
export function getFollowedTracks(): Track[] {
  try {
    const raw = localStorage.getItem(FOLLOWED_TRACKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Check if a track is followed / favorited
 */
export function isTrackFollowed(trackIdOrTitle: string): boolean {
  if (!trackIdOrTitle) return false;
  const tracks = getFollowedTracks();
  const search = trackIdOrTitle.toLowerCase().trim();
  return tracks.some(t => t.id === trackIdOrTitle || t.title.toLowerCase().trim() === search);
}

/**
 * Toggle follow status for a track
 */
export function toggleFollowTrack(track: Track): boolean {
  if (!track) return false;
  const tracks = getFollowedTracks();
  const index = tracks.findIndex(
    t => t.id === track.id || t.title.toLowerCase().trim() === track.title.toLowerCase().trim()
  );

  let isNowFollowed = false;
  if (index >= 0) {
    tracks.splice(index, 1);
    isNowFollowed = false;
  } else {
    tracks.unshift({
      ...track,
      addedAt: new Date().toISOString()
    });
    isNowFollowed = true;
  }

  try {
    localStorage.setItem(FOLLOWED_TRACKS_KEY, JSON.stringify(tracks));
  } catch (e) {
    console.error('Failed to save followed tracks', e);
  }

  notifyListeners();
  return isNowFollowed;
}

/**
 * Get all followed artists
 */
export function getFollowedArtists(): string[] {
  try {
    const raw = localStorage.getItem(FOLLOWED_ARTISTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Check if an artist is followed
 */
export function isArtistFollowed(artistName: string): boolean {
  if (!artistName) return false;
  const artists = getFollowedArtists();
  const search = artistName.toLowerCase().trim();
  return artists.some(a => a.toLowerCase().trim() === search);
}

/**
 * Toggle follow status for an artist
 */
export function toggleFollowArtist(artistName: string): boolean {
  if (!artistName) return false;
  const artists = getFollowedArtists();
  const search = artistName.toLowerCase().trim();
  const index = artists.findIndex(a => a.toLowerCase().trim() === search);

  let isNowFollowed = false;
  if (index >= 0) {
    artists.splice(index, 1);
    isNowFollowed = false;
  } else {
    artists.unshift(artistName.trim());
    isNowFollowed = true;
  }

  try {
    localStorage.setItem(FOLLOWED_ARTISTS_KEY, JSON.stringify(artists));
  } catch (e) {
    console.error('Failed to save followed artists', e);
  }

  notifyListeners();
  return isNowFollowed;
}
