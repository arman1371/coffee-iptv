import { useState, useEffect, useRef } from "preact/hooks";
import { configManager, onConfigChanged } from "./config-factory";

interface LogEntry {
  level: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: string;
}

const MAX_LOG_ENTRIES = 200;

// Global log store shared across all instances
const logEntries: LogEntry[] = [];
let logListeners: Array<(entries: LogEntry[]) => void> = [];

function notifyListeners() {
  logListeners.forEach((l) => l([...logEntries]));
}

function addLogEntry(level: LogEntry["level"], args: unknown[]) {
  const message = args
    .map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "object") {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(" ");

  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;

  logEntries.push({ level, message, timestamp });
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
  }
  notifyListeners();
}

// Patch console once globally
let consolePatchedByDebugPanel = false;

function patchConsole() {
  if (consolePatchedByDebugPanel) return;
  consolePatchedByDebugPanel = true;

  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);
  const origInfo = console.info.bind(console);

  console.log = (...args: unknown[]) => {
    origLog(...args);
    addLogEntry("log", args);
  };
  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    addLogEntry("warn", args);
  };
  console.error = (...args: unknown[]) => {
    origError(...args);
    addLogEntry("error", args);
  };
  console.info = (...args: unknown[]) => {
    origInfo(...args);
    addLogEntry("info", args);
  };
}

export function DebugPanel() {
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([...logEntries]);
  const [isExpanded, setIsExpanded] = useState(true);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function checkDebug() {
      try {
        await configManager.initialize();
        const enabled = await configManager.isDebugMode();
        if (!cancelled) {
          if (enabled) patchConsole();
          setDebugEnabled(enabled);
        }
      } catch {
        // silently ignore
      }
    }

    checkDebug();

    const unsubscribe = onConfigChanged(checkDebug);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Subscribe to log updates
  useEffect(() => {
    if (!debugEnabled) return;

    const listener = (entries: LogEntry[]) => {
      setLogs(entries);
    };
    logListeners.push(listener);
    return () => {
      logListeners = logListeners.filter((l) => l !== listener);
    };
  }, [debugEnabled]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScrollRef.current && logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  if (!debugEnabled) return null;

  const levelColor: Record<LogEntry["level"], string> = {
    log: "text-gray-300",
    info: "text-blue-400",
    warn: "text-yellow-400",
    error: "text-red-400",
  };

  const handleScroll = () => {
    const el = logBoxRef.current;
    if (!el) return;
    // If user scrolls up, disable auto-scroll; if at bottom, re-enable
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    autoScrollRef.current = atBottom;
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-black bg-opacity-90 border-t border-gray-600"
      style={{ maxHeight: isExpanded ? "220px" : "36px", transition: "max-height 0.2s ease" }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-b border-gray-700 select-none">
        <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">
          🐛 Debug Console
        </span>
        <div className="flex gap-2">
          <button
            className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-gray-700"
            onClick={() => {
              logEntries.splice(0, logEntries.length);
              setLogs([]);
              notifyListeners();
            }}
          >
            Clear
          </button>
          <button
            className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-gray-700"
            onClick={() => setIsExpanded((v) => !v)}
          >
            {isExpanded ? "▼ Hide" : "▲ Show"}
          </button>
        </div>
      </div>

      {/* Log area */}
      {isExpanded && (
        <div
          ref={logBoxRef}
          onScroll={handleScroll}
          className="overflow-y-auto font-mono text-xs leading-snug px-2 py-1"
          style={{ maxHeight: "180px" }}
        >
          {logs.length === 0 ? (
            <span className="text-gray-600 italic">No log entries yet…</span>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className={`flex gap-2 ${levelColor[entry.level]}`}>
                <span className="text-gray-500 shrink-0">{entry.timestamp}</span>
                <span className="text-gray-500 shrink-0 uppercase" style={{ minWidth: "3.2rem" }}>
                  [{entry.level}]
                </span>
                <span className="break-all whitespace-pre-wrap">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
