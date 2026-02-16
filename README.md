# Coffee IPTV

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=arman1371_coffee-iptv&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=arman1371_coffee-iptv)

A modern IPTV application for LG webOS Smart TVs, built with Preact and TypeScript. Stream your favorite IPTV channels with full remote control navigation support and HLS adaptive streaming.

## Features

- 📺 **IPTV Streaming** - Support for M3U/M3U8 playlists with HLS adaptive bitrate streaming
- 🎮 **Full Remote Control** - Complete navigation using LG TV remote (arrow keys, channel up/down, number pad)
- ⚡ **Fast & Lightweight** - Built with Preact (3KB) for optimal performance
- 🔄 **Multi-Playlist Support** - Load and merge up to 10 M3U playlists simultaneously
- 💾 **Persistent Settings** - Configuration stored locally using webOS DB8 database

## Prerequisites

- Node.js 16+ and npm
- LG webOS TV SDK (for deployment to TV)
- Modern web browser (for development)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arman1371/coffee-iptv.git
   cd coffee-iptv
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure development settings** (optional)
   
   Edit `public/config.json` to set your M3U playlist URL for development:
   ```json
   {
     "debugMode": false,
     "m3uUrls": [
       {
         "url": "https://example.com/playlist.m3u",
         "enabled": true
       }
     ]
   }
   ```

## Development

### Run Development Server

```bash
npm run dev
```

The app will open in your default browser. Use keyboard arrows and Enter for navigation.

## Building for webOS

### 1. Build the Application

```bash
npm run build
```

### 2. Package as IPK

```bash
npm run package
```

This creates `dist/com.arman.coffeeiptv_<VERSION>_all.ipk`

### 3. Deploy to TV

First, set up your webOS device:

```bash
ares-setup-device
```

Install the application:

```bash
ares-install --device <device-name> dist/com.arman.coffeeiptv_<VERSION>_all.ipk
```

Launch the application:

```bash
ares-launch --device <device-name> com.arman.coffeeiptv
```

## Configuration

On first launch, navigate to the Configuration page using the menu button:

1. **Add M3U Playlist URLs** - Add up to 10 IPTV playlist sources
2. **Enable/Disable Playlists** - Toggle individual playlists on/off
3. **Debug Mode** - Enable console logging (optional)
4. **Save** - Configuration is stored persistently on the TV

### Supported M3U Formats

- Standard M3U playlists
- M3U8 playlists
- Extended M3U with EXTINF metadata
- HTTP/HTTPS URLs
- Attributes: tvg-id, tvg-name, tvg-logo, group-title, language, country

## Testing

### Run Tests

```bash
npm run test
```

### Generate Coverage Report

```bash
npm run coverage
```

View the coverage report at `coverage/index.html`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Preact](https://preactjs.com/)
- Video streaming powered by [HLS.js](https://github.com/video-dev/hls.js/)
- Designed for [LG webOS TV](https://webostv.developer.lge.com/)
