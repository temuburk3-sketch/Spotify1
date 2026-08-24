import { CollaborationEvent, Collaborator, Playlist } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

const CURRENT_USER_KEY = 'soundpulse_current_user';

export function getCurrentUser(): UserProfile {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }

  const sampleNames = ['Burak', 'Zeynep', 'Emre', 'Deniz', 'Can', 'Selin', 'Kaan', 'Elif'];
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
  const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  const newUser: UserProfile = {
    id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: randomName,
    avatar: randomAvatar
  };

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  return newUser;
}

export function updateCurrentUser(name: string, avatar?: string): UserProfile {
  const current = getCurrentUser();
  const updated = {
    ...current,
    name: name.trim() || current.name,
    avatar: avatar || current.avatar
  };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
  return updated;
}

export class CollaborationManager {
  private channel: BroadcastChannel | null = null;
  private listeners: ((event: CollaborationEvent) => void)[] = [];

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('soundpulse_collab_bus');
      this.channel.onmessage = (msg) => {
        if (msg.data && msg.data.type) {
          this.notifyListeners(msg.data);
        }
      };
    }

    // Storage fallback for cross-tab sync
    window.addEventListener('storage', (e) => {
      if (e.key === 'soundpulse_collab_last_event' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          this.notifyListeners(event);
        } catch {}
      }
    });
  }

  public subscribe(callback: (event: CollaborationEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public broadcast(playlistId: string, type: CollaborationEvent['type'], data: any) {
    const user = getCurrentUser();
    const event: CollaborationEvent = {
      id: `evt_${Date.now()}_${Math.random()}`,
      playlistId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      type,
      data,
      timestamp: new Date().toISOString()
    };

    if (this.channel) {
      this.channel.postMessage(event);
    }

    try {
      localStorage.setItem('soundpulse_collab_last_event', JSON.stringify(event));
    } catch {}

    this.notifyListeners(event);
  }

  private notifyListeners(event: CollaborationEvent) {
    this.listeners.forEach(l => l(event));
  }
}

export const collabManager = new CollaborationManager();
