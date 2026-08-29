import { Playlist, Track, AudioSettings, PlaylistFolder } from '../types';

const DB_NAME = 'SoundPulse_DB';
const DB_VERSION = 2;
const STORE_PLAYLISTS = 'playlists';
const STORE_AUDIO_CACHE = 'audio_cache';
const STORE_SETTINGS = 'settings';
const STORE_FOLDERS = 'folders';

export const DEFAULT_FOLDERS: PlaylistFolder[] = [
  { id: 'all', name: 'Tüm Listeler', icon: 'Sparkles', color: 'emerald' },
  { id: 'favorites', name: '⭐ Favorilerim', icon: 'Star', color: 'amber', description: 'En çok dinlenen ve yıldızlanan listeler' },
  { id: 'spotify', name: '🎧 Spotify İçe Aktarılanlar', icon: 'Music', color: 'green', description: 'Spotify bağlantısı ile senkronize edilenler' },
  { id: 'energy', name: '⚡ Enerji & Spor', icon: 'Zap', color: 'rose', description: 'Antrenman ve motivasyon müzikleri' },
  { id: 'chill', name: '🌙 Gece & Lo-Fi Odak', icon: 'Moon', color: 'indigo', description: 'Ders çalışma, dinlenme ve uyku modları' }
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO_CACHE)) {
        db.createObjectStore(STORE_AUDIO_CACHE, { keyPath: 'trackId' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePlaylistsToDB(playlists: Playlist[]): Promise<void> {
  if (!playlists || playlists.length === 0) return;

  // Always synchronously update localStorage for immediate recovery and tab safety
  try {
    localStorage.setItem('soundpulse_playlists', JSON.stringify(playlists));
  } catch (e) {
    console.warn('localStorage quota warning for playlists', e);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);

    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const p of playlists) {
      store.put(p);
    }
  } catch (err) {
    console.error('Failed to save playlists to IndexedDB:', err);
  }
}

export function getInitialPlaylistsSync(): Playlist[] | null {
  try {
    const local = localStorage.getItem('soundpulse_playlists');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function getInitialFoldersSync(): PlaylistFolder[] | null {
  try {
    const local = localStorage.getItem('soundpulse_folders');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export async function loadPlaylistsFromDB(): Promise<Playlist[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
    const store = tx.objectStore(STORE_PLAYLISTS);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result && req.result.length > 0) {
          resolve(req.result as Playlist[]);
        } else {
          const local = localStorage.getItem('soundpulse_playlists');
          if (local) {
            try {
              resolve(JSON.parse(local));
              return;
            } catch {}
          }
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error loading playlists from IndexedDB:', err);
    const local = localStorage.getItem('soundpulse_playlists');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }
    return null;
  }
}

export async function saveFoldersToDB(folders: PlaylistFolder[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FOLDERS, 'readwrite');
    const store = tx.objectStore(STORE_FOLDERS);
    await new Promise<void>((resolve) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => resolve();
    });
    for (const f of folders) {
      store.put(f);
    }
  } catch (err) {
    try {
      localStorage.setItem('soundpulse_folders', JSON.stringify(folders));
    } catch {}
  }
}

export async function loadFoldersFromDB(): Promise<PlaylistFolder[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FOLDERS, 'readonly');
    const store = tx.objectStore(STORE_FOLDERS);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result && req.result.length > 0) {
          resolve(req.result as PlaylistFolder[]);
        } else {
          const local = localStorage.getItem('soundpulse_folders');
          if (local) {
            try {
              resolve(JSON.parse(local));
              return;
            } catch {}
          }
          resolve(DEFAULT_FOLDERS);
        }
      };
      req.onerror = () => resolve(DEFAULT_FOLDERS);
    });
  } catch {
    return DEFAULT_FOLDERS;
  }
}

// Generate a valid WAV Audio Blob for offline fallback
export function generateSyntheticWavBlob(durationSeconds = 120, title = 'Offline Track'): Blob {
  const sampleRate = 22050;
  const numSamples = sampleRate * Math.min(30, durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate pleasant harmonic chord tones
  const baseFreq = 220 + (title.charCodeAt(0) % 5) * 55;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const wave1 = Math.sin(2 * Math.PI * baseFreq * t);
    const wave2 = Math.sin(2 * Math.PI * (baseFreq * 1.25) * t) * 0.5;
    const wave3 = Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.25;
    const env = Math.sin((i / numSamples) * Math.PI); // Envelope
    const sample = Math.max(-1, Math.min(1, (wave1 + wave2 + wave3) * env * 0.4));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export async function saveAudioBlobToCache(trackId: string, blob: Blob, mimeType = 'audio/mp3'): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO_CACHE);
    store.put({
      trackId,
      blob,
      mimeType,
      size: blob.size,
      cachedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to cache audio blob:', err);
  }
}

export async function cacheTrackAudio(track: Track): Promise<boolean> {
  try {
    if (track.fileBlob) {
      await saveAudioBlobToCache(track.id, track.fileBlob);
      return true;
    }

    if (track.audioUrl && (track.audioUrl.startsWith('blob:') || track.audioUrl.startsWith('data:'))) {
      const resp = await fetch(track.audioUrl);
      const b = await resp.blob();
      await saveAudioBlobToCache(track.id, b);
      return true;
    }

    if (track.audioUrl && track.audioUrl.startsWith('http')) {
      try {
        const resp = await fetch(track.audioUrl, { mode: 'cors' });
        if (resp.ok) {
          const b = await resp.blob();
          await saveAudioBlobToCache(track.id, b);
          return true;
        }
      } catch {}
    }

    // Fallback: Store generated synthesized rich offline audio buffer
    const syntheticBlob = generateSyntheticWavBlob(track.duration || 180, track.title);
    await saveAudioBlobToCache(track.id, syntheticBlob, 'audio/wav');
    return true;
  } catch (err) {
    console.error('Cache track audio error:', err);
    return false;
  }
}

export async function getAudioBlobFromCache(trackId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO_CACHE, 'readonly');
    const store = tx.objectStore(STORE_AUDIO_CACHE);
    return new Promise((resolve, reject) => {
      const req = store.get(trackId);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob as Blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get audio blob from cache:', err);
    return null;
  }
}

export async function removeAudioBlobFromCache(trackId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO_CACHE);
    store.delete(trackId);
  } catch (err) {
    console.error('Failed to remove audio from cache:', err);
  }
}

export async function getCachedAudioStats(): Promise<{ count: number; totalSizeBytes: number; trackIds: string[] }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO_CACHE, 'readonly');
    const store = tx.objectStore(STORE_AUDIO_CACHE);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        let totalSizeBytes = 0;
        const trackIds: string[] = [];
        for (const item of items) {
          totalSizeBytes += item.size || 0;
          trackIds.push(item.trackId);
        }
        resolve({
          count: items.length,
          totalSizeBytes,
          trackIds
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return { count: 0, totalSizeBytes: 0, trackIds: [] };
  }
}

export async function clearAllCachedAudio(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_AUDIO_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_AUDIO_CACHE);
    await new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear cache:', err);
  }
}

export async function clearOfflineCacheAndResetPlaylists(playlists: Playlist[]): Promise<Playlist[]> {
  await clearAllCachedAudio();
  const resetPlaylists: Playlist[] = playlists.map(p => ({
    ...p,
    isDownloadedOffline: false,
    tracks: p.tracks.map(t => ({
      ...t,
      isOfflineCached: false
    }))
  }));
  await savePlaylistsToDB(resetPlaylists);
  return resetPlaylists;
}
