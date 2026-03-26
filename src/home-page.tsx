import { useEffect, useState, useRef, useCallback } from "preact/hooks";
import type { M3UPlaylist, M3UChannel } from "./m3u-manager";

interface HomePageProps {
  playlist: M3UPlaylist | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onChannelClick: (channel: M3UChannel) => void;
  initialFocusIndex?: number;
}

export function HomePage({
  playlist,
  loading,
  error,
  onRetry,
  onChannelClick,
  initialFocusIndex = 0,
}: HomePageProps) {
  const [focusedChannelIndex, setFocusedChannelIndex] =
    useState(initialFocusIndex);
  const [channelsPerRow, setChannelsPerRow] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (index: number) => {
    setFocusedChannelIndex(index);
  };

  // Calculate channels per row dynamically
  const calculateChannelsPerRow = useCallback(() => {
    if (!gridRef.current || !playlist || playlist.channels.length === 0) return;

    const gridElement = gridRef.current;
    const firstCard = gridElement.querySelector(".channel-card") as HTMLElement;

    if (!firstCard) return;

    const gridRect = gridElement.getBoundingClientRect();
    const cardRect = firstCard.getBoundingClientRect();
    const gridStyles = window.getComputedStyle(gridElement);
    const gap = parseInt(gridStyles.gap, 10) || 30;

    // Calculate how many cards fit in one row
    const availableWidth = gridRect.width;
    const cardWidth = cardRect.width;
    const calculatedPerRow = Math.floor(
      (availableWidth + gap) / (cardWidth + gap)
    );

    setChannelsPerRow(Math.max(1, calculatedPerRow));
  }, [playlist]);

  // Recalculate on window resize and when playlist changes
  useEffect(() => {
    const handleResize = () => {
      // Small delay to ensure DOM has updated
      setTimeout(calculateChannelsPerRow, 100);
    };

    // Calculate initially
    setTimeout(calculateChannelsPerRow, 100);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [playlist, calculateChannelsPerRow]);

  // Handle WebOS remote navigation
  useEffect(() => {
    if (!playlist || playlist.channels.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const totalChannels = playlist.channels.length;
      const totalRows = Math.ceil(totalChannels / channelsPerRow);
      const currentRow = Math.floor(focusedChannelIndex / channelsPerRow);
      const currentCol = focusedChannelIndex % channelsPerRow;

      switch (event.keyCode) {
        case 37: // Left arrow
          event.preventDefault();
          if (currentCol > 0) {
            setFocusedChannelIndex(focusedChannelIndex - 1);
          }
          // Stay in place if already at first column
          break;

        case 39: // Right arrow
          event.preventDefault();
          if (
            currentCol < channelsPerRow - 1 &&
            focusedChannelIndex < totalChannels - 1
          ) {
            setFocusedChannelIndex(focusedChannelIndex + 1);
          }
          // Stay in place if already at last column or last channel
          break;

        case 38: // Up arrow
          event.preventDefault();
          if (currentRow > 0) {
            const newIndex = focusedChannelIndex - channelsPerRow;
            setFocusedChannelIndex(Math.max(0, newIndex));
          }
          break;

        case 40: // Down arrow
          event.preventDefault();
          if (currentRow < totalRows - 1) {
            const newIndex = focusedChannelIndex + channelsPerRow;
            setFocusedChannelIndex(Math.min(newIndex, totalChannels - 1));
          }
          break;

        case 13: // OK/Enter
          event.preventDefault();
          {
            const selectedChannel = playlist.channels[focusedChannelIndex];
            if (selectedChannel) {
              onChannelClick(selectedChannel);
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [playlist, focusedChannelIndex, onChannelClick, channelsPerRow]);

  // Handle scroll wheel for webOS Magic Remote
  // webOS doesn't natively scroll the page on wheel events, so we do it manually
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      window.scrollBy(0, event.deltaY);
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  // Auto-scroll to focused channel
  useEffect(() => {
    if (!gridRef.current || !playlist || playlist.channels.length === 0) return;

    const focusedCard = gridRef.current.querySelector(
      `[data-channel-index="${focusedChannelIndex}"]`
    ) as HTMLElement;
    if (focusedCard) {
      focusedCard.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [focusedChannelIndex, playlist]);

  // Reset focus when playlist changes, but use initialFocusIndex
  useEffect(() => {
    setFocusedChannelIndex(initialFocusIndex);
  }, [playlist, initialFocusIndex]);

  // Loading state
  if (loading) {
    return (
      <div
        className={`flex min-h-screen w-full items-center justify-center overflow-hidden bg-gray-900 p-6 pt-20 font-sans text-white`}
      >
        <div className="flex flex-col items-center">
          <div className="h-15 w-15 mb-5 animate-spin rounded-full border-4 border-t-blue-500" />
          <p>Loading channels...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`min-h-screen w-full overflow-hidden bg-gray-900 p-6 pt-20 font-sans text-white`}
      >
        <div className="flex flex-col items-center rounded-xl bg-gray-800 p-10">
          <div className="mb-2 text-6xl">⚠️</div>
          <h2 className="text-3xl font-semibold">Failed to Load Channels</h2>
          <p className="p-4 text-base">{error}</p>
          <button
            className="mt-5 cursor-pointer rounded-md bg-gray-950 p-3 text-white hover:bg-gray-900"
            onClick={onRetry}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty playlist state
  if (!playlist || playlist.channels.length === 0) {
    return (
      <div
        className={`min-h-screen w-full overflow-hidden bg-gray-900 p-6 pt-20 font-sans text-white`}
      >
        <div className="flex flex-col items-center rounded-xl bg-gray-800 p-10">
          <div className="mb-2 text-6xl">📺</div>
          <h2 className="text-3xl font-semibold">No Channels Found</h2>
          <p className="text-base">
            Your playlist appears to be empty or invalid.
          </p>
          <button
            className="mt-5 cursor-pointer rounded-md bg-gray-950 p-3 text-white hover:bg-gray-900"
            onClick={onRetry}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Channels grid
  const channels = playlist.channels;

  return (
    <div
      className={`min-h-screen w-full bg-gray-900 p-6 pt-20 font-sans text-white`}
    >
      <main>
        <section
          className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6"
          ref={gridRef}
        >
          {channels.map((channel, index) => (
            <div
              key={channel.id}
              className={`channel-card flex cursor-pointer items-center rounded-xl bg-gray-800 p-4 transition-all ${index === focusedChannelIndex ? "ring-4 ring-blue-500" : ""}`}
              onClick={() => onChannelClick(channel)}
              onMouseMove={() => handleMouseEnter(index)}
              data-channel-index={index}
            >
              <div className="order-2 flex">
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={`${channel.name} logo`}
                    className="h-20 w-20 rounded-md bg-gray-700 object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-gray-700 object-contain p-2 text-4xl">
                    📺
                  </div>
                )}
              </div>

              <div className="order-1 flex-1">
                <h3
                  className="truncate text-lg font-semibold"
                  title={channel.name}
                >
                  {channel.name}
                </h3>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
