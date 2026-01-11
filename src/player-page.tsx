import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import Hls from "hls.js";
import type { M3UChannel, M3UPlaylist } from "./m3u-manager";

interface PlayerPageProps {
  channel: M3UChannel;
  playlist: M3UPlaylist;
  currentChannelIndex: number;
  onChannelChange: (channel: M3UChannel, index: number) => void;
}

export function PlayerPage({
  channel,
  playlist,
  currentChannelIndex,
  onChannelChange,
}: PlayerPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolution, setResolution] = useState<string>("");
  const headerTimeoutRef = useRef<number | null>(null);
  const [channelInput, setChannelInput] = useState<string>("");
  const [showChannelInput, setShowChannelInput] = useState(false);
  const channelInputTimeoutRef = useRef<number | null>(null);

  const onBack = () => {
    window.history.back();
  };

  // Channel navigation functions wrapped in useCallback
  const goToNextChannel = useCallback(() => {
    const nextIndex = (currentChannelIndex + 1) % playlist.channels.length;
    const nextChannel = playlist.channels[nextIndex];
    onChannelChange(nextChannel, nextIndex);
  }, [currentChannelIndex, playlist.channels, onChannelChange]);

  const goToPreviousChannel = useCallback(() => {
    const prevIndex =
      currentChannelIndex === 0
        ? playlist.channels.length - 1
        : currentChannelIndex - 1;
    const prevChannel = playlist.channels[prevIndex];
    onChannelChange(prevChannel, prevIndex);
  }, [currentChannelIndex, playlist.channels, onChannelChange]);

  // Go to specific channel by number (1-based index)
  const goToChannelByNumber = useCallback(
    (channelNumber: number) => {
      const channelIndex = channelNumber - 1; // Convert to 0-based index
      if (channelIndex >= 0 && channelIndex < playlist.channels.length) {
        const targetChannel = playlist.channels[channelIndex];
        onChannelChange(targetChannel, channelIndex);
      }
    },
    [playlist.channels, onChannelChange]
  );

  // Handle number input with timeout
  const handleNumberInput = useCallback(
    (digit: string) => {
      // Clear existing timeout
      if (channelInputTimeoutRef.current) {
        clearTimeout(channelInputTimeoutRef.current);
      }

      // Update channel input
      const newInput = channelInput + digit;
      setChannelInput(newInput);
      setShowChannelInput(true);

      // Set timeout to execute channel change after 2 seconds of no input
      channelInputTimeoutRef.current = setTimeout(() => {
        const channelNumber = parseInt(newInput, 10);
        if (!isNaN(channelNumber) && channelNumber > 0) {
          goToChannelByNumber(channelNumber);
        }
        // Clear the input display
        setChannelInput("");
        setShowChannelInput(false);
      }, 2000); // 2 second timeout
    },
    [channelInput, goToChannelByNumber]
  );

  // Auto-hide header after 10 seconds, but only when video is playing
  useEffect(() => {
    const resetHeaderTimeout = () => {
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current);
      }

      setShowHeader(true);

      // Only start timeout if video is playing (not loading or paused)
      if (isPlaying && !isLoading && !error) {
        headerTimeoutRef.current = setTimeout(() => {
          setShowHeader(false);
        }, 10000);
      }
    };

    const handleMouseMove = () => {
      resetHeaderTimeout();
    };

    const handleKeyDown = () => {
      resetHeaderTimeout();
    };

    // Start/restart the timeout when playing state changes
    resetHeaderTimeout();

    // Add event listeners only if video is playing
    if (isPlaying && !isLoading && !error) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (headerTimeoutRef.current) {
        clearTimeout(headerTimeoutRef.current);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying, isLoading, error]);

  // Cleanup channel input timeout on component unmount
  useEffect(() => {
    return () => {
      if (channelInputTimeoutRef.current) {
        clearTimeout(channelInputTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = channel.url;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setError(null);
    setResolution("");

    const updateResolution = () => {
      if (video.videoWidth && video.videoHeight) {
        setResolution(`${video.videoWidth}x${video.videoHeight}`);
      }
    };

    const initializePlayer = () => {
      if (Hls.isSupported()) {
        // HLS.js is supported
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 60,
          maxMaxBufferLength: 90,
          liveDurationInfinity: true,
          startFragPrefetch: true,
        });

        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.error("Auto-play failed:", err);
            });
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
          updateResolution();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error("HLS Error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError("Network error - check your connection");
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError("Media error - stream format not supported");
                break;
              default:
                setError("Fatal error occurred while loading stream");
                break;
            }
            setIsLoading(false);
          }
        });
      } else {
        setError("HLS is not supported in this browser");
        setIsLoading(false);
      }
    };

    initializePlayer();

    // Video event listeners
    const handleError = () => {
      setError("Video playback error");
      setIsLoading(false);
    };

    const handleLoadedMetadata = () => {
      updateResolution();
    };

    const handleResize = () => {
      updateResolution();
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener("error", handleError);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("resize", handleResize);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    // Cleanup
    return () => {
      video.removeEventListener("error", handleError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("resize", handleResize);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel.url]);

  // Handle keyboard navigation for WebOS - channel switching and number input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle number keys (0-9) for channel selection
      if (event.key >= "0" && event.key <= "9") {
        // Number keys 0-9
        event.preventDefault();
        handleNumberInput(event.key);
        return;
      }

      // Only handle channel navigation keys, let WebOS handle back button via History API
      switch (event.keyCode) {
        case 38: // Up arrow
        case 33: // Channel Up (if available)
          event.preventDefault();
          goToNextChannel();
          return;
        case 40: // Down arrow
        case 34: // Channel Down (if available)
          event.preventDefault();
          goToPreviousChannel();
          return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goToNextChannel, goToPreviousChannel, handleNumberInput]);

  const handleRetry = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.load();
      setError(null);
      setIsLoading(true);
    }
  };

  return (
    <div className="fixed left-0 top-0 z-10 h-screen w-screen text-white">
      <div
        className={`absolute z-30 flex w-full p-6 transition-all duration-500 ${showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}
      >
        <button
          className="h-12 cursor-pointer rounded-md bg-gray-800 px-4"
          onClick={onBack}
        >
          ← Back
        </button>
        <div className="flex flex-1 flex-col items-end">
          <div className="pb-4 text-3xl font-semibold">
            {showChannelInput ? (
              <span>{channelInput}</span>
            ) : (
              <span>{channel.name}</span>
            )}
          </div>
          <div className="flex gap-2">
            {channel.group && (
              <span className="rounded-3xl bg-gray-900 px-3 py-1">
                {channel.group}
              </span>
            )}
            {resolution && (
              <span className="rounded-3xl bg-gray-900 px-3 py-1">
                {resolution}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="h-full w-full">
        <video
          ref={videoRef}
          className="h-full w-full bg-black object-contain"
          controls={false}
          autoPlay
          muted={false}
          playsInline
        />

        {isLoading && (
          <div className="absolute left-0 top-0 z-20 flex h-full w-full flex-col items-center justify-center bg-black/80">
            <div className="h-15 w-15 mb-5 animate-spin rounded-full border-4 border-t-blue-500" />
            <p>Loading stream...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute left-0 top-0 z-20 flex h-full w-full flex-col items-center justify-center bg-black/80">
            <div className="mb-2 text-6xl">⚠️</div>
            <h2 className="text-3xl font-semibold">Playback Error</h2>
            <p className="p-4 text-base">{error}</p>
            <div className="flex gap-4">
              <button
                className="mt-5 cursor-pointer rounded-md bg-gray-950 p-3 text-white hover:bg-gray-900"
                onClick={handleRetry}
              >
                Retry
              </button>
              <button
                className="mt-5 cursor-pointer rounded-md bg-gray-800 p-3 text-white hover:bg-gray-700"
                onClick={onBack}
              >
                Back to Channels
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
