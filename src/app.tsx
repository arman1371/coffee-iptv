import { useState, useEffect } from "preact/hooks";
import { configManager } from "./config-factory";
import { m3uManager, type M3UPlaylist, type M3UChannel } from "./m3u-manager";
import { Navigation } from "./navigation";
import { HomePage } from "./home-page";
import { ConfigPage } from "./config-page";
import { PlayerPage } from "./player-page";
import "./app.css";

export function App() {
  const [currentPage, setCurrentPage] = useState("Home");
  const [playlist, setPlaylist] = useState<M3UPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<M3UChannel | null>(
    null
  );
  const [selectedChannelIndex, setSelectedChannelIndex] = useState<number>(0);
  const [lastPlayedChannelIndex, setLastPlayedChannelIndex] =
    useState<number>(0);

  useEffect(() => {
    if (currentPage === "Home") {
      loadChannels();
    }
  }, [currentPage]);

  // Handle browser back button using History API
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.page) {
        setCurrentPage(state.page);
        if (state.page === "Home") {
          setSelectedChannel(null);
          // Don't reset selectedChannelIndex - keep the last played channel
        } else if (state.page === "Player" && state.channel) {
          setSelectedChannel(state.channel);
          setSelectedChannelIndex(state.channelIndex || 0);
        }
      } else {
        // No state, go to home
        setCurrentPage("Home");
        setSelectedChannel(null);
        // Don't reset selectedChannelIndex on initial load
      }
    };

    // Set initial state
    if (!window.history.state) {
      window.history.replaceState({ page: "Home" }, "", "");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize config manager and get M3U URL
      await configManager.initialize();
      const m3uUrl = await configManager.getM3uUrl();

      if (!m3uUrl || m3uUrl.trim() === "") {
        setError(
          "No M3U URL configured. Please set up your playlist URL in settings."
        );
        return;
      }

      // Download and parse M3U playlist
      const result = await m3uManager.downloadAndParseM3U(m3uUrl);

      if (!result.success || !result.playlist) {
        setError(result.error || "Failed to load playlist");
        return;
      }

      setPlaylist(result.playlist);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadChannels();
  };

  const onNavigate = (page: string) => {
    if (page === "home") {
      // Push home state to history
      window.history.pushState({ page: "Home" }, "", "");
      setCurrentPage("Home");
    } else if (page === "configuration") {
      // Push configuration state to history
      window.history.pushState({ page: "Configuration" }, "", "");
      setCurrentPage("Configuration");
    }
  };

  const handleChannelClick = (channel: M3UChannel) => {
    const channelIndex =
      playlist?.channels.findIndex((ch) => ch.id === channel.id) ?? 0;

    // Update last played channel index
    setLastPlayedChannelIndex(channelIndex);

    // Push player state to history
    window.history.pushState(
      {
        page: "Player",
        channel,
        channelIndex,
      },
      "",
      ""
    );

    setSelectedChannel(channel);
    setSelectedChannelIndex(channelIndex);
    setCurrentPage("Player");
  };

  const handleChannelChange = (newChannel: M3UChannel, newIndex: number) => {
    // Update last played channel index when channel changes in player
    setLastPlayedChannelIndex(newIndex);

    // Replace current player state with new channel
    window.history.replaceState(
      {
        page: "Player",
        channel: newChannel,
        channelIndex: newIndex,
      },
      "",
      ""
    );

    setSelectedChannel(newChannel);
    setSelectedChannelIndex(newIndex);
  };

  const renderCurrentPage = () => {
    if (currentPage === "Configuration") {
      return <ConfigPage />;
    }

    if (currentPage === "Player" && selectedChannel && playlist) {
      return (
        <PlayerPage
          channel={selectedChannel}
          playlist={playlist}
          currentChannelIndex={selectedChannelIndex}
          onChannelChange={handleChannelChange}
        />
      );
    }

    // Home page
    return (
      <HomePage
        playlist={playlist}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        onChannelClick={handleChannelClick}
        initialFocusIndex={lastPlayedChannelIndex}
      />
    );
  };

  return (
    <div className="app">
      <Navigation currentPage={currentPage} onNavigate={onNavigate} />
      {renderCurrentPage()}
    </div>
  );
}
