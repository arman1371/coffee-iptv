# AGENTS.md - Coffee IPTV Project Guide

## Project Overview

**Coffee IPTV** is a webOS TV application for viewing IPTV streams. It's built using Preact, TypeScript, and Tailwind CSS, specifically designed for LG webOS Smart TVs with full remote control navigation support.

- **App ID**: `com.arman.coffeeiptv`
- **Version**: 0.0.1
- **Platform**: LG webOS Smart TV
- **Primary Tech Stack**: Preact, TypeScript, Vite, Tailwind CSS, HLS.js

---

## Architecture Overview

### Core Application Structure

The application follows a single-page application (SPA) architecture with client-side routing using the History API. It consists of three main pages:

1. **Home Page** - Channel browser with grid layout
2. **Player Page** - Video player with HLS streaming support
3. **Configuration Page** - Settings management

### Key Architectural Patterns

- **Factory Pattern**: Used for configuration management (`config-factory.ts`)
- **Manager Pattern**: Modular managers for specific concerns (M3U, Database, Config)
- **Component-Based Architecture**: Preact functional components with hooks
- **Environment-Specific Implementations**: Separate implementations for dev/production environments

---

## Project Structure

```
coffee-iptv/
├── public/
│   ├── appinfo.json          # webOS app metadata
│   ├── config.json           # Development configuration
│   ├── icons/                # App icons
│   └── js/
│       └── webOSTVjs-1.2.10/ # webOS TV JavaScript SDK
├── src/
│   ├── app.tsx               # Main app component with routing
│   ├── main.tsx              # Application entry point
│   ├── navigation.tsx        # Sidebar navigation component
│   ├── home-page.tsx         # Channel grid page
│   ├── player-page.tsx       # Video player page
│   ├── config-page.tsx       # Configuration page
│   ├── config-manager.ts     # Production config manager (DB8)
│   ├── dev-config-manager.ts # Development config manager (file-based)
│   ├── config-factory.ts     # Config manager factory
│   ├── database-manager.ts   # webOS DB8 wrapper
│   ├── m3u-manager.ts        # M3U playlist parser
│   ├── webos-types.d.ts      # TypeScript definitions for webOS
│   ├── app.css               # Global styles
│   └── *.test.ts             # Unit tests
├── coverage/                 # Test coverage reports
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── eslint.config.js
```

---

## Core Components & Modules

### 1. App Component (`app.tsx`)

**Purpose**: Main application component that orchestrates routing, state management, and page rendering.

**Key Responsibilities**:

- Client-side routing using History API
- M3U playlist loading and management
- Channel selection and navigation state
- Browser back button handling
- Page rendering logic

**State Management**:

- `currentPage`: Current active page (Home, Configuration, Player)
- `playlist`: Loaded M3U playlist data
- `selectedChannel`: Currently playing channel
- `selectedChannelIndex`: Index of current channel
- `lastPlayedChannelIndex`: Resume playback position
- `loading`: Loading state
- `error`: Error messages

**Key Features**:

- History API integration for back button support
- Automatic channel resume on return to home
- Error handling and retry mechanisms

---

### 2. Home Page Component (`home-page.tsx`)

**Purpose**: Displays channel grid with TV remote navigation support.

**Key Features**:

- **Dynamic Grid Layout**: Auto-calculates channels per row based on screen size
- **Remote Control Navigation**: Arrow keys (up/down/left/right) and OK button
- **Keyboard Navigation**: Full keyboard support for development
- **Auto-scroll**: Automatically scrolls focused channel into view
- **Focus Management**: Maintains focus state across navigation
- **Mouse Support**: Mouse hover for desktop testing

**Navigation Logic**:

- Left/Right arrows: Navigate within row
- Up/Down arrows: Navigate between rows
- OK/Enter: Select channel to play
- Boundary detection: Prevents navigation beyond grid limits

**States**:

- Loading state with spinner
- Error state with retry button
- Empty playlist state
- Normal grid view

---

### 3. Player Page Component (`player-page.tsx`)

**Purpose**: Video player with HLS streaming and channel switching.

**Key Features**:

- **HLS.js Integration**: Adaptive bitrate streaming
- **Channel Navigation**: Previous/Next channel with remote
- **Direct Channel Entry**: Number input for quick channel selection
- **Auto-hiding Header**: Header disappears during playback
- **Resolution Display**: Shows current video resolution
- **Error Recovery**: Automatic retry on stream errors
- **Back Navigation**: History API integration

**HLS Configuration**:

```javascript
{
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 30,
  maxBufferLength: 60,
  maxMaxBufferLength: 90,
  liveDurationInfinity: true,
  startFragPrefetch: true
}
```

**Remote Controls**:

- **Back button**: Return to home
- **Channel Up/Down**: Switch channels
- **Number keys**: Direct channel entry (2-second timeout)
- **Play/Pause**: Control playback

**Auto-hide Header**:

- Shows on interaction (mouse, keyboard)
- Hides after 10 seconds of no interaction
- Only when video is playing

---

### 4. Configuration Page Component (`config-page.tsx`)

**Purpose**: User settings interface for managing app configuration.

**Configuration Options**:

- **M3U Playlist URL**: IPTV playlist source
- **Debug Mode**: Enable console debugging

**Features**:

- Real-time validation
- Save/Cancel buttons
- Error display
- Loading states
- History API back navigation

**Data Flow**:

1. Load current config from ConfigManager
2. Display in form with local state
3. On save: Write to ConfigManager → Navigate back
4. On cancel: Discard changes → Navigate back

---

### 5. Navigation Component (`navigation.tsx`)

**Purpose**: Slide-out sidebar menu for page navigation.

**Features**:

- Hamburger menu button
- Sliding sidebar animation
- Active page highlighting
- Backdrop overlay
- Keyboard accessible

**Menu Items**:

- Home
- Configuration

---

### 6. Configuration Management System

#### Config Factory (`config-factory.ts`)

**Purpose**: Factory pattern implementation that selects appropriate config manager based on environment.

```typescript
export function createConfigManager(): IConfigManager {
  if (isDevelopment()) {
    return new DevConfigManager();
  }
  return new ConfigManager();
}
```

**Environment Detection**:

- Development: `import.meta.env.DEV` or `import.meta.env.MODE === "development"`
- Production: webOS device

---

#### Production Config Manager (`config-manager.ts`)

**Purpose**: Production configuration manager using webOS DB8 database.

**Storage**: webOS DB8 (persistent database)

**Interface**:

```typescript
interface AppConfig {
  debugMode: boolean;
  m3uUrl: string;
}
```

**Key Methods**:

- `initialize()`: Creates DB8 kind/schema
- `getConfig<K>(key: K)`: Get single config value
- `setConfig<K>(key: K, value)`: Set single config value
- `getAllConfig()`: Get all config as object
- `isDebugMode()`: Convenience getter
- `setDebugMode(enabled)`: Convenience setter
- `getM3uUrl()`: Convenience getter
- `setM3uUrl(url)`: Convenience setter

**DB8 Kind**:

- **Kind ID**: `com.arman.coffeeiptv.config:1`
- **Owner**: `com.arman.coffeeiptv`
- **Private**: Yes (removed on app uninstall)
- **Indexes**: `keyIndex` on `key` field

**Default Values**:

```typescript
{
  debugMode: false,
  m3uUrl: ""
}
```

---

#### Development Config Manager (`dev-config-manager.ts`)

**Purpose**: Simplified file-based config manager for local development (no DB8 required).

**Storage**: `/public/config.json` file

**Features**:

- Read-only in browser
- No setConfig methods (development only)
- Loads from static JSON file
- Same interface as production manager

**Usage**: Automatically selected when running `npm run dev`

---

### 7. Database Manager (`database-manager.ts`)

**Purpose**: Type-safe wrapper around webOS DB8 Luna service.

**Luna Service**: `luna://com.palm.db`

**Key Methods**:

| Method          | Description             | Luna Method |
| --------------- | ----------------------- | ----------- |
| `find(query)`   | Query database objects  | `find`      |
| `put(objects)`  | Store/update objects    | `put`       |
| `putKind(kind)` | Register database kind  | `putKind`   |
| `createQuery()` | Helper to build queries | N/A         |
| `createKind()`  | Helper to build kinds   | N/A         |

**Type Definitions**:

- `DB8Query`: Query structure with from/where/select/orderBy
- `DB8Object`: Database object with \_id, \_kind, \_rev
- `DB8Kind`: Kind definition with id, owner, indexes
- `DB8SuccessResponse`: Success response structure
- `DB8ErrorResponse`: Error response structure

**Example Usage**:

```typescript
const dbManager = new DatabaseManager();

// Create kind
const kind = dbManager.createKind("com.app.data:1", "com.app.id", true, [
  { name: "index1", props: [{ name: "field" }] },
]);
await dbManager.putKind(kind);

// Query data
const query = dbManager.createQuery("com.app.data:1", [
  { prop: "field", op: "=", val: "value" },
]);
const results = await dbManager.find(query);

// Store data
await dbManager.put([
  {
    _kind: "com.app.data:1",
    field: "value",
  },
]);
```

---

### 8. M3U Manager (`m3u-manager.ts`)

**Purpose**: Download and parse M3U/M3U8 playlist files.

**Key Interfaces**:

```typescript
interface M3UChannel {
  id: string; // Unique identifier
  name: string; // Channel name
  url: string; // Stream URL
  logo?: string; // Channel logo URL
  group?: string; // Category/group
  language?: string; // Language code
  country?: string; // Country code
  tvgId?: string; // EPG ID
  attributes: Record<string, string>; // All EXTINF attributes
}

interface M3UPlaylist {
  channels: M3UChannel[];
  metadata: {
    totalChannels: number;
    groups: string[];
    parsedAt: string;
    sourceUrl?: string;
  };
}
```

**Key Methods**:

1. **`downloadM3U(url, timeout?)`**
   - Downloads M3U content from URL
   - Default timeout: 30 seconds
   - Custom User-Agent: "Coffee-IPTV/1.0 (webOS)"
   - Returns: `M3UDownloadResult`

2. **`parseM3U(content, sourceUrl?)`**
   - Parses M3U content string
   - Validates #EXTM3U header
   - Extracts channel info from #EXTINF lines
   - Returns: `M3UParseResult`

3. **`downloadAndParseM3U(url, timeout?)`**
   - Combined download + parse operation
   - Most commonly used method
   - Returns: `M3UParseResult`

**EXTINF Parsing**:

- Extracts tvg-id, tvg-name, tvg-logo
- Extracts group-title
- Extracts language, country
- Parses all attributes into key-value pairs
- Generates unique channel ID from URL

**Error Handling**:

- Network errors
- Timeout handling
- Invalid format detection
- Empty content validation
- HTTP error codes

---

## Navigation & Routing

### History API Integration

The app uses the browser History API for navigation with proper state management:

```typescript
// Navigating to a page
window.history.pushState({ page: "Home" }, "", "");

// Navigating to player with channel
window.history.pushState(
  {
    page: "Player",
    channel: channelObject,
    channelIndex: 5,
  },
  "",
  ""
);

// Handling back button
window.addEventListener("popstate", (event) => {
  const state = event.state;
  if (state && state.page) {
    setCurrentPage(state.page);
  }
});
```

**Benefits**:

- Native back button support on webOS remote
- Proper state restoration
- Browser back/forward compatibility
- No hash-based routing required

---

## WebOS Integration

### WebOS TV JavaScript SDK

**Version**: 1.2.10  
**Location**: `/public/js/webOSTVjs-1.2.10/`

**Global Object**: `window.webOS`

### Key WebOS Services

#### 1. DB8 Database Service

```typescript
window.webOS.service.request("luna://com.palm.db", {
  method: "find" | "put" | "putKind",
  parameters: {
    /* ... */
  },
  onSuccess: (response) => {
    /* ... */
  },
  onFailure: (error) => {
    /* ... */
  },
});
```

#### 2. Platform Back Button

```typescript
window.PalmSystem?.platformBack?.();
```

### TypeScript Support

All webOS types defined in `src/webos-types.d.ts`:

- `WebOSInterface`
- `WebOSServiceRequest`
- `PalmServiceBridge`
- `DeviceInfo`
- `AppInfo`
- `PlatformInfo`

---

## Remote Control Key Codes

| Key          | Code   | Usage                  |
| ------------ | ------ | ---------------------- |
| Left Arrow   | 37     | Navigate left in grid  |
| Up Arrow     | 38     | Navigate up in grid    |
| Right Arrow  | 39     | Navigate right in grid |
| Down Arrow   | 40     | Navigate down in grid  |
| OK/Enter     | 13     | Select/Confirm         |
| Back         | 461    | Go back                |
| Channel Up   | 33     | Next channel           |
| Channel Down | 34     | Previous channel       |
| Play/Pause   | 415/19 | Control playback       |
| Numbers 0-9  | 48-57  | Direct channel entry   |

---

## Styling System

### Tailwind CSS

**Configuration**: `tailwind.config.js`

**Key Features**:

- Utility-first CSS
- Dark theme by default
- Custom color palette (grays, blues)
- Responsive design utilities

**Common Patterns**:

```css
/* Background colors */
bg-gray-900  /* App background */
bg-gray-800  /* Card background */
bg-gray-700  /* Input background */

/* Text colors */
text-white    /* Primary text */
text-gray-400 /* Secondary text */

/* Interactive elements */
hover:bg-gray-900
focus:ring-2
cursor-pointer
```

### Global Styles

**File**: `src/app.css`

- Custom fonts
- Reset styles
- WebOS-specific adjustments
- Base component styles

---

## Development Workflow

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Run unit tests
npm run test

# Generate coverage report
npm run coverage

# Build for production
npm run build

# Package for webOS
npm run package

# Preview production build
npm run preview
```

### Development Environment

1. **Vite Dev Server**: `npm run dev`
   - Hot module replacement
   - TypeScript checking
   - Port: Default Vite port (usually 5173)

2. **Configuration**: Edit `/public/config.json`
   - No need to restart server
   - Changes reflected on page reload

3. **Testing in Browser**:
   - Mouse events work alongside keyboard
   - Console debugging available
   - Responsive layout testing

### Production Build

1. **TypeScript Compilation**: `tsc -b`
2. **Vite Build**: `vite build`
3. **Output**: `dist/` directory
4. **WebOS Packaging**: `ares-package -n -o dist dist`

---

## Testing

### Test Framework

- **Runner**: Vitest
- **Environment**: jsdom
- **Coverage**: v8 provider
- **UI**: @vitest/ui

### Test Files

- `config-manager.test.ts`: Config manager unit tests
- `database-manager.test.ts`: Database wrapper tests
- `m3u-manager.test.ts`: M3U parsing tests
- `test-setup.ts`: Test environment setup

### Running Tests

```bash
# Run all tests once
npm run test

# Generate coverage report
npm run coverage

# Open coverage report
open coverage/index.html
```

### Test Coverage

Reports available in `/coverage/` directory:

- HTML report: `coverage/index.html`
- Clover XML: `coverage/clover.xml`
- JSON: `coverage/coverage-final.json`

---

## Error Handling

### Common Error Scenarios

#### 1. Network Errors

**Where**: M3U Manager, Video Player  
**Handling**:

- Timeout errors with custom messages
- HTTP error codes displayed to user
- Retry mechanisms available
- Graceful degradation

#### 2. Configuration Errors

**Where**: Config Manager  
**Handling**:

- Default values on read failure
- Validation on save
- User-friendly error messages
- Retry options

#### 3. Playback Errors

**Where**: Player Page  
**Handling**:

- HLS.js error recovery
- Network error retry
- Media error recovery
- Fatal error display

#### 4. Parsing Errors

**Where**: M3U Manager  
**Handling**:

- Format validation
- Detailed error messages
- Empty playlist detection
- Malformed entry skipping

### Error Display Pattern

```typescript
// Error state UI
if (error) {
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <h2>Error Title</h2>
      <p>{error}</p>
      <button onClick={handleRetry}>Try Again</button>
    </div>
  );
}
```

---

## State Management

### Component State (Hooks)

The application uses Preact hooks for local component state:

- `useState`: Local component state
- `useEffect`: Side effects and lifecycle
- `useRef`: DOM references and mutable values
- `useCallback`: Memoized callbacks

### State Flow

```
App Component (Root State)
├── Playlist data
├── Current page
├── Selected channel
├── Loading states
└── Error states
    │
    ├── Home Page (Derived State)
    │   ├── Focused channel index
    │   └── Channels per row
    │
    ├── Player Page (Local State)
    │   ├── Video element ref
    │   ├── HLS instance ref
    │   ├── Loading/Playing states
    │   └── Header visibility
    │
    └── Config Page (Local State)
        ├── Current config
        ├── Original config
        └── Saving state
```

### No Global State Management

The application intentionally avoids Redux/MobX/etc because:

- Simple state requirements
- Component tree is shallow
- Props drilling is minimal
- Performance is adequate

---

## Performance Considerations

### Video Player Optimization

1. **HLS Configuration**:
   - Worker threads enabled
   - Low latency mode
   - Optimized buffer lengths
   - Fragment prefetching

2. **Memory Management**:
   - HLS instance cleanup on unmount
   - Timeout cleanup
   - Event listener removal

### Grid Navigation Optimization

1. **Dynamic Layout Calculation**:
   - Calculates once on mount
   - Recalculates on resize (debounced)
   - Caches channels per row

2. **Scroll Performance**:
   - Smooth scroll with `scrollIntoView`
   - Only scrolls when necessary
   - Uses `block: "nearest"`

### Bundle Size

- **Preact**: ~3KB (vs React 40KB)
- **Tree-shaking**: Vite automatic
- **Code splitting**: Not currently used (app is small)

---

## Security Considerations

### Content Security

1. **M3U URL Validation**:
   - URL format validation
   - HTTPS enforcement (recommended)
   - Timeout limits

2. **XSS Prevention**:
   - Preact escapes by default
   - No dangerouslySetInnerHTML usage
   - User input sanitization

### Data Privacy

1. **Local Storage**:
   - DB8 is device-local
   - No cloud sync
   - Data removed on uninstall

2. **Network Requests**:
   - User-controlled endpoints only
   - No telemetry or tracking
   - No third-party analytics

---

## Deployment

### WebOS Deployment Process

1. **Build Application**:

   ```bash
   npm run build
   ```

2. **Package IPK**:

   ```bash
   npm run package
   ```

   Output: `dist/com.arman.coffeeiptv_0.0.1_all.ipk`

3. **Install on Device**:

   ```bash
   ares-install --device <device-name> dist/com.arman.coffeeiptv_0.0.1_all.ipk
   ```

4. **Launch Application**:
   ```bash
   ares-launch --device <device-name> com.arman.coffeeiptv
   ```

### Device Setup

```bash
# Add device
ares-setup-device

# List devices
ares-setup-device --list

# Test connection
ares-device-info --device <device-name>
```

### Development Testing

```bash
# Install development build
ares-install --device <device-name> dist/com.arman.coffeeiptv_0.0.1_all.ipk

# View logs
ares-launch --device <device-name> com.arman.coffeeiptv --inspect

# Uninstall
ares-install --device <device-name> --remove com.arman.coffeeiptv
```

---

## Configuration Files

### package.json

**Dependencies**:

- `preact`: UI library (^10.27.0)
- `hls.js`: HLS streaming (^1.6.13)

**Dev Dependencies**:

- TypeScript toolchain
- Vite build system
- Tailwind CSS
- ESLint + Prettier
- Vitest testing framework

### vite.config.ts

**Key Settings**:

- Preact plugin
- TypeScript checker
- Base path: `./` (relative for webOS)
- Jsdom test environment

### tsconfig.json

**Compiler Options**:

- Target: ES2020
- Module: ESNext
- JSX: react-jsx with Preact
- Strict mode enabled
- Path aliases supported

### tailwind.config.js

**Content Paths**:

- `./index.html`
- `./src/**/*.{js,ts,jsx,tsx}`

**Customization**:

- Custom color schemes
- Font families
- Spacing utilities

### eslint.config.js

**Extends**:

- ESLint recommended
- TypeScript ESLint
- Preact recommended
- Prettier integration

---

## Future Enhancement Ideas

### Features

1. **EPG (Electronic Program Guide)**: TV guide integration
2. **Favorites**: Bookmark channels
3. **Search**: Channel search functionality
4. **Categories**: Filter by group/category
5. **Recently Watched**: History tracking
6. **Parental Controls**: PIN protection for channels
7. **Multi-language Support**: i18n integration
8. **Custom Themes**: User-selectable color schemes

### Technical Improvements

1. **Code Splitting**: Lazy load pages
2. **Service Worker**: Offline support
3. **Channel Prefetching**: Preload next channel
4. **IndexedDB Cache**: Cache channel list
5. **WebSocket Support**: Live channel updates
6. **DVR Support**: Recording functionality
7. **Cast Support**: Chromecast integration
8. **Picture-in-Picture**: PIP mode

### UX Enhancements

1. **Mini Guide**: Overlay channel list in player
2. **Gesture Support**: Touch/swipe navigation
3. **Voice Control**: Voice search
4. **Accessibility**: Screen reader support
5. **Keyboard Shortcuts**: Custom hotkeys
6. **Auto-play Next**: Continuous playback
7. **Sleep Timer**: Auto-stop feature
8. **Subtitle Support**: WebVTT/SRT subtitles

---

## Troubleshooting

### Common Issues

#### 1. "No M3U URL configured"

**Cause**: Config not set  
**Solution**: Go to Configuration page and set M3U URL

#### 2. "Failed to load playlist"

**Cause**: Invalid URL, network error, or invalid M3U format  
**Solutions**:

- Check URL is accessible
- Verify M3U format is valid
- Check network connection
- Try different playlist

#### 3. "HLS not supported"

**Cause**: Browser doesn't support MSE  
**Solution**: Use modern browser or webOS device

#### 4. Video doesn't play

**Causes**:

- Invalid stream URL
- Stream offline
- Network issues
- Codec not supported

**Solutions**:

- Try different channel
- Check stream URL manually
- Verify network connection
- Check browser console for errors

#### 5. Remote control doesn't work

**Cause**: Not running on webOS device  
**Solution**:

- Use keyboard arrows in development
- Test on actual webOS device

### Debug Mode

Enable debug mode in Configuration to see:

- Console logs
- Network requests
- State changes
- Error details

### Browser Console

Check console for:

- HLS errors
- Network failures
- Configuration issues
- JavaScript errors

---

## Dependencies Overview

### Production Dependencies

| Package | Version  | Purpose                       |
| ------- | -------- | ----------------------------- |
| preact  | ^10.27.0 | Lightweight React alternative |
| hls.js  | ^1.6.13  | HLS video streaming support   |

### Development Dependencies

| Package             | Purpose                       |
| ------------------- | ----------------------------- |
| @preact/preset-vite | Vite integration for Preact   |
| typescript          | Type checking and compilation |
| vite                | Build tool and dev server     |
| vitest              | Unit testing framework        |
| @vitest/coverage-v8 | Code coverage reporting       |
| tailwindcss         | Utility-first CSS framework   |
| eslint              | Code linting                  |
| prettier            | Code formatting               |
| jsdom               | DOM implementation for tests  |

---

## API Reference

### M3U Manager API

```typescript
class M3UManager {
  // Download M3U from URL
  downloadM3U(url: string, timeout?: number): Promise<M3UDownloadResult>;

  // Parse M3U content
  parseM3U(content: string, sourceUrl?: string): M3UParseResult;

  // Download and parse in one call
  downloadAndParseM3U(url: string, timeout?: number): Promise<M3UParseResult>;

  // Validate URL format
  private isValidUrl(url: string): boolean;

  // Parse EXTINF line
  private parseExtInfLine(line: string, url: string): M3UChannel | null;

  // Extract attributes from EXTINF
  private extractAttributes(line: string): Record<string, string>;
}
```

### Config Manager API

```typescript
interface IConfigManager {
  initialize(): Promise<void>;
  getConfig<K>(key: K): Promise<AppConfig[K]>;
  setConfig<K>(key: K, value: AppConfig[K]): Promise<void>;
  getAllConfig(): Promise<AppConfig>;
  isDebugMode(): Promise<boolean>;
  setDebugMode(enabled: boolean): Promise<void>;
  getM3uUrl(): Promise<string>;
  setM3uUrl(url: string): Promise<void>;
}
```

### Database Manager API

```typescript
class DatabaseManager {
  find(query: DB8Query, count?: boolean): Promise<DB8SuccessResponse>;
  put(objects: DB8Object[]): Promise<DB8SuccessResponse>;
  putKind(kind: DB8Kind): Promise<DB8SuccessResponse>;
  createQuery(kind: string, whereClause?: WhereClause[]): DB8Query;
  createKind(
    id: string,
    owner: string,
    isPrivate: boolean,
    indexes?: Index[]
  ): DB8Kind;
}
```

---

## Code Conventions

### TypeScript Style

1. **Interfaces over Types**: Prefer `interface` for object shapes
2. **Explicit Return Types**: Always specify function return types
3. **Strict Mode**: Enable all strict type checking
4. **No Any**: Avoid `any` type, use `unknown` if needed

### Component Patterns

1. **Functional Components**: No class components
2. **Hooks**: Use hooks for state and effects
3. **Props Interfaces**: Always define props interface
4. **Export Named**: Use named exports for components

### File Naming

- **Components**: PascalCase + `.tsx` (e.g., `HomePage.tsx`)
- **Utilities**: kebab-case + `.ts` (e.g., `m3u-manager.ts`)
- **Types**: `.d.ts` for type definitions
- **Tests**: `.test.ts` suffix

### Code Organization

```typescript
// 1. Imports
import { external } from "external";
import { internal } from "./internal";

// 2. Types/Interfaces
interface Props { }

// 3. Constants
const CONSTANT = "value";

// 4. Component/Class
export function Component(props: Props) {
  // 4a. Hooks
  const [state, setState] = useState();

  // 4b. Effects
  useEffect(() => { }, []);

  // 4c. Handlers
  const handleClick = () => { };

  // 4d. Render
  return <div />;
}
```

---

## Resources

### Documentation

- [Preact Documentation](https://preactjs.com/)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [webOS TV Developer Guide](https://webostv.developer.lge.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

### WebOS Resources

- [webOS TV SDK Download](https://webostv.developer.lge.com/sdk/download/)
- [webOS TV API Reference](https://webostv.developer.lge.com/api/webos-service-api/)
- [ares CLI Tools](https://webostv.developer.lge.com/develop/tools/cli-installation/)

### Community

- [webOS OSE GitHub](https://github.com/webosose)
- [Preact GitHub](https://github.com/preactjs/preact)
- [HLS.js GitHub](https://github.com/video-dev/hls.js/)

---

## License

Not specified in the project. Consider adding a LICENSE file.

---

## Contact & Support

**Vendor**: Arman  
**App ID**: com.arman.coffeeiptv

---

## Changelog

### Version 0.0.1 (Current)

- Initial release
- Basic IPTV playback functionality
- M3U playlist support
- HLS streaming support
- Remote control navigation
- Configuration management
- webOS DB8 integration

---

## Contributing Guidelines

### For AI Agents

When modifying this project:

1. **Maintain Type Safety**: Always use TypeScript types
2. **Follow Patterns**: Use existing patterns (managers, factories)
3. **Test Changes**: Run tests before committing
4. **Update Tests**: Add/update tests for new features
5. **Check Errors**: Run TypeScript compiler to catch issues
6. **Format Code**: Use Prettier for consistent formatting
7. **Lint Code**: Ensure ESLint passes
8. **Document**: Update this file for significant changes

### Testing Checklist

- [ ] TypeScript compiles without errors
- [ ] ESLint passes without errors
- [ ] All tests pass
- [ ] Code is formatted with Prettier
- [ ] Manual testing in browser
- [ ] Remote control navigation works
- [ ] Video playback works
- [ ] Configuration saves properly

---

_Last Updated: January 11, 2026_
_Document Version: 1.0_
