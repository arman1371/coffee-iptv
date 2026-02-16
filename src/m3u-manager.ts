// M3U Manager for Coffee IPTV
// Handles M3U playlist parsing and downloading

export interface M3UChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  language?: string;
  country?: string;
  tvgId?: string;
  attributes: Record<string, string>;
}

export interface M3UPlaylist {
  channels: M3UChannel[];
  metadata: {
    totalChannels: number;
    groups: string[];
    parsedAt: string;
    sourceUrl?: string;
  };
}

export interface M3UParseResult {
  success: boolean;
  playlist?: M3UPlaylist;
  error?: string;
}

export interface M3UDownloadResult {
  success: boolean;
  content?: string;
  error?: string;
  url: string;
}

export class M3UManager {
  private readonly userAgent = "Coffee-IPTV/1.0 (webOS)";

  /**
   * Download M3U content from a URL
   */
  async downloadM3U(
    url: string,
    timeout: number = 30000
  ): Promise<M3UDownloadResult> {
    try {
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          error: "Invalid URL format",
          url,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/x-mpegURL, text/plain, */*",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          url,
        };
      }

      const content = await response.text();

      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: "Empty response from server",
          url,
        };
      }

      return {
        success: true,
        content: content.trim(),
        url,
      };
    } catch (error) {
      let errorMessage = "Unknown error occurred";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timeout";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        url,
      };
    }
  }

  /**
   * Parse M3U content string into structured data
   */
  parseM3U(content: string, sourceUrl?: string): M3UParseResult {
    try {
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: "Empty content provided",
        };
      }

      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        return {
          success: false,
          error: "No valid lines found in content",
        };
      }

      // Check if it's a valid M3U file
      if (!lines[0].startsWith("#EXTM3U")) {
        return {
          success: false,
          error: "Invalid M3U format: missing #EXTM3U header",
        };
      }

      const channels: M3UChannel[] = [];
      const groups = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("#EXTINF:")) {
          // Parse channel info line
          const nextLine = lines[i + 1];
          if (nextLine && !nextLine.startsWith("#")) {
            const channel = this.parseExtInfLine(line, nextLine);
            if (channel) {
              channels.push(channel);
              if (channel.group) {
                groups.add(channel.group);
              }
            }
            i++; // Skip the URL line since we've processed it
          }
        }
      }

      const playlist: M3UPlaylist = {
        channels,
        metadata: {
          totalChannels: channels.length,
          groups: Array.from(groups).sort((a, b) => a.localeCompare(b)),
          parsedAt: new Date().toISOString(),
          sourceUrl,
        },
      };

      return {
        success: true,
        playlist,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse M3U content",
      };
    }
  }

  /**
   * Download and parse M3U from URL in one operation
   */
  async downloadAndParseM3U(
    url: string,
    timeout?: number
  ): Promise<M3UParseResult> {
    const downloadResult = await this.downloadM3U(url, timeout);

    if (!downloadResult.success || !downloadResult.content) {
      return {
        success: false,
        error: `Download failed: ${downloadResult.error}`,
      };
    }

    return this.parseM3U(downloadResult.content, url);
  }

  /**
   * Download and merge multiple M3U playlists
   * Downloads all URLs in parallel, merges channels, and deduplicates by URL
   */
  async downloadAndMergeMultipleM3U(
    urls: string[],
    timeout?: number
  ): Promise<M3UParseResult> {
    // Filter out empty/whitespace URLs
    const cleanUrls = urls
      .map(url => url.trim())
      .filter(url => url !== '');

    if (cleanUrls.length === 0) {
      return {
        success: false,
        error: 'No valid URLs provided',
      };
    }

    // Download all playlists in parallel using Promise.allSettled
    const downloadPromises = cleanUrls.map(url => 
      this.downloadAndParseM3U(url, timeout)
    );

    const results = await Promise.allSettled(downloadPromises);

    // Extract successful playlists
    const successfulPlaylists: M3UPlaylist[] = [];
    const failedUrls: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success && result.value.playlist) {
        successfulPlaylists.push(result.value.playlist);
      } else {
        failedUrls.push(cleanUrls[index]);
      }
    });

    // If all URLs failed, return error
    if (successfulPlaylists.length === 0) {
      return {
        success: false,
        error: `All playlist downloads failed. Failed URLs: ${failedUrls.join(', ')}`,
      };
    }

    // Merge playlists with deduplication by channel URL
    const seenUrls = new Set<string>();
    const mergedChannels: M3UChannel[] = [];
    const allGroups = new Set<string>();

    // Process playlists in order (first URL has priority for duplicates)
    for (const playlist of successfulPlaylists) {
      for (const channel of playlist.channels) {
        // Deduplicate by channel URL
        if (!seenUrls.has(channel.url)) {
          seenUrls.add(channel.url);
          mergedChannels.push(channel);
        }
        
        // Collect all unique groups
        if (channel.group) {
          allGroups.add(channel.group);
        }
      }
    }

    // Create merged playlist
    const mergedPlaylist: M3UPlaylist = {
      channels: mergedChannels,
      metadata: {
        totalChannels: mergedChannels.length,
        groups: Array.from(allGroups).sort((a, b) => a.localeCompare(b)),
        parsedAt: new Date().toISOString(),
        sourceUrl: `Merged from ${successfulPlaylists.length} playlist(s)`,
      },
    };

    return {
      success: true,
      playlist: mergedPlaylist,
    };
  }

  /**
   * Get channels filtered by group
   */
  getChannelsByGroup(playlist: M3UPlaylist, groupName: string): M3UChannel[] {
    return playlist.channels.filter((channel) => channel.group === groupName);
  }

  /**
   * Search channels by name
   */
  searchChannels(playlist: M3UPlaylist, query: string): M3UChannel[] {
    const lowercaseQuery = query.toLowerCase();
    return playlist.channels.filter((channel) =>
      channel.name.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get playlist statistics
   */
  getPlaylistStats(playlist: M3UPlaylist): {
    totalChannels: number;
    totalGroups: number;
    channelsWithLogos: number;
    channelsWithTvgId: number;
    groupDistribution: Record<string, number>;
  } {
    const groupDistribution: Record<string, number> = {};
    let channelsWithLogos = 0;
    let channelsWithTvgId = 0;

    playlist.channels.forEach((channel) => {
      if (channel.group) {
        groupDistribution[channel.group] =
          (groupDistribution[channel.group] || 0) + 1;
      } else {
        groupDistribution["Ungrouped"] =
          (groupDistribution["Ungrouped"] || 0) + 1;
      }

      if (channel.logo) channelsWithLogos++;
      if (channel.tvgId) channelsWithTvgId++;
    });

    return {
      totalChannels: playlist.channels.length,
      totalGroups: playlist.metadata.groups.length,
      channelsWithLogos,
      channelsWithTvgId,
      groupDistribution,
    };
  }

  /**
   * Validate M3U URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Parse a single #EXTINF line and extract channel information
   */
  private parseExtInfLine(
    extinfLine: string,
    urlLine: string
  ): M3UChannel | null {
    try {
      // Remove #EXTINF: prefix
      const content = extinfLine.substring(8);

      // Split duration and attributes/name
      const commaIndex = content.indexOf(",");
      if (commaIndex === -1) return null;

      const attributesPart = content.substring(0, commaIndex);
      const namePart = content.substring(commaIndex + 1).trim();

      if (!namePart || !urlLine) return null;

      // Parse attributes - improved regex to handle various formats
      const attributes: Record<string, string> = {};
      const attributeRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
      let match;

      while ((match = attributeRegex.exec(attributesPart)) !== null) {
        attributes[match[1].toLowerCase()] = match[2];
      }

      // Generate ID from URL or name
      const id = this.generateChannelId(urlLine, namePart);

      const channel: M3UChannel = {
        id,
        name: namePart,
        url: urlLine,
        attributes,
      };

      // Extract common attributes
      if (attributes["tvg-logo"]) {
        channel.logo = attributes["tvg-logo"];
      }
      if (attributes["group-title"]) {
        channel.group = attributes["group-title"];
      }
      if (attributes["tvg-language"]) {
        channel.language = attributes["tvg-language"];
      }
      if (attributes["tvg-country"]) {
        channel.country = attributes["tvg-country"];
      }
      if (attributes["tvg-id"]) {
        channel.tvgId = attributes["tvg-id"];
      }

      return channel;
    } catch (error) {
      console.warn("Failed to parse EXTINF line:", extinfLine, error);
      return null;
    }
  }

  /**
   * Generate a unique ID for a channel
   */
  private generateChannelId(url: string, name: string): string {
    // Use a simple hash-like approach
    const input = `${url}-${name}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `ch_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Export playlist back to M3U format
   */
  exportToM3U(playlist: M3UPlaylist): string {
    let content = "#EXTM3U\n";

    playlist.channels.forEach((channel) => {
      let extinf = "#EXTINF:-1";

      // Add attributes
      Object.entries(channel.attributes).forEach(([key, value]) => {
        extinf += ` ${key}="${value}"`;
      });

      // Add standard attributes if not already present
      if (channel.tvgId && !channel.attributes["tvg-id"]) {
        extinf += ` tvg-id="${channel.tvgId}"`;
      }
      if (channel.logo && !channel.attributes["tvg-logo"]) {
        extinf += ` tvg-logo="${channel.logo}"`;
      }
      if (channel.group && !channel.attributes["group-title"]) {
        extinf += ` group-title="${channel.group}"`;
      }
      if (channel.language && !channel.attributes["tvg-language"]) {
        extinf += ` tvg-language="${channel.language}"`;
      }
      if (channel.country && !channel.attributes["tvg-country"]) {
        extinf += ` tvg-country="${channel.country}"`;
      }

      extinf += `,${channel.name}\n`;
      content += extinf;
      content += `${channel.url}\n`;
    });

    return content;
  }
}

// Export a singleton instance for easy use
export const m3uManager = new M3UManager();

// Export default for convenience
export default M3UManager;
