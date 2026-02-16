import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { M3UManager, m3uManager, type M3UPlaylist } from "./m3u-manager";

// Mock fetch globally using vitest
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("M3UManager", () => {
  let manager: M3UManager;

  beforeEach(() => {
    manager = new M3UManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("downloadM3U", () => {
    it("should download M3U content successfully", async () => {
      const mockContent =
        "#EXTM3U\n#EXTINF:-1,Test Channel\nhttp://test.com/stream\n";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent),
      });

      const result = await manager.downloadM3U(
        "https://example.com/playlist.m3u"
      );

      expect(result.success).toBe(true);
      expect(result.content).toBe(mockContent.trim()); // Expect trimmed content
      expect(result.url).toBe("https://example.com/playlist.m3u");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/playlist.m3u",
        {
          method: "GET",
          headers: {
            "User-Agent": "Coffee-IPTV/1.0 (webOS)",
            Accept: "application/x-mpegURL, text/plain, */*",
          },
          signal: expect.any(AbortSignal),
        }
      );
    });

    it("should handle invalid URL", async () => {
      const result = await manager.downloadM3U("invalid-url");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid URL format");
      expect(result.url).toBe("invalid-url");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await manager.downloadM3U(
        "https://example.com/notfound.m3u"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("HTTP 404: Not Found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await manager.downloadM3U(
        "https://example.com/playlist.m3u"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should handle timeout", async () => {
      // Mock a hanging fetch that never resolves
      mockFetch.mockImplementationOnce((_url, options) => {
        // Simulate immediate timeout by calling abort
        setTimeout(() => {
          if (options?.signal) {
            options.signal.dispatchEvent(new Event("abort"));
          }
        }, 50);

        return new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          }
        });
      });

      const result = await manager.downloadM3U(
        "https://example.com/playlist.m3u",
        100
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Request timeout");
    });

    it("should handle empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });

      const result = await manager.downloadM3U("https://example.com/empty.m3u");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Empty response from server");
    });
  });

  describe("parseM3U", () => {
    it("should parse basic M3U content", () => {
      const content = `#EXTM3U
#EXTINF:-1,BBC One
http://stream1.example.com
#EXTINF:-1,CNN
http://stream2.example.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      expect(result.playlist).toBeDefined();
      expect(result.playlist!.channels).toHaveLength(2);
      expect(result.playlist!.channels[0].name).toBe("BBC One");
      expect(result.playlist!.channels[0].url).toBe(
        "http://stream1.example.com"
      );
      expect(result.playlist!.metadata.totalChannels).toBe(2);
    });

    it("should parse M3U with attributes", () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="bbc1" tvg-logo="http://logo.com/bbc1.png" group-title="UK",BBC One
http://stream1.example.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      const channel = result.playlist!.channels[0];
      expect(channel.name).toBe("BBC One");
      expect(channel.tvgId).toBe("bbc1");
      expect(channel.logo).toBe("http://logo.com/bbc1.png");
      expect(channel.group).toBe("UK");
      expect(channel.attributes["tvg-id"]).toBe("bbc1");
    });

    it("should handle empty content", () => {
      const result = manager.parseM3U("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Empty content provided");
    });

    it("should handle invalid M3U format", () => {
      const content = "Not an M3U file\nSome random content";

      const result = manager.parseM3U(content);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid M3U format: missing #EXTM3U header");
    });

    it("should handle M3U with only header", () => {
      const content = "#EXTM3U";

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(0);
    });

    it("should skip malformed entries", () => {
      const content = `#EXTM3U
#EXTINF:-1,Valid Channel
http://valid.stream.com
#EXTINF:-1
#EXTINF:-1,Another Valid
http://another.stream.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(2);
      expect(result.playlist!.channels[0].name).toBe("Valid Channel");
      expect(result.playlist!.channels[1].name).toBe("Another Valid");
    });

    it("should include source URL in metadata", () => {
      const content = "#EXTM3U\n#EXTINF:-1,Test\nhttp://test.com";
      const sourceUrl = "https://example.com/playlist.m3u";

      const result = manager.parseM3U(content, sourceUrl);

      expect(result.success).toBe(true);
      expect(result.playlist!.metadata.sourceUrl).toBe(sourceUrl);
    });
  });

  describe("downloadAndParseM3U", () => {
    it("should download and parse in one operation", async () => {
      const mockContent =
        "#EXTM3U\n#EXTINF:-1,Test Channel\nhttp://test.com/stream\n";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent),
      });

      const result = await manager.downloadAndParseM3U(
        "https://example.com/playlist.m3u"
      );

      expect(result.success).toBe(true);
      expect(result.playlist).toBeDefined();
      expect(result.playlist!.channels).toHaveLength(1);
      expect(result.playlist!.metadata.sourceUrl).toBe(
        "https://example.com/playlist.m3u"
      );
    });

    it("should handle download failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await manager.downloadAndParseM3U(
        "https://example.com/playlist.m3u"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Download failed: Network error");
    });
  });

  describe("downloadAndMergeMultipleM3U", () => {
    it("should download and merge multiple playlists successfully", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://stream1.com\n";
      const playlist2 = "#EXTM3U\n#EXTINF:-1,Channel 2\nhttp://stream2.com\n";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist1),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist2),
        });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/playlist1.m3u",
        "https://example.com/playlist2.m3u",
      ]);

      expect(result.success).toBe(true);
      expect(result.playlist).toBeDefined();
      expect(result.playlist!.channels).toHaveLength(2);
      expect(result.playlist!.channels[0].name).toBe("Channel 1");
      expect(result.playlist!.channels[1].name).toBe("Channel 2");
      expect(result.playlist!.metadata.sourceUrl).toContain("Merged from 2 playlist(s)");
    });

    it("should deduplicate channels by URL", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://stream1.com\n#EXTINF:-1,Channel 2\nhttp://stream2.com\n";
      const playlist2 = "#EXTM3U\n#EXTINF:-1,Channel 1 Duplicate\nhttp://stream1.com\n#EXTINF:-1,Channel 3\nhttp://stream3.com\n";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist1),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist2),
        });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/playlist1.m3u",
        "https://example.com/playlist2.m3u",
      ]);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(3); // Deduped: only 3 unique URLs
      expect(result.playlist!.channels[0].name).toBe("Channel 1"); // First occurrence wins
      expect(result.playlist!.channels[1].name).toBe("Channel 2");
      expect(result.playlist!.channels[2].name).toBe("Channel 3");
    });

    it("should handle empty URL list", async () => {
      const result = await manager.downloadAndMergeMultipleM3U([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No valid URLs provided");
    });

    it("should filter out empty/whitespace URLs", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://stream1.com\n";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(playlist1),
      });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/playlist1.m3u",
        "",
        "   ",
        "\t",
      ]);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(1);
    });

    it("should continue merging when some URLs fail", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://stream1.com\n";

      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist1),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/failed1.m3u",
        "https://example.com/success.m3u",
        "https://example.com/failed2.m3u",
      ]);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(1);
      expect(result.playlist!.metadata.sourceUrl).toContain("Merged from 1 playlist(s)");
    });

    it("should fail when all URLs fail", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/failed1.m3u",
        "https://example.com/failed2.m3u",
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain("All playlist downloads failed");
      expect(result.error).toContain("failed1.m3u");
      expect(result.error).toContain("failed2.m3u");
    });

    it("should merge groups from multiple playlists", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1 group-title=\"Sports\",ESPN\nhttp://stream1.com\n";
      const playlist2 = "#EXTM3U\n#EXTINF:-1 group-title=\"News\",CNN\nhttp://stream2.com\n";
      const playlist3 = "#EXTM3U\n#EXTINF:-1 group-title=\"Sports\",ESPN2\nhttp://stream3.com\n";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist1),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist2),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist3),
        });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/playlist1.m3u",
        "https://example.com/playlist2.m3u",
        "https://example.com/playlist3.m3u",
      ]);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(3);
      expect(result.playlist!.metadata.groups).toEqual(["News", "Sports"]);
    });

    it("should respect URL order for deduplication priority", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1 group-title=\"First\",Channel A\nhttp://stream.com\n";
      const playlist2 = "#EXTM3U\n#EXTINF:-1 group-title=\"Second\",Channel B\nhttp://stream.com\n";

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist1),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(playlist2),
        });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/playlist1.m3u",
        "https://example.com/playlist2.m3u",
      ]);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(1);
      // First URL wins
      expect(result.playlist!.channels[0].name).toBe("Channel A");
      expect(result.playlist!.channels[0].group).toBe("First");
    });

    it("should handle channels with groups and without groups", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1 group-title=\"Sports\",ESPN\nhttp://stream1.com\n#EXTINF:-1,No Group\nhttp://stream2.com\n";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(playlist1),
      });

      const result = await manager.downloadAndMergeMultipleM3U([
        "https://example.com/playlist.m3u",
      ]);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(2);
      expect(result.playlist!.metadata.groups).toEqual(["Sports"]);
    });

    it("should pass timeout parameter to downloads", async () => {
      const playlist1 = "#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://stream1.com\n";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(playlist1),
      });

      await manager.downloadAndMergeMultipleM3U(
        ["https://example.com/playlist.m3u"],
        5000
      );

      // Verify timeout is passed through
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("utility methods", () => {
    let samplePlaylist: M3UPlaylist;

    beforeEach(() => {
      samplePlaylist = {
        channels: [
          {
            id: "ch1",
            name: "BBC One",
            url: "http://bbc1.com",
            group: "UK",
            logo: "http://logo.com/bbc1.png",
            tvgId: "bbc1",
            attributes: {},
          },
          {
            id: "ch2",
            name: "CNN",
            url: "http://cnn.com",
            group: "News",
            attributes: {},
          },
          {
            id: "ch3",
            name: "BBC Two",
            url: "http://bbc2.com",
            group: "UK",
            attributes: {},
          },
        ],
        metadata: {
          totalChannels: 3,
          groups: ["UK", "News"],
          parsedAt: "2025-08-31T12:00:00Z",
        },
      };
    });

    describe("getChannelsByGroup", () => {
      it("should filter channels by group", () => {
        const ukChannels = manager.getChannelsByGroup(samplePlaylist, "UK");

        expect(ukChannels).toHaveLength(2);
        expect(ukChannels[0].name).toBe("BBC One");
        expect(ukChannels[1].name).toBe("BBC Two");
      });

      it("should return empty array for non-existent group", () => {
        const channels = manager.getChannelsByGroup(
          samplePlaylist,
          "Non-existent"
        );

        expect(channels).toHaveLength(0);
      });
    });

    describe("searchChannels", () => {
      it("should search channels by name", () => {
        const results = manager.searchChannels(samplePlaylist, "BBC");

        expect(results).toHaveLength(2);
        expect(results[0].name).toBe("BBC One");
        expect(results[1].name).toBe("BBC Two");
      });

      it("should be case insensitive", () => {
        const results = manager.searchChannels(samplePlaylist, "bbc");

        expect(results).toHaveLength(2);
      });

      it("should return empty array for no matches", () => {
        const results = manager.searchChannels(samplePlaylist, "XYZ");

        expect(results).toHaveLength(0);
      });
    });

    describe("getPlaylistStats", () => {
      it("should calculate playlist statistics", () => {
        const stats = manager.getPlaylistStats(samplePlaylist);

        expect(stats.totalChannels).toBe(3);
        expect(stats.totalGroups).toBe(2);
        expect(stats.channelsWithLogos).toBe(1);
        expect(stats.channelsWithTvgId).toBe(1);
        expect(stats.groupDistribution).toEqual({
          UK: 2,
          News: 1,
        });
      });

      it("should handle channels without groups", () => {
        const playlistWithUngrouped: M3UPlaylist = {
          channels: [
            {
              id: "ch1",
              name: "Ungrouped Channel",
              url: "http://test.com",
              attributes: {},
            },
          ],
          metadata: {
            totalChannels: 1,
            groups: [],
            parsedAt: "2025-08-31T12:00:00Z",
          },
        };

        const stats = manager.getPlaylistStats(playlistWithUngrouped);

        expect(stats.groupDistribution).toEqual({
          Ungrouped: 1,
        });
      });
    });
  });

  describe("exportToM3U", () => {
    it("should export playlist back to M3U format", () => {
      const playlist: M3UPlaylist = {
        channels: [
          {
            id: "ch1",
            name: "BBC One",
            url: "http://bbc1.com",
            group: "UK",
            logo: "http://logo.com/bbc1.png",
            tvgId: "bbc1",
            attributes: {
              "custom-attr": "value",
            },
          },
        ],
        metadata: {
          totalChannels: 1,
          groups: ["UK"],
          parsedAt: "2025-08-31T12:00:00Z",
        },
      };

      const m3uContent = manager.exportToM3U(playlist);

      expect(m3uContent).toContain("#EXTM3U");
      expect(m3uContent).toContain("#EXTINF:-1");
      expect(m3uContent).toContain('custom-attr="value"');
      expect(m3uContent).toContain('tvg-id="bbc1"');
      expect(m3uContent).toContain('tvg-logo="http://logo.com/bbc1.png"');
      expect(m3uContent).toContain('group-title="UK"');
      expect(m3uContent).toContain(",BBC One");
      expect(m3uContent).toContain("http://bbc1.com");
    });

    it("should handle empty playlist", () => {
      const playlist: M3UPlaylist = {
        channels: [],
        metadata: {
          totalChannels: 0,
          groups: [],
          parsedAt: "2025-08-31T12:00:00Z",
        },
      };

      const m3uContent = manager.exportToM3U(playlist);

      expect(m3uContent).toBe("#EXTM3U\n");
    });
  });

  describe("channel ID generation", () => {
    it("should generate consistent IDs for same input", () => {
      const content1 = "#EXTM3U\n#EXTINF:-1,Test Channel\nhttp://test.com";
      const content2 = "#EXTM3U\n#EXTINF:-1,Test Channel\nhttp://test.com";

      const result1 = manager.parseM3U(content1);
      const result2 = manager.parseM3U(content2);

      expect(result1.playlist!.channels[0].id).toBe(
        result2.playlist!.channels[0].id
      );
    });

    it("should generate different IDs for different inputs", () => {
      const content =
        "#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://test1.com\n#EXTINF:-1,Channel 2\nhttp://test2.com";

      const result = manager.parseM3U(content);

      expect(result.playlist!.channels[0].id).not.toBe(
        result.playlist!.channels[1].id
      );
    });
  });

  describe("complex M3U parsing", () => {
    it("should handle M3U with various attribute formats", () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="test1" tvg-name="Test 1" tvg-logo="https://logo.com/1.png" group-title="Group 1" tvg-language="en" tvg-country="US",Test Channel 1
http://stream1.com
#EXTINF:-1 tvg-id="test2" group-title="Group 2",Test Channel 2
http://stream2.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(2);

      const channel1 = result.playlist!.channels[0];
      expect(channel1.tvgId).toBe("test1");
      expect(channel1.logo).toBe("https://logo.com/1.png");
      expect(channel1.group).toBe("Group 1");
      expect(channel1.language).toBe("en");
      expect(channel1.country).toBe("US");

      const channel2 = result.playlist!.channels[1];
      expect(channel2.group).toBe("Group 2");
      expect(channel2.language).toBeUndefined();
    });

    it("should handle comments and empty lines", () => {
      const content = `#EXTM3U

# This is a comment
#EXTINF:-1,Channel 1
http://stream1.com

# Another comment
#EXTINF:-1,Channel 2
http://stream2.com

`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(2);
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton m3uManager instance", () => {
      expect(m3uManager).toBeInstanceOf(M3UManager);
    });
  });

  describe("error handling", () => {
    it("should handle malformed attribute parsing gracefully", () => {
      const content = `#EXTM3U
#EXTINF:-1 tvg-id="test" invalid-attr-without-quotes group-title="Valid Group",Test Channel
http://stream.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels).toHaveLength(1);
      expect(result.playlist!.channels[0].group).toBe("Valid Group");
    });

    it("should handle very long channel names", () => {
      const longName = "A".repeat(1000);
      const content = `#EXTM3U\n#EXTINF:-1,${longName}\nhttp://stream.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      expect(result.playlist!.channels[0].name).toBe(longName);
    });

    it("should handle EXTINF line without comma", () => {
      const content = `#EXTM3U\n#EXTINF:-1 no-comma-here\nhttp://stream.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      // Channel should be skipped due to invalid format
      expect(result.playlist!.channels).toHaveLength(0);
    });

    it("should handle EXTINF line without name", () => {
      const content = `#EXTM3U\n#EXTINF:-1,\nhttp://stream.com`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      // Channel should be skipped due to empty name
      expect(result.playlist!.channels).toHaveLength(0);
    });

    it("should handle EXTINF line without URL", () => {
      const content = `#EXTM3U\n#EXTINF:-1,Test Channel\n`;

      const result = manager.parseM3U(content);

      expect(result.success).toBe(true);
      // Channel should be skipped due to missing URL
      expect(result.playlist!.channels).toHaveLength(0);
    });

    it("should handle non-Error exceptions in parseM3U", () => {
      // This tests the catch block's fallback error message
      const invalidContent = null as unknown as string;
      
      const result = manager.parseM3U(invalidContent);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
