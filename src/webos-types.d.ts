// TypeScript declarations for webOS TV JavaScript library
// Based on webOSTVjs-1.2.10

declare global {
  interface Window {
    webOS: WebOSInterface;
    PalmSystem?: {
      identifier?: string;
      launchParams?: string;
      deviceInfo?: string;
      country?: string;
      timeZone?: string;
      platformBack?: () => void;
      stageReady?: () => void;
      isKeyboardVisible?: boolean;
    };
    PalmServiceBridge?: PalmServiceBridgeConstructor;
  }
}

interface PalmServiceBridgeConstructor {
  new (): PalmServiceBridge;
}

interface PalmServiceBridge {
  onservicecallback: ((responseText: string) => void) | null;
  call: (uri: string, payload: string) => void;
  cancel: () => void;
}

interface WebOSInterface {
  service: {
    request: (
      service: string,
      options: WebOSServiceRequest
    ) => WebOSServiceHandle;
  };
  deviceInfo: (callback: (info: DeviceInfo) => void) => void;
  fetchAppId: () => string;
  fetchAppInfo: (callback: (info: AppInfo) => void, path?: string) => void;
  fetchAppRootPath: () => string;
  keyboard: {
    isShowing: () => boolean;
  };
  libVersion: string;
  platform: PlatformInfo;
  platformBack: () => void;
  systemInfo: () => SystemInfo;
}

interface WebOSServiceRequest {
  method: string;
  parameters?: Record<string, unknown>;
  onSuccess?: (response: unknown) => void;
  onFailure?: (error: unknown) => void;
  onComplete?: (response: unknown) => void;
  subscribe?: boolean;
}

interface WebOSServiceHandle {
  cancel: () => void;
}

interface DeviceInfo {
  modelName?: string;
  version?: string;
  versionMajor?: number;
  versionMinor?: number;
  versionDot?: number;
  screenWidth?: number;
  screenHeight?: number;
  uhd?: boolean;
  uhd8K?: boolean;
  hdr10?: boolean;
  dolbyVision?: boolean;
  dolbyAtmos?: boolean;
  oled?: boolean;
  ddrSize?: string;
  brandName?: string;
  manufacturer?: string;
  mainboardMaker?: string;
  platformBizType?: string;
  tuner?: boolean;
  sdkVersion?: string;
}

interface AppInfo {
  id?: string;
  version?: string;
  vendor?: string;
  type?: string;
  main?: string;
  title?: string;
  icon?: string;
  [key: string]: unknown;
}

interface PlatformInfo {
  tv?: boolean;
  watch?: boolean;
  legacy?: boolean;
  open?: boolean;
  chrome?: number;
  unknown?: boolean;
}

interface SystemInfo {
  country?: string;
  smartServiceCountry?: string;
  timezone?: string;
}

export {};
