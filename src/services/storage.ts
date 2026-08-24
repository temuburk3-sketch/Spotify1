import { Playlist, Track, AudioSettings } from '../types';

const DB_NAME = 'SoundPulse_DB';
const DB_VERSION = 1;
const STORE_PLAYLISTS = 'playlists';
const STORE_AUDIO_CACHE = 'audio_cache';
const STORE_SETTINGS = 'settings';

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePlaylistsToDB(playlists: Playlist[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    
    // Clear & re-insert
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
    // Fallback to localStorage
    try {
      localStorage.setItem('soundpulse_playlists', JSON.stringify(playlists));
    } catch {}
  }
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
          // Check localStorage fallback
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
    store.clear();
  } catch (err) {
    console.error('Failed to clear cache:', err);
  }
}
