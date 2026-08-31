import { Capacitor } from '@capacitor/core';

export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const isIOS = () => {
  try {
    return Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
};

// Androidはプラグインの最小プリセットでも50-100msと強いため Web Vibration API を使う
const MIN_VIBRATE_MS = 8;

const tryWebVibrate = (ms: number) => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    return navigator.vibrate(ms);
  } catch {
    return false;
  }
};

export const selectionHaptic = () => {
  if (isNative() && isIOS()) {
    import('@capacitor/haptics')
      .then(({ Haptics }) => Haptics.selectionChanged())
      .catch(() => {});
    return;
  }

  if (tryWebVibrate(MIN_VIBRATE_MS)) return;

  if (isNative()) {
    import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {});
  }
};

export const impactHaptic = () => selectionHaptic();

export const notifyHaptic = (type: 'success' | 'warning' | 'error' = 'success') => {
  if (!isNative()) return;
  import('@capacitor/haptics')
    .then(({ Haptics, NotificationType }) =>
      Haptics.notification({
        type:
          type === 'error'
            ? NotificationType.Error
            : type === 'warning'
              ? NotificationType.Warning
              : NotificationType.Success,
      })
    )
    .catch(() => {});
};

// CSSはOSのLiquid Glass素材にならないので iOS はネイティブ描画（GlassTabBarController.swift）
export const usesNativeTabBar = () => isNative() && isIOS();
export const usesNativeGlassControls = usesNativeTabBar;

type NativeTabBarState = { activeTab: string; visible: boolean };

export const syncNativeTabBar = (state: NativeTabBarState) => {
  if (!usesNativeTabBar()) return;
  try {
    (window as any).webkit?.messageHandlers?.waritoTabBar?.postMessage(state);
  } catch {}
};

export const bindNativeTabBar = (handlers: {
  onTab: (tab: 'timetable' | 'grades') => void;
  onAdd: () => void;
}) => {
  if (!usesNativeTabBar()) return () => {};
  const w = window as any;
  w.__waritoNativeTab = (tab: string) => {
    if (tab === 'timetable' || tab === 'grades') handlers.onTab(tab);
  };
  w.__waritoNativeAdd = () => handlers.onAdd();
  return () => {
    delete w.__waritoNativeTab;
    delete w.__waritoNativeAdd;
  };
};

type NativeGlassControlsState = {
  activeTab: string;
  visible: boolean;
  year: number;
  semester: string;
  presetCount: number;
  presetIndex: number;
};

export const syncNativeGlassControls = (state: NativeGlassControlsState) => {
  if (!usesNativeGlassControls()) return;
  try {
    (window as any).webkit?.messageHandlers?.waritoGlassControls?.postMessage(state);
  } catch {}
};

export const bindNativeGlassControls = (handlers: {
  onSearch: () => void;
  onAccount: () => void;
  onTerm: () => void;
  onPresetSelect?: (index: number) => void;
}) => {
  if (!usesNativeGlassControls()) return () => {};
  const w = window as any;
  w.__waritoNativeGlassSearch = handlers.onSearch;
  w.__waritoNativeGlassAccount = handlers.onAccount;
  w.__waritoNativeGlassTerm = handlers.onTerm;
  w.__waritoNativeGlassPreset = (index: number) => handlers.onPresetSelect?.(index);
  return () => {
    delete w.__waritoNativeGlassSearch;
    delete w.__waritoNativeGlassAccount;
    delete w.__waritoNativeGlassTerm;
    delete w.__waritoNativeGlassPreset;
  };
};

export const initNativeShell = async () => {
  if (!isNative()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const isLight = document.documentElement.classList.contains('theme-light');
    await StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {}

  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    // setScroll({isDisabled:true}) は WKWebView の scrollView 自体を殺すので使わない
  } catch {}

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {}
};

export const syncStatusBarTheme = async (isLightTheme: boolean) => {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: isLightTheme ? Style.Light : Style.Dark });
  } catch {}
};
