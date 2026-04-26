// Playlist Cache Factory - Selects the right cache manager based on environment

import {
  type IPlaylistCacheManager,
  PlaylistCacheManager,
} from "./playlist-cache-manager";
import { DevPlaylistCacheManager } from "./dev-playlist-cache-manager";

function isDevelopment(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === "development";
}

export function createPlaylistCacheManager(): IPlaylistCacheManager {
  if (isDevelopment()) {
    console.log("Using DevPlaylistCacheManager for development");
    return new DevPlaylistCacheManager();
  }
  return new PlaylistCacheManager();
}

export const playlistCacheManager = createPlaylistCacheManager();
